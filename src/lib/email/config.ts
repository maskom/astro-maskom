import type { EmailConfig } from './types';

export class EmailConfigManager {
  private static instance: EmailConfigManager;
  private config: EmailConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): EmailConfigManager {
    if (!EmailConfigManager.instance) {
      EmailConfigManager.instance = new EmailConfigManager();
    }
    return EmailConfigManager.instance;
  }

  private loadConfig(): EmailConfig {
    const emailProvider = process.env.EMAIL_PROVIDER || 'supabase';

    // Validate that the provider is a valid EmailConfig['provider']
    const validProviders: EmailConfig['provider'][] = [
      'supabase',
      'sendgrid',
      'ses',
    ];
    if (!validProviders.includes(emailProvider as EmailConfig['provider'])) {
      throw new Error(
        `Invalid email provider: ${emailProvider}. Must be one of: ${validProviders.join(', ')}`
      );
    }

    const provider = emailProvider as EmailConfig['provider'];

    const config: EmailConfig = {
      provider,
    };

    // Load Supabase configuration
    if (provider === 'supabase') {
      config.supabase = {
        enabled: true,
      };
    }

    // Load SendGrid configuration
    if (provider === 'sendgrid') {
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
      const sendgridFromName =
        process.env.SENDGRID_FROM_NAME || 'Maskom Network';

      if (!sendgridApiKey || !sendgridFromEmail) {
        throw new Error(
          'SendGrid configuration missing: SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are required'
        );
      }

      config.sendgrid = {
        apiKey: sendgridApiKey,
        fromEmail: sendgridFromEmail,
        fromName: sendgridFromName,
      };
    }

    // Load AWS SES configuration
    if (provider === 'ses') {
      const sesRegion = process.env.AWS_SES_REGION || 'us-east-1';
      const sesAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const sesSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const sesFromEmail = process.env.AWS_SES_FROM_EMAIL;
      const sesFromName = process.env.AWS_SES_FROM_NAME || 'Maskom Network';

      if (!sesAccessKeyId || !sesSecretAccessKey || !sesFromEmail) {
        throw new Error(
          'AWS SES configuration missing: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SES_FROM_EMAIL are required'
        );
      }

      config.ses = {
        region: sesRegion,
        accessKeyId: sesAccessKeyId,
        secretAccessKey: sesSecretAccessKey,
        fromEmail: sesFromEmail,
        fromName: sesFromName,
      };
    }

    return config;
  }

  public getConfig(): EmailConfig {
    return this.config;
  }

  public getProvider(): EmailConfig['provider'] {
    return this.config.provider;
  }

  public isConfigured(): boolean {
    try {
      this.loadConfig();
      return true;
    } catch {
      return false;
    }
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.provider) {
      errors.push('Email provider is not specified');
    }

    if (this.config.provider === 'sendgrid') {
      if (!this.config.sendgrid?.apiKey) {
        errors.push('SendGrid API key is missing');
      }
      if (!this.config.sendgrid?.fromEmail) {
        errors.push('SendGrid from email is missing');
      }
    }

    if (this.config.provider === 'ses') {
      if (!this.config.ses?.accessKeyId) {
        errors.push('AWS SES access key ID is missing');
      }
      if (!this.config.ses?.secretAccessKey) {
        errors.push('AWS SES secret access key is missing');
      }
      if (!this.config.ses?.fromEmail) {
        errors.push('AWS SES from email is missing');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}
