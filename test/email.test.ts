import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailQueueService } from '@/lib/email/queue';
import type { EmailTemplate, SendEmailOptions } from '@/lib/email/types';

// Mock Supabase client interfaces
interface MockSupabaseQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockSupabaseClient {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
}

// Mock Supabase client
const mockSupabase: MockSupabaseClient = {
  rpc: vi.fn(),
  from: vi.fn(() => {
    const mockQuery: MockSupabaseQuery = {
      select: vi.fn(() => mockQuery),
      eq: vi.fn(() => mockQuery),
      order: vi.fn(() => mockQuery),
      limit: vi.fn(() => mockQuery),
      range: vi.fn(() => mockQuery),
      single: vi.fn(),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => mockQuery),
      in: vi.fn(() => mockQuery),
      lt: vi.fn(() => mockQuery),
      delete: vi.fn(() => mockQuery),
    };
    return mockQuery;
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

describe('EmailQueueService', () => {
  let service: EmailQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailQueueService('test-url', 'test-key');
  });

  describe('addEmailToQueue', () => {
    it('should add email to queue successfully', async () => {
      const mockEmailId = 'test-email-id';
      mockSupabase.rpc.mockResolvedValue({
        data: mockEmailId,
        error: null,
      });

      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      };

      const result = await service.addEmailToQueue(options);

      expect(result).toBe(mockEmailId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_email_to_queue', {
        p_to_email: options.to,
        p_from_email: 'noreply@maskom.network',
        p_subject: options.subject,
        p_content_html: options.html,
        p_content_text: options.text,
        p_template_id: null,
        p_template_data: {},
        p_priority: 5,
        p_metadata: {},
      });
    });

    it('should handle errors when adding email to queue', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
      };

      await expect(service.addEmailToQueue(options)).rejects.toThrow(
        'Failed to add email to queue: Database error'
      );
    });
  });

  describe('processQueue', () => {
    it('should process queue successfully', async () => {
      const mockResult = { processed: 5, failed: 2 };
      mockSupabase.rpc.mockResolvedValue({
        data: [mockResult],
        error: null,
      });

      const result = await service.processQueue(10);

      expect(result).toEqual(mockResult);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_email_queue', {
        batch_size: 10,
      });
    });

    it('should handle errors when processing queue', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Processing error' },
      });

      await expect(service.processQueue()).rejects.toThrow(
        'Failed to process email queue: Processing error'
      );
    });
  });

  describe('getQueueStats', () => {
    it('should get queue statistics successfully', async () => {
      const mockStats = {
        pending_count: 10,
        processing_count: 2,
        sent_today: 50,
        failed_today: 3,
        retry_count: 5,
      };
      mockSupabase.rpc.mockResolvedValue({
        data: [mockStats],
        error: null,
      });

      const result = await service.getQueueStats();

      expect(result).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_email_queue_stats');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with data', () => {
      const template = 'Hello {{name}}, your order {{order_id}} is ready!';
      const data = { name: 'John', order_id: '12345' };

      const result = service.renderTemplate(template, data);

      expect(result).toBe('Hello John, your order 12345 is ready!');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}, your order {{order_id}} is ready!';
      const data = { name: 'John' };

      const result = service.renderTemplate(template, data);

      expect(result).toBe('Hello John, your order {{order_id}} is ready!');
    });
  });

  describe('sendTransactionalEmail', () => {
    it('should send transactional email using template', async () => {
      const mockTemplate: EmailTemplate = {
        id: 'template-id',
        name: 'welcome_email',
        subject_template: 'Welcome {{name}}!',
        html_template: '<h1>Welcome {{name}}!</h1>',
        text_template: 'Welcome {{name}}!',
        category: 'transactional',
        is_active: true,
        version: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTemplate,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockFrom as MockSupabaseQuery);
      mockSupabase.rpc.mockResolvedValue({
        data: 'email-id',
        error: null,
      });

      const result = await service.sendTransactionalEmail(
        'test@example.com',
        'welcome_email',
        { name: 'John' }
      );

      expect(result).toBe('email-id');
      expect(mockSupabase.from).toHaveBeenCalledWith('email_templates');
    });

    it('should throw error if template not found', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockFrom as MockSupabaseQuery);

      await expect(
        service.sendTransactionalEmail(
          'test@example.com',
          'nonexistent_template',
          {}
        )
      ).rejects.toThrow("Template 'nonexistent_template' not found");
    });
  });
});
