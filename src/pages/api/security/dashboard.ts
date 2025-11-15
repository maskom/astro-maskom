import type { APIRoute } from 'astro';
import { securityAuditLogger } from '../../../lib/security/audit';
import { rbacService } from '../../../lib/security/rbac';
import { sessionManager } from '../../../lib/security/session';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import {
  Permission,
  SecuritySeverity,
  UserRole,
  SessionSecurity,
} from '../../../lib/security/types';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    // Check if user has permission to view security logs
    const hasPermission = await rbacService.hasPermission(
      securityContext.userId,
      Permission.VIEW_SECURITY_LOGS
    );

    if (!hasPermission) {
      return new Response('Insufficient permissions', { status: 403 });
    }

    const searchParams = new URLSearchParams(url.search);
    const limit = parseInt(searchParams.get('limit') || '100');
    const severity = searchParams.get('severity') as
      | SecuritySeverity
      | undefined;
    const userId = searchParams.get('userId') || undefined;

    // Get security events
    const events = await securityAuditLogger.getSecurityEvents(
      userId,
      severity,
      limit
    );

    // Get audit logs
    const auditLogs = await securityAuditLogger.getAuditLogs(
      userId,
      undefined,
      limit
    );

    // Get user sessions if admin
    let userSessions: SessionSecurity[] = [];
    if (await rbacService.hasRole(securityContext.userId, UserRole.ADMIN)) {
      if (userId) {
        userSessions = await sessionManager.getUserActiveSessions(userId);
      }
    } else {
      userSessions = await sessionManager.getUserActiveSessions(
        securityContext.userId
      );
    }

    // Get summary statistics
    const stats = await getSecurityStats(securityContext.userId);

    return new Response(
      JSON.stringify({
        events,
        auditLogs,
        userSessions,
        stats,
        permissions: securityContext.permissions,
        role: securityContext.role,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Security dashboard error:', error);
    return new Response('Failed to fetch security data', { status: 500 });
  }
};

async function getSecurityStats(userId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get recent security events
    const recentEvents = await securityAuditLogger.getSecurityEvents(
      undefined,
      undefined,
      1000
    );
    const recentCriticalEvents = recentEvents.filter(
      e =>
        e.severity === SecuritySeverity.CRITICAL &&
        new Date(e.timestamp) > thirtyDaysAgo
    );

    // Get recent audit logs
    const recentLogs = await securityAuditLogger.getAuditLogs(
      userId,
      undefined,
      1000
    );
    const failedLogins = recentLogs.filter(
      log => !log.success && log.action === 'login'
    );

    // Get active sessions
    const activeSessions = await sessionManager.getUserActiveSessions(userId);
    const suspiciousSessions =
      await sessionManager.detectSuspiciousSessions(userId);

    return {
      criticalEvents: recentCriticalEvents.length,
      failedLogins: failedLogins.length,
      activeSessions: activeSessions.length,
      suspiciousSessions: suspiciousSessions.length,
      lastLogin:
        recentLogs.find(log => log.action === 'login' && log.success)
          ?.timestamp || null,
      mfaEnabled: await (
        await import('../../../lib/security/mfa')
      ).mfaService.isMFAEnabled(userId),
    };
  } catch (error) {
    console.error('Security stats error:', error);
    return {
      criticalEvents: 0,
      failedLogins: 0,
      activeSessions: 0,
      suspiciousSessions: 0,
      lastLogin: null,
      mfaEnabled: false,
    };
  }
}
