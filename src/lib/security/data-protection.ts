import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { DataConsent, ConsentType, UserDataExport } from './types';

export class DataProtectionService {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  private readonly encryptionKey = crypto.scryptSync(
    import.meta.env.ENCRYPTION_PASSWORD || 'default-key-change-in-production',
    'salt',
    32
  );

  encryptSensitiveData(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error(
        'Encryption error',
        error instanceof Error ? error : new Error(String(error)),
        {
          module: 'data-protection',
          operation: 'encrypt',
        }
      );
      throw new Error('Failed to encrypt data');
    }
  }

  decryptSensitiveData(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error(
        'Decryption error',
        error instanceof Error ? error : new Error(String(error)),
        {
          module: 'data-protection',
          operation: 'decrypt',
        }
      );
      throw new Error('Failed to decrypt data');
    }
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [salt, hash] = hashedPassword.split(':');
      const verifyHash = crypto
        .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
        .toString('hex');
      return hash === verifyHash;
    } catch (error) {
      logger.error(
        'Password verification error',
        error instanceof Error ? error : new Error(String(error)),
        {
          module: 'data-protection',
          operation: 'verifyPassword',
        }
      );
      return false;
    }
  }

  async recordDataConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    ipAddress: string,
    purpose: string,
    legalBasis: string,
    retentionPeriodDays: number = 365
  ): Promise<boolean> {
    try {
      const consent: Omit<DataConsent, 'id' | 'timestamp'> = {
        user_id: userId,
        consent_type: consentType,
        granted,
        ip_address: ipAddress,
        purpose,
        legal_basis: legalBasis,
        retention_period_days: retentionPeriodDays,
      };

      const { error } = await this.supabase
        .from('data_consents')
        .insert(consent);

      if (error) {
        logger.error('Failed to record data consent', error, {
          userId,
          consentType,
          granted,
          module: 'data-protection',
          operation: 'recordDataConsent',
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error(
        'Failed to record data consent',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          consentType,
          granted,
          module: 'data-protection',
          operation: 'recordDataConsent',
        }
      );
      return false;
    }
  }

  async hasDataConsent(
    userId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    try {
      const { data: consent, error } = await this.supabase
        .from('data_consents')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return false;
      }

      // Check if consent has expired based on retention period
      if (consent) {
        const expiryDate = new Date(consent.timestamp);
        expiryDate.setDate(
          expiryDate.getDate() + consent.retention_period_days
        );

        if (new Date() > expiryDate) {
          return false;
        }
      }

      return !!consent;
    } catch (error) {
      logger.error(
        'Data consent check error',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          consentType,
          module: 'data-protection',
          operation: 'hasDataConsent',
        }
      );
      return false;
    }
  }

  async anonymizeUserData(userId: string): Promise<boolean> {
    try {
      // Anonymize user profile data
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          email: `deleted-${crypto.randomBytes(8).toString('hex')}@deleted.com`,
          full_name: 'Deleted User',
          phone: null,
          address: null,
          updated_at: new Date(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to anonymize profile:', profileError);
        return false;
      }

      // Log the data deletion
      await this.supabase.from('security_audit_logs').insert({
        user_id: userId,
        action: 'data_delete',
        resource: 'user_profile',
        details: { anonymized: true },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Data anonymization error:', error);
      return false;
    }
  }

  async deleteExpiredData(): Promise<number> {
    try {
      const deletedCount = { count: 0 };

      // Delete expired audit logs
      const auditLogsRetention = 365; // 1 year
      const auditCutoff = new Date();
      auditCutoff.setDate(auditCutoff.getDate() - auditLogsRetention);

      const { error: auditError } = await this.supabase
        .from('security_audit_logs')
        .delete()
        .lt('timestamp', auditCutoff.toISOString());

      if (!auditError) {
        deletedCount.count++;
      }

      // Delete expired failed login attempts
      const failedLoginRetention = 30; // 30 days
      const failedLoginCutoff = new Date();
      failedLoginCutoff.setDate(
        failedLoginCutoff.getDate() - failedLoginRetention
      );

      const { error: failedLoginError } = await this.supabase
        .from('failed_login_attempts')
        .delete()
        .lt('timestamp', failedLoginCutoff.toISOString());

      if (!failedLoginError) {
        deletedCount.count++;
      }

      // Delete expired session data
      const sessionRetention = 7; // 7 days
      const sessionCutoff = new Date();
      sessionCutoff.setDate(sessionCutoff.getDate() - sessionRetention);

      const { error: sessionError } = await this.supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', sessionCutoff.toISOString());

      if (!sessionError) {
        deletedCount.count++;
      }

      return deletedCount.count;
    } catch (error) {
      console.error('Expired data deletion error:', error);
      return 0;
    }
  }

  async exportUserData(userId: string): Promise<UserDataExport | null> {
    try {
      const userData: UserDataExport = {
        user_id: userId,
        email: '',
        profile: {},
        subscriptions: [],
        payments: [],
        security_logs: [],
        consent_records: [],
        created_at: new Date().toISOString(),
        exported_at: new Date().toISOString(),
      };

      // Get user profile
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        userData.profile = profile;
      }

      // Get security profile
      const { data: securityProfile } = await this.supabase
        .from('user_security_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (securityProfile) {
        userData.security_profile = {
          ...securityProfile,
          mfa_secret: undefined, // Exclude sensitive data
          backup_codes: undefined,
        };
      }

      // Get data consents
      const { data: consents } = await this.supabase
        .from('data_consents')
        .select('*')
        .eq('user_id', userId);

      if (consents) {
        userData.data_consents = consents;
      }

      // Get billing data
      const { data: billing } = await this.supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', userId);

      if (billing) {
        userData.billing_history = billing;
      }

      // Log the data export
      await this.supabase.from('security_audit_logs').insert({
        user_id: userId,
        action: 'data_export',
        resource: 'user_data',
        details: { record_count: Object.keys(userData).length },
        timestamp: new Date(),
      });

      return userData;
    } catch (error) {
      console.error('User data export error:', error);
      return null;
    }
  }

  generateDataRetentionReport(): Record<string, number> {
    return {
      audit_logs_retention_days: 365,
      failed_login_attempts_retention_days: 30,
      session_data_retention_days: 7,
      user_data_retention_days: 2555, // 7 years for GDPR compliance
      billing_data_retention_days: 2555,
      consent_data_retention_days: 2555,
    };
  }
}

export const dataProtectionService = new DataProtectionService();
