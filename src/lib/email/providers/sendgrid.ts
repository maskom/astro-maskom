import type {
  EmailProvider,
  EmailOptions,
  EmailDeliveryResult,
} from '../types';

export class SendGridEmailProvider implements EmailProvider {
  public readonly name = 'sendgrid';
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config: { apiKey: string; fromEmail: string; fromName: string }) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
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

      // Prepare SendGrid API request
      const payload = {
        personalizations: [
          {
            to: this.formatRecipients(
              Array.isArray(options.to) ? options.to : [options.to]
            ),
            cc: options.cc
              ? this.formatRecipients(
                  Array.isArray(options.cc) ? options.cc : [options.cc]
                )
              : undefined,
            bcc: options.bcc
              ? this.formatRecipients(
                  Array.isArray(options.bcc) ? options.bcc : [options.bcc]
                )
              : undefined,
            subject: options.subject,
          },
        ],
        from: {
          email: options.from?.email || this.fromEmail,
          name: options.from?.name || this.fromName,
        },
        reply_to: options.replyTo
          ? {
              email: options.replyTo.email,
              name: options.replyTo.name,
            }
          : undefined,
        content: [
          ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
          ...(options.text
            ? [{ type: 'text/plain', value: options.text }]
            : []),
        ],
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64'),
          type: att.contentType || 'application/octet-stream',
          disposition: 'attachment',
        })),
        headers: options.headers,
      };

      // Send request to SendGrid API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `SendGrid API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const messageId = response.headers.get('X-Message-Id');
      return {
        success: true,
        messageId: messageId || `sendgrid_${Date.now()}`,
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
        text: 'This is a test email to verify the SendGrid provider is working.',
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

  private formatRecipients(
    recipients: Array<{ email: string; name?: string }>
  ) {
    return recipients.map(recipient => ({
      email: recipient.email,
      name: recipient.name,
    }));
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
