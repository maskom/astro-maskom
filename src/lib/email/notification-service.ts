import { EmailQueueService } from './queue';
import type {
  SendEmailOptions,
  EmailCampaign,
  CustomerEmailPreferences,
  EmailAnalytics,
  TemplateData,
} from './types';

export class EmailNotificationService {
  private queueService: EmailQueueService;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.queueService = new EmailQueueService(supabaseUrl, supabaseKey);
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    const templateData: TemplateData = {
      user_name: userName,
      signup_date: new Date().toLocaleDateString(
        language === 'id' ? 'id-ID' : 'en-US'
      ),
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'welcome_email',
      templateData
    );
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
    const templateData: TemplateData = {
      order_id: orderData.orderId,
      amount: orderData.amount.toLocaleString(
        language === 'id' ? 'id-ID' : 'en-US'
      ),
      currency: orderData.currency,
      product_name: orderData.productName,
      payment_date: new Date().toLocaleDateString(
        language === 'id' ? 'id-ID' : 'en-US'
      ),
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'payment_confirmation',
      templateData
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
    const templateData: TemplateData = {
      reset_url: resetUrl,
      user_name: userName || (language === 'id' ? 'Pengguna' : 'User'),
      expiry_hours: '24',
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'password_reset',
      templateData
    );
  }

