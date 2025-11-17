import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { Database } from '../../database.types';

export type OutageEvent = Database['public']['Tables']['outage_events']['Row'];
export type OutageNotification =
  Database['public']['Tables']['outage_notifications']['Row'];
export type CustomerNotificationPreferences =
  Database['public']['Tables']['customer_notification_preferences']['Row'];

export class OutageDatabase {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Create a new outage event
  async createOutageEvent(
    eventData: Database['public']['Tables']['outage_events']['Insert']
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating outage event', error as Error, {
        action: 'createOutageEvent',
        eventData: eventData.title,
      });
      return null;
    }
  }

  // Update an existing outage event
  async updateOutageEvent(
    id: string,
    updates: Database['public']['Tables']['outage_events']['Update']
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating outage event', error as Error, {
        action: 'updateOutageEvent',
        eventId: id,
      });
      return null;
    }
  }

  // Get active outage events
  async getActiveOutageEvents(): Promise<OutageEvent[]> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .select('*')
        .in('status', ['investigating', 'identified', 'monitoring'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching active outage events', error as Error, {
        action: 'getActiveOutageEvents',
      });
      return [];
    }
  }

  // Get all outage events
  async getAllOutageEvents(limit = 50): Promise<OutageEvent[]> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching all outage events', error as Error, {
        action: 'getAllOutageEvents',
      });
      return [];
    }
  }

  // Get user notification preferences
  async getUserNotificationPreferences(
    userId: string
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('customer_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(
        'Error fetching user notification preferences',
        error as Error,
        {
          action: 'getUserNotificationPreferences',
          userId,
        }
      );
      return null;
    }
  }

  // Create default notification preferences for a user
  async createDefaultNotificationPreferences(
    userId: string
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      const defaultPrefs = {
        user_id: userId,
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'medium' as const,
        timezone: 'UTC',
      };

      const { data, error } = await this.supabase
        .from('customer_notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(
        'Error creating default notification preferences',
        error as Error,
        {
          action: 'createDefaultNotificationPreferences',
          userId,
        }
      );
      return null;
    }
  }

  // Update user notification preferences
  async updateUserNotificationPreferences(
    userId: string,
    preferences: Database['public']['Tables']['customer_notification_preferences']['Update']
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('customer_notification_preferences')
        .update({ ...preferences, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(
        'Error updating user notification preferences',
        error as Error,
        {
          action: 'updateUserNotificationPreferences',
          userId,
        }
      );
      return null;
    }
  }

  // Get notification template
  async getNotificationTemplate(
    type: string,
    channel: string
  ): Promise<NotificationTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('channel', channel)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching notification template', error as Error, {
        action: 'getNotificationTemplate',
        type,
        channel,
      });
      return null;
    }
  }

  // Get affected users for an outage
  async getAffectedUsersForOutage(
    outageRegions: string[],
    outageServices: string[]
  ): Promise<{ user_id: string; email: string; phone?: string }[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_affected_users_for_outage',
        {
          outage_regions: outageRegions,
          outage_services: outageServices,
        }
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting affected users for outage', error as Error, {
        action: 'getAffectedUsersForOutage',
        outageRegions,
        outageServices,
      });
      return [];
    }
  }

  // Create notification record
  async createNotificationRecord(
    notificationData: Database['public']['Tables']['outage_notifications']['Insert']
  ): Promise<OutageNotification | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating notification record', error as Error, {
        action: 'createNotificationRecord',
      });
      return null;
    }
  }

  // Update notification status
  async updateNotificationStatus(
    notificationId: string,
    updateData: Database['public']['Tables']['outage_notifications']['Update']
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('outage_notifications')
        .update(updateData)
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error updating notification status', error as Error, {
        action: 'updateNotificationStatus',
        notificationId,
      });
      return false;
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    limit = 20
  ): Promise<OutageNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('outage_notifications')
        .select(
          `
          *,
          outage_events (
            title,
            severity,
            status
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user notifications', error as Error, {
        action: 'getUserNotifications',
        userId,
      });
      return [];
    }
  }

  // Get outage event by ID
  async getOutageEventById(id: string): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching outage event by ID', error as Error, {
        action: 'getOutageEventById',
        eventId: id,
      });
      return null;
    }
  }
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type:
    | 'outage_started'
    | 'outage_updated'
    | 'outage_resolved'
    | 'maintenance_scheduled';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  subject_template?: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const outageDatabase = new OutageDatabase();
