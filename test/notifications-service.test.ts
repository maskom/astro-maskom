import { describe, it, expect, vi, beforeEach } from 'vitest';
import { outageNotificationService } from '../src/lib/notifications/outage-service';
import type { Database } from '../src/lib/database.types';

// Mock the logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the dependencies
vi.mock('../src/lib/notifications/outage-database', () => ({
  outageDatabase: {
    createOutageEvent: vi.fn(),
    updateOutageEvent: vi.fn(),
    getActiveOutageEvents: vi.fn(),
    getAllOutageEvents: vi.fn(),
    getUserNotificationPreferences: vi.fn(),
    createDefaultNotificationPreferences: vi.fn(),
    updateUserNotificationPreferences: vi.fn(),
    getNotificationTemplate: vi.fn(),
    getUserNotifications: vi.fn(),
    getOutageEventById: vi.fn(),
  },
}));

vi.mock('../src/lib/notifications/outage-validation', () => ({
  outageValidation: {
    validateOutageEventData: vi.fn(),
    validateNotificationPreferences: vi.fn(),
    validateNotificationTemplate: vi.fn(),
  },
}));

vi.mock('../src/lib/notifications/outage-notifications', () => {
  return {
    OutageNotifications: class {
      triggerOutageNotifications = vi.fn();
      markNotificationAsRead = vi.fn();
      getNotificationStatistics = vi.fn();
    },
  };
});

