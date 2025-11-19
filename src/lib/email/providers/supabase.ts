import { createClient } from '@supabase/supabase-js';
import type { EmailOptions, EmailDeliveryResult } from '../types';

export class SupabaseEmailProvider {
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

      // Use Supabase Database to store email for queue processing
      // Note: This stores the email in the database for later processing by the email queue
      const insertData = {
        to_email: toEmails[0],
        subject: options.subject,
        content_html: options.html,
        content_text: options.text,
        status: 'pending' as const,
        priority: options.priority || 5,
        template_data: options.templateData || {},
        metadata: options.metadata || {},
        created_at: new Date().toISOString(),
      };

      const { data, error } = await (
        this.supabase as unknown as {
          from: (table: string) => {
            insert: (data: typeof insertData) => {
              select: () => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from('email_queue')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase email error: ${error.message}`);
      }

      return {
        success: true,
        messageId: data?.id || `supabase_${Date.now()}`,
        provider: this.name,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testOptions: EmailOptions = {
        to: 'test@example.com',
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
