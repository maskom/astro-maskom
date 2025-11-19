import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailNotificationService } from '@/lib/email/notification-service';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        insert: vi.fn(),
        update: vi.fn(),
      })),
    })),
  })),
}));

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailNotificationService('test-url', 'test-key');
    mockSupabase = createClient('test-url', 'test-key');
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with Indonesian language by default', async () => {
      const mockQueueService = {
        sendTransactionalEmail: vi.fn().mockResolvedValue('email-id'),
      };
      service['queueService'] = mockQueueService;

      await service.sendWelcomeEmail('test@example.com', 'John Doe');

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome_email',
        {
          user_name: 'John Doe',
          signup_date: new Date().toLocaleDateString('id-ID'),
        }
      );
    });

    it('should send welcome email with English language when specified', async () => {
      const mockQueueService = {
        sendTransactionalEmail: vi.fn().mockResolvedValue('email-id'),
      };
      service['queueService'] = mockQueueService;

      await service.sendWelcomeEmail('test@example.com', 'John Doe', 'en');

      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome_email',
        {
          user_name: 'John Doe',
          signup_date: new Date().toLocaleDateString('en-US'),
        }
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      const mockQueueService = {
        sendTransactionalEmail: vi.fn().mockResolvedValue('email-id'),
      };
      service['queueService'] = mockQueueService;

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
      const mockQueueService = {
        sendTransactionalEmail: vi.fn().mockResolvedValue('email-id'),
      };
      service['queueService'] = mockQueueService;

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
        security_notifications: true,
        frequency_preference: 'normal',
        preferred_language: 'id',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: [mockPreferences],
        error: null,
      });

      const preferences = await service.getCustomerEmailPreferences('customer-123');

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
        securityNotifications: true,
        frequencyPreference: 'normal',
        preferredLanguage: 'id',
      });
    });

    it('should return null when no preferences found', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const preferences = await service.getCustomerEmailPreferences('customer-123');

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

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(mockPreferences as any);

      const canSend = await service.canSendEmailToCustomer('customer-123', 'transactional');

      expect(canSend).toBe(true);
    });

    it('should return false for marketing emails when disabled', async () => {
      const mockPreferences = {
        emailEnabled: true,
        transactionalEmails: true,
        marketingEmails: false,
      };

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(mockPreferences as any);

      const canSend = await service.canSendEmailToCustomer('customer-123', 'marketing');

      expect(canSend).toBe(false);
    });

    it('should return false when email is disabled', async () => {
      const mockPreferences = {
        emailEnabled: false,
        transactionalEmails: true,
        marketingEmails: false,
      };

      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(mockPreferences as any);

      const canSend = await service.canSendEmailToCustomer('customer-123', 'transactional');

      expect(canSend).toBe(false);
    });

    it('should return false for marketing emails when preferences not found', async () => {
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(null);

      const canSend = await service.canSendEmailToCustomer('customer-123', 'marketing');

      expect(canSend).toBe(false);
    });

    it('should return true for transactional emails when preferences not found', async () => {
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue(null);

      const canSend = await service.canSendEmailToCustomer('customer-123', 'transactional');

      expect(canSend).toBe(true);
    });
  });

  describe('createMarketingCampaign', () => {
    it('should create marketing campaign', async () => {
      const mockCampaignId = 'campaign-123';
      mockSupabase.rpc.mockResolvedValue({
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
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_email_campaign', {
        p_name: 'Test Campaign',
        p_description: 'Test Description',
        p_subject: 'Test Subject',
        p_content_html: '<p>Test Content</p>',
        p_content_text: 'Test Text Content',
        p_campaign_type: 'marketing',
        p_target_audience: {},
        p_scheduled_at: null,
        p_created_by: undefined,
      });
    });
  });

  describe('trackEmailEvent', () => {
    it('should track email event', async () => {
      const mockAnalytics = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from.mockReturnValue(mockAnalytics);

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
      const mockQueueService = {
        addEmailToQueue: vi.fn().mockResolvedValue('email-id'),
      };
      service['queueService'] = mockQueueService;

      vi.spyOn(service, 'canSendEmailToCustomer').mockResolvedValue(true);
      vi.spyOn(service, 'getCustomerEmailPreferences').mockResolvedValue({
        preferredLanguage: 'id',
      } as any);

      const emailId = await service.sendEmailWithPreferences(
        'customer-123',
        'transactional',
        'test@example.com',
        {
          subject: 'Test Subject',
          html: '<p>Test Content</p>',
        }
      );

      expect(emailId).toBe('email-id');
      expect(mockQueueService.addEmailToQueue).toHaveBeenCalledWith({
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
          subject: 'Test Subject',
          html: '<p>Test Content</p>',
        }
      );

      expect(emailId).toBeNull();
    });
  });
});