  /**
   * Send service status notification
   */
  async sendServiceNotification(
    to: string,
    subject: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    const priority = severity === 'error' ? 1 : severity === 'warning' ? 3 : 5;

    const colors = {
      error: { bg: '#fee', text: '#721c24' },
      warning: { bg: '#fff3cd', text: '#856404' },
      info: { bg: '#d1ecf1', text: '#0c5460' },
    };

    const color = colors[severity];
    const footerText =
      language === 'id'
        ? 'Ini adalah notifikasi otomatis dari Maskom Network. Jika ada pertanyaan, silakan hubungi tim support kami.'
        : 'This is an automated notification from Maskom Network. If you have any questions, please contact our support team.';

    return this.queueService.addEmailToQueue({
      to,
      subject: `[${severity.toUpperCase()}] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${color.bg}; padding: 20px; border-radius: 5px;">
            <h2 style="color: ${color.text}; margin: 0 0 10px 0;">${subject}</h2>
            <p style="color: ${color.text}; margin: 0;">${message}</p>
          </div>
          <div style="margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">${footerText}</p>
          </div>
        </div>
      `,
      text: `${subject}\n\n${message}\n\n${footerText}`,
      priority,
      metadata: { severity, type: 'service_notification', language },
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
    },
    language: 'id' | 'en' = 'id'
  ): Promise<string> {
    const isId = language === 'id';
    const subject = isId
      ? `Pengingat Pembayaran - Invoice ${invoiceData.invoiceNumber}`
      : `Billing Reminder - Invoice ${invoiceData.invoiceNumber}`;

    const templateData: TemplateData = {
      invoice_number: invoiceData.invoiceNumber,
      amount: invoiceData.amount.toLocaleString(isId ? 'id-ID' : 'en-US'),
      due_date: invoiceData.dueDate,
      product_name: invoiceData.productName,
      billing_url: `${process.env.SITE_URL}/billing`,
      user_name: isId ? 'Pelanggan' : 'Customer',
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'billing_reminder',
      templateData
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
    const isId = language === 'id';
    const subject = isId
      ? 'Konfirmasi Janji Temu Layanan'
      : 'Service Appointment Confirmation';

    const templateData: TemplateData = {
      appointment_id: appointmentData.appointmentId,
      appointment_date: appointmentData.date,
      appointment_time: appointmentData.time,
      appointment_type: appointmentData.type,
      technician_name:
        appointmentData.technician || (isId ? 'Teknisi' : 'Technician'),
      service_address:
        appointmentData.address || (isId ? 'Alamat Anda' : 'Your Address'),
      user_name: isId ? 'Pelanggan' : 'Customer',
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'appointment_confirmation',
      templateData
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
    const isId = language === 'id';
    const subject = isId
      ? 'Konfirmasi Instalasi Layanan'
      : 'Service Installation Confirmation';

    const templateData: TemplateData = {
      installation_id: installationData.installationId,
      service_address: installationData.serviceAddress,
      installation_date: installationData.installationDate,
      installation_time: installationData.installationTime,
      service_name: installationData.serviceName,
      technician_name:
        installationData.technician || (isId ? 'Teknisi' : 'Technician'),
      user_name: isId ? 'Pelanggan' : 'Customer',
    };

    return this.queueService.sendTransactionalEmail(
      to,
      'installation_confirmation',
      templateData
    );
  }

  /**
   * Create and send marketing campaign
   */
  async createMarketingCampaign(
    name: string,
    subject: string,
    contentHtml: string,
    contentText?: string,
    options: {
      description?: string;
      campaignType?:
        | 'marketing'
        | 'newsletter'
        | 'promotional'
        | 'announcement';
      targetAudience?: Record<string, any>;
      scheduledAt?: Date;
      createdBy?: string;
    } = {}
  ): Promise<string> {
    const { data, error } = await this.queueService.supabase.rpc(
      'create_email_campaign',
      {
        p_name: name,
        p_description: options.description || null,
        p_subject: subject,
        p_content_html: contentHtml,
        p_content_text: contentText || null,
        p_campaign_type: options.campaignType || 'marketing',
        p_target_audience: options.targetAudience || {},
        p_scheduled_at: options.scheduledAt?.toISOString() || null,
        p_created_by: options.createdBy || null,
      }
    );

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return data;
  }

  /**
   * Get customer email preferences
   */
  async getCustomerEmailPreferences(
    customerId: string
  ): Promise<CustomerEmailPreferences | null> {
    const { data, error } = await this.queueService.supabase.rpc(
      'get_customer_email_preferences',
      {
        p_customer_id: customerId,
      }
    );

    if (error) {
      throw new Error(`Failed to get customer preferences: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const prefs = data[0];
    return {
      customerId,
      emailEnabled: prefs.email_enabled,
      transactionalEmails: prefs.transactional_emails,
      marketingEmails: prefs.marketing_emails,
      newsletterEmails: prefs.newsletter_emails,
      billingNotifications: prefs.billing_notifications,
      serviceNotifications: prefs.service_notifications,
      appointmentReminders: prefs.appointment_reminders,
      promotionalEmails: prefs.promotional_emails,
      securityNotifications: prefs.security_notifications,
      frequencyPreference: prefs.frequency_preference,
      preferredLanguage: prefs.preferred_language as 'id' | 'en',
    };
  }

  /**
   * Update customer email preferences
   */
  async updateCustomerEmailPreferences(
    customerId: string,
    preferences: Partial<CustomerEmailPreferences>
  ): Promise<boolean> {
    const { error } = await this.queueService.supabase.rpc(
      'update_customer_email_preferences',
      {
        p_customer_id: customerId,
        p_email_enabled: preferences.emailEnabled ?? true,
        p_transactional_emails: preferences.transactionalEmails ?? true,
        p_marketing_emails: preferences.marketingEmails ?? false,
        p_newsletter_emails: preferences.newsletterEmails ?? false,
        p_billing_notifications: preferences.billingNotifications ?? true,
        p_service_notifications: preferences.serviceNotifications ?? true,
        p_appointment_reminders: preferences.appointmentReminders ?? true,
        p_promotional_emails: preferences.promotionalEmails ?? false,
        p_security_notifications: preferences.securityNotifications ?? true,
        p_frequency_preference: preferences.frequencyPreference ?? 'normal',
        p_preferred_language: preferences.preferredLanguage ?? 'id',
      }
    );

    if (error) {
      throw new Error(
        `Failed to update customer preferences: ${error.message}`
      );
    }

    return true;
  }

  /**
   * Check if customer can receive email type
   */
  async canSendEmailToCustomer(
    customerId: string,
    emailType:
      | 'transactional'
      | 'marketing'
      | 'newsletter'
      | 'promotional'
      | 'notification'
  ): Promise<boolean> {
    try {
      const preferences = await this.getCustomerEmailPreferences(customerId);

      // If no preferences found, only allow transactional emails
      if (!preferences) {
        return emailType === 'transactional';
      }

      // If email is disabled, don't send any emails
      if (!preferences.emailEnabled) {
        return false;
      }

      switch (emailType) {
        case 'transactional':
          return preferences.transactionalEmails;
        case 'marketing':
          return preferences.marketingEmails;
        case 'newsletter':
          return preferences.newsletterEmails;
        case 'promotional':
          return preferences.promotionalEmails;
        case 'notification':
          return preferences.serviceNotifications;
        default:
          return false;
      }
    } catch {
      // If we can't get preferences, default to not sending marketing emails
      return emailType === 'transactional';
    }
  }

  /**
   * Send email with customer preference check
   */
  async sendEmailWithPreferences(
    customerId: string,
    emailType:
      | 'transactional'
      | 'marketing'
      | 'newsletter'
      | 'promotional'
      | 'notification',
    to: string,
    options: SendEmailOptions
  ): Promise<string | null> {
    const canSend = await this.canSendEmailToCustomer(customerId, emailType);

    if (!canSend) {
      return null;
    }

    // Get customer's preferred language
    const preferences = await this.getCustomerEmailPreferences(customerId);
    const language = preferences?.preferredLanguage || 'id';

    // Add language to metadata
    options.metadata = {
      ...options.metadata,
      language,
      customer_id: customerId,
      email_type: emailType,
    };

    return this.queueService.addEmailToQueue(options);
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(
    filters: {
      startDate?: string;
      endDate?: string;
      campaignId?: string;
      customerId?: string;
      eventType?: string;
    } = {}
  ): Promise<EmailAnalytics[]> {
    let query = this.queueService.supabase
      .from('email_analytics')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }

    if (filters.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get email analytics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(
    campaignId: string
  ): Promise<EmailCampaign | null> {
    const { data, error } = await this.queueService.supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }

    return data;
  }

  /**
   * Track email event (open, click, etc.)
   */
  async trackEmailEvent(
    emailId: string,
    eventType: 'opened' | 'clicked' | 'bounced' | 'complained',
    eventData: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await this.queueService.supabase
      .from('email_analytics')
      .insert({
        email_id: emailId,
        event_type: eventType,
        event_data: eventData,
        user_agent: eventData.userAgent,
        ip_address: eventData.ipAddress,
      });

    if (error) {
      throw new Error(`Failed to track email event: ${error.message}`);
    }

    // Update campaign recipient status if applicable
    if (eventType === 'opened' || eventType === 'clicked') {
      const { data: emailData } = await this.queueService.supabase
        .from('email_queue')
        .select('metadata')
        .eq('id', emailId)
        .single();

      if (emailData?.metadata?.campaign_id) {
        const updateField = eventType === 'opened' ? 'opened_at' : 'clicked_at';
        await this.queueService.supabase
          .from('email_campaign_recipients')
          .update({
            status: eventType,
            [updateField]: new Date().toISOString(),
          })
          .eq('campaign_id', emailData.metadata.campaign_id)
          .eq('email_id', emailId);
      }
    }
  }

  /**
   * Process email queue with preference checks
   */
  async processQueue(): Promise<{
    processed: number;
    failed: number;
    skipped: number;
  }> {
    const settings = await this.queueService.getSettings();
    const batchSizeSetting = settings.find(s => s.key === 'max_batch_size');
    const batchSize =
      typeof batchSizeSetting?.value === 'number' ? batchSizeSetting.value : 10;

    // Get emails to process
    const emails = await this.queueService.getEmails({
      status: 'pending',
      limit: batchSize,
      orderBy: 'priority',
      orderDirection: 'desc',
    });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const email of emails) {
      try {
        // Check customer preferences if customer_id is in metadata
        if (email.metadata?.customer_id && email.metadata?.email_type) {
          const canSend = await this.canSendEmailToCustomer(
            email.metadata.customer_id,
            email.metadata.email_type
          );

          if (!canSend) {
            // Mark as skipped/cancelled
            await this.queueService.cancelEmail(email.id);
            skipped++;
            continue;
          }
        }

        // Process the email
        await this.queueService.processQueue(1);
        processed++;
      } catch (error) {
        failed++;
      }
    }

    return { processed, failed, skipped };
  }

  /**
   * Get queue service for advanced operations
   */
  getQueueService(): EmailQueueService {
    return this.queueService;
  }
}
