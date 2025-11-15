import type { EmailOptions, EmailDeliveryResult, EmailProvider, EmailLog, EmailTestResult } from './types';
import { EmailConfigManager } from './config';
import { SupabaseEmailProvider } from './providers/supabase';
import { SendGridEmailProvider } from './providers/sendgrid';

export class EmailService {
  private static instance: EmailService;
  private configManager: EmailConfigManager;
  private provider: EmailProvider;
  private logs: EmailLog[] = [];

  private constructor() {
    this.configManager = EmailConfigManager.getInstance();
    this.provider = this.initializeProvider();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeProvider(): EmailProvider {
    const config = this.configManager.getConfig();
    
    switch (config.provider) {
      case 'supabase':
        return new SupabaseEmailProvider();
      
      case 'sendgrid':
        if (!config.sendgrid) {
          throw new Error('SendGrid configuration is missing');
        }
        return new SendGridEmailProvider(config.sendgrid);
      
      case 'ses':
        throw new Error('AWS SES provider not yet implemented');
      
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        throw new Error(`Email configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Validate email options
      this.validateEmailOptions(options);

      // Send email
      const result = await this.provider.send(options);

      // Log the attempt
      const log: EmailLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: Array.isArray(options.to) ? options.to.map(r => r.email).join(', ') : options.to.email,
        subject: options.subject,
        provider: this.provider.name,
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date(),
        metadata: {
          responseTime: Date.now() - startTime,
          hasHtml: !!options.html,
          hasText: !!options.text,
          hasAttachments: !!(options.attachments && options.attachments.length > 0),
        },
      };

      this.addLog(log);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log the failure
      const log: EmailLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: Array.isArray(options.to) ? options.to.map(r => r.email).join(', ') : options.to.email,
        subject: options.subject,
        provider: this.provider.name,
        status: 'failed',
        error: errorMessage,
        timestamp: new Date(),
        metadata: {
          responseTime: Date.now() - startTime,
        },
      };

      this.addLog(log);

      return {
        success: false,
        error: errorMessage,
        provider: this.provider.name,
        timestamp: new Date(),
      };
    }
  }

  async testEmail(testEmail?: string): Promise<EmailTestResult> {
    const startTime = Date.now();
    const email = testEmail || 'test@example.com';

    try {
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        throw new Error(`Email configuration invalid: ${validation.errors.join(', ')}`);
      }

      const testOptions: EmailOptions = {
        to: { email },
        subject: 'Maskom Network - Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🧪 Email Service Test</h2>
            <p>This is a test email to verify that the Maskom Network email service is working correctly.</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3>Test Details:</h3>
              <ul>
                <li><strong>Provider:</strong> ${this.provider.name}</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>Test Email:</strong> ${email}</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you received this email, the email service is configured correctly.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated test email from Maskom Network.
            </p>
          </div>
        `,
        text: `
Email Service Test

This is a test email to verify that the Maskom Network email service is working correctly.

Test Details:
- Provider: ${this.provider.name}
- Timestamp: ${new Date().toISOString()}
- Test Email: ${email}

If you received this email, the email service is configured correctly.

This is an automated test email from Maskom Network.
        `,
      };

      const result = await this.sendEmail(testOptions);
      const responseTime = Date.now() - startTime;

      return {
        success: result.success,
        provider: this.provider.name,
        testEmail: email,
        messageId: result.messageId,
        error: result.error,
        responseTime,
        timestamp: new Date(),
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        provider: this.provider.name,
        testEmail: email,
        error: errorMessage,
        responseTime,
        timestamp: new Date(),
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        return {
          success: false,
          error: `Configuration invalid: ${validation.errors.join(', ')}`,
        };
      }

      // Test with a simple email
      const result = await this.testEmail();
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }

  getConfiguration() {
    return this.configManager.getConfig();
  }

  validateConfiguration() {
    return this.configManager.validateConfig();
  }

  getLogs(limit: number = 50): EmailLog[] {
    return this.logs.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }

  private validateEmailOptions(options: EmailOptions): void {
    if (!options.to) {
      throw new Error('Recipient (to) is required');
    }

    if (!options.subject) {
      throw new Error('Subject is required');
    }

    if (!options.html && !options.text) {
      throw new Error('Either html or text content is required');
    }

    // Validate email addresses
    const validateAddress = (address: { email: string; name?: string }) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(address.email)) {
        throw new Error(`Invalid email address: ${address.email}`);
      }
    };

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    recipients.forEach(validateAddress);

    if (options.cc) {
      const ccRecipients = Array.isArray(options.cc) ? options.cc : [options.cc];
      ccRecipients.forEach(validateAddress);
    }

    if (options.bcc) {
      const bccRecipients = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
      bccRecipients.forEach(validateAddress);
    }

    if (options.replyTo) {
      validateAddress(options.replyTo);
    }
  }

  private addLog(log: EmailLog): void {
    this.logs.push(log);
    
    // Keep only the last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  // Utility method to switch providers (useful for testing)
  switchProvider(providerName: 'supabase' | 'sendgrid'): void {
    const config = this.configManager.getConfig();
    
    // Temporarily override the provider
    switch (providerName) {
      case 'supabase':
        this.provider = new SupabaseEmailProvider();
        break;
      case 'sendgrid':
        if (config.sendgrid) {
          this.provider = new SendGridEmailProvider(config.sendgrid);
        } else {
          throw new Error('SendGrid configuration not available');
        }
        break;
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }
}