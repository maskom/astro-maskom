import { logger } from '../logger';
import type { CustomerNotificationPreferences } from './outage-database';

export class OutageValidation {
  // Validate outage event data
  validateOutageEventData(eventData: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!eventData.title || typeof eventData.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (!eventData.description || typeof eventData.description !== 'string') {
      errors.push('Description is required and must be a string');
    }

    if (
      !eventData.severity ||
      !['low', 'medium', 'high', 'critical'].includes(eventData.severity)
    ) {
      errors.push(
        'Severity is required and must be one of: low, medium, high, critical'
      );
    }

    if (
      !eventData.status ||
      !['investigating', 'identified', 'monitoring', 'resolved'].includes(
        eventData.status
      )
    ) {
      errors.push(
        'Status is required and must be one of: investigating, identified, monitoring, resolved'
      );
    }

    if (
      !eventData.affected_regions ||
      !Array.isArray(eventData.affected_regions)
    ) {
      errors.push('Affected regions is required and must be an array');
    }

    if (
      !eventData.affected_services ||
      !Array.isArray(eventData.affected_services)
    ) {
      errors.push('Affected services is required and must be an array');
    }

    if (
      eventData.estimated_resolution &&
      isNaN(Date.parse(eventData.estimated_resolution))
    ) {
      errors.push('Estimated resolution must be a valid date');
    }

    if (
      eventData.actual_resolution &&
      isNaN(Date.parse(eventData.actual_resolution))
    ) {
      errors.push('Actual resolution must be a valid date');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate notification preferences
  validateNotificationPreferences(preferences: Record<string, unknown>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!preferences.user_id || typeof preferences.user_id !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    if (
      preferences.email_notifications !== undefined &&
      typeof preferences.email_notifications !== 'boolean'
    ) {
      errors.push('Email notifications must be a boolean');
    }

    if (
      preferences.sms_notifications !== undefined &&
      typeof preferences.sms_notifications !== 'boolean'
    ) {
      errors.push('SMS notifications must be a boolean');
    }

    if (
      preferences.in_app_notifications !== undefined &&
      typeof preferences.in_app_notifications !== 'boolean'
    ) {
      errors.push('In-app notifications must be a boolean');
    }

    if (
      preferences.push_notifications !== undefined &&
      typeof preferences.push_notifications !== 'boolean'
    ) {
      errors.push('Push notifications must be a boolean');
    }

    if (
      preferences.outage_notifications !== undefined &&
      typeof preferences.outage_notifications !== 'boolean'
    ) {
      errors.push('Outage notifications must be a boolean');
    }

    if (
      preferences.maintenance_notifications !== undefined &&
      typeof preferences.maintenance_notifications !== 'boolean'
    ) {
      errors.push('Maintenance notifications must be a boolean');
    }

    if (
      preferences.billing_notifications !== undefined &&
      typeof preferences.billing_notifications !== 'boolean'
    ) {
      errors.push('Billing notifications must be a boolean');
    }

    if (
      preferences.marketing_notifications !== undefined &&
      typeof preferences.marketing_notifications !== 'boolean'
    ) {
      errors.push('Marketing notifications must be a boolean');
    }

    if (
      preferences.minimum_severity &&
      typeof preferences.minimum_severity === 'string' &&
      !['low', 'medium', 'high', 'critical'].includes(
        preferences.minimum_severity
      )
    ) {
      errors.push(
        'Minimum severity must be one of: low, medium, high, critical'
      );
    }

    if (preferences.timezone && typeof preferences.timezone !== 'string') {
      errors.push('Timezone must be a string');
    }

    // Validate quiet hours format
    if (
      preferences.quiet_hours_start &&
      typeof preferences.quiet_hours_start === 'string' &&
      preferences.quiet_hours_start.trim() &&
      !this.isValidTimeFormat(preferences.quiet_hours_start)
    ) {
      errors.push('Quiet hours start must be in HH:MM format');
    }

    if (
      preferences.quiet_hours_end &&
      typeof preferences.quiet_hours_end === 'string' &&
      preferences.quiet_hours_end.trim() &&
      !this.isValidTimeFormat(preferences.quiet_hours_end)
    ) {
      errors.push('Quiet hours end must be in HH:MM format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate notification template
  validateNotificationTemplate(template: {
    name?: string;
    type?: string;
    channel?: string;
    subject_template?: string;
    message_template?: string;
    variables?: string[];
    is_active?: boolean;
  }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.name || typeof template.name !== 'string') {
      errors.push('Template name is required and must be a string');
    }

    if (
      !template.type ||
      ![
        'outage_started',
        'outage_updated',
        'outage_resolved',
        'maintenance_scheduled',
      ].includes(template.type)
    ) {
      errors.push(
        'Template type is required and must be one of: outage_started, outage_updated, outage_resolved, maintenance_scheduled'
      );
    }

    if (
      !template.channel ||
      !['email', 'sms', 'in_app', 'push'].includes(template.channel)
    ) {
      errors.push(
        'Template channel is required and must be one of: email, sms, in_app, push'
      );
    }

    if (
      !template.message_template ||
      typeof template.message_template !== 'string'
    ) {
      errors.push('Message template is required and must be a string');
    }

    if (
      template.subject_template &&
      typeof template.subject_template !== 'string'
    ) {
      errors.push('Subject template must be a string');
    }

    if (!template.variables || !Array.isArray(template.variables)) {
      errors.push('Variables must be an array');
    }

    if (
      template.is_active !== undefined &&
      typeof template.is_active !== 'boolean'
    ) {
      errors.push('Is active must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Check if user should be notified based on preferences
  shouldNotifyUser(
    prefs: CustomerNotificationPreferences,
    severity: string,
    channel: string
  ): boolean {
    try {
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
      const userMinLevel =
        severityLevels[prefs.minimum_severity as keyof typeof severityLevels];
      const outageLevel =
        severityLevels[severity as keyof typeof severityLevels];

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
    } catch (error) {
      logger.error('Error checking notification preferences', error as Error, {
        action: 'shouldNotifyUser',
        severity,
        channel,
      });
      return false;
    }
  }

  // Validate template variables
  validateTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): { isValid: boolean; missingVariables: string[] } {
    const missingVariables: string[] = [];

    // Find all template variables in the format {{variable_name}}
    const templateVarRegex = /\{\{([^}]+)\}\}/g;
    const templateVariables = [];
    let match;

    while ((match = templateVarRegex.exec(template)) !== null) {
      templateVariables.push(match[1]);
    }

    // Check if all template variables are provided
    for (const variable of templateVariables) {
      if (!variables.hasOwnProperty(variable)) {
        missingVariables.push(variable);
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  // Validate time format (HH:MM)
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Sanitize notification content
  sanitizeNotificationContent(content: string): string {
    // Basic sanitization - remove potentially harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  // Validate notification recipient
  validateNotificationRecipient(
    channel: string,
    recipient: string
  ): { isValid: boolean; error?: string } {
    switch (channel) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient)) {
          return { isValid: false, error: 'Invalid email address' };
        }
        break;
      }
      case 'sms': {
        const phoneRegex = /^\+?[\d\s\-()]+$/;
        if (!phoneRegex.test(recipient)) {
          return { isValid: false, error: 'Invalid phone number' };
        }
        break;
      }
      case 'in_app':
      case 'push':
        if (!recipient || typeof recipient !== 'string') {
          return {
            isValid: false,
            error: 'Invalid user ID for in-app/push notification',
          };
        }
        break;
      default:
        return { isValid: false, error: 'Unknown notification channel' };
    }

    return { isValid: true };
  }
}

export const outageValidation = new OutageValidation();
