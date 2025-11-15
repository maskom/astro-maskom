import { createClient } from '@supabase/supabase-js';
import type { EmailProvider, EmailOptions, EmailDeliveryResult } from './types';

export class SupabaseEmailProvider implements EmailProvider {
  public readonly name = 'supabase';
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async send(options: EmailOptions): Promise<EmailDeliveryResult> {
    try {
      // Validate required fields
      if (!options.to) {
        throw new Error('Recipient email address is required');
      }

      if (!options.subject) {
        throw new Error('Email subject is required');
      }

      if (!options.html && !options.text) {
        throw new Error('Email content (html or text) is required');
      }

      // Normalize recipients
      const to = Array.isArray(options.to) ? options.to : [options.to];
      const toEmails = to.map(recipient => recipient.email).filter(Boolean);

      if (toEmails.length === 0) {
        throw new Error('Valid recipient email address is required');
      }

      // Use Supabase Auth's email functionality
      // Note: Supabase Auth email is primarily for auth emails, but we can use it for basic transactional emails
      const { data, error } = await this.supabase.auth.admin.invokeAction(
        'send_email',
        {
          to: toEmails[0], // Supabase Auth email typically sends to one recipient at a time
          subject: options.subject,
          html: options.html,
          text: options.text,
        }
      );

      if (error) {
        throw new Error(`Supabase email error: ${error.message}`);
      }

      return {
        success: true,
        messageId: data?.id || `supabase_${Date.now()}`,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testOptions: EmailOptions = {
        to: { email: 'test@example.com' },
        subject: 'Test Email',
        text: 'This is a test email to verify the Supabase email provider is working.',
      };

      const result = await this.send(testOptions);

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private formatEmailAddress(address: {
    email: string;
    name?: string;
  }): string {
    if (address.name) {
      return `${address.name} <${address.email}>`;
    }
    return address.email;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
