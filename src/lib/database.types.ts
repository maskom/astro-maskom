// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      // Bandwidth monitoring tables
      bandwidth_usage: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          usage_date: string;
          download_bytes: number;
          upload_bytes: number;
          total_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['bandwidth_usage']['Row'],
          'id' | 'created_at' | 'updated_at' | 'total_bytes'
        >;
        Update: Partial<
          Database['public']['Tables']['bandwidth_usage']['Insert']
        >;
      };
      data_caps: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          monthly_cap_gb: number;
          current_usage_gb: number;
          billing_cycle_start: string;
          is_active: boolean;
          notification_thresholds: number[];
          last_notified_at: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['data_caps']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['data_caps']['Insert']>;
      };
      usage_notifications: {
        Row: {
          id: string;
          user_id: string;
          data_cap_id: string;
          threshold_percentage: number;
          notification_type: 'email' | 'sms' | 'dashboard';
          message: string;
          sent_at: string;
          is_read: boolean;
        };
        Insert: Omit<
          Database['public']['Tables']['usage_notifications']['Row'],
          'id' | 'sent_at'
        >;
        Update: Partial<
          Database['public']['Tables']['usage_notifications']['Insert']
        >;
      };
      bandwidth_usage_history: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          total_usage_gb: number;
          package_id: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['bandwidth_usage_history']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['bandwidth_usage_history']['Insert']
        >;
      };

      // Security tables
      security_audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action:
            | 'login'
            | 'logout'
            | 'password_change'
            | 'mfa_enable'
            | 'mfa_disable'
            | 'role_change'
            | 'permission_grant'
            | 'permission_revoke'
            | 'data_access'
            | 'data_export'
            | 'data_delete'
            | 'admin_action'
            | 'security_breach';
          resource: string;
          ip_address: string;
          user_agent: string | null;
          timestamp: string;
          success: boolean;
          details: Record<string, any> | null;
          risk_level: 'low' | 'medium' | 'high' | 'critical';
        };
        Insert: Omit<
          Database['public']['Tables']['security_audit_logs']['Row'],
          'id' | 'timestamp'
        >;
        Update: Partial<
          Database['public']['Tables']['security_audit_logs']['Insert']
        >;
      };
      security_events: {
        Row: {
          id: string;
          type:
            | 'failed_login'
            | 'suspicious_activity'
            | 'brute_force_attempt'
            | 'unauthorized_access'
            | 'data_breach'
            | 'malicious_request'
            | 'anomalous_behavior';
          severity: 'low' | 'medium' | 'high' | 'critical';
          user_id: string | null;
          ip_address: string;
          description: string;
          timestamp: string;
          resolved: boolean;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<
          Database['public']['Tables']['security_events']['Row'],
          'id' | 'timestamp'
        >;
        Update: Partial<
          Database['public']['Tables']['security_events']['Insert']
        >;
      };
      security_alerts: {
        Row: {
          id: string;
          event_id: string;
          type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          user_id: string | null;
          ip_address: string;
          description: string;
          timestamp: string;
          acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<
          Database['public']['Tables']['security_alerts']['Row'],
          'id' | 'timestamp'
        >;
        Update: Partial<
          Database['public']['Tables']['security_alerts']['Insert']
        >;
      };
      failed_login_attempts: {
        Row: {
          id: string;
          email: string;
          ip_address: string;
          user_agent: string | null;
          reason: string | null;
          timestamp: string;
        };
        Insert: Omit<
          Database['public']['Tables']['failed_login_attempts']['Row'],
          'id' | 'timestamp'
        >;
        Update: Partial<
          Database['public']['Tables']['failed_login_attempts']['Insert']
        >;
      };
      user_security_profiles: {
        Row: {
          id: string;
          user_id: string;
          mfa_enabled: boolean;
          mfa_secret: string | null;
          backup_codes: string[] | null;
          role: 'customer' | 'support' | 'admin' | 'super_admin';
          permissions: string[];
          failed_login_attempts: number;
          last_login: string | null;
          password_changed_at: string;
          session_timeout_minutes: number;
          data_retention_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['user_security_profiles']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['user_security_profiles']['Insert']
        >;
      };
      user_sessions: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          ip_address: string;
          user_agent: string | null;
          created_at: string;
          last_activity: string;
          expires_at: string;
          is_active: boolean;
          mfa_verified: boolean;
        };
        Insert: Omit<
          Database['public']['Tables']['user_sessions']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['user_sessions']['Insert']
        >;
      };
      data_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_type:
            | 'marketing'
            | 'analytics'
            | 'personalization'
            | 'legal_compliance'
            | 'data_processing';
          granted: boolean;
          timestamp: string;
          ip_address: string;
          purpose: string;
          legal_basis: string;
          retention_period_days: number;
        };
        Insert: Omit<
          Database['public']['Tables']['data_consents']['Row'],
          'id' | 'timestamp'
        >;
        Update: Partial<
          Database['public']['Tables']['data_consents']['Insert']
        >;
      };

      // Payment tables
      payment_transactions: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          amount: number;
          currency: string;
          status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refund';
          payment_method: Record<string, any>;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['payment_transactions']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['payment_transactions']['Insert']
        >;
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          user_id: string;
          transaction_id: string | null;
          amount: number;
          tax: number;
          total: number;
          due_date: string;
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['invoices']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['invoice_items']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['invoice_items']['Insert']
        >;
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          type: 'credit_card' | 'bank_transfer' | 'ewallet';
          provider: string;
          method_identifier: string;
          display_name: string;
          is_active: boolean;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['payment_methods']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['payment_methods']['Insert']
        >;
      };

      // Status monitoring tables (not in migrations but referenced in code)
      services: {
        Row: {
          id: string;
          name: string;
          status: 'operational' | 'degraded' | 'outage';
          description: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['services']['Row'],
          'id' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      incidents: {
        Row: {
          id: string;
          title: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at: string;
          updated_at: string;
          description: string;
          affected_services: string[];
        };
        Insert: Omit<
          Database['public']['Tables']['incidents']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['incidents']['Insert']>;
      };
      service_uptime: {
        Row: {
          id: string;
          service_id: string;
          period_days: number;
          uptime_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['service_uptime']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['service_uptime']['Insert']
        >;
      };

      // Subscribers table
      subscribers: {
        Row: {
          id: string;
          email: string;
          preferences: Record<string, any>;
          subscribed_at: string;
          confirmed: boolean;
        };
        Insert: Omit<Database['public']['Tables']['subscribers']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['subscribers']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
