import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailQueueItem,
  EmailTemplate,
  EmailDeliveryLog,
  EmailQueueSettings,
  QueueStats,
  SendEmailOptions,
  TemplateData,
  QueueSettingValue,
} from './types';

export class EmailQueueService {
  public supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || import.meta.env.SUPABASE_URL,
      supabaseKey || import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Add an email to the queue
   */
  async addEmailToQueue(options: SendEmailOptions): Promise<string> {
    const { data, error } = await this.supabase.rpc('add_email_to_queue', {
      p_to_email: options.to,
      p_from_email: options.from || 'noreply@maskom.network',
      p_subject: options.subject,
      p_content_html: options.html || null,
      p_content_text: options.text || null,
      p_template_id: options.template
        ? await this.getTemplateIdByName(options.template)
        : null,
      p_template_data: options.templateData || {},
      p_priority: options.priority || 5,
      p_metadata: options.metadata || {},
    });

    if (error) {
      throw new Error(`Failed to add email to queue: ${error.message}`);
    }

    if (typeof data !== 'string') {
      throw new Error(
        'Invalid response from add_email_to_queue: expected string'
      );
    }

    return data;
  }

  /**
   * Process the email queue
   */
  async processQueue(
    batchSize: number = 10
  ): Promise<{ processed: number; failed: number }> {
    const { data, error } = await this.supabase.rpc('process_email_queue', {
      batch_size: batchSize,
    });

    if (error) {
      throw new Error(`Failed to process email queue: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return { processed: 0, failed: 0 };
    }

    const result = data[0];
    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as { processed: number }).processed !== 'number' ||
      typeof (result as { failed: number }).failed !== 'number'
    ) {
      throw new Error(
        'Invalid response from process_email_queue: expected object with processed and failed numbers'
      );
    }

    return result as { processed: number; failed: number };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const { data, error } = await this.supabase.rpc('get_email_queue_stats');

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        pending_count: 0,
        processing_count: 0,
        sent_today: 0,
        failed_today: 0,
        retry_count: 0,
      };
    }

    const result = data[0];
    if (
      typeof result !== 'object' ||
      result === null ||
      typeof (result as QueueStats).pending_count !== 'number' ||
      typeof (result as QueueStats).processing_count !== 'number' ||
      typeof (result as QueueStats).sent_today !== 'number' ||
      typeof (result as QueueStats).failed_today !== 'number' ||
      typeof (result as QueueStats).retry_count !== 'number'
    ) {
      throw new Error(
        'Invalid response from get_email_queue_stats: expected QueueStats object'
      );
    }

    return result as QueueStats;
  }

  /**
   * Get emails from queue with filters
   */
  async getEmails(
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'priority' | 'next_retry_at';
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<EmailQueueItem[]> {
    let query = this.supabase
      .from('email_queue')
      .select('*')
      .order(filters.orderBy || 'created_at', {
        ascending: filters.orderDirection !== 'desc',
      });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get emails: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Validate that each item in the array is a valid EmailQueueItem
    const validEmails = data.filter((item): item is EmailQueueItem => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.to_email === 'string' &&
        typeof item.from_email === 'string' &&
        typeof item.subject === 'string' &&
        typeof item.priority === 'number' &&
        typeof item.status === 'string' &&
        typeof item.attempts === 'number' &&
        typeof item.max_attempts === 'number' &&
        typeof item.template_data === 'object' &&
        typeof item.metadata === 'object' &&
        typeof item.created_at === 'string' &&
        typeof item.updated_at === 'string'
      );
    });

    return validEmails;
  }

  /**
   * Get email templates
   */
  async getTemplates(
    filters: {
      category?: string;
      isActive?: boolean;
    } = {}
  ): Promise<EmailTemplate[]> {
    let query = this.supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', filters.isActive !== false);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Validate that each item in the array is a valid EmailTemplate
    const validTemplates = data.filter((item): item is EmailTemplate => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.subject_template === 'string' &&
        typeof item.html_template === 'string' &&
        typeof item.category === 'string' &&
        typeof item.is_active === 'boolean' &&
        typeof item.version === 'number' &&
        typeof item.created_at === 'string' &&
        typeof item.updated_at === 'string'
      );
    });

    return validTemplates;
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get template: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Validate that the data is a valid EmailTemplate
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof (data as EmailTemplate).id !== 'string' ||
      typeof (data as EmailTemplate).name !== 'string' ||
      typeof (data as EmailTemplate).subject_template !== 'string' ||
      typeof (data as EmailTemplate).html_template !== 'string' ||
      typeof (data as EmailTemplate).category !== 'string' ||
      typeof (data as EmailTemplate).is_active !== 'boolean' ||
      typeof (data as EmailTemplate).version !== 'number' ||
      typeof (data as EmailTemplate).created_at !== 'string' ||
      typeof (data as EmailTemplate).updated_at !== 'string'
    ) {
      throw new Error('Invalid template data received from database');
    }

    return data as EmailTemplate;
  }

  /**
   * Get template ID by name
   */
  private async getTemplateIdByName(name: string): Promise<string | null> {
    const template = await this.getTemplateByName(name);
    return template?.id || null;
  }

  /**
   * Create email template
   */
  async createTemplate(
    template: Omit<
      EmailTemplate,
      'id' | 'created_at' | 'updated_at' | 'version'
    >
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .insert(template)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as { id: string }).id !== 'string'
    ) {
      throw new Error(
        'Invalid response from template creation: expected object with id string'
      );
    }

    const result = data as { id: string };
    return result.id;
  }

  /**
   * Update email template
   */
  async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Get delivery logs for an email
   */
  async getDeliveryLogs(emailId: string): Promise<EmailDeliveryLog[]> {
    const { data, error } = await this.supabase
      .from('email_delivery_logs')
      .select('*')
      .eq('email_id', emailId)
      .order('processed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get delivery logs: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Validate that each item in the array is a valid EmailDeliveryLog
    const validLogs = data.filter((item): item is EmailDeliveryLog => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.email_id === 'string' &&
        typeof item.event_type === 'string' &&
        typeof item.processed_at === 'string' &&
        typeof item.metadata === 'object'
      );
    });

    return validLogs;
  }

  /**
   * Get queue settings
   */
  async getSettings(): Promise<EmailQueueSettings[]> {
    const { data, error } = await this.supabase
      .from('email_queue_settings')
      .select('*')
      .order('key');

    if (error) {
      throw new Error(`Failed to get settings: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Validate that each item in the array is a valid EmailQueueSettings
    const validSettings = data.filter((item): item is EmailQueueSettings => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.key === 'string' &&
        typeof item.updated_at === 'string'
      );
    });

    return validSettings;
  }

