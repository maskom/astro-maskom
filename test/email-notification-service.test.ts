import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailNotificationService } from '@/lib/email/notification-service';

// Mock EmailQueueService with proper class structure
vi.mock('@/lib/email/queue', () => ({
  EmailQueueService: class {
    supabase = {
      rpc: vi.fn(),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        insert: vi.fn().mockReturnValue({ error: null }),
        update: vi.fn(),
      })),
    };

    sendTransactionalEmail = vi.fn().mockResolvedValue('email-id');
    addEmailToQueue = vi.fn().mockResolvedValue('email-id');
  },
}));

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockQueueService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailNotificationService('test-url', 'test-key');
    mockQueueService = (service as any).queueService;
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with Indonesian language by default', async () => {
      await service.sendWelcomeEmail('test@example.com', 'John Doe');

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome_email',
        {
          user_name: 'John Doe',
          signup_date: expect.any(String),
        }
      );
    });

    it('should send welcome email with English language when specified', async () => {
      await service.sendWelcomeEmail('test@example.com', 'John Doe', 'en');

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome_email',
        {
          user_name: 'John Doe',
          signup_date: expect.any(String),
        }
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      await service.sendPasswordReset(
        'test@example.com',
        'https://example.com/reset',
        'John Doe',
        'en'
      );

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password_reset',
        {
          reset_url: 'https://example.com/reset',
          user_name: 'John Doe',
          expiry_hours: '24',
        }
      );
    });

    it('should use default user name when not provided', async () => {
      await service.sendPasswordReset(
        'test@example.com',
        'https://example.com/reset',
        undefined,
        'id'
      );

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password_reset',
        {
          reset_url: 'https://example.com/reset',
          user_name: 'Pengguna',
          expiry_hours: '24',
        }
      );
    });
  });

  describe('getCustomerEmailPreferences', () => {
    it('should return customer preferences', async () => {
      const mockPreferences = {
        email_enabled: true,
        transactional_emails: true,
        marketing_emails: false,
        newsletter_emails: false,
        billing_notifications: true,
        service_notifications: true,
        appointment_reminders: true,
        promotional_emails: false,
        product_updates: false,
        security_notifications: true,
        frequency_preference: 'normal',
        preferred_language: 'id',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockQueueService.supabase.rpc.mockResolvedValue({
        data: [mockPreferences],
        error: null,
      });

      const preferences =
        await service.getCustomerEmailPreferences('customer-123');

      expect(preferences).toEqual({
        customerId: 'customer-123',
        emailEnabled: true,
        transactionalEmails: true,
        marketingEmails: false,
        newsletterEmails: false,
        billingNotifications: true,
        serviceNotifications: true,
        appointmentReminders: true,
        promotionalEmails: false,
        productUpdates: false,
        securityNotifications: true,
        frequencyPreference: 'normal',
        preferredLanguage: 'id',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      });
    });

    it('should return null when no preferences found', async () => {
      mockQueueService.supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const preferences =
        await service.getCustomerEmailPreferences('customer-123');

      expect(preferences).toBeNull();
    });
  });

  describe('canSendEmailToCustomer', () => {
    it('should return true for transactional emails when enabled', async () => {
      const mockPreferences = {
        emailEnabled: true,
        transactionalEmails: true,
        marketingEmails: false,
      };

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(
        mockPreferences as any
      );

      const canSend = await service.canSendEmailToCustomer(
        'customer-123',
        'transactional'
      );

      expect(canSend).toBe(true);
    });

    it('should return false for marketing emails when disabled', async () => {
      const mockPreferences = {
        emailEnabled: true,
        transactionalEmails: true,
        marketingEmails: false,
      };

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(
        mockPreferences as any
      );

      const canSend = await service.canSendEmailToCustomer(
        'customer-123',
        'marketing'
      );

      expect(canSend).toBe(false);
    });

    it('should return false when email is disabled', async () => {
      const mockPreferences = {
        emailEnabled: false,
        transactionalEmails: true,
        marketingEmails: false,
      };

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(
        mockPreferences as any
      );

      const canSend = await service.canSendEmailToCustomer(
        'customer-123',
        'transactional'
      );

      expect(canSend).toBe(false);
    });

    it('should return false for marketing emails when preferences not found', async () => {
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(null);

      const canSend = await service.canSendEmailToCustomer(
        'customer-123',
        'marketing'
      );

      expect(canSend).toBe(false);
    });

    it('should return true for transactional emails when preferences not found', async () => {
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(null);

      const canSend = await service.canSendEmailToCustomer(
        'customer-123',
        'transactional'
      );

      expect(canSend).toBe(true);
    });
  });

  describe('createMarketingCampaign', () => {
    it('should create marketing campaign', async () => {
      const mockCampaignId = 'campaign-123';
      mockQueueService.supabase.rpc.mockResolvedValue({
        data: mockCampaignId,
        error: null,
      });

      const campaignId = await service.createMarketingCampaign(
        'Test Campaign',
        'Test Subject',
        '<p>Test Content</p>',
        'Test Text Content',
        {
          campaignType: 'marketing',
          description: 'Test Description',
        }
      );

      expect(campaignId).toBe(mockCampaignId);
      expect(mockQueueService.supabase.rpc).toHaveBeenCalledWith(
        'create_email_campaign',
        {
          p_name: 'Test Campaign',
          p_description: 'Test Description',
          p_subject: 'Test Subject',
          p_content_html: '<p>Test Content</p>',
          p_content_text: 'Test Text Content',
          p_campaign_type: 'marketing',
          p_target_audience: {},
          p_scheduled_at: null,
          p_created_by: null,
        }
      );
    });
  });

  describe('trackEmailEvent', () => {
    it('should track email event', async () => {
      // Mock for email_analytics insert
      const mockAnalytics = {
        insert: vi.fn().mockReturnValue({ error: null }),
      };

      // Mock for email_queue select
      const mockEmailQueue = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { metadata: { campaign_id: 'campaign-123' } },
            }),
          })),
        })),
      };

      // Mock for email_campaign_recipients update
      const mockCampaignRecipients = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Set up the from mock to return different objects based on the table
      mockQueueService.supabase.from.mockImplementation((table: string) => {
        if (table === 'email_analytics') return mockAnalytics;
        if (table === 'email_queue') return mockEmailQueue;
        if (table === 'email_campaign_recipients')
          return mockCampaignRecipients;
        return mockAnalytics;
      });

      await service.trackEmailEvent('email-123', 'opened', {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(mockAnalytics.insert).toHaveBeenCalledWith({
        email_id: 'email-123',
        event_type: 'opened',
        event_data: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
      });
    });
  });

  describe('sendEmailWithPreferences', () => {
    it('should send email when preferences allow', async () => {
      vi.spyOn(service, 'canSendEmailToCustomer').mockResolvedValue(true);
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue({
        preferredLanguage: 'id',
      } as any);

      const emailId = await service.sendEmailWithPreferences(
        'customer-123',
        'transactional',
        'test@example.com',
        {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test Content</p>',
        }
      );

      expect(emailId).toBe('email-id');
      expect(mockQueueService.addEmailToQueue).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test Content</p>',
        metadata: {
          language: 'id',
          customer_id: 'customer-123',
          email_type: 'transactional',
        },
      });
    });

    it('should return null when preferences do not allow', async () => {
      vi.spyOn(service, 'canSendEmailToCustomer').mockResolvedValue(false);

      const emailId = await service.sendEmailWithPreferences(
        'customer-123',
        'marketing',
        'test@example.com',
        {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test Content</p>',
        }
      );

      expect(emailId).toBeNull();
    });
  });
});
