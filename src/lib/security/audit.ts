import type {
  SecurityAuditLog,
  SecurityEvent,
  AuditDetails,
  EventMetadata,
} from './types';
import {
  SecurityAction,
  SecurityEventType,
  SecuritySeverity,
  RiskLevel,
} from './types';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';

export class SecurityAuditLogger {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  async logSecurityAction(
    userId: string,
    action: SecurityAction,
    resource: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details?: AuditDetails
  ): Promise<void> {
    const riskLevel = this.calculateRiskLevel(action, success, details);

    const auditLog: Omit<SecurityAuditLog, 'id' | 'timestamp'> = {
      user_id: userId,
      action,
      resource,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      details,
      risk_level: riskLevel,
    };

    try {
      const { error } = await this.supabase
        .from('security_audit_logs')
        .insert(auditLog);

      if (error) {
        logger.error('Failed to log security action', error, {
          module: 'security',
          operation: 'logSecurityAction',
          userId,
          action,
          resource,
          riskLevel,
        });
      }

      // Create security event for high-risk actions
      if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
        await this.createSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          SecuritySeverity.HIGH,
          userId,
          ipAddress,
          `High-risk action detected: ${action} on ${resource}`,
          details
        );
      }
    } catch (error) {
      logger.error('Security audit logging error', error, {
        module: 'security',
        operation: 'logSecurityAction',
        userId,
        action,
        resource,
      });
    }
  }

  async logFailedLogin(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string
  ): Promise<void> {
    try {
      // Check for brute force attempts
      const recentFailures = await this.getRecentFailedLogins(ipAddress, 15); // Last 15 minutes

      if (recentFailures >= 5) {
        await this.createSecurityEvent(
          SecurityEventType.BRUTE_FORCE_ATTEMPT,
          SecuritySeverity.HIGH,
          undefined,
          ipAddress,
          `Multiple failed login attempts detected for ${email}`,
          { email, attempts: recentFailures, reason }
        );
      }

      // Log the failed attempt
      await this.supabase.from('failed_login_attempts').insert({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed login logging error', error, {
        module: 'security',
        operation: 'logFailedLogin',
        email,
        ipAddress,
        reason,
      });
    }
  }

  async createSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    userId?: string,
    ipAddress?: string,
    description?: string,
    metadata?: EventMetadata
  ): Promise<void> {
    const securityEvent: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'> =
      {
        type,
        severity,
        user_id: userId,
        ip_address: ipAddress || 'unknown',
        description: description || `${type} detected`,
        metadata,
      };

    try {
      const { error } = await this.supabase
        .from('security_events')
        .insert(securityEvent);

      if (error) {
        logger.error('Failed to create security event', error, {
          module: 'security',
          operation: 'createSecurityEvent',
          eventType,
          severity,
          userId,
        });
      }

      // For critical events, trigger immediate alerts
      if (severity === SecuritySeverity.CRITICAL) {
        await this.triggerSecurityAlert(securityEvent);
      }
    } catch (error) {
      logger.error('Security event creation error', error, {
        module: 'security',
        operation: 'createSecurityEvent',
        eventType,
        severity,
        userId,
      });
    }
  }

  async getSecurityEvents(
    userId?: string,
    severity?: SecuritySeverity,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    try {
      let query = this.supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch security events', error, {
          module: 'security',
          operation: 'fetchSecurityEvents',
          userId,
          severity,
          limit,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Security events fetch error', error, {
        module: 'security',
        operation: 'fetchSecurityEvents',
        userId,
        severity,
        limit,
      });
      return [];
    }
  }

  async getAuditLogs(
    userId?: string,
    action?: SecurityAction,
    limit: number = 100
  ): Promise<SecurityAuditLog[]> {
    try {
      let query = this.supabase
        .from('security_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch audit logs', error, {
          module: 'security',
          operation: 'getAuditLogs',
          userId,
          action,
          limit,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Audit logs fetch error', error, {
        module: 'security',
        operation: 'getAuditLogs',
        userId,
        action,
        limit,
      });
      return [];
    }
  }

  private calculateRiskLevel(
    action: SecurityAction,
    success: boolean,
    _details?: AuditDetails
  ): RiskLevel {
    if (!success) {
      return RiskLevel.MEDIUM;
    }

    const highRiskActions = [
      SecurityAction.ROLE_CHANGE,
      SecurityAction.PERMISSION_GRANT,
      SecurityAction.PERMISSION_REVOKE,
      SecurityAction.DATA_DELETE,
      SecurityAction.ADMIN_ACTION,
      SecurityAction.SECURITY_BREACH,
    ];

    if (highRiskActions.includes(action)) {
      return RiskLevel.HIGH;
    }

    const mediumRiskActions = [
      SecurityAction.MFA_DISABLE,
      SecurityAction.PASSWORD_CHANGE,
      SecurityAction.DATA_EXPORT,
    ];

    if (mediumRiskActions.includes(action)) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  private async getRecentFailedLogins(
    ipAddress: string,
    minutes: number
  ): Promise<number> {
    try {
      const since = new Date(Date.now() - minutes * 60 * 1000);

      const { count, error } = await this.supabase
        .from('failed_login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ipAddress)
        .gte('timestamp', since.toISOString());

      if (error) {
        logger.error('Failed to get recent failed logins', error, {
          module: 'security',
          operation: 'getRecentFailedLogins',
          ipAddress,
          minutes,
        });
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Recent failed logins error', error, {
        module: 'security',
        operation: 'getRecentFailedLogins',
        ipAddress,
        minutes,
      });
      return 0;
    }
  }

  private async triggerSecurityAlert(
    event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>
  ): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    logger.error('🚨 CRITICAL SECURITY ALERT', undefined, {
      module: 'security',
      operation: 'triggerSecurityAlert',
      eventType: event.type,
      severity: event.severity,
      userId: event.user_id,
      ipAddress: event.ip_address,
      description: event.description,
      alertType: 'CRITICAL_SECURITY_ALERT',
    });

    // Store alert for admin dashboard
    try {
      await this.supabase.from('security_alerts').insert({
        ...event,
        timestamp: new Date(),
        acknowledged: false,
      });
    } catch (error) {
      logger.error('Failed to store security alert', error, {
        module: 'security',
        operation: 'triggerSecurityAlert',
        eventType: event.type,
        severity: event.severity,
        userId: event.user_id,
      });
    }
  }
}

export const securityAuditLogger = new SecurityAuditLogger();