  /**
   * Update queue setting
   */
  async updateSetting(key: string, value: QueueSettingValue): Promise<void> {
    const { error } = await this.supabase.from('email_queue_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  }

  /**
   * Cancel email in queue
   */
  async cancelEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_queue')
      .update({ status: 'cancelled' })
      .eq('id', emailId)
      .in('status', ['pending', 'retry']);

    if (error) {
      throw new Error(`Failed to cancel email: ${error.message}`);
    }
  }

  /**
   * Retry failed email
   */
  async retryEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_queue')
      .update({
        status: 'pending',
        next_retry_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', emailId)
      .eq('status', 'failed');

    if (error) {
      throw new Error(`Failed to retry email: ${error.message}`);
    }
  }

  /**
   * Delete old emails (cleanup)
   */
  async cleanupOldEmails(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await this.supabase
      .from('email_queue')
      .delete()
      .in('status', ['sent', 'failed', 'cancelled'])
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup old emails: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return 0;
    }

    // Validate that each item has an id property
    const validItems = data.filter(
      (item): item is { id: string } =>
        typeof item === 'object' && item !== null && typeof item.id === 'string'
    );

    return validItems.length;
  }

  /**
   * Render template with data
   */
  renderTemplate(template: string, data: TemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Send transactional email using template
   */
  async sendTransactionalEmail(
    to: string,
    templateName: string,
    data: TemplateData,
    options: Partial<SendEmailOptions> = {}
  ): Promise<string> {
    const template = await this.getTemplateByName(templateName);

    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const subject = this.renderTemplate(template.subject_template, data);
    const html = template.html_template
      ? this.renderTemplate(template.html_template, data)
      : undefined;
    const text = template.text_template
      ? this.renderTemplate(template.text_template, data)
      : undefined;

    return this.addEmailToQueue({
      to,
      subject,
      html,
      text,
      template: templateName,
      templateData: data,
      priority: options.priority || 3, // Higher priority for transactional emails
      metadata: options.metadata,
    });
  }
}
