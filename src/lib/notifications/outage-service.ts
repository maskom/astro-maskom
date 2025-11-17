import { logger } from '../logger';
import type { Database } from '../database.types';
import {
  outageDatabase,
  type OutageEvent,
  type OutageNotification,
  type CustomerNotificationPreferences,
} from './outage-database';
import { outageValidation } from './outage-validation';
import { OutageNotifications } from './outage-notifications';

// Re-export types for backward compatibility
export type {
  OutageEvent,
  OutageNotification,
  CustomerNotificationPreferences,
} from './outage-database';
export type { NotificationTemplate } from './outage-database';

class OutageNotificationService {
  private notifications: OutageNotifications;

  constructor() {
    this.notifications = new OutageNotifications(
      outageDatabase,
      outageValidation
    );
  }

  // Create a new outage event
  async createOutageEvent(
    eventData: Database['public']['Tables']['outage_events']['Insert']
  ): Promise<OutageEvent | null> {
    try {
      // Validate event data
      const validation = outageValidation.validateOutageEventData(eventData);
      if (!validation.isValid) {
        logger.error(
          'Invalid outage event data',
          new Error('Validation failed'),
          {
            action: 'createOutageEvent',
            errors: JSON.stringify(validation.errors),
          }
        );
        return null;
      }

      // Create outage event
      const data = await outageDatabase.createOutageEvent(eventData);
      if (!data) {
        return null;
      }

      // Trigger notifications for the new outage
      await this.notifications.triggerOutageNotifications(
        data.id,
        'outage_started'
      );

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
      // Validate update data
      const validation = outageValidation.validateOutageEventData({
        ...updates,
        id,
      });
      if (!validation.isValid) {
        logger.error(
          'Invalid outage event update data',
          new Error('Validation failed'),
          {
            action: 'updateOutageEvent',
            errors: JSON.stringify(validation.errors),
          }
        );
        return null;
      }

      // Update outage event
      const data = await outageDatabase.updateOutageEvent(id, updates);
      if (!data) {
        return null;
      }

      // Trigger notifications for the update
      await this.notifications.triggerOutageNotifications(id, 'outage_updated');

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
    return await outageDatabase.getActiveOutageEvents();
  }

  // Get all outage events
  async getAllOutageEvents(limit = 50): Promise<OutageEvent[]> {
    return await outageDatabase.getAllOutageEvents(limit);
  }

  // Get user notification preferences
  async getUserNotificationPreferences(
    userId: string
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      const prefs = await outageDatabase.getUserNotificationPreferences(userId);

      // If no preferences exist, create default ones
      if (!prefs) {
        return await outageDatabase.createDefaultNotificationPreferences(
          userId
        );
      }

      return prefs;
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
    return await outageDatabase.createDefaultNotificationPreferences(userId);
  }

  // Update user notification preferences
  async updateUserNotificationPreferences(
    userId: string,
    preferences: Database['public']['Tables']['customer_notification_preferences']['Update']
  ): Promise<CustomerNotificationPreferences | null> {
    try {
      // Validate preferences
      const validation = outageValidation.validateNotificationPreferences({
        ...preferences,
        user_id: userId,
      });
      if (!validation.isValid) {
        logger.error(
          'Invalid notification preferences',
          new Error('Validation failed'),
          {
            action: 'updateUserNotificationPreferences',
            errors: JSON.stringify(validation.errors),
          }
        );
        return null;
      }

      return await outageDatabase.updateUserNotificationPreferences(
        userId,
        preferences
      );
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
  async getNotificationTemplate(type: string, channel: string) {
    return await outageDatabase.getNotificationTemplate(type, channel);
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    limit = 20,
    _unreadOnly = false
  ): Promise<OutageNotification[]> {
    try {
      const notifications = await outageDatabase.getUserNotifications(
        userId,
        limit
      );

      // Note: In a real implementation, you'd add a read/unread field to notifications
      // For now, we'll return all notifications
      return notifications;
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
    return await this.notifications.markNotificationAsRead(
      notificationId,
      userId
    );
  }

  // Get notification statistics
  async getNotificationStatistics(outageEventId?: string) {
    return await this.notifications.getNotificationStatistics(outageEventId);
  }

  // Resolve an outage event
  async resolveOutageEvent(
    id: string,
    resolutionData?: {
      actual_resolution?: string;
      resolution_notes?: string;
    }
  ): Promise<OutageEvent | null> {
    try {
      const updates: Database['public']['Tables']['outage_events']['Update'] = {
        status: 'resolved',
        updated_at: new Date().toISOString(),
      };

      if (resolutionData?.actual_resolution) {
        updates.actual_resolution = resolutionData.actual_resolution;
      }

      if (resolutionData?.resolution_notes) {
        updates.resolution_notes = resolutionData.resolution_notes;
      }

      const data = await outageDatabase.updateOutageEvent(id, updates);
      if (!data) {
        return null;
      }

      // Trigger notifications for the resolution
      await this.notifications.triggerOutageNotifications(
        id,
        'outage_resolved'
      );

      return data;
    } catch (error) {
      logger.error('Error resolving outage event', error as Error, {
        action: 'resolveOutageEvent',
        eventId: id,
      });
      return null;
    }
  }

  // Get outage event by ID
  async getOutageEventById(id: string): Promise<OutageEvent | null> {
    return await outageDatabase.getOutageEventById(id);
  }

  // Create notification template
  async createNotificationTemplate(templateData: any) {
    try {
      // Validate template data
      const validation =
        outageValidation.validateNotificationTemplate(templateData);
      if (!validation.isValid) {
        logger.error(
          'Invalid notification template',
          new Error('Validation failed'),
          {
            action: 'createNotificationTemplate',
            errors: JSON.stringify(validation.errors),
          }
        );
        return null;
      }

      // This would create a template in the database
      // For now, we'll just log and return success
      logger.info('Creating notification template', {
        action: 'createNotificationTemplate',
        templateName: templateData.name,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error creating notification template', error as Error, {
        action: 'createNotificationTemplate',
      });
      return null;
    }
  }

  // Update notification template
  async updateNotificationTemplate(templateId: string, updateData: any) {
    try {
      // Validate update data
      const validation =
        outageValidation.validateNotificationTemplate(updateData);
      if (!validation.isValid) {
        logger.error(
          'Invalid notification template update',
          new Error('Validation failed'),
          {
            action: 'updateNotificationTemplate',
            errors: JSON.stringify(validation.errors),
          }
        );
        return null;
      }

      // This would update a template in the database
      // For now, we'll just log and return success
      logger.info('Updating notification template', {
        action: 'updateNotificationTemplate',
        templateId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error updating notification template', error as Error, {
        action: 'updateNotificationTemplate',
        templateId,
      });
      return null;
    }
  }
}

export const outageNotificationService = new OutageNotificationService();
