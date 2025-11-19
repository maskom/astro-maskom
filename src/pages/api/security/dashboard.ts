import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logger';
import { securityAuditLogger } from '../../../lib/security/audit';
import { rbacService } from '../../../lib/security/rbac';
import { sessionManager } from '../../../lib/security/session';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import {
  Permission,
  SecuritySeverity,
  UserRole,
} from '../../../lib/security/types';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  let securityContext: {
    userId: string;
    permissions: string[];
    role: string;
  } | null = null;
  try {
    securityContext = await SecurityMiddleware.createSecurityContext(
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
    let userSessions: unknown[] = [];
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

    // Get CSP violation statistics
    const cspStats = await getCSPStats(securityContext.userId);

    return new Response(
      JSON.stringify({
        events,
        auditLogs,
        userSessions,
        stats,
        cspStats,
        permissions: securityContext.permissions,
        role: securityContext.role,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error(
      'Security dashboard error',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'api',
        endpoint: 'security/dashboard',
        method: 'GET',
        userId: securityContext?.userId,
      }
    );
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
    logger.error(
      'Security stats error',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'api',
        endpoint: 'security/dashboard',
        operation: 'getSecurityStats',
        userId,
      }
    );
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

async function getCSPStats(userId: string) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get CSP violations from logs (this would ideally query a database)
    const allLogs = await securityAuditLogger.getAuditLogs(
      undefined,
      undefined,
      5000
    );

    // Filter CSP-related logs
    const cspLogs = allLogs.filter(
      log =>
        log.details &&
        typeof log.details === 'object' &&
        log.details !== null &&
        'violationType' in log.details &&
        log.details.violationType === 'CSP violation'
    );

    // Recent violations (last 24 hours)
    const recentViolations = cspLogs.filter(
      log => new Date(log.timestamp) > twentyFourHoursAgo
    );

    // Weekly violations
    const weeklyViolations = cspLogs.filter(
      log => new Date(log.timestamp) > sevenDaysAgo
    );

    // Categorize by severity
    const highSeverityViolations = weeklyViolations.filter(
      log =>
        log.details &&
        typeof log.details === 'object' &&
        log.details !== null &&
        'severity' in log.details &&
        log.details.severity === 'high'
    ).length;

    const mediumSeverityViolations = weeklyViolations.filter(
      log =>
        log.details &&
        typeof log.details === 'object' &&
        log.details !== null &&
        'severity' in log.details &&
        log.details.severity === 'medium'
    ).length;

    const lowSeverityViolations = weeklyViolations.filter(
      log =>
        log.details &&
        typeof log.details === 'object' &&
        log.details !== null &&
        'severity' in log.details &&
        log.details.severity === 'low'
    ).length;

    // Most common violated directives
    const directiveCounts: Record<string, number> = {};
    weeklyViolations.forEach(log => {
      if (
        log.details &&
        typeof log.details === 'object' &&
        log.details !== null &&
        'violatedDirective' in log.details &&
        typeof log.details.violatedDirective === 'string'
      ) {
        const directive = log.details.violatedDirective;
        directiveCounts[directive] = (directiveCounts[directive] || 0) + 1;
      }
    });

    const mostCommonViolations = Object.entries(directiveCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([directive, count]) => ({ directive, count }));

    return {
      totalViolations24h: recentViolations.length,
      totalViolations7d: weeklyViolations.length,
      highSeverityViolations,
      mediumSeverityViolations,
      lowSeverityViolations,
      mostCommonViolations,
      lastViolation:
        recentViolations.length > 0 ? recentViolations[0].timestamp : null,
    };
  } catch (error) {
    logger.error(
      'CSP stats error',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'api',
        endpoint: 'security/dashboard',
        operation: 'getCSPStats',
        userId,
      }
    );
    return {
      totalViolations24h: 0,
      totalViolations7d: 0,
      highSeverityViolations: 0,
      mediumSeverityViolations: 0,
      lowSeverityViolations: 0,
      mostCommonViolations: [],
      lastViolation: null,
    };
  }
}