describe('OutageNotificationService', () => {
  const mockOutageEvent = {
    id: 'outage-123',
    title: 'Test Outage',
    description: 'Test outage description',
    severity: 'high' as const,
    status: 'investigating' as const,
    affected_regions: ['region-1'],
    affected_services: ['service-1'],
    estimated_resolution: '2024-01-01T12:00:00Z',
    actual_resolution: undefined,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  };

  const mockEventInsert: Database['public']['Tables']['outage_events']['Insert'] =
    {
      title: 'Test Outage',
      description: 'Test outage description',
      severity: 'high',
      status: 'investigating',
      affected_regions: ['region-1'],
      affected_services: ['service-1'],
      estimated_resolution: '2024-01-01T12:00:00Z',
    };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOutageEvent', () => {
    it('should create outage event successfully', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      vi.mocked(outageValidation.validateOutageEventData).mockReturnValue({
        isValid: true,
        errors: [],
      });
      vi.mocked(outageDatabase.createOutageEvent).mockResolvedValue(
        mockOutageEvent
      );

      const result =
        await outageNotificationService.createOutageEvent(mockEventInsert);

      expect(result).toEqual(mockOutageEvent);
      expect(outageValidation.validateOutageEventData).toHaveBeenCalledWith(
        mockEventInsert
      );
      expect(outageDatabase.createOutageEvent).toHaveBeenCalledWith(
        mockEventInsert
      );
    });

    it('should return null for invalid event data', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      vi.mocked(outageValidation.validateOutageEventData).mockReturnValue({
        isValid: false,
        errors: ['Title is required'],
      });

      const result =
        await outageNotificationService.createOutageEvent(mockEventInsert);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      vi.mocked(outageValidation.validateOutageEventData).mockReturnValue({
        isValid: true,
        errors: [],
      });
      vi.mocked(outageDatabase.createOutageEvent).mockResolvedValue(null);

      const result =
        await outageNotificationService.createOutageEvent(mockEventInsert);

      expect(result).toBeNull();
    });
  });

  describe('updateOutageEvent', () => {
    it('should update outage event successfully', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData: Database['public']['Tables']['outage_events']['Update'] =
        {
          title: 'Updated Title',
        };

      vi.mocked(outageValidation.validateOutageEventData).mockReturnValue({
        isValid: true,
        errors: [],
      });
      vi.mocked(outageDatabase.updateOutageEvent).mockResolvedValue(
        mockOutageEvent
      );

      const result = await outageNotificationService.updateOutageEvent(
        'outage-123',
        updateData
      );

      expect(result).toEqual(mockOutageEvent);
      expect(outageDatabase.updateOutageEvent).toHaveBeenCalledWith(
        'outage-123',
        updateData
      );
    });

    it('should return null for invalid update data', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData: Database['public']['Tables']['outage_events']['Update'] =
        {
          title: '',
        };

      vi.mocked(outageValidation.validateOutageEventData).mockReturnValue({
        isValid: false,
        errors: ['Title cannot be empty'],
      });

      const result = await outageNotificationService.updateOutageEvent(
        'outage-123',
        updateData
      );

      expect(result).toBeNull();
    });
  });

  describe('getActiveOutageEvents', () => {
    it('should return active outage events', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getActiveOutageEvents).mockResolvedValue([
        mockOutageEvent,
      ]);

      const result = await outageNotificationService.getActiveOutageEvents();

      expect(result).toEqual([mockOutageEvent]);
      expect(outageDatabase.getActiveOutageEvents).toHaveBeenCalled();
    });
  });

  describe('getAllOutageEvents', () => {
    it('should return all outage events with default limit', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getAllOutageEvents).mockResolvedValue([
        mockOutageEvent,
      ]);

      const result = await outageNotificationService.getAllOutageEvents();

      expect(result).toEqual([mockOutageEvent]);
      expect(outageDatabase.getAllOutageEvents).toHaveBeenCalledWith(50);
    });

    it('should return all outage events with custom limit', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getAllOutageEvents).mockResolvedValue([
        mockOutageEvent,
      ]);

      const result = await outageNotificationService.getAllOutageEvents(25);

      expect(result).toEqual([mockOutageEvent]);
      expect(outageDatabase.getAllOutageEvents).toHaveBeenCalledWith(25);
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return existing user preferences', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        maintenance_notifications: false,
        billing_notifications: false,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        timezone: 'UTC',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(
        outageDatabase.getUserNotificationPreferences
      ).mockResolvedValue(mockPreferences);

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'user-123'
        );

      expect(result).toEqual(mockPreferences);
    });

    it('should create default preferences if none exist', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const mockDefaultPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: true,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
        maintenance_notifications: false,
        billing_notifications: false,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        timezone: 'UTC',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(
        outageDatabase.getUserNotificationPreferences
      ).mockResolvedValue(null);
      vi.mocked(
        outageDatabase.createDefaultNotificationPreferences
      ).mockResolvedValue(mockDefaultPreferences);

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'user-123'
        );

      expect(result).toEqual(mockDefaultPreferences);
      expect(
        outageDatabase.createDefaultNotificationPreferences
      ).toHaveBeenCalledWith('user-123');
    });
  });

  describe('createDefaultNotificationPreferences', () => {
    it('should create default notification preferences', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const mockDefaultPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: true,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
        maintenance_notifications: false,
        billing_notifications: false,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        timezone: 'UTC',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(
        outageDatabase.createDefaultNotificationPreferences
      ).mockResolvedValue(mockDefaultPreferences);

      const result =
        await outageNotificationService.createDefaultNotificationPreferences(
          'user-123'
        );

      expect(result).toEqual(mockDefaultPreferences);
      expect(
        outageDatabase.createDefaultNotificationPreferences
      ).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user notification preferences successfully', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData: Database['public']['Tables']['customer_notification_preferences']['Update'] =
        {
          email_notifications: false,
        };

      const mockUpdatedPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        outage_notifications: true,
        email_notifications: false,
        sms_notifications: true,
        in_app_notifications: true,
        push_notifications: true,
        maintenance_notifications: false,
        billing_notifications: false,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        timezone: 'UTC',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(
        outageValidation.validateNotificationPreferences
      ).mockReturnValue({
        isValid: true,
        errors: [],
      });
      vi.mocked(
        outageDatabase.updateUserNotificationPreferences
      ).mockResolvedValue(mockUpdatedPreferences);

      const result =
        await outageNotificationService.updateUserNotificationPreferences(
          'user-123',
          updateData
        );

      expect(result).toEqual(mockUpdatedPreferences);
      expect(
        outageValidation.validateNotificationPreferences
      ).toHaveBeenCalledWith({
        ...updateData,
        user_id: 'user-123',
      });
    });

    it('should return null for invalid preferences', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData: Database['public']['Tables']['customer_notification_preferences']['Update'] =
        {
          email_notifications: false,
        };

      vi.mocked(
        outageValidation.validateNotificationPreferences
      ).mockReturnValue({
        isValid: false,
        errors: ['Invalid preference'],
      });

      const result =
        await outageNotificationService.updateUserNotificationPreferences(
          'user-123',
          updateData
        );

      expect(result).toBeNull();
    });
  });

  describe('getNotificationTemplate', () => {
    it('should get notification template', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        type: 'outage_started' as const,
        channel: 'email' as const,
        subject_template: 'Outage: {{title}}',
        message_template: 'Outage {{title}}: {{description}}',
        variables: ['title', 'description'],
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      vi.mocked(outageDatabase.getNotificationTemplate).mockResolvedValue(
        mockTemplate
      );

      const result = await outageNotificationService.getNotificationTemplate(
        'outage_started',
        'email'
      );

      expect(result).toEqual(mockTemplate);
      expect(outageDatabase.getNotificationTemplate).toHaveBeenCalledWith(
        'outage_started',
        'email'
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with default limit', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const mockNotifications = [
        {
          id: 'notification-123',
          outage_event_id: 'outage-123',
          user_id: 'user-123',
          notification_type: 'email' as const,
          status: 'sent' as const,
          recipient: 'test@example.com',
          message_content: 'Test message',
          created_at: '2024-01-01T10:00:00Z',
          sent_at: '2024-01-01T10:05:00Z',
          error_message: undefined,
        },
      ];

      vi.mocked(outageDatabase.getUserNotifications).mockResolvedValue(
        mockNotifications
      );

      const result =
        await outageNotificationService.getUserNotifications('user-123');

      expect(result).toEqual(mockNotifications);
      expect(outageDatabase.getUserNotifications).toHaveBeenCalledWith(
        'user-123',
        20
      );
    });

    it('should get user notifications with custom limit', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getUserNotifications).mockResolvedValue([]);

      const result = await outageNotificationService.getUserNotifications(
        'user-123',
        10
      );

      expect(result).toEqual([]);
      expect(outageDatabase.getUserNotifications).toHaveBeenCalledWith(
        'user-123',
        10
      );
    });

    it('should handle errors when getting user notifications', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getUserNotifications).mockRejectedValue(
        new Error('Database error')
      );

      const result =
        await outageNotificationService.getUserNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('resolveOutageEvent', () => {
    it('should resolve outage event successfully', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      const resolutionData = {
        actual_resolution: '2024-01-01T14:00:00Z',
        resolution_notes: 'Issue fixed',
      };

      vi.mocked(outageDatabase.updateOutageEvent).mockResolvedValue(
        mockOutageEvent
      );

      const result = await outageNotificationService.resolveOutageEvent(
        'outage-123',
        resolutionData
      );

      expect(result).toEqual(mockOutageEvent);
      expect(outageDatabase.updateOutageEvent).toHaveBeenCalledWith(
        'outage-123',
        {
          status: 'resolved',
          actual_resolution: '2024-01-01T14:00:00Z',
        }
      );
    });

    it('should resolve outage event without resolution data', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.updateOutageEvent).mockResolvedValue(
        mockOutageEvent
      );

      const result =
        await outageNotificationService.resolveOutageEvent('outage-123');

      expect(result).toEqual(mockOutageEvent);
      expect(outageDatabase.updateOutageEvent).toHaveBeenCalledWith(
        'outage-123',
        {
          status: 'resolved',
        }
      );
    });
  });

  describe('getOutageEventById', () => {
    it('should get outage event by ID', async () => {
      const { outageDatabase } = await import(
        '../src/lib/notifications/outage-database'
      );

      vi.mocked(outageDatabase.getOutageEventById).mockResolvedValue(
        mockOutageEvent
      );

      const result =
        await outageNotificationService.getOutageEventById('outage-123');

      expect(result).toEqual(mockOutageEvent);
      expect(outageDatabase.getOutageEventById).toHaveBeenCalledWith(
        'outage-123'
      );
    });
  });

  describe('createNotificationTemplate', () => {
    it('should create notification template successfully', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const templateData = {
        name: 'Test Template',
        type: 'outage_started' as const,
        channel: 'email',
        subject_template: 'Outage: {{title}}',
        message_template: 'Outage {{title}}: {{description}}',
        variables: ['title', 'description'],
        is_active: true,
      };

      vi.mocked(outageValidation.validateNotificationTemplate).mockReturnValue({
        isValid: true,
        errors: [],
      });

      const result =
        await outageNotificationService.createNotificationTemplate(
          templateData
        );

      expect(result).toEqual({ success: true });
      expect(
        outageValidation.validateNotificationTemplate
      ).toHaveBeenCalledWith(templateData);
    });

    it('should return null for invalid template data', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const templateData = {
        name: '',
        type: 'outage_started' as const,
        channel: 'email',
        message_template: 'Test message',
      };

      vi.mocked(outageValidation.validateNotificationTemplate).mockReturnValue({
        isValid: false,
        errors: ['Name is required'],
      });

      const result =
        await outageNotificationService.createNotificationTemplate(
          templateData
        );

      expect(result).toBeNull();
    });
  });

  describe('updateNotificationTemplate', () => {
    it('should update notification template successfully', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData = {
        name: 'Updated Template',
        message_template: 'Updated message',
      };

      vi.mocked(outageValidation.validateNotificationTemplate).mockReturnValue({
        isValid: true,
        errors: [],
      });

      const result = await outageNotificationService.updateNotificationTemplate(
        'template-123',
        updateData
      );

      expect(result).toEqual({ success: true });
      expect(
        outageValidation.validateNotificationTemplate
      ).toHaveBeenCalledWith(updateData);
    });

    it('should return null for invalid update data', async () => {
      const { outageValidation } = await import(
        '../src/lib/notifications/outage-validation'
      );

      const updateData = {
        name: '',
      };

      vi.mocked(outageValidation.validateNotificationTemplate).mockReturnValue({
        isValid: false,
        errors: ['Name cannot be empty'],
      });

      const result = await outageNotificationService.updateNotificationTemplate(
        'template-123',
        updateData
      );

      expect(result).toBeNull();
    });
  });
});
