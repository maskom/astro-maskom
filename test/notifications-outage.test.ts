import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutageNotifications } from '../src/lib/notifications/outage-notifications';
import type {
  OutageEvent,
  OutageNotification,
} from '../src/lib/notifications/outage-database';
import type { OutageValidation } from '../src/lib/notifications/outage-validation';
import type { OutageDatabase } from '../src/lib/notifications/outage-database';

// Mock the logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('OutageNotifications', () => {
  let outageNotifications: OutageNotifications;
  let mockDatabase: OutageDatabase;
  let mockValidation: OutageValidation;

  const mockOutageEvent: OutageEvent = {
    id: 'outage-123',
    title: 'Test Outage',
    description: 'Test outage description',
    severity: 'high',
    status: 'active',
    affected_regions: ['region-1'],
    affected_services: ['service-1'],
    estimated_resolution: '2024-01-01T12:00:00Z',
    actual_resolution: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  };

  const mockUser = {
    user_id: 'user-123',
    email: 'test@example.com',
    phone: '+1234567890',
  };

  const mockNotification: OutageNotification = {
    id: 'notification-123',
    outage_event_id: 'outage-123',
    user_id: 'user-123',
    notification_type: 'email',
    status: 'pending',
    recipient: 'test@example.com',
    message_content: 'Test message',
    created_at: '2024-01-01T10:00:00Z',
    sent_at: null,
    error_message: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDatabase = {
      getOutageEventById: vi.fn(),
      getAffectedUsersForOutage: vi.fn(),
      getUserNotificationPreferences: vi.fn(),
      getNotificationTemplate: vi.fn(),
      createNotificationRecord: vi.fn(),
      updateNotificationStatus: vi.fn(),
    } as unknown as OutageDatabase;

    mockValidation = {
      shouldNotifyUser: vi.fn(),
      validateTemplateVariables: vi.fn(),
      validateNotificationRecipient: vi.fn(),
      sanitizeNotificationContent: vi.fn(),
    } as unknown as OutageValidation;

    outageNotifications = new OutageNotifications(mockDatabase, mockValidation);
  });

  describe('triggerOutageNotifications', () => {
    it('should successfully trigger notifications for valid outage event', async () => {
      vi.mocked(mockDatabase.getOutageEventById).mockResolvedValue(
        mockOutageEvent
      );
      vi.mocked(mockDatabase.getAffectedUsersForOutage).mockResolvedValue([
        mockUser,
      ]);
      vi.mocked(mockDatabase.getUserNotificationPreferences).mockResolvedValue({
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: true,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
      });
      vi.mocked(mockValidation.shouldNotifyUser).mockReturnValue(true);
      vi.mocked(mockDatabase.getNotificationTemplate).mockResolvedValue({
        id: 'template-123',
        name: 'Test Template',
        type: 'outage_started',
        channel: 'email',
        subject_template: 'Outage: {{title}}',
        message_template: 'Outage {{title}}: {{description}}',
        variables: ['title', 'description'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      });
      vi.mocked(mockValidation.validateTemplateVariables).mockReturnValue({
        isValid: true,
        missingVariables: [],
      });
      vi.mocked(mockValidation.validateNotificationRecipient).mockReturnValue({
        isValid: true,
      });
      vi.mocked(mockValidation.sanitizeNotificationContent).mockReturnValue(
        'Sanitized message'
      );
      vi.mocked(mockDatabase.createNotificationRecord).mockResolvedValue(
        mockNotification
      );
      vi.mocked(mockDatabase.updateNotificationStatus).mockResolvedValue(true);

      await outageNotifications.triggerOutageNotifications(
        'outage-123',
        'outage_started'
      );

      expect(mockDatabase.getOutageEventById).toHaveBeenCalledWith(
        'outage-123'
      );
      expect(mockDatabase.getAffectedUsersForOutage).toHaveBeenCalledWith(
        ['region-1'],
        ['service-1']
      );
    });

    it('should handle outage event not found', async () => {
      vi.mocked(mockDatabase.getOutageEventById).mockResolvedValue(null);

      await outageNotifications.triggerOutageNotifications(
        'invalid-id',
        'outage_started'
      );

      expect(mockDatabase.getOutageEventById).toHaveBeenCalledWith(
        'invalid-id'
      );
      expect(mockDatabase.getAffectedUsersForOutage).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockDatabase.getOutageEventById).mockRejectedValue(
        new Error('Database error')
      );

      await outageNotifications.triggerOutageNotifications(
        'outage-123',
        'outage_started'
      );

      expect(mockDatabase.getOutageEventById).toHaveBeenCalledWith(
        'outage-123'
      );
    });
  });

  describe('processUserNotification', () => {
    it('should skip users with outage notifications disabled', async () => {
      vi.mocked(mockDatabase.getUserNotificationPreferences).mockResolvedValue({
        user_id: 'user-123',
        outage_notifications: false,
        email_notifications: true,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
      });

      // Access private method through prototype for testing
      const processUserNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).processUserNotification.bind(outageNotifications);
      await processUserNotification(
        mockUser,
        mockOutageEvent,
        'outage_started'
      );

      expect(mockValidation.shouldNotifyUser).not.toHaveBeenCalled();
    });

    it('should skip users with no preferences', async () => {
      vi.mocked(mockDatabase.getUserNotificationPreferences).mockResolvedValue(
        null
      );

      const processUserNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).processUserNotification.bind(outageNotifications);
      await processUserNotification(
        mockUser,
        mockOutageEvent,
        'outage_started'
      );

      expect(mockValidation.shouldNotifyUser).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    beforeEach(() => {
      vi.mocked(mockDatabase.getUserNotificationPreferences).mockResolvedValue({
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: true,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
      });
    });

    it('should handle missing template', async () => {
      vi.mocked(mockDatabase.getNotificationTemplate).mockResolvedValue(null);

      const sendNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).sendNotification.bind(outageNotifications);
      await sendNotification(
        mockUser,
        mockOutageEvent,
        'outage_started',
        'email'
      );

      expect(mockValidation.validateTemplateVariables).not.toHaveBeenCalled();
    });

    it('should handle template validation failure', async () => {
      vi.mocked(mockDatabase.getNotificationTemplate).mockResolvedValue({
        id: 'template-123',
        name: 'Test Template',
        type: 'outage_started',
        channel: 'email',
        subject_template: 'Outage: {{title}}',
        message_template: 'Outage {{title}}: {{description}}',
        variables: ['title', 'description'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      });
      vi.mocked(mockValidation.validateTemplateVariables).mockReturnValue({
        isValid: false,
        missingVariables: ['missing_var'],
      });

      const sendNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).sendNotification.bind(outageNotifications);
      await sendNotification(
        mockUser,
        mockOutageEvent,
        'outage_started',
        'email'
      );

      expect(
        mockValidation.validateNotificationRecipient
      ).not.toHaveBeenCalled();
    });

    it('should handle recipient validation failure', async () => {
      vi.mocked(mockDatabase.getNotificationTemplate).mockResolvedValue({
        id: 'template-123',
        name: 'Test Template',
        type: 'outage_started',
        channel: 'email',
        subject_template: 'Outage: {{title}}',
        message_template: 'Outage {{title}}: {{description}}',
        variables: ['title', 'description'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      });
      vi.mocked(mockValidation.validateTemplateVariables).mockReturnValue({
        isValid: true,
        missingVariables: [],
      });
      vi.mocked(mockValidation.validateNotificationRecipient).mockReturnValue({
        isValid: false,
        error: 'Invalid email',
      });

      const sendNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).sendNotification.bind(outageNotifications);
      await sendNotification(
        mockUser,
        mockOutageEvent,
        'outage_started',
        'email'
      );

      expect(mockValidation.sanitizeNotificationContent).not.toHaveBeenCalled();
    });
  });

  describe('deliverNotification', () => {
    it('should deliver email notifications successfully', async () => {
      vi.mocked(mockDatabase.updateNotificationStatus).mockResolvedValue(true);

      const deliverNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverNotification.bind(outageNotifications);
      await deliverNotification(mockNotification, 'Test Subject', {
        title: 'Test',
      });

      expect(mockDatabase.updateNotificationStatus).toHaveBeenCalledWith(
        'notification-123',
        {
          status: 'sent',
          sent_at: expect.any(String),
        }
      );
    });

    it('should handle unknown notification types', async () => {
      const unknownNotification = {
        ...mockNotification,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        notification_type: 'unknown' as any,
      };
      vi.mocked(mockDatabase.updateNotificationStatus).mockResolvedValue(true);

      const deliverNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverNotification.bind(outageNotifications);
      await deliverNotification(unknownNotification);

      expect(mockDatabase.updateNotificationStatus).toHaveBeenCalledWith(
        'notification-123',
        {
          status: 'failed',
          sent_at: expect.any(String),
          error_message: 'Unknown notification type',
        }
      );
    });
  });

  describe('renderTemplate', () => {
    it('should replace template variables correctly', () => {
      const template =
        'Outage {{title}}: {{description}} - Severity: {{severity}}';
      const variables = {
        title: 'Test Outage',
        description: 'Test Description',
        severity: 'High',
      };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTemplate = (outageNotifications as any).renderTemplate.bind(
        outageNotifications
      );
      const result = renderTemplate(template, variables);

      expect(result).toBe(
        'Outage Test Outage: Test Description - Severity: High'
      );
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Outage {{title}}: {{missing_var}}';
      const variables = {
        title: 'Test Outage',
      };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTemplate = (outageNotifications as any).renderTemplate.bind(
        outageNotifications
      );
      const result = renderTemplate(template, variables);

      expect(result).toBe('Outage Test Outage: {{missing_var}}');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const result = await outageNotifications.markNotificationAsRead(
        'notification-123',
        'user-123'
      );

      expect(result).toBe(true);
    });

    it('should handle errors when marking as read', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await outageNotifications.markNotificationAsRead(
        'invalid-id',
        'user-123'
      );

      expect(result).toBe(true); // Still returns true due to mock implementation
      consoleSpy.mockRestore();
    });
  });

  describe('getNotificationStatistics', () => {
    it('should return notification statistics', async () => {
      const result =
        await outageNotifications.getNotificationStatistics('outage-123');

      expect(result).toEqual({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      });
    });

    it('should handle errors when getting statistics', async () => {
      const result =
        await outageNotifications.getNotificationStatistics('invalid-id');

      expect(result).toEqual({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      });
    });
  });

  describe('delivery methods', () => {
    beforeEach(() => {
      vi.mocked(mockDatabase.updateNotificationStatus).mockResolvedValue(true);
    });

    it('should deliver email notifications', async () => {
      const deliverEmailNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverEmailNotification.bind(outageNotifications);
      const result = await deliverEmailNotification(mockNotification);

      expect(result).toBe(true);
    });

    it('should deliver SMS notifications', async () => {
      const deliverSmsNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverSmsNotification.bind(outageNotifications);
      const result = await deliverSmsNotification(mockNotification);

      expect(result).toBe(true);
    });

    it('should deliver in-app notifications', async () => {
      const deliverInAppNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverInAppNotification.bind(outageNotifications);
      const result = await deliverInAppNotification(mockNotification);

      expect(result).toBe(true);
    });

    it('should deliver push notifications', async () => {
      const deliverPushNotification = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        outageNotifications as any
      ).deliverPushNotification.bind(outageNotifications);
      const result = await deliverPushNotification(mockNotification);

      expect(result).toBe(true);
    });
  });
});
