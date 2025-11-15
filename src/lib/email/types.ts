export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
}

export interface EmailProvider {
  name: string;
  send(options: EmailOptions): Promise<EmailDeliveryResult>;
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

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  provider: string;
  status: 'sent' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: string[];
  category?: string;
}

export interface EmailTestResult {
  success: boolean;
  provider: string;
  testEmail: string;
  messageId?: string;
  error?: string;
  responseTime: number;
  timestamp: Date;
}
