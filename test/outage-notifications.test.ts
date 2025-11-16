import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing the service
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

// Import after mocking
import { outageNotificationService } from '../src/lib/notifications/outage-service';
import { createClient } from '@supabase/supabase-js';

// Get the mock functions
const mockCreateClient = vi.mocked(createClient);

// Mock Supabase client interface
interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
}

describe('OutageNotificationService', () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock client for each test
    mockClient = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockCreateClient.mockReturnValue(mockClient);

    // Replace the supabase client on the service instance
    (outageNotificationService as { supabase: MockSupabaseClient }).supabase =
      mockClient;
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

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockCreatedEvent, error: null });

      mockClient.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      // Mock the notification trigger
      vi.spyOn(
        outageNotificationService as {
          triggerOutageNotifications: () => Promise<void>;
        },
        'triggerOutageNotifications'
      ).mockResolvedValue(undefined);

      const result =
        await outageNotificationService.createOutageEvent(mockEventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockInsert).toHaveBeenCalledWith([mockEventData]);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
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

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Database error') });

      mockClient.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

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
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockPreferences, error: null });

      mockClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'test-user'
        );

      expect(result).toEqual(mockPreferences);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user');
    });

    it('should create default preferences if none exist', async () => {
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
      });

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
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(
        outageNotificationService,
        'createDefaultNotificationPreferences'
      ).mockResolvedValue(mockDefaultPrefs);

      const result =
        await outageNotificationService.getUserNotificationPreferences(
          'test-user'
        );

      expect(result).toEqual(mockDefaultPrefs);
      expect(
        outageNotificationService.createDefaultNotificationPreferences
      ).toHaveBeenCalledWith('test-user');
    });
  });

  describe('getActiveOutageEvents', () => {
    it('should return active outage events', async () => {
      const mockActiveEvents = [
        {
          id: 'event-1',
          title: 'Active Outage 1',
          status: 'investigating',
          severity: 'high',
          created_at: new Date().toISOString(),
        },
        {
          id: 'event-2',
          title: 'Active Outage 2',
          status: 'monitoring',
          severity: 'medium',
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi
        .fn()
        .mockResolvedValue({ data: mockActiveEvents, error: null });

      mockClient.from.mockReturnValue({
        select: mockSelect,
        in: mockIn,
        order: mockOrder,
      });

      const result = await outageNotificationService.getActiveOutageEvents();

      expect(result).toEqual(mockActiveEvents);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockIn).toHaveBeenCalledWith('status', [
        'investigating',
        'identified',
        'monitoring',
      ]);
      expect(mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
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

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockUpdatedPrefs, error: null });

      mockClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result =
        await outageNotificationService.updateUserNotificationPreferences(
          'test-user',
          updates
        );

      expect(result).toEqual(mockUpdatedPrefs);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user');
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

      // Access private method through type assertion
      const renderTemplate = (
        outageNotificationService as {
          renderTemplate: (
            template: string,
            variables: Record<string, string>
          ) => string;
        }
      ).renderTemplate.bind(outageNotificationService);
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

      const renderTemplate = (
        outageNotificationService as {
          renderTemplate: (
            template: string,
            variables: Record<string, string>
          ) => string;
        }
      ).renderTemplate.bind(outageNotificationService);
      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello John, you have {{count}} new notifications.');
    });
  });

  describe('shouldNotifyUser', () => {
    it('should return true for critical outages regardless of quiet hours', async () => {
      const prefs = {
        email_notifications: true,
        outage_notifications: true,
        minimum_severity: 'medium' as const,
        quiet_hours_start: '22:00',
        quiet_hours_end: '06:00',
      };

      const shouldNotify = (
        outageNotificationService as {
          shouldNotifyUser: (
            prefs: Record<string, unknown>,
            severity: string,
            channel: string
          ) => Promise<boolean>;
        }
      ).shouldNotifyUser.bind(outageNotificationService);
      const result = await shouldNotify(prefs, 'critical', 'email');

      expect(result).toBe(true);
    });

    it('should respect minimum severity settings', async () => {
      const prefs = {
        email_notifications: true,
        outage_notifications: true,
        minimum_severity: 'high' as const,
      };

      const shouldNotify = (
        outageNotificationService as {
          shouldNotifyUser: (
            prefs: Record<string, unknown>,
            severity: string,
            channel: string
          ) => Promise<boolean>;
        }
      ).shouldNotifyUser.bind(outageNotificationService);

      // Low severity should not notify
      const lowResult = await shouldNotify(prefs, 'low', 'email');
      expect(lowResult).toBe(false);

      // High severity should notify
      const highResult = await shouldNotify(prefs, 'high', 'email');
      expect(highResult).toBe(true);
    });

    it('should respect channel-specific settings', async () => {
      const prefs = {
        email_notifications: true,
        sms_notifications: false,
        outage_notifications: true,
        minimum_severity: 'low' as const,
      };

      const shouldNotify = (
        outageNotificationService as {
          shouldNotifyUser: (
            prefs: Record<string, unknown>,
            severity: string,
            channel: string
          ) => Promise<boolean>;
        }
      ).shouldNotifyUser.bind(outageNotificationService);

      // Email should work
      const emailResult = await shouldNotify(prefs, 'medium', 'email');
      expect(emailResult).toBe(true);

      // SMS should not work
      const smsResult = await shouldNotify(prefs, 'medium', 'sms');
      expect(smsResult).toBe(false);
    });
  });
});
