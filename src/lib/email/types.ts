export interface EmailQueueItem {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  content_html?: string;
  content_text?: string;
  template_id?: string;
  template_data: Record<string, unknown>;
  priority: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  sent_at?: string;
  error_message?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject_template: string;
  html_template: string;
  text_template?: string;
  category: 'transactional' | 'marketing' | 'notification' | 'system';
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EmailDeliveryLog {
  id: string;
  email_id: string;
  event_type:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'bounced'
    | 'complained'
    | 'rejected'
    | 'failed';
  provider?: string;
  provider_message_id?: string;
  response_code?: string;
  response_message?: string;
  processed_at: string;
  metadata: Record<string, unknown>;
}

export interface EmailQueueSettings {
  key: string;
  value: unknown;
  description?: string;
  updated_at: string;
}

export interface QueueStats {
  pending_count: number;
  processing_count: number;
  sent_today: number;
  failed_today: number;
  retry_count: number;
  avg_delivery_time?: string;
}

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface EmailConfig {
  provider: 'supabase' | 'sendgrid' | 'ses';
  supabase?: {
    enabled: boolean;
  };
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    fromEmail: string;
    fromName: string;
  };
}

export type EmailProvider = 'supabase' | 'sendgrid' | 'ses';

export interface EmailOptions extends SendEmailOptions {
  cc?: string | string[] | Array<{ email: string; name?: string }>;
  bcc?: string | string[] | Array<{ email: string; name?: string }>;
  replyTo?: { email: string; name?: string };
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp?: Date;
}

// Supabase database types for email queue operations
export interface EmailQueueInsert {
  to_email: string;
  subject: string;
  content_html?: string | null;
  content_text?: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
  priority: number;
  template_data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EmailQueueUpdate {
  status?: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
  next_retry_at?: string | null;
  error_message?: string | null;
}

export type TemplateInsert = Omit<
  EmailTemplate,
  'id' | 'created_at' | 'updated_at' | 'version'
>;

export interface QueueSettingUpsert {
  key: string;
  value: unknown;
  updated_at: string;
}

// Generic template data type for better type safety
export interface TemplateData {
  [key: string]: unknown;
}
