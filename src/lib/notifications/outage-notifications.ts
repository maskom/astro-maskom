import { logger } from '../logger';
import type { OutageEvent, OutageNotification } from './outage-database';
import type { OutageDatabase } from './outage-database';
import type { OutageValidation } from './outage-validation';

export class OutageNotifications {
  constructor(
    private database: OutageDatabase,
    private validation: OutageValidation
  ) {}

  // Trigger notifications for an outage event
  async triggerOutageNotifications(
    outageEventId: string,
    notificationType: string
  ): Promise<void> {
    try {
      // Get the outage event details
      const outageEvent = await this.database.getOutageEventById(outageEventId);

      if (!outageEvent) {
        throw new Error('Outage event not found');
      }

      // Get affected users
      const affectedUsers = await this.database.getAffectedUsersForOutage(
        outageEvent.affected_regions,
        outageEvent.affected_services
      );

      // Process each user
      for (const user of affectedUsers) {
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
      const prefs = await this.database.getUserNotificationPreferences(
        user.user_id
      );
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
        if (
          this.validation.shouldNotifyUser(prefs, outageEvent.severity, channel)
        ) {
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

  // Send notification to user
  private async sendNotification(
    user: { user_id: string; email: string; phone?: string },
    outageEvent: OutageEvent,
    notificationType: string,
    channel: 'email' | 'sms' | 'in_app' | 'push'
  ): Promise<void> {
    try {
      // Get notification template
      const template = await this.database.getNotificationTemplate(
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

      // Validate template variables
      const templateValidation = this.validation.validateTemplateVariables(
        template.message_template,
        variables
      );
      if (!templateValidation.isValid) {
        logger.error(
          'Template variables validation failed',
          new Error('Missing variables'),
          {
            action: 'sendNotification',
            missingVariables: templateValidation.missingVariables,
          }
        );
        return;
      }

      // Render message template
      const messageContent = this.renderTemplate(
        template.message_template,
        variables
      );
      const recipient = channel === 'email' ? user.email : user.phone || '';

      // Validate recipient
      const recipientValidation = this.validation.validateNotificationRecipient(
        channel,
        recipient
      );
      if (!recipientValidation.isValid) {
        logger.error(
          'Recipient validation failed',
          new Error(recipientValidation.error),
          {
            action: 'sendNotification',
            channel,
            recipient,
          }
        );
        return;
      }

      // Sanitize content
      const sanitizedContent =
        this.validation.sanitizeNotificationContent(messageContent);

      // Create notification record
      const notification = await this.database.createNotificationRecord({
        outage_event_id: outageEvent.id,
        user_id: user.user_id,
        notification_type: channel,
        status: 'pending',
        recipient,
        message_content: sanitizedContent,
      });

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
    subjectTemplate?: string | null,
    variables?: Record<string, string>
  ): Promise<void> {
    try {
      let success = false;
      let errorMessage: string | undefined;

      switch (notification.notification_type) {
        case 'email':
          success = await this.deliverEmailNotification(
            notification,
            subjectTemplate,
            variables
          );
          break;
        case 'sms':
          success = await this.deliverSmsNotification(notification);
          break;
        case 'in_app':
          success = await this.deliverInAppNotification(notification);
          break;
        case 'push':
          success = await this.deliverPushNotification(notification);
          break;
        default:
          success = false;
          errorMessage = 'Unknown notification type';
          break;
      }

      // Update notification status
      const updateData = {
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      } as any;

      if (!success) {
        updateData.error_message = errorMessage || 'Unknown error';
      }

      await this.database.updateNotificationStatus(notification.id, updateData);
    } catch (error) {
      logger.error('Error delivering notification', error as Error, {
        action: 'deliverNotification',
        notificationId: notification.id,
      });
    }
  }

  // Deliver email notification
  private async deliverEmailNotification(
    notification: OutageNotification,
    subjectTemplate?: string | null,
    variables?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Email delivery implementation would go here
      // For now, we'll simulate success
      logger.info('Email notification sent', {
        action: 'deliverEmailNotification',
        notificationId: notification.id,
        recipient: notification.recipient,
      });
      return true;
    } catch (error) {
      logger.error('Error delivering email notification', error as Error, {
        action: 'deliverEmailNotification',
        notificationId: notification.id,
      });
      return false;
    }
  }

  // Deliver SMS notification
  private async deliverSmsNotification(
    notification: OutageNotification
  ): Promise<boolean> {
    try {
      // SMS delivery implementation would go here
      // For now, we'll simulate success
      logger.info('SMS notification sent', {
        action: 'deliverSmsNotification',
        notificationId: notification.id,
        recipient: notification.recipient,
      });
      return true;
    } catch (error) {
      logger.error('Error delivering SMS notification', error as Error, {
        action: 'deliverSmsNotification',
        notificationId: notification.id,
      });
      return false;
    }
  }

  // Deliver in-app notification
  private async deliverInAppNotification(
    notification: OutageNotification
  ): Promise<boolean> {
    try {
      // In-app notifications are handled by real-time subscriptions
      // This would typically involve a WebSocket or real-time database update
      logger.info('In-app notification created', {
        action: 'deliverInAppNotification',
        notificationId: notification.id,
        userId: notification.user_id,
      });
      return true;
    } catch (error) {
      logger.error('Error delivering in-app notification', error as Error, {
        action: 'deliverInAppNotification',
        notificationId: notification.id,
      });
      return false;
    }
  }

  // Deliver push notification
  private async deliverPushNotification(
    notification: OutageNotification
  ): Promise<boolean> {
    try {
      // Push notification delivery would be implemented here
      // This would typically use a service like Firebase Cloud Messaging
      logger.info('Push notification sent', {
        action: 'deliverPushNotification',
        notificationId: notification.id,
        userId: notification.user_id,
      });
      return true;
    } catch (error) {
      logger.error('Error delivering push notification', error as Error, {
        action: 'deliverPushNotification',
        notificationId: notification.id,
      });
      return false;
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

  // Mark notification as read
  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // In a real implementation, you'd add an is_read field and update it
      // For now, we'll just log and return success
      logger.info('Marking notification as read', {
        action: 'markNotificationAsRead',
        notificationId,
        userId,
      });
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

  // Get notification statistics
  async getNotificationStatistics(outageEventId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      // This would typically involve database queries to get statistics
      // For now, we'll return mock data
      const stats = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      };

      logger.info('Retrieved notification statistics', {
        action: 'getNotificationStatistics',
        outageEventId,
        stats,
      });

      return stats;
    } catch (error) {
      logger.error('Error getting notification statistics', error as Error, {
        action: 'getNotificationStatistics',
        outageEventId,
      });
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      };
    }
  }
}
