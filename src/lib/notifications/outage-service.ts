import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { Database } from '../database.types';

export interface OutageEvent {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_services: string[];
  affected_regions: string[];
  estimated_resolution?: string;
  actual_resolution?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  resolved_by?: string;
}

export interface OutageNotification {
  id: string;
  outage_event_id: string;
  user_id: string;
  notification_type: 'email' | 'sms' | 'in_app' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  recipient: string;
  message_content: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  created_at: string;
}

export interface CustomerNotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  phone_number?: string;
  outage_notifications: boolean;
  maintenance_notifications: boolean;
  billing_notifications: boolean;
  marketing_notifications: boolean;
  minimum_severity: 'low' | 'medium' | 'high' | 'critical';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
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

class OutageNotificationService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Create a new outage event
  async createOutageEvent(
    eventData: Omit<OutageEvent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Trigger notifications for the new outage
      await this.triggerOutageNotifications(data.id, 'outage_started');

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
    updates: Partial<OutageEvent>
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Trigger notifications for the update
      await this.triggerOutageNotifications(id, 'outage_updated');

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

      // If no preferences exist, create default ones
      if (!data) {
        return await this.createDefaultNotificationPreferences(userId);
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
        .insert([defaultPrefs])
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
    preferences: Partial<CustomerNotificationPreferences>
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

  // Trigger notifications for an outage event
  private async triggerOutageNotifications(
    outageEventId: string,
    notificationType: string
  ): Promise<void> {
    try {
      // Get the outage event details
      const { data: outageEvent, error: eventError } = await this.supabase
        .from('outage_events')
        .select('*')
        .eq('id', outageEventId)
        .single();

      if (eventError || !outageEvent) {
        throw new Error('Outage event not found');
      }

      // Get affected users
      const { data: affectedUsers, error: usersError } =
        await this.supabase.rpc('get_affected_users_for_outage', {
          outage_regions: outageEvent.affected_regions,
          outage_services: outageEvent.affected_services,
        });

      if (usersError) {
        throw usersError;
      }

      // Process each user
      for (const user of affectedUsers || []) {
        await this.processUserNotification(user, outageEvent, notificationType);
      }
    } catch (error) {
      logger.error('Error triggering outage notifications', error as Error, {
        action: 'triggerOutageNotifications',
        outageEventId,
        notificationType,
      });
    }
  }

  // Process notification for a single user
  private async processUserNotification(
    user: { user_id: string; email: string; phone?: string },
    outageEvent: OutageEvent,
    notificationType: string
  ): Promise<void> {
    try {
      // Get user preferences
      const prefs = await this.getUserNotificationPreferences(user.user_id);
      if (!prefs || !prefs.outage_notifications) {
        return;
      }

      // Check each notification channel
      const channels: Array<'email' | 'sms' | 'in_app' | 'push'> = [
        'email',
        'sms',
        'in_app',
        'push',
      ];

      for (const channel of channels) {
        if (await this.shouldNotifyUser(prefs, outageEvent.severity, channel)) {
          await this.sendNotification(
            user,
            outageEvent,
            notificationType,
            channel
          );
        }
      }
    } catch (error) {
      logger.error('Error processing user notification', error as Error, {
        action: 'processUserNotification',
        userId: user.user_id,
        outageEventId: outageEvent.id,
      });
    }
  }

  // Check if user should be notified based on preferences
  private async shouldNotifyUser(
    prefs: CustomerNotificationPreferences,
    severity: string,
    channel: string
  ): Promise<boolean> {
    // Check if notifications are enabled for this channel
    switch (channel) {
      case 'email':
        if (!prefs.email_notifications) return false;
        break;
      case 'sms':
        if (!prefs.sms_notifications || !prefs.phone_number) return false;
        break;
      case 'in_app':
        if (!prefs.in_app_notifications) return false;
        break;
      case 'push':
        if (!prefs.push_notifications) return false;
        break;
    }

    // Check minimum severity
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const userMinLevel = severityLevels[prefs.minimum_severity];
    const outageLevel = severityLevels[severity as keyof typeof severityLevels];

    if (outageLevel < userMinLevel) {
      return false;
    }

    // Check quiet hours (skip for critical outages)
    if (
      severity !== 'critical' &&
      prefs.quiet_hours_start &&
      prefs.quiet_hours_end
    ) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Simple quiet hours check - this could be enhanced with timezone handling
      if (
        currentTime >= prefs.quiet_hours_start &&
        currentTime <= prefs.quiet_hours_end
      ) {
        return false;
      }
    }

    return true;
  }

  // Send notification to user
  private async sendNotification(
    user: { user_id: string; email: string; phone?: string },
    outageEvent: OutageEvent,
    notificationType: string,
    channel: 'email' | 'sms' | 'in_app' | 'push'
  ): Promise<void> {
    try {
      // Get notification template
      const template = await this.getNotificationTemplate(
        notificationType,
        channel
      );
      if (!template) {
        logger.warn('No template found for notification', {
          notificationType,
          channel,
        });
        return;
      }

      // Prepare template variables
      const variables = {
        title: outageEvent.title,
        severity: outageEvent.severity,
        services: outageEvent.affected_services.join(', '),
        description: outageEvent.description,
        estimated_resolution: outageEvent.estimated_resolution
          ? new Date(outageEvent.estimated_resolution).toLocaleString()
          : 'Unknown',
        resolution_time: outageEvent.actual_resolution
          ? new Date(outageEvent.actual_resolution).toLocaleString()
          : '',
        status_page_url: `${import.meta.env.PUBLIC_SITE_URL}/status`,
      };

      // Render message template
      const messageContent = this.renderTemplate(
        template.message_template,
        variables
      );
      const recipient = channel === 'email' ? user.email : user.phone || '';

      // Create notification record
      const { data: notification, error: notificationError } =
        await this.supabase
          .from('outage_notifications')
          .insert([
            {
              outage_event_id: outageEvent.id,
              user_id: user.user_id,
              notification_type: channel,
              status: 'pending',
              recipient,
              message_content: messageContent,
            },
          ])
          .select()
          .single();

      if (notificationError) {
        throw notificationError;
      }

      // Send the notification based on channel
      if (notification) {
        await this.deliverNotification(
          notification,
          template.subject_template,
          variables
        );
      }
    } catch (error) {
      logger.error('Error sending notification', error as Error, {
        action: 'sendNotification',
        userId: user.user_id,
        outageEventId: outageEvent.id,
        channel,
      });
    }
  }

  // Deliver notification via appropriate channel
  private async deliverNotification(
    notification: OutageNotification,
    _subjectTemplate?: string | null,
    _variables?: Record<string, string>
  ): Promise<void> {
    try {
      let success = false;
      let errorMessage: string | undefined;

      switch (notification.notification_type) {
        case 'email':
          // Email delivery would be implemented here
          // For now, we'll simulate success
          success = true;
          break;
        case 'sms':
          // SMS delivery would be implemented here
          // For now, we'll simulate success
          success = true;
          break;
        case 'in_app':
          // In-app notifications are handled by real-time subscriptions
          success = true;
          break;
        case 'push':
          // Push notifications would be implemented here
          // For now, we'll simulate success
          success = true;
          break;
        default:
          // Unknown notification type
          success = false;
          errorMessage = 'Unknown notification type';
          break;
      }

      // Update notification status
      const updateData: Partial<OutageNotification> = {
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      };

      if (!success) {
        updateData.error_message = errorMessage || 'Unknown error';
      }

      await this.supabase
        .from('outage_notifications')
        .update(updateData)
        .eq('id', notification.id);
    } catch (error) {
      logger.error('Error delivering notification', error as Error, {
        action: 'deliverNotification',
        notificationId: notification.id,
      });
    }
  }

  // Render template with variables
  private renderTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    return rendered;
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    limit = 20,
    _unreadOnly = false
  ): Promise<OutageNotification[]> {
    try {
      const query = this.supabase
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

      // Note: In a real implementation, you'd add a read/unread field to notifications
      // For now, we'll return all notifications

      const { data, error } = await query;

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

  // Mark notification as read
  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // In a real implementation, you'd add an is_read field and update it
      // For now, we'll just return success
      return true;
    } catch (error) {
      logger.error('Error marking notification as read', error as Error, {
        action: 'markNotificationAsRead',
        notificationId,
        userId,
      });
      return false;
    }
  }
}

export const outageNotificationService = new OutageNotificationService();
