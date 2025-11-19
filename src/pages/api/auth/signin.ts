import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { securityAuditLogger } from '../../../lib/security/audit';
import { sessionManager } from '../../../lib/security/session';
import { mfaService } from '../../../lib/security/mfa';
import { withApiMiddleware, setUserContext } from '../../../lib/middleware/api';
import { ErrorFactory } from '../../../lib/errors';
import { SecurityAction } from '../../../lib/security/types';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import { AuthSchemas } from '../../../lib/validation/schemas';

export const prerender = false;
export const POST: APIRoute = withApiMiddleware(
  validateRequest(AuthSchemas.signIn)(
    async ({ request, cookies, redirect, validatedData, requestId }) => {
      const { email, password } = validatedData;

      // Get client IP and user agent for security logging
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      logger.info('User sign in attempt', {
        requestId,
        email,
        ipAddress,
        userAgent,
      });

      const supabase = createServerClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        await securityAuditLogger.logFailedLogin(
          email,
          ipAddress,
          userAgent,
          error.message
        );

        logger.warn('Sign in failed', {
          requestId,
          email,
          ipAddress,
          error: error.message,
        });

        throw ErrorFactory.invalidCredentials();
      }

      const user = data.user;
      const { access_token, refresh_token } = data.session;

      // Check if MFA is enabled for this user
      const mfaEnabled = await mfaService.isMFAEnabled(user.id);

      // Create session
      const sessionId = await sessionManager.createSession(
        user.id,
        ipAddress,
        userAgent,
        30 // 30 minutes timeout
      );

      if (!sessionId) {
        throw ErrorFactory.internalError('Failed to create session');
      }

      // Set session cookie
      cookies.set('session-id', sessionId, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });

      // Set Supabase tokens
      cookies.set('sb-access-token', access_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });
      cookies.set('sb-refresh-token', refresh_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      });

      // Set user context for logging
      setUserContext(request, user.id);

      // Log successful login
      await securityAuditLogger.logSecurityAction(
        user.id,
        SecurityAction.LOGIN,
        'authentication',
        ipAddress,
        userAgent,
        true,
        { mfa_required: mfaEnabled }
      );

      logger.info('Sign in successful', {
        requestId,
        userId: user.id,
        email,
        mfaRequired: mfaEnabled,
      });

      // If MFA is enabled, redirect to MFA verification
      if (mfaEnabled) {
        return redirect('/verify-mfa');
      }

      return redirect('/dashboard');
    }
  )
);
