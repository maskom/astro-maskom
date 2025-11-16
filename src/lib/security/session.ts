import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { SessionSecurity } from './types';

export class SessionManager {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    timeoutMinutes: number = 30
  ): Promise<string | null> {
    try {
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

      const session: Omit<SessionSecurity, 'id'> = {
        session_id: sessionId,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date(),
        last_activity: new Date(),
        expires_at: expiresAt,
        is_active: true,
        mfa_verified: false,
      };

      const { error } = await this.supabase
        .from('user_sessions')
        .insert(session);

      if (error) {
        console.error('Failed to create session:', error);
        return null;
      }

      return sessionId;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }

  async validateSession(
    sessionId: string,
    ipAddress?: string
  ): Promise<SessionSecurity | null> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      const { data: session, error } = await query;

      if (error || !session) {
        return null;
      }

      // Optional IP address validation for security
      if (ipAddress && session.ip_address !== ipAddress) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);

      return session as SessionSecurity;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          updated_at: new Date(),
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Failed to invalidate session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session invalidation error:', error);
      return false;
    }
  }

  async invalidateAllUserSessions(
    userId: string,
    exceptSessionId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          updated_at: new Date(),
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (exceptSessionId) {
        query = query.neq('session_id', exceptSessionId);
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to invalidate user sessions:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('User sessions invalidation error:', error);
      return false;
    }
  }

  async extendSession(
    sessionId: string,
    additionalMinutes: number = 30
  ): Promise<boolean> {
    try {
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          expires_at: newExpiresAt,
          last_activity: new Date(),
          updated_at: new Date(),
        })
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to extend session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session extension error:', error);
      return false;
    }
  }

  async verifyMFAForSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          mfa_verified: true,
          updated_at: new Date(),
        })
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to verify MFA for session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('MFA session verification error:', error);
      return false;
    }
  }

  async getUserActiveSessions(userId: string): Promise<SessionSecurity[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Failed to get user sessions:', error);
        return [];
      }

      return sessions as SessionSecurity[];
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false, updated_at: new Date() })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (error) {
        console.error('Failed to cleanup expired sessions:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  async detectSuspiciousSessions(userId: string): Promise<SessionSecurity[]> {
    try {
      const sessions = await this.getUserActiveSessions(userId);
      const suspiciousSessions: SessionSecurity[] = [];

      // Check for sessions from multiple IP addresses
      const ipAddresses = new Set(sessions.map(s => s.ip_address));
      if (ipAddresses.size > 2) {
        suspiciousSessions.push(...sessions);
      }

      // Check for old sessions (more than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldSessions = sessions.filter(
        s => new Date(s.created_at) < oneDayAgo
      );
      suspiciousSessions.push(...oldSessions);

      // Check for sessions with unusual user agents
      const userAgents = sessions.map(s => s.user_agent);
      const uniqueUserAgents = new Set(userAgents);
      if (uniqueUserAgents.size > 3) {
        suspiciousSessions.push(...sessions);
      }

      return [...new Set(suspiciousSessions)];
    } catch (error) {
      console.error('Suspicious session detection error:', error);
      return [];
    }
  }

  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .update({
          last_activity: new Date(),
          updated_at: new Date(),
        })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Session activity update error:', error);
    }
  }

  // Middleware helper for session validation
  requireValidSession() {
    return async (
      sessionId: string,
      ipAddress?: string
    ): Promise<SessionSecurity | null> => {
      return await this.validateSession(sessionId, ipAddress);
    };
  }

  // Middleware helper for MFA verification
  requireMFAVerification() {
    return async (sessionId: string): Promise<boolean> => {
      try {
        const { data: session, error } = await this.supabase
          .from('user_sessions')
          .select('mfa_verified')
          .eq('session_id', sessionId)
          .eq('is_active', true)
          .single();

        if (error || !session) {
          return false;
        }

        return session.mfa_verified;
      } catch (error) {
        console.error('MFA verification check error:', error);
        return false;
      }
    };
  }
}

export const sessionManager = new SessionManager();
