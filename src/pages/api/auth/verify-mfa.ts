import type { APIRoute } from 'astro';
import { mfaService } from '../../../lib/security/mfa';
import { sessionManager } from '../../../lib/security/session';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import { securityAuditLogger } from '../../../lib/security/audit';
import { SecurityAction } from '../../../lib/security/types';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import {
  AuthSchemas,
  ValidatedVerifyMFAData,
} from '../../../lib/validation/schemas';

export const prerender = false;

export const POST: APIRoute = validateRequest(AuthSchemas.verifyMFA)(async ({
  request,
  cookies,
  validatedData,
  requestId,
}) => {
  try {
    const { code } = (validatedData || {}) as unknown as ValidatedVerifyMFAData;

    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      logger.warn('MFA verification: Authentication required', {
        requestId,
      });
      return new Response('Authentication required', { status: 401 });
    }

    logger.info('MFA verification attempt', {
      requestId,
      userId: securityContext.userId,
      verificationMethod: 'totp',
    });

    // Verify TOTP code
    const profile = await mfaService.getUserSecurityProfile(
      securityContext.userId
    );

    if (!profile?.mfa_secret) {
      logger.warn('MFA verification: MFA not enabled', {
        requestId,
        userId: securityContext.userId,
      });
      return new Response('MFA is not enabled', { status: 400 });
    }

    const isValid = await mfaService.verifyTOTP(profile.mfa_secret, code);

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
          verification_method: 'totp',
        }
      );

      logger.warn('MFA verification: Invalid code', {
        requestId,
        userId: securityContext.userId,
      });

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
      { verification_method: 'totp' }
    );

    logger.info('MFA verification successful', {
      requestId,
      userId: securityContext.userId,
    });

    return new Response(
      JSON.stringify({
        message: 'MFA verification successful',
        verified: true,
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
    logger.error('MFA verification error', error as Error, { requestId });
    return new Response('Failed to verify MFA', { status: 500 });
  }
});
