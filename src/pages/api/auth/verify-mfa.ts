import type { APIRoute } from 'astro';
import { mfaService } from '../../../lib/security/mfa';
import { sessionManager } from '../../../lib/security/session';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import { securityAuditLogger } from '../../../lib/security/audit';
import { SecurityAction } from '../../../lib/security/types';
import { logger, generateRequestId } from '../../../lib/logger';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = generateRequestId();
  
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    const { code, backupCode } = await request.json();

    if (!code && !backupCode) {
      return new Response('Verification code or backup code is required', {
        status: 400,
      });
    }

    let isValid = false;
    let verificationMethod = '';

    if (code) {
      // Verify TOTP code
      const profile = await mfaService.getUserSecurityProfile(
        securityContext.userId
      );

      if (!profile?.mfa_secret) {
        return new Response('MFA is not enabled', { status: 400 });
      }

      isValid = await mfaService.verifyTOTP(profile.mfa_secret, code);
      verificationMethod = 'totp';
    } else if (backupCode) {
      // Verify backup code
      isValid = await mfaService.verifyBackupCode(
        securityContext.userId,
        backupCode
      );
      verificationMethod = 'backup_code';
    }

    if (!isValid) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        SecurityAction.LOGIN,
        'mfa_verification',
        securityContext.ipAddress,
        securityContext.userAgent,
        false,
        {
          reason: 'invalid_mfa_code',
          verification_method: verificationMethod,
        }
      );

      return new Response('Invalid verification code', { status: 400 });
    }

    // Mark MFA as verified for the session
    const sessionUpdated = await sessionManager.verifyMFAForSession(
      securityContext.sessionId
    );

    if (!sessionUpdated) {
      return new Response('Failed to verify MFA for session', { status: 500 });
    }

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.LOGIN,
      'mfa_verified',
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { verification_method: verificationMethod }
    );

    return new Response(
      JSON.stringify({
        message: 'MFA verification successful',
        verified: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.apiError('MFA verification error', error, {
      requestId,
      endpoint: '/api/auth/verify-mfa',
      method: 'POST',
      verificationMethod
    });
    return new Response('Failed to verify MFA', { status: 500 });
  }
};
