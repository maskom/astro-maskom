// Database type definitions for Supabase

export interface SubscriberPreferences {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  inAppNotifications?: boolean;
  pushNotifications?: boolean;
  outageNotifications?: boolean;
  maintenanceNotifications?: boolean;
  billingNotifications?: boolean;
  marketingNotifications?: boolean;
  minimumSeverity?: 'low' | 'medium' | 'high' | 'critical';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  customPreferences?: Record<string, unknown>;
}

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          name: string;
          status: 'operational' | 'degraded' | 'outage';
          description: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status: 'operational' | 'degraded' | 'outage';
          description: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: 'operational' | 'degraded' | 'outage';
          description?: string;
          updated_at?: string;
        };
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
        Insert: {
          id?: string;
          title: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at?: string;
          updated_at?: string;
          description: string;
          affected_services: string[];
        };
        Update: {
          id?: string;
          title?: string;
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          created_at?: string;
          updated_at?: string;
          description?: string;
          affected_services?: string[];
        };
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
        Insert: {
          id?: string;
          service_id: string;
          period_days: number;
          uptime_percentage: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          period_days?: number;
          uptime_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          preferences: SubscriberPreferences;
          subscribed_at: string;
          confirmed: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          preferences: SubscriberPreferences;
          subscribed_at?: string;
          confirmed?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          preferences?: SubscriberPreferences;
          subscribed_at?: string;
          confirmed?: boolean;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          current_usage_gb: number;
          monthly_cap_gb: number;
          package_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          current_usage_gb?: number;
          monthly_cap_gb?: number;
          package_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          current_usage_gb?: number;
          monthly_cap_gb?: number;
          package_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_caps: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          monthly_cap_gb: number;
          current_usage_gb: number;
          billing_cycle_start: string;
          notification_thresholds: number[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          monthly_cap_gb: number;
          current_usage_gb?: number;
          billing_cycle_start?: string;
          notification_thresholds?: number[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          monthly_cap_gb?: number;
          current_usage_gb?: number;
          billing_cycle_start?: string;
          notification_thresholds?: number[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_notifications: {
        Row: {
          id: string;
          user_id: string;
          data_cap_id: string;
          notification_type: string;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data_cap_id: string;
          notification_type: string;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data_cap_id?: string;
          notification_type?: string;
          sent_at?: string;
          created_at?: string;
        };
      };
      outage_events: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          severity: 'low' | 'medium' | 'high' | 'critical';
          affected_services: string[];
          affected_regions: string[];
          estimated_resolution: string | null;
          actual_resolution: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          severity: 'low' | 'medium' | 'high' | 'critical';
          affected_services?: string[];
          affected_regions?: string[];
          estimated_resolution?: string | null;
          actual_resolution?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          affected_services?: string[];
          affected_regions?: string[];
          estimated_resolution?: string | null;
          actual_resolution?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          resolved_by?: string | null;
        };
      };
      outage_notifications: {
        Row: {
          id: string;
          outage_event_id: string;
          user_id: string;
          notification_type: 'email' | 'sms' | 'in_app' | 'push';
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          recipient: string;
          message_content: string;
          sent_at: string | null;
          delivered_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outage_event_id: string;
          user_id: string;
          notification_type: 'email' | 'sms' | 'in_app' | 'push';
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          recipient: string;
          message_content: string;
          sent_at?: string | null;
          delivered_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outage_event_id?: string;
          user_id?: string;
          notification_type?: 'email' | 'sms' | 'in_app' | 'push';
          status?: 'pending' | 'sent' | 'delivered' | 'failed';
          recipient?: string;
          message_content?: string;
          sent_at?: string | null;
          delivered_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      customer_notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications: boolean;
          sms_notifications: boolean;
          in_app_notifications: boolean;
          push_notifications: boolean;
          phone_number: string | null;
          outage_notifications: boolean;
          maintenance_notifications: boolean;
          billing_notifications: boolean;
          marketing_notifications: boolean;
          minimum_severity: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications?: boolean;
          sms_notifications?: boolean;
          in_app_notifications?: boolean;
          push_notifications?: boolean;
          phone_number?: string | null;
          outage_notifications?: boolean;
          maintenance_notifications?: boolean;
          billing_notifications?: boolean;
          marketing_notifications?: boolean;
          minimum_severity?: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications?: boolean;
          sms_notifications?: boolean;
          in_app_notifications?: boolean;
          push_notifications?: boolean;
          phone_number?: string | null;
          outage_notifications?: boolean;
          maintenance_notifications?: boolean;
          billing_notifications?: boolean;
          marketing_notifications?: boolean;
          minimum_severity?: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_templates: {
        Row: {
          id: string;
          name: string;
          type:
            | 'outage_started'
            | 'outage_updated'
            | 'outage_resolved'
            | 'maintenance_scheduled';
          channel: 'email' | 'sms' | 'in_app' | 'push';
          subject_template: string | null;
          message_template: string;
          variables: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type:
            | 'outage_started'
            | 'outage_updated'
            | 'outage_resolved'
            | 'maintenance_scheduled';
          channel: 'email' | 'sms' | 'in_app' | 'push';
          subject_template?: string | null;
          message_template: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?:
            | 'outage_started'
            | 'outage_updated'
            | 'outage_resolved'
            | 'maintenance_scheduled';
          channel?: 'email' | 'sms' | 'in_app' | 'push';
          subject_template?: string | null;
          message_template?: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_rate_limits: {
        Row: {
          id: string;
          user_id: string | null;
          notification_type: string;
          last_sent_at: string;
          count_sent: number;
          window_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          notification_type: string;
          last_sent_at?: string;
          count_sent?: number;
          window_start?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          notification_type?: string;
          last_sent_at?: string;
          count_sent?: number;
          window_start?: string;
          created_at?: string;
        };
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
