// Auto-generated database types from Supabase
// This file should be regenerated when database schema changes

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
          phone?: string;
          preferences?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          phone?: string;
          preferences?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string;
          preferences?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      outage_events: {
        Row: {
          id: string;
          title: string;
          description: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_regions: string[];
          affected_services: string[];
          estimated_resolution?: string;
          actual_resolution?: string;
          resolution_notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_regions: string[];
          affected_services: string[];
          estimated_resolution?: string;
          actual_resolution?: string;
          resolution_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_regions?: string[];
          affected_services?: string[];
          estimated_resolution?: string;
          actual_resolution?: string;
          resolution_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      outage_notifications: {
        Row: {
          id: string;
          outage_event_id: string;
          user_id: string;
          notification_type: 'email' | 'sms' | 'in_app' | 'push';
          status: 'pending' | 'sent' | 'failed';
          recipient: string;
          message_content: string;
          error_message?: string;
          sent_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          outage_event_id: string;
          user_id: string;
          notification_type: 'email' | 'sms' | 'in_app' | 'push';
          status?: 'pending' | 'sent' | 'failed';
          recipient: string;
          message_content: string;
          error_message?: string;
          sent_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outage_event_id?: string;
          user_id?: string;
          notification_type?: 'email' | 'sms' | 'in_app' | 'push';
          status?: 'pending' | 'sent' | 'failed';
          recipient?: string;
          message_content?: string;
          error_message?: string;
          sent_at?: string;
          created_at?: string;
          updated_at?: string;
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
          outage_notifications: boolean;
          maintenance_notifications: boolean;
          billing_notifications: boolean;
          marketing_notifications: boolean;
          minimum_severity: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          timezone: string;
          phone_number?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications: boolean;
          sms_notifications: boolean;
          in_app_notifications: boolean;
          push_notifications: boolean;
          outage_notifications: boolean;
          maintenance_notifications: boolean;
          billing_notifications: boolean;
          marketing_notifications: boolean;
          minimum_severity: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          timezone: string;
          phone_number?: string;
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
          outage_notifications?: boolean;
          maintenance_notifications?: boolean;
          billing_notifications?: boolean;
          marketing_notifications?: boolean;
          minimum_severity?: 'low' | 'medium' | 'high' | 'critical';
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          timezone?: string;
          phone_number?: string;
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
          subject_template?: string | null;
          message_template: string;
          variables?: string[];
          is_active?: boolean;
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