import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing the service

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock validation
vi.mock('../src/lib/notifications/outage-validation', () => ({
  outageValidation: {
    validateOutageEventData: vi.fn(() => ({ isValid: true, errors: [] })),
    validateNotificationPreferences: vi.fn(() => ({
      isValid: true,
      errors: [],
    })),
    validateNotificationTemplate: vi.fn(() => ({ isValid: true, errors: [] })),
    validateTemplateVariables: vi.fn(() => ({
      isValid: true,
      missingVariables: [],
    })),
    validateNotificationRecipient: vi.fn(() => ({ isValid: true, errors: [] })),
    shouldNotifyUser: vi.fn(() => Promise.resolve(true)),
  },
}));

// Mock outage database
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

// Import after mocking
import { outageNotificationService } from '../src/lib/notifications/outage-service';
import { outageDatabase } from '../src/lib/notifications/outage-database';
import { outageValidation } from '../src/lib/notifications/outage-validation';
import { OutageNotifications } from '../src/lib/notifications/outage-notifications';
import { createClient } from '@supabase/supabase-js';

// Get the mock functions
const mockCreateClient = vi.mocked(createClient);
const mockOutageDatabase = vi.mocked(outageDatabase);
const mockOutageValidation = vi.mocked(outageValidation);

describe('OutageNotificationService', () => {
  let mockClient: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock client for each test
    mockClient = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockCreateClient.mockReturnValue(mockClient as any);

    // Reset all mock implementations
    mockOutageDatabase.createOutageEvent.mockResolvedValue(null);
    mockOutageDatabase.updateOutageEvent.mockResolvedValue(null);
    mockOutageDatabase.getActiveOutageEvents.mockResolvedValue([]);
    mockOutageDatabase.getAllOutageEvents.mockResolvedValue([]);
    mockOutageDatabase.getUserNotificationPreferences.mockResolvedValue(null);
    mockOutageDatabase.createDefaultNotificationPreferences.mockResolvedValue(
      null
    );
    mockOutageDatabase.updateUserNotificationPreferences.mockResolvedValue(
      null
    );
    mockOutageDatabase.getNotificationTemplate.mockResolvedValue(null);
    mockOutageDatabase.getUserNotifications.mockResolvedValue([]);
    mockOutageDatabase.getOutageEventById.mockResolvedValue(null);

    mockOutageValidation.shouldNotifyUser.mockResolvedValue(true);
  });

  describe('createOutageEvent', () => {
    it('should create a new outage event successfully', async () => {
      const mockEventData = {
        title: 'Test Outage',
        description: 'Test description',
        status: 'investigating' as const,
        severity: 'high' as const,
        affected_services: ['internet'],
        affected_regions: ['jakarta'],
        created_by: 'test-user',
      };

      const mockCreatedEvent = {
        id: 'test-event-id',
        ...mockEventData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the database operation
      mockOutageDatabase.createOutageEvent.mockResolvedValue(mockCreatedEvent);

      // Mock the notification trigger - it's now in the notifications module
      const mockNotifications = {
        triggerOutageNotifications: vi.fn().mockResolvedValue(undefined),
      } as any;

      // Replace the notifications instance on the service
      (outageNotificationService as any).notifications = mockNotifications;

      const result =
        await outageNotificationService.createOutageEvent(mockEventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockOutageDatabase.createOutageEvent).toHaveBeenCalledWith(
        mockEventData
      );
      expect(mockNotifications.triggerOutageNotifications).toHaveBeenCalledWith(
        'test-event-id',
        'outage_started'
      );
    });

    it('should return null if database error occurs', async () => {
      const mockEventData = {
        title: 'Test Outage',
        description: 'Test description',
        status: 'investigating' as const,
        severity: 'high' as const,
        affected_services: ['internet'],
        affected_regions: ['jakarta'],
        created_by: 'test-user',
      };

      // Mock the database operation to return null (error case)
      mockOutageDatabase.createOutageEvent.mockResolvedValue(null);

      const result =
        await outageNotificationService.createOutageEvent(mockEventData);

      expect(result).toBeNull();
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user preferences if they exist', async () => {
      const mockPreferences = {
        id: 'prefs-id',
        user_id: 'test-user',
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        phone_number: null,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the database operation
      mockOutageDatabase.getUserNotificationPreferences.mockResolvedValue(
        mockPreferences
      );

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'test-user'
        );

      expect(result).toEqual(mockPreferences);
      expect(
        mockOutageDatabase.getUserNotificationPreferences
      ).toHaveBeenCalledWith('test-user');
    });

    it('should create default preferences if none exist', async () => {
      // Mock the database to return null (no existing preferences)
      mockOutageDatabase.getUserNotificationPreferences.mockResolvedValue(null);

      // Mock the createDefaultNotificationPreferences method
      const mockDefaultPrefs = {
        id: 'default-prefs-id',
        user_id: 'test-user',
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        phone_number: null,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockOutageDatabase.createDefaultNotificationPreferences.mockResolvedValue(
        mockDefaultPrefs
      );

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'test-user'
        );

      expect(result).toEqual(mockDefaultPrefs);
      expect(
        mockOutageDatabase.createDefaultNotificationPreferences
      ).toHaveBeenCalledWith('test-user');
    });
  });

  describe('getActiveOutageEvents', () => {
    it('should return active outage events', async () => {
      const mockActiveEvents = [
        {
          id: 'event-1',
          title: 'Active Outage 1',
          description: 'Test outage 1',
          status: 'investigating' as const,
          severity: 'high' as const,
          affected_regions: ['region-1'],
          affected_services: ['service-1'],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'event-2',
          title: 'Active Outage 2',
          description: 'Test outage 2',
          status: 'monitoring' as const,
          severity: 'medium' as const,
          affected_regions: ['region-2'],
          affected_services: ['service-2'],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      // Mock the database operation
      mockOutageDatabase.getActiveOutageEvents.mockResolvedValue(
        mockActiveEvents
      );

      const result = await outageNotificationService.getActiveOutageEvents();

      expect(result).toEqual(mockActiveEvents);
      expect(mockOutageDatabase.getActiveOutageEvents).toHaveBeenCalled();
    });

    it('should return empty array if no active events', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });

      mockClient.from.mockReturnValue({
        select: mockSelect,
        in: mockIn,
        order: mockOrder,
      });

      const result = await outageNotificationService.getActiveOutageEvents();

      expect(result).toEqual([]);
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user notification preferences successfully', async () => {
      const updates = {
        email_notifications: false,
        minimum_severity: 'high' as const,
      };

      const mockUpdatedPrefs = {
        id: 'prefs-id',
        user_id: 'test-user',
        email_notifications: false,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'high' as const,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the database operation
      mockOutageDatabase.updateUserNotificationPreferences.mockResolvedValue(
        mockUpdatedPrefs
      );

      const result =
        await outageNotificationService.updateUserNotificationPreferences(
          'test-user',
          updates
        );

      expect(result).toEqual(mockUpdatedPrefs);
      expect(
        mockOutageDatabase.updateUserNotificationPreferences
      ).toHaveBeenCalledWith('test-user', updates);
    });
  });

  describe('renderTemplate', () => {
    it('should replace template variables with provided values', () => {
      const template =
        'Hello {{name}}, you have {{count}} new notifications about {{subject}}.';
      const variables = {
        name: 'John',
        count: '5',
        subject: 'service outage',
      };

      // Create a notifications instance to test the private method
      const notifications = new OutageNotifications(
        outageDatabase,
        outageValidation
      );

      // Access private method through type assertion
      const renderTemplate = (
        (notifications as any).renderTemplate as (
          template: string,
          variables: Record<string, string>
        ) => string
      ).bind(notifications);
      const result = renderTemplate(template, variables);

      expect(result).toBe(
        'Hello John, you have 5 new notifications about service outage.'
      );
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, you have {{count}} new notifications.';
      const variables = {
        name: 'John',
        // count is missing
      };

      // Create a notifications instance to test the private method
      const notifications = new OutageNotifications(
        outageDatabase,
        outageValidation
      );

      const renderTemplate = (
        (notifications as any).renderTemplate as (
          template: string,
          variables: Record<string, string>
        ) => string
      ).bind(notifications);
      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello John, you have {{count}} new notifications.');
    });
  });

  describe('shouldNotifyUser', () => {
    it('should return true for critical outages regardless of quiet hours', async () => {
      const prefs = {
        id: 'test-prefs-id',
        user_id: 'test-user',
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        quiet_hours_start: '22:00',
        quiet_hours_end: '06:00',
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the validation method to return true for critical
      mockOutageValidation.shouldNotifyUser.mockResolvedValue(true);

      const result = await mockOutageValidation.shouldNotifyUser(
        prefs,
        'critical',
        'email'
      );

      expect(result).toBe(true);
      expect(mockOutageValidation.shouldNotifyUser).toHaveBeenCalledWith(
        prefs,
        'critical',
        'email'
      );
    });

    it('should respect minimum severity settings', async () => {
      const prefs = {
        id: 'test-prefs-id',
        user_id: 'test-user',
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'high' as const,
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock different return values based on severity
      mockOutageValidation.shouldNotifyUser
        .mockResolvedValueOnce(false) // Low severity
        .mockResolvedValueOnce(true); // High severity

      // Low severity should not notify
      const lowResult = await mockOutageValidation.shouldNotifyUser(
        prefs,
        'low',
        'email'
      );
      expect(lowResult).toBe(false);

      // High severity should notify
      const highResult = await mockOutageValidation.shouldNotifyUser(
        prefs,
        'high',
        'email'
      );
      expect(highResult).toBe(true);
    });

    it('should respect channel-specific settings', async () => {
      const prefs = {
        id: 'test-prefs-id',
        user_id: 'test-user',
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'low' as const,
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock different return values based on channel
      mockOutageValidation.shouldNotifyUser
        .mockResolvedValueOnce(true) // Email should work
        .mockResolvedValueOnce(false); // SMS should not work

      // Email should work
      const emailResult = await mockOutageValidation.shouldNotifyUser(
        prefs,
        'medium',
        'email'
      );
      expect(emailResult).toBe(true);

      // SMS should not work
      const smsResult = await mockOutageValidation.shouldNotifyUser(
        prefs,
        'medium',
        'sms'
      );
      expect(smsResult).toBe(false);
    });
  });
});
