import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '@/lib/email/service';
import { EmailQueueService } from '@/lib/email/queue';

// Mock EmailQueueService
const mockQueueService = {
  sendTransactionalEmail: vi.fn(),
  addEmailToQueue: vi.fn(),
  processQueue: vi.fn(),
  getQueueStats: vi.fn(),
  getSettings: vi.fn(),
};

vi.mock('@/lib/email/queue', () => ({
  EmailQueueService: vi.fn(() => mockQueueService),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailService('test-url', 'test-key');
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      mockQueueService.sendTransactionalEmail.mockResolvedValue('email-id');

      const result = await service.sendWelcomeEmail(
        'test@example.com',
        'John Doe'
      );

      expect(result).toBe('email-id');
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

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation email', async () => {
      mockQueueService.sendTransactionalEmail.mockResolvedValue('email-id');

      const orderData = {
        orderId: 'ORD-123',
        amount: 100000,
        currency: 'IDR',
        productName: 'Internet Package',
      };

      const result = await service.sendPaymentConfirmation(
        'test@example.com',
        orderData
      );

      expect(result).toBe('email-id');
      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'payment_confirmation',
        {
          order_id: 'ORD-123',
          amount: '100,000',
          currency: 'IDR',
          product_name: 'Internet Package',
          payment_date: expect.any(String),
        }
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      mockQueueService.sendTransactionalEmail.mockResolvedValue('email-id');

      const result = await service.sendPasswordReset(
        'test@example.com',
        'https://example.com/reset?token=abc123',
        'John Doe'
      );

      expect(result).toBe('email-id');
      expect(mockQueueService.sendTransactionalEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password_reset',
        {
          reset_url: 'https://example.com/reset?token=abc123',
          user_name: 'John Doe',
          expiry_hours: '24',
        }
      );
    });
  });

  describe('sendServiceNotification', () => {
    it('should send service notification with error severity', async () => {
      mockQueueService.addEmailToQueue.mockResolvedValue('email-id');

      const result = await service.sendServiceNotification(
        'test@example.com',
        'Service Outage',
        'We are experiencing technical difficulties.',
        'error'
      );

      expect(result).toBe('email-id');
      expect(mockQueueService.addEmailToQueue).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[ERROR] Service Outage',
        html: expect.stringContaining('Service Outage'),
        text: expect.stringContaining('Service Outage'),
        priority: 1,
        metadata: { severity: 'error', type: 'service_notification' },
      });
    });

    it('should send service notification with info severity', async () => {
      mockQueueService.addEmailToQueue.mockResolvedValue('email-id');

      const result = await service.sendServiceNotification(
        'test@example.com',
        'Maintenance Notice',
        'Scheduled maintenance will occur tonight.',
        'info'
      );

      expect(result).toBe('email-id');
      expect(mockQueueService.addEmailToQueue).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[INFO] Maintenance Notice',
        html: expect.stringContaining('Maintenance Notice'),
        text: expect.stringContaining('Maintenance Notice'),
        priority: 5,
        metadata: { severity: 'info', type: 'service_notification' },
      });
    });
  });

  describe('sendBillingReminder', () => {
    it('should send billing reminder email', async () => {
      mockQueueService.addEmailToQueue.mockResolvedValue('email-id');

      const invoiceData = {
        invoiceNumber: 'INV-123',
        amount: 150000,
        dueDate: '2024-12-31',
        productName: 'Premium Internet',
      };

      const result = await service.sendBillingReminder(
        'test@example.com',
        invoiceData
      );

      expect(result).toBe('email-id');
      expect(mockQueueService.addEmailToQueue).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Billing Reminder - Invoice INV-123',
        html: expect.stringContaining('INV-123'),
        text: expect.stringContaining('INV-123'),
        priority: 4,
        metadata: {
          type: 'billing_reminder',
          invoice_number: 'INV-123',
        },
      });
    });
  });

  describe('processQueue', () => {
    it('should process queue with custom batch size', async () => {
      mockQueueService.getSettings.mockResolvedValue([
        { key: 'max_batch_size', value: 20 },
      ]);
      mockQueueService.processQueue.mockResolvedValue({
        processed: 15,
        failed: 2,
      });

      const result = await service.processQueue();

      expect(result).toEqual({ processed: 15, failed: 2 });
      expect(mockQueueService.processQueue).toHaveBeenCalledWith(20);
    });
  });

  describe('getQueueService', () => {
    it('should return queue service instance', () => {
      const queueService = service.getQueueService();
      expect(queueService).toBe(mockQueueService);
    });
  });
});
