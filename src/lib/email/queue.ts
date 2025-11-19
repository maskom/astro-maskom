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
  private supabase: SupabaseClient;

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

    return data as string;
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

    const result = data as { processed: number; failed: number }[];
    return result[0] || { processed: 0, failed: 0 };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const { data, error } = await this.supabase.rpc('get_email_queue_stats');

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }

    const result = data as QueueStats[];
    return (
      result[0] || {
        pending_count: 0,
        processing_count: 0,
        sent_today: 0,
        failed_today: 0,
        retry_count: 0,
      }
    );
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

    return (data as EmailQueueItem[]) || [];
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

    return (data as EmailTemplate[]) || [];
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

    return data as EmailTemplate | null;
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

    return (data as EmailDeliveryLog[]) || [];
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

    return (data as EmailQueueSettings[]) || [];
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

    const result = data as { id: string }[];
    return result?.length || 0;
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
