import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { Database } from '../database.types';

// Re-export types from database for clarity
export type OutageEvent = Database['public']['Tables']['outage_events']['Row'];
export type OutageNotification =
  Database['public']['Tables']['outage_notifications']['Row'];
export type CustomerNotificationPreferences =
  Database['public']['Tables']['customer_notification_preferences']['Row'];
export type NotificationTemplate =
  Database['public']['Tables']['notification_templates']['Row'];

// Helper types for insert/update operations
export type OutageEventInsert =
  Database['public']['Tables']['outage_events']['Insert'];
export type OutageEventUpdate =
  Database['public']['Tables']['outage_events']['Update'];
export type OutageNotificationInsert =
  Database['public']['Tables']['outage_notifications']['Insert'];
export type OutageNotificationUpdate =
  Database['public']['Tables']['outage_notifications']['Update'];
export type CustomerNotificationPreferencesInsert =
  Database['public']['Tables']['customer_notification_preferences']['Insert'];
export type CustomerNotificationPreferencesUpdate =
  Database['public']['Tables']['customer_notification_preferences']['Update'];

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
    eventData: OutageEventInsert
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        // @ts-expect-error - TypeScript infers never types for Supabase operations
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Trigger notifications for the new outage
      await this.triggerOutageNotifications(
        (data as OutageEvent).id,
        'outage_started'
      );

      return data as OutageEvent;
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
    updates: OutageEventUpdate
  ): Promise<OutageEvent | null> {
    try {
      const { data, error } = await this.supabase
        .from('outage_events')
        // @ts-expect-error - TypeScript infers never types for Supabase operations
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Trigger notifications for the update
      await this.triggerOutageNotifications(id, 'outage_updated');

      return data as OutageEvent;
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
      const defaultPrefs: CustomerNotificationPreferencesInsert = {
        user_id: userId,
        email_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        push_notifications: false,
        outage_notifications: true,
        maintenance_notifications: true,
        billing_notifications: true,
        marketing_notifications: false,
        minimum_severity: 'medium',
        timezone: 'UTC',
      };

      const { data, error } = await this.supabase
        .from('customer_notification_preferences')
        // @ts-expect-error - TypeScript infers never types for Supabase operations
        .insert([defaultPrefs])
        .select()
        .single();

      if (error) throw error;
      return data as CustomerNotificationPreferences;
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
    preferences: CustomerNotificationPreferencesUpdate
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('customer_notification_preferences')
        // @ts-expect-error - TypeScript infers never types for Supabase operations
        .update({
          ...(preferences as any),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerNotificationPreferences;
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
        await this.supabase.rpc(
          // @ts-expect-error - TypeScript infers never types for Supabase operations
          'get_affected_users_for_outage',
          // @ts-expect-error - TypeScript infers never types for Supabase operations
          {
            outage_regions: (outageEvent as any).affected_regions,
            outage_services: (outageEvent as any).affected_services,
          }
        );

      if (usersError) {
        throw usersError;
      }

      // Process each user - type the response as any since RPC function isn't typed
      const users =
        (affectedUsers as Array<{
          user_id: string;
          email: string;
          phone?: string;
        }>) || [];
      for (const user of users) {
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
      const notificationData: OutageNotificationInsert = {
        outage_event_id: outageEvent.id,
        user_id: user.user_id,
        notification_type: channel,
        status: 'pending',
        recipient,
        message_content: messageContent,
      };

      const { data: notification, error: notificationError } =
        await this.supabase
          .from('outage_notifications')
          // @ts-expect-error - TypeScript infers never types for Supabase operations
          .insert([notificationData])
          .select()
          .single();

      if (notificationError) {
        throw notificationError;
      }

      // Send the notification based on channel
      if (notification) {
        await this.deliverNotification(
          notification as OutageNotification,
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
      const updateData: OutageNotificationUpdate = {
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      };

      if (!success) {
        (updateData as any).error_message = errorMessage || 'Unknown error';
      }

      await this.supabase
        .from('outage_notifications')
        // @ts-expect-error - TypeScript infers never types for Supabase operations
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
    _notificationId: string,
    _userId: string
  ): Promise<boolean> {
    // In a real implementation, you'd add an is_read field and update it
    // For now, we'll just return success
    return true;
  }
}

export const outageNotificationService = new OutageNotificationService();
