import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import type { UserSecurityProfile } from './types';

export class MFAService {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  generateMFASecret(): string {
    return crypto.randomBytes(20).toString('base64');
  }

  generateTOTPSecret(userEmail: string): { secret: string; qrCodeUrl: string } {
    const secret = this.generateMFASecret();
    const issuer = encodeURIComponent('Maskom Network');
    const account = encodeURIComponent(userEmail);
    const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;

    return { secret, qrCodeUrl };
  }

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  async enableMFA(userId: string, secret: string): Promise<boolean> {
    try {
      const backupCodes = this.generateBackupCodes();

      const { error } = await this.supabase
        .from('user_security_profiles')
        .upsert({
          user_id: userId,
          mfa_enabled: true,
          mfa_secret: secret,
          backup_codes: backupCodes,
          updated_at: new Date(),
        });

      if (error) {
        logger.error('Failed to enable MFA', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'enableMFA', userId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('MFA enable error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'enableMFA', userId });
      return false;
    }
  }

  async disableMFA(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_security_profiles')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          backup_codes: null,
          updated_at: new Date(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to disable MFA', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'disableMFA', userId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('MFA disable error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'disableMFA', userId });
      return false;
    }
  }

  async verifyTOTP(secret: string, token: string): Promise<boolean> {
    // This is a simplified TOTP verification
    // In production, you'd use a library like 'otplib'
    try {
      const window = 1; // Allow 1 step before/after for clock drift
      const timeStep = 30; // 30-second time steps

      for (let offset = -window; offset <= window; offset++) {
        const time = Math.floor(Date.now() / 1000 / timeStep) + offset;
        const expectedToken = this.generateTOTPToken(secret, time);

        if (token === expectedToken) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('TOTP verification error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'verifyTOTP', secret });
      return false;
    }
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_security_profiles')
        .select('backup_codes')
        .eq('user_id', userId)
        .single();

      if (error || !profile?.backup_codes) {
        return false;
      }

      const backupCodes = profile.backup_codes as string[];
      const codeIndex = backupCodes.indexOf(code.toUpperCase());

      if (codeIndex === -1) {
        return false;
      }

      // Remove the used backup code
      backupCodes.splice(codeIndex, 1);

      await this.supabase
        .from('user_security_profiles')
        .update({
          backup_codes: backupCodes,
          updated_at: new Date(),
        })
        .eq('user_id', userId);

      return true;
    } catch (error) {
      logger.error('Backup code verification error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'verifyBackupCode', userId, code });
      return false;
    }
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_security_profiles')
        .select('mfa_enabled')
        .eq('user_id', userId)
        .single();

      if (error) {
        return false;
      }

      return profile?.mfa_enabled || false;
    } catch (error) {
      logger.error('MFA status check error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'isMFAEnabled', userId });
      return false;
    }
  }

  async getUserSecurityProfile(
    userId: string
  ): Promise<UserSecurityProfile | null> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_security_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return null;
      }

      return profile as UserSecurityProfile;
    } catch (error) {
      logger.error('Get security profile error', error instanceof Error ? error : new Error(String(error)), { module: 'security', submodule: 'mfa', operation: 'getUserSecurityProfile', userId });
      return null;
    }
  }

  private generateTOTPToken(secret: string, time: number): string {
    // Simplified TOTP token generation
    // In production, use a proper TOTP library
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(time), 0);

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      (((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)) %
      1000000;

    return code.toString().padStart(6, '0');
  }
}

export const mfaService = new MFAService();
