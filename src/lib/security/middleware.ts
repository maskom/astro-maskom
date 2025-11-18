import type { APIContext, AstroCookies } from 'astro';
import { securityAuditLogger } from './audit';
import { rbacService } from './rbac';
import { sessionManager } from './session';
import { dataProtectionService } from './data-protection';
import { logger } from '../logger';
import {
  SecurityAction,
  SecurityEventType,
  SecuritySeverity,
  type Permission,
  type UserRole,
  type SecurityRequest,
  type AuditDetails,
  ConsentType,
} from './types';

export interface SecurityContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  isAuthenticated: boolean;
  mfaVerified: boolean;
  role: UserRole | null;
  permissions: Permission[];
}

export class SecurityMiddleware {
  private static readonly RATE_LIMIT_MAP = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static async createSecurityContext(
    request: Request,
    cookies: AstroCookies
  ): Promise<SecurityContext | null> {
    try {
      const sessionId = cookies.get('session-id')?.value;
      const ipAddress = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';

      if (!sessionId) {
        return null;
      }

      const session = await sessionManager.validateSession(
        sessionId,
        ipAddress
      );

      if (!session) {
        return null;
      }

      const role = await rbacService.getUserRole(session.user_id);
      const permissions = await rbacService.getUserPermissions(session.user_id);

      return {
        userId: session.user_id,
        sessionId: session.session_id,
        ipAddress,
        userAgent,
        isAuthenticated: true,
        mfaVerified: session.mfa_verified,
        role,
        permissions,
      };
    } catch (error) {
      logger.error('Security context creation error', error, {
        module: 'security',
        operation: 'createSecurityContext',
        ipAddress,
        userAgent
      });
      return null;
    }
  }

  static requireAuthentication() {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const securityContext = await this.createSecurityContext(
        context.request,
        context.cookies
      );

      if (!securityContext) {
        return new Response('Authentication required', { status: 401 });
      }

      // Attach security context to the request for use in handlers
      (context.request as SecurityRequest).securityContext = securityContext;

      return await next();
    };
  }

  static requireMFA() {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const securityContext = await this.createSecurityContext(
        context.request,
        context.cookies
      );

      if (!securityContext || !securityContext.mfaVerified) {
        return new Response('MFA verification required', { status: 401 });
      }

      (context.request as SecurityRequest).securityContext = securityContext;

      return await next();
    };
  }

  static requirePermission(permission: Permission) {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const securityContext = await this.createSecurityContext(
        context.request,
        context.cookies
      );

      if (!securityContext) {
        return new Response('Authentication required', { status: 401 });
      }

      const hasPermission = await rbacService.hasPermission(
        securityContext.userId,
        permission
      );

      if (!hasPermission) {
        await securityAuditLogger.logSecurityAction(
          securityContext.userId,
          SecurityAction.UNAUTHORIZED_ACCESS,
          context.url.pathname,
          securityContext.ipAddress,
          securityContext.userAgent,
          false,
          { required_permission: permission }
        );

        return new Response('Insufficient permissions', { status: 403 });
      }

      (context.request as SecurityRequest).securityContext = securityContext;

      return await next();
    };
  }

  static requireRole(role: UserRole) {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const securityContext = await this.createSecurityContext(
        context.request,
        context.cookies
      );

      if (!securityContext) {
        return new Response('Authentication required', { status: 401 });
      }

      const hasRole = await rbacService.hasRole(securityContext.userId, role);

      if (!hasRole) {
        await securityAuditLogger.logSecurityAction(
          securityContext.userId,
          SecurityAction.UNAUTHORIZED_ACCESS,
          context.url.pathname,
          securityContext.ipAddress,
          securityContext.userAgent,
          false,
          { required_role: role }
        );

        return new Response('Insufficient role privileges', { status: 403 });
      }

      (context.request as SecurityRequest).securityContext = securityContext;

      return await next();
    };
  }

  static requireDataConsent(consentType: ConsentType) {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const securityContext = await this.createSecurityContext(
        context.request,
        context.cookies
      );

      if (!securityContext) {
        return new Response('Authentication required', { status: 401 });
      }

      const hasConsent = await dataProtectionService.hasDataConsent(
        securityContext.userId,
        consentType
      );

      if (!hasConsent) {
        return new Response('Data consent required', { status: 451 });
      }

      (context.request as SecurityRequest).securityContext = securityContext;

      return await next();
    };
  }

  static rateLimit(maxRequests: number, windowMinutes: number = 15) {
    return async (context: APIContext, next: () => Promise<Response>) => {
      const ipAddress = this.getClientIP(context.request);
      const key = `${ipAddress}:${context.url.pathname}`;
      const now = Date.now();
      const windowMs = windowMinutes * 60 * 1000;

      const current = this.RATE_LIMIT_MAP.get(key);

      if (!current || now > current.resetTime) {
        this.RATE_LIMIT_MAP.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        return await next();
      }

      if (current.count >= maxRequests) {
        await securityAuditLogger.createSecurityEvent(
          SecurityEventType.BRUTE_FORCE_ATTEMPT,
          SecuritySeverity.MEDIUM,
          undefined,
          ipAddress,
          `Rate limit exceeded: ${maxRequests} requests per ${windowMinutes} minutes`
        );

        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (current.resetTime - now) / 1000
            ).toString(),
          },
        });
      }

      current.count++;
      return await next();
    };
  }

  static async logSecurityActivity(
    context: APIContext,
    action: SecurityAction,
    resource: string,
    success: boolean,
    details?: AuditDetails
  ): Promise<void> {
    const securityContext = (context.request as SecurityRequest)
      .securityContext;

    if (securityContext) {
      await securityAuditLogger.logSecurityAction(
        securityContext.userId,
        action,
        resource,
        securityContext.ipAddress,
        securityContext.userAgent,
        success,
        details
      );
    }
  }

  static async detectSuspiciousActivity(context: APIContext): Promise<boolean> {
    const securityContext = await this.createSecurityContext(
      context.request,
      context.cookies
    );

    if (!securityContext) {
      return false;
    }

    // Check for suspicious sessions
    const suspiciousSessions = await sessionManager.detectSuspiciousSessions(
      securityContext.userId
    );

    if (suspiciousSessions.length > 0) {
      await securityAuditLogger.createSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.HIGH,
        securityContext.userId,
        securityContext.ipAddress,
        'Suspicious session activity detected',
        { suspicious_sessions_count: suspiciousSessions.length }
      );

      return true;
    }

    return false;
  }

  static getClientIP(request: Request): string {
    // Try various headers for the real IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to a default or remote address
    return 'unknown';
  }

  static async cleanup() {
    // Cleanup expired sessions
    await sessionManager.cleanupExpiredSessions();

    // Delete expired data
    await dataProtectionService.deleteExpiredData();

    // Cleanup rate limit map
    const now = Date.now();
    for (const [key, value] of this.RATE_LIMIT_MAP.entries()) {
      if (now > value.resetTime) {
        this.RATE_LIMIT_MAP.delete(key);
      }
    }
  }
}

// Helper function to get security context in API routes
export function getSecurityContext(request: Request): SecurityContext | null {
  return (request as SecurityRequest).securityContext || null;
}

// Helper function to check permissions in API routes
export async function checkPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  return await rbacService.hasPermission(userId, permission);
}

// Helper function to check role in API routes
export async function checkRole(
  userId: string,
  role: UserRole
): Promise<boolean> {
  return await rbacService.hasRole(userId, role);
}
