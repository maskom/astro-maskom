import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput, sanitizeEmail } from '../../../lib/sanitization';
import { securityAuditLogger } from '../../../lib/security/audit';
import { sessionManager } from '../../../lib/security/session';
import { mfaService } from '../../../lib/security/mfa';
import { withApiMiddleware, setUserContext } from '../../../lib/middleware/api';
import { ErrorFactory, Validation } from '../../../lib/errors';
import { SecurityAction } from '../../../lib/security/types';

export const prerender = false;
export const POST: APIRoute = withApiMiddleware(
  async ({ request, cookies, redirect }) => {
    const formData = await request.formData();
    const email = sanitizeInput(formData.get('email')?.toString());
    const password = formData.get('password')?.toString(); // Don't sanitize password

    // Get client IP and user agent for security logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email || '');

    // Validate required fields
    Validation.required(sanitizedEmail, 'email');
    Validation.required(password, 'password');
    Validation.email(sanitizedEmail);

    if (!password) {
      throw ErrorFactory.missingRequiredField('password');
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    if (error) {
      // Log failed login attempt
      await securityAuditLogger.logFailedLogin(
        sanitizedEmail,
        ipAddress,
        userAgent,
        error.message
      );

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

    // If MFA is enabled, redirect to MFA verification
    if (mfaEnabled) {
      return redirect('/verify-mfa');
    }

    return redirect('/dashboard');
  }
);
