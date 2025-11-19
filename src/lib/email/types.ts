// Base interfaces for type safety
export interface TemplateData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface EmailMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export type QueueSettingValue = string | number | boolean | null | undefined;

export interface EmailQueueItem {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  content_html?: string;
  content_text?: string;
  template_id?: string;
  template_data: TemplateData;
  priority: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  sent_at?: string;
  error_message?: string;
  metadata: EmailMetadata;
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
  metadata: EmailMetadata;
}

export interface EmailQueueSettings {
  key: string;
  value: QueueSettingValue;
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
  templateData?: TemplateData;
  priority?: number;
  metadata?: EmailMetadata;
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

export interface CustomerEmailPreferences {
  customerId: string;
  emailEnabled: boolean;
  transactionalEmails: boolean;
  marketingEmails: boolean;
  newsletterEmails: boolean;
  billingNotifications: boolean;
  serviceNotifications: boolean;
  appointmentReminders: boolean;
  promotionalEmails: boolean;
  securityNotifications: boolean;
  frequencyPreference: 'immediate' | 'daily' | 'weekly' | 'never';
  preferredLanguage: 'id' | 'en';
}

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  subject: string;
  contentHtml: string;
  contentText?: string;
  campaignType: 'marketing' | 'newsletter' | 'promotional' | 'announcement';
  targetAudience: Record<string, any>;
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'paused';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAnalytics {
  id: string;
  emailId?: string;
  campaignId?: string;
  customerId?: string;
  eventType: string;
  eventData: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface UnsubscribeRequest {
  email: string;
  customerId?: string;
  reason?: string;
  campaignId?: string;
}

export interface EmailTrackingPixel {
  emailId: string;
  customerId?: string;
  campaignId?: string;
  userAgent?: string;
  ipAddress?: string;
}
