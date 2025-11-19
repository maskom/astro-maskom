import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock EmailQueueService and EmailNotificationService
vi.mock('@/lib/email/queue', () => ({
  EmailQueueService: class {
    sendTransactionalEmail = vi.fn().mockResolvedValue('email-id');
    addEmailToQueue = vi.fn().mockResolvedValue('email-id');
    processQueue = vi.fn().mockResolvedValue({ processed: 0, failed: 0 });
    getQueueStats = vi
      .fn()
      .mockResolvedValue({ pending: 0, processing: 0, failed: 0 });
    getSettings = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock('@/lib/email/notification-service', () => ({
  EmailNotificationService: class {
    sendWelcomeEmail = vi.fn().mockResolvedValue('email-id');
    sendPaymentConfirmation = vi.fn().mockResolvedValue('email-id');
    sendPasswordReset = vi.fn().mockResolvedValue('email-id');
  },
}));

import { EmailService } from '@/lib/email/service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailService('test-url', 'test-key');
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      const notificationService = service.getNotificationService();
      vi.mocked(notificationService.sendWelcomeEmail).mockResolvedValue(
        'email-id'
      );

      const result = await service.sendWelcomeEmail(
        'test@example.com',
        'John Doe'
      );

      expect(result).toBe('email-id');
      expect(notificationService.sendWelcomeEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
        'id'
      );
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation email', async () => {
      const notificationService = service.getNotificationService();
      vi.mocked(notificationService.sendPaymentConfirmation).mockResolvedValue(
        'email-id'
      );

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
      expect(notificationService.sendPaymentConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        orderData,
        'id'
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      const notificationService = service.getNotificationService();
      vi.mocked(notificationService.sendPasswordReset).mockResolvedValue(
        'email-id'
      );

      const result = await service.sendPasswordReset(
        'test@example.com',
        'https://example.com/reset?token=abc123',
        'John Doe'
      );

      expect(result).toBe('email-id');
      expect(notificationService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        'https://example.com/reset?token=abc123',
        'John Doe',
        'id'
      );
    });
  });

  describe('sendServiceNotification', () => {
    it('should send service notification with error severity', async () => {
      const queueService = service.getQueueService();
      vi.mocked(queueService.addEmailToQueue).mockResolvedValue('email-id');

      const result = await service.sendServiceNotification(
        'test@example.com',
        'Service Outage',
        'We are experiencing technical difficulties.',
        'error'
      );

      expect(result).toBe('email-id');
      expect(queueService.addEmailToQueue).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[ERROR] Service Outage',
        html: expect.stringContaining('Service Outage'),
        text: expect.stringContaining('Service Outage'),
        priority: 1,
        metadata: { severity: 'error', type: 'service_notification' },
      });
    });

    it('should send service notification with info severity', async () => {
      const queueService = service.getQueueService();
      vi.mocked(queueService.addEmailToQueue).mockResolvedValue('email-id');

      const result = await service.sendServiceNotification(
        'test@example.com',
        'Maintenance Notice',
        'Scheduled maintenance will occur tonight.',
        'info'
      );

      expect(result).toBe('email-id');
      expect(queueService.addEmailToQueue).toHaveBeenCalledWith({
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
      const queueService = service.getQueueService();
      vi.mocked(queueService.addEmailToQueue).mockResolvedValue('email-id');

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
      expect(queueService.addEmailToQueue).toHaveBeenCalledWith({
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
      const queueService = service.getQueueService();
      vi.mocked(queueService.getSettings).mockResolvedValue([
        {
          key: 'max_batch_size',
          value: 20,
          updated_at: new Date().toISOString(),
        },
      ]);
      vi.mocked(queueService.processQueue).mockResolvedValue({
        processed: 15,
        failed: 2,
      });

      const result = await service.processQueue();

      expect(result).toEqual({ processed: 15, failed: 2 });
      expect(queueService.processQueue).toHaveBeenCalledWith(20);
    });
  });

  describe('getQueueService', () => {
    it('should return queue service instance', () => {
      const queueService = service.getQueueService();
      expect(queueService).toBeDefined();
      expect(typeof queueService.sendTransactionalEmail).toBe('function');
      expect(typeof queueService.addEmailToQueue).toBe('function');
    });
  });
});
