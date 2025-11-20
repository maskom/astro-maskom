import type { APIRoute } from 'astro';
import { mfaService } from '../../../lib/security/mfa';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import { securityAuditLogger } from '../../../lib/security/audit';
import { SecurityAction } from '../../../lib/security/types';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import { AuthSchemas, ValidatedMFAData } from '../../../lib/validation/schemas';

export const prerender = false;

export const POST: APIRoute = validateRequest({
  email: AuthSchemas.register.email,
})(async ({ request, cookies, validatedData, requestId }) => {
  try {
    const { email } = (validatedData || {}) as unknown as ValidatedMFAData;

    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      logger.warn('MFA setup: Authentication required', {
        requestId,
      });
      return new Response('Authentication required', { status: 401 });
    }

    logger.info('MFA setup initiated', {
      requestId,
      userId: securityContext.userId,
      email,
    });

    // Generate TOTP secret
    const { secret, qrCodeUrl } = mfaService.generateTOTPSecret(email);

    // In a real implementation, you would generate a QR code image
    // For now, we'll return the URL that can be used to generate one

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_ENABLE,
      'mfa_setup',
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { email, secret_generated: true }
    );

    logger.info('MFA secret generated', {
      requestId,
      userId: securityContext.userId,
    });

    return new Response(
      JSON.stringify({
        secret,
        qrCodeUrl,
        instructions:
          'Scan this QR code with your authenticator app or enter the secret manually',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId || 'unknown',
        },
      }
    );
  } catch (error) {
    logger.error('MFA setup error', error as Error, { requestId });
    return new Response('Failed to setup MFA', { status: 500 });
  }
});

export const PUT: APIRoute = validateRequest(AuthSchemas.setupMFA)(async ({
  request,
  cookies,
  validatedData,
  requestId,
}) => {
  try {
    const { secret, code } = (validatedData ||
      {}) as unknown as ValidatedMFAData;

    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      logger.warn('MFA enable: Authentication required', {
        requestId,
      });
      return new Response('Authentication required', { status: 401 });
    }

    logger.info('MFA enable attempt', {
      requestId,
      userId: securityContext.userId,
    });

    // Verify the TOTP code
    if (!secret || !code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Secret and code are required',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const isValid = await mfaService.verifyTOTP(secret, code);

    if (!isValid) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        SecurityAction.MFA_ENABLE,
        'mfa_verification',
        securityContext.ipAddress,
        securityContext.userAgent,
        false,
        { reason: 'invalid_verification_code' }
      );

      logger.warn('MFA enable: Invalid verification code', {
        requestId,
        userId: securityContext.userId,
      });

      return new Response('Invalid verification code', { status: 400 });
    }

    // Enable MFA for the user
    const success = await mfaService.enableMFA(securityContext.userId, secret);

    if (!success) {
      logger.error('MFA enable: Failed to enable MFA', undefined, {
        requestId,
        userId: securityContext.userId,
      });
      return new Response('Failed to enable MFA', { status: 500 });
    }

    // Generate backup codes
    const backupCodes = mfaService.generateBackupCodes();

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_ENABLE,
      'mfa_enabled',
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { backup_codes_count: backupCodes.length }
    );

    logger.info('MFA enabled successfully', {
      requestId,
      userId: securityContext.userId,
      backupCodesCount: backupCodes.length,
    });

    return new Response(
      JSON.stringify({
        message: 'MFA enabled successfully',
        backupCodes,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId || 'unknown',
        },
      }
    );
  } catch (error) {
    logger.error('MFA enable error', error as Error, { requestId });
    return new Response('Failed to enable MFA', { status: 500 });
  }
});

export const DELETE: APIRoute = validateRequest({
  code: AuthSchemas.setupMFA.code,
})(async ({ request, cookies, validatedData, requestId }) => {
  try {
    const { code } = (validatedData || {}) as unknown as ValidatedMFAData;

    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      logger.warn('MFA disable: Authentication required', {
        requestId,
      });
      return new Response('Authentication required', { status: 401 });
    }

    logger.info('MFA disable attempt', {
      requestId,
      userId: securityContext.userId,
    });

    // Get current MFA secret to verify
    const profile = await mfaService.getUserSecurityProfile(
      securityContext.userId
    );

    if (!profile?.mfa_secret) {
      return new Response('MFA is not enabled', { status: 400 });
    }

    // Verify the TOTP code before disabling
    if (!code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Verification code is required',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const isValid = await mfaService.verifyTOTP(profile.mfa_secret, code);

    if (!isValid) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        SecurityAction.MFA_DISABLE,
        'mfa_disable_attempt',
        securityContext.ipAddress,
        securityContext.userAgent,
        false,
        { reason: 'invalid_verification_code' }
      );

      logger.warn('MFA disable: Invalid verification code', {
        requestId,
        userId: securityContext.userId,
      });

      return new Response('Invalid verification code', { status: 400 });
    }

    // Disable MFA
    const success = await mfaService.disableMFA(securityContext.userId);

    if (!success) {
      logger.error('MFA disable: Failed to disable MFA', undefined, {
        requestId,
        userId: securityContext.userId,
      });
      return new Response('Failed to disable MFA', { status: 500 });
    }

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.MFA_DISABLE,
      'mfa_disabled',
      securityContext.ipAddress,
      securityContext.userAgent,
      true
    );

    logger.info('MFA disabled successfully', {
      requestId,
      userId: securityContext.userId,
    });

    return new Response(
      JSON.stringify({
        message: 'MFA disabled successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId || 'unknown',
        },
      }
    );
  } catch (error) {
    logger.error('MFA disable error', error as Error, { requestId });
    return new Response('Failed to disable MFA', { status: 500 });
  }
});
