import type {
  SecurityAuditLog,
  SecurityEvent,
  SecurityAction,
  SecurityEventType,
  SecuritySeverity,
  RiskLevel,
} from './types';
import { createClient } from '@supabase/supabase-js';

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
    details?: Record<string, any>
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
        console.error('Failed to log security action:', error);
      }

      // Create security event for high-risk actions
      if (
        riskLevel === ('high' as RiskLevel) ||
        riskLevel === ('critical' as RiskLevel)
      ) {
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
      console.error('Security audit logging error:', error);
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
      console.error('Failed login logging error:', error);
    }
  }

  async createSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    userId?: string,
    ipAddress?: string,
    description?: string,
    metadata?: Record<string, any>
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
        console.error('Failed to create security event:', error);
      }

      // For critical events, trigger immediate alerts
      if (severity === SecuritySeverity.CRITICAL) {
        await this.triggerSecurityAlert(securityEvent);
      }
    } catch (error) {
      console.error('Security event creation error:', error);
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
        console.error('Failed to fetch security events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Security events fetch error:', error);
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
        console.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Audit logs fetch error:', error);
      return [];
    }
  }

  private calculateRiskLevel(
    action: SecurityAction,
    success: boolean,
    _details?: Record<string, any>
  ): RiskLevel {
    if (!success) {
      return 'medium' as RiskLevel;
    }

    const highRiskActions = [
      'role_change' as SecurityAction,
      'permission_grant' as SecurityAction,
      'permission_revoke' as SecurityAction,
      'data_delete' as SecurityAction,
      'admin_action' as SecurityAction,
      'security_breach' as SecurityAction,
    ];

    if (highRiskActions.includes(action)) {
      return 'high' as RiskLevel;
    }

    const mediumRiskActions = [
      'mfa_disable' as SecurityAction,
      'password_change' as SecurityAction,
      'data_export' as SecurityAction,
    ];

    if (mediumRiskActions.includes(action)) {
      return 'medium' as RiskLevel;
    }

    return 'low' as RiskLevel;
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
        console.error('Failed to get recent failed logins:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Recent failed logins error:', error);
      return 0;
    }
  }

  private async triggerSecurityAlert(
    event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>
  ): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.error('🚨 CRITICAL SECURITY ALERT:', {
      type: event.type,
      severity: event.severity,
      user_id: event.user_id,
      ip_address: event.ip_address,
      description: event.description,
      timestamp: new Date().toISOString(),
    });

    // Store alert for admin dashboard
    try {
      await this.supabase.from('security_alerts').insert({
        ...event,
        timestamp: new Date(),
        acknowledged: false,
      });
    } catch (error) {
      console.error('Failed to store security alert:', error);
    }
  }
}

export const securityAuditLogger = new SecurityAuditLogger();
