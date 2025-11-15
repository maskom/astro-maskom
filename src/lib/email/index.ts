// Export all email service functionality
import { EmailService } from './service';
import { EmailConfigManager } from './config';
import { SupabaseEmailProvider } from './providers/supabase';
import { SendGridEmailProvider } from './providers/sendgrid';

export {
  EmailService,
  EmailConfigManager,
  SupabaseEmailProvider,
  SendGridEmailProvider,
};

// Export types
export type {
  EmailAddress,
  EmailAttachment,
  EmailOptions,
  EmailDeliveryResult,
  EmailProvider,
  EmailConfig,
  EmailLog,
  EmailTemplate,
  EmailTestResult,
} from './types';

// Export convenience functions
export const emailService = EmailService.getInstance();
export const emailConfig = EmailConfigManager.getInstance();

// Quick access functions
export const sendEmail = (options: import('./types').EmailOptions) =>
  emailService.sendEmail(options);

export const testEmail = (testEmail?: string) =>
  emailService.testEmail(testEmail);

export const testConnection = () => emailService.testConnection();

export const getEmailLogs = (limit?: number) => emailService.getLogs(limit);
