export interface EmailQueueItem {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  content_html?: string;
  content_text?: string;
  template_id?: string;
  template_data: Record<string, any>;
  priority: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'retry';
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  sent_at?: string;
  error_message?: string;
  metadata: Record<string, any>;
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
  event_type: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'rejected' | 'failed';
  provider?: string;
  provider_message_id?: string;
  response_code?: string;
  response_message?: string;
  processed_at: string;
  metadata: Record<string, any>;
}

export interface EmailQueueSettings {
  key: string;
  value: any;
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
  templateData?: Record<string, any>;
  priority?: number;
  metadata?: Record<string, any>;
}