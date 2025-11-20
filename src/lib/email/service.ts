import { EmailQueueService } from './queue';
import { EmailNotificationService } from './notification-service';
import type { SendEmailOptions } from './types';

export class EmailService {
  private queueService: EmailQueueService;
  private notificationService: EmailNotificationService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.queueService = new EmailQueueService(supabaseUrl, supabaseKey);
    this.notificationService = new EmailNotificationService(
      supabaseUrl,
      supabaseKey
    );
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    return this.notificationService.sendWelcomeEmail(to, userName, language);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    to: string,
    orderData: {
      orderId: string;
      amount: number;
      currency: string;
      productName: string;
    },
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    return this.notificationService.sendPaymentConfirmation(
      to,
      orderData,
      language
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    resetUrl: string,
    userName?: string,
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    return this.notificationService.sendPasswordReset(
      to,
      resetUrl,
      userName,
      language
    );
  }

  /**
   * Send service status notification
   */
  async sendServiceNotification(
    to: string,
    subject: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<string> {
    const priority = severity === 'error' ? 1 : severity === 'warning' ? 3 : 5;

    return this.queueService.addEmailToQueue({
      to,
      subject: `[${severity.toUpperCase()}] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severity === 'error' ? '#fee' : severity === 'warning' ? '#fff3cd' : '#d1ecf1'}; padding: 20px; border-radius: 5px;">
            <h2 style="color: ${severity === 'error' ? '#721c24' : severity === 'warning' ? '#856404' : '#0c5460'}; margin: 0 0 10px 0;">
              ${subject}
            </h2>
            <p style="color: ${severity === 'error' ? '#721c24' : severity === 'warning' ? '#856404' : '#0c5460'}; margin: 0;">
              ${message}
            </p>
          </div>
          <div style="margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              This is an automated notification from Maskom Network. If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `${subject}\n\n${message}\n\nThis is an automated notification from Maskom Network.`,
      priority,
      metadata: { severity, type: 'service_notification' },
    });
  }

  /**
   * Send billing reminder
   */
  async sendBillingReminder(
    to: string,
    invoiceData: {
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      productName: string;
    }
  ): Promise<string> {
    return this.queueService.addEmailToQueue({
      to,
      subject: `Billing Reminder - Invoice ${invoiceData.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Billing Reminder</h2>
          <p>This is a friendly reminder that your invoice is due soon.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>Amount:</strong> Rp ${invoiceData.amount.toLocaleString()}</p>
            <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>
            <p><strong>Service:</strong> ${invoiceData.productName}</p>
          </div>
          
          <p>Please ensure payment is made by the due date to avoid service interruption.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/billing" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Invoice
            </a>
          </div>
        </div>
      `,
      text: `
Billing Reminder

Invoice Number: ${invoiceData.invoiceNumber}
Amount: Rp ${invoiceData.amount.toLocaleString()}
Due Date: ${invoiceData.dueDate}
Service: ${invoiceData.productName}

Please ensure payment is made by the due date to avoid service interruption.

View your invoice at: ${process.env.SITE_URL}/billing
      `,
      priority: 4,
      metadata: {
        type: 'billing_reminder',
        invoice_number: invoiceData.invoiceNumber,
      },
    });
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(options: SendEmailOptions): Promise<string> {
    return this.queueService.addEmailToQueue(options);
  }

  /**
   * Process email queue (should be called by cron job)
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    const settings = await this.queueService.getSettings();
    const batchSizeSetting = settings.find(s => s.key === 'max_batch_size');
    const batchSize =
      typeof batchSizeSetting?.value === 'number' ? batchSizeSetting.value : 10;

    return this.queueService.processQueue(batchSize);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  /**
   * Get queue service instance for advanced operations
   */
  getQueueService(): EmailQueueService {
    return this.queueService;
  }

  /**
   * Test email service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.queueService.getSettings();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'supabase';
  }

  /**
   * Get configuration
   */
  getConfiguration(): Record<string, string | boolean | number> {
    return {
      provider: 'supabase',
      queueEnabled: true,
    };
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      await this.testConnection();
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Send test email
   */
  async testEmail(to: string): Promise<string> {
    return this.queueService.addEmailToQueue({
      to,
      subject: 'Test Email from Maskom Network',
      html: '<p>This is a test email from the Maskom Network email service.</p>',
      text: 'This is a test email from the Maskom Network email service.',
      priority: 5,
      metadata: { type: 'test_email' },
    });
  }

  /**
   * Send email (alias for sendCustomEmail)
   */
  async sendEmail(options: SendEmailOptions): Promise<string> {
    return this.sendCustomEmail(options);
  }

  /**
   * Get customer email preferences
   */
  async getCustomerEmailPreferences(customerId: string) {
    return this.notificationService.getCustomerEmailPreferences(customerId);
  }

  /**
   * Update customer email preferences
   */
  async updateCustomerEmailPreferences(customerId: string, preferences: any) {
    return this.notificationService.updateCustomerEmailPreferences(
      customerId,
      preferences
    );
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(
    to: string,
    appointmentData: {
      appointmentId: string;
      date: string;
      time: string;
      type: string;
      technician?: string;
      address?: string;
    },
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    return this.notificationService.sendAppointmentConfirmation(
      to,
      appointmentData,
      language
    );
  }

  /**
   * Send installation confirmation
   */
  async sendInstallationConfirmation(
    to: string,
    installationData: {
      installationId: string;
      serviceAddress: string;
      installationDate: string;
      installationTime: string;
      serviceName: string;
      technician?: string;
    },
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    return this.notificationService.sendInstallationConfirmation(
      to,
      installationData,
      language
    );
  }

  /**
   * Create marketing campaign
   */
  async createMarketingCampaign(
    name: string,
    subject: string,
    contentHtml: string,
    contentText?: string,
    options?: {
      description?: string;
      campaignType?:
        | 'marketing'
        | 'newsletter'
        | 'promotional'
        | 'announcement';
      targetAudience?: Record<string, any>;
      scheduledAt?: Date;
      createdBy?: string;
    }
  ): Promise<string> {
    return this.notificationService.createMarketingCampaign(
      name,
      subject,
      contentHtml,
      contentText,
      options
    );
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
    customerId?: string;
    eventType?: string;
  }) {
    return this.notificationService.getEmailAnalytics(filters);
  }

  /**
   * Track email event
   */
  async trackEmailEvent(
    emailId: string,
    eventType: 'opened' | 'clicked' | 'bounced' | 'complained',
    eventData?: Record<string, any>
  ): Promise<void> {
    return this.notificationService.trackEmailEvent(
      emailId,
      eventType,
      eventData
    );
  }

  /**
   * Get notification service for advanced operations
   */
  getNotificationService(): EmailNotificationService {
    return this.notificationService;
  }
}

// Export singleton instance
export const emailService = new EmailService(
  import.meta.env.SUPABASE_URL || '',
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
