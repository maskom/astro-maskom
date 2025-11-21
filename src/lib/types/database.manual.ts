// Manual database type extensions and custom types
// These types complement the auto-generated database types

// Outage notification types (from migration 20251116_outage_notifications.sql)
export interface OutageEvent {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_services: string[];
  affected_regions: string[];
  estimated_resolution?: string;
  actual_resolution?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  resolved_by?: string;
}

export interface OutageNotification {
  id: string;
  outage_event_id: string;
  user_id: string;
  notification_type: 'email' | 'sms' | 'in_app' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  recipient: string;
  message_content: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  created_at: string;
}

export interface CustomerNotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  phone_number?: string;
  outage_notifications: boolean;
  maintenance_notifications: boolean;
  billing_notifications: boolean;
  marketing_notifications: boolean;
  minimum_severity: 'low' | 'medium' | 'high' | 'critical';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type:
    | 'outage_started'
    | 'outage_updated'
    | 'outage_resolved'
    | 'maintenance_scheduled';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  subject_template?: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRateLimit {
  id: string;
  user_id?: string;
  notification_type: string;
  last_sent_at: string;
  count_sent: number;
  window_start: string;
  created_at: string;
}

// Main Database interface
export interface Database {
  public: {
    Tables: {
      // Status management tables
      incidents: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
          affected_services?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      // Existing tables (add as needed)
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
          status?: 'operational' | 'degraded' | 'outage';
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
      // Knowledge Base tables
      kb_categories: {
        Row: KbCategory;
        Insert: Omit<KbCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<KbCategory, 'id' | 'created_at' | 'updated_at'>>;
      };
      kb_articles: {
        Row: KbArticle;
        Insert: Omit<KbArticle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<KbArticle, 'id' | 'created_at' | 'updated_at'>>;
      };
      kb_ratings: {
        Row: KbRating;
        Insert: Omit<KbRating, 'id' | 'created_at'>;
        Update: Partial<Omit<KbRating, 'id' | 'created_at'>>;
      };
      kb_search_logs: {
        Row: KbSearchLog;
        Insert: Omit<KbSearchLog, 'id' | 'created_at'>;
        Update: Partial<Omit<KbSearchLog, 'id' | 'created_at'>>;
      };
      kb_article_history: {
        Row: KbArticleHistory;
        Insert: Omit<KbArticleHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<KbArticleHistory, 'id' | 'created_at'>>;
      };
      kb_attachments: {
        Row: KbAttachment;
        Insert: Omit<KbAttachment, 'id' | 'created_at'>;
        Update: Partial<Omit<KbAttachment, 'id' | 'created_at'>>;
      };
      // Outage notification tables
      outage_events: {
        Row: OutageEvent;
        Insert: Omit<OutageEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OutageEvent, 'id' | 'created_at' | 'updated_at'>>;
      };
      outage_notifications: {
        Row: OutageNotification;
        Insert: Omit<OutageNotification, 'id' | 'created_at'>;
        Update: Partial<Omit<OutageNotification, 'id' | 'created_at'>>;
      };
      customer_notification_preferences: {
        Row: CustomerNotificationPreferences;
        Insert: Omit<
          CustomerNotificationPreferences,
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Omit<
            CustomerNotificationPreferences,
            'id' | 'created_at' | 'updated_at'
          >
        >;
      };
      notification_templates: {
        Row: NotificationTemplate;
        Insert: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<
          Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
        >;
      };
      notification_rate_limits: {
        Row: NotificationRateLimit;
        Insert: Omit<NotificationRateLimit, 'id' | 'created_at'>;
        Update: Partial<Omit<NotificationRateLimit, 'id' | 'created_at'>>;
      };
      // Add other tables as needed
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

// Subscriber preferences interface
export interface SubscriberPreferences {
  email?: boolean;
  sms?: boolean;
  marketing?: boolean;
  newsletters?: boolean;
  promotions?: boolean;
  updates?: boolean;
  outage_notifications?: boolean;
  maintenance_notifications?: boolean;
  billing_notifications?: boolean;
  [key: string]: boolean | undefined;
}

// Extended user profile information
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
  role?: 'customer' | 'support' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

// Service level agreement types
export interface SLA {
  id: string;
  service_id: string;
  uptime_percentage: number;
  response_time_ms: number;
  resolution_time_hours: number;
  compensation_rate?: number;
  created_at: string;
  updated_at: string;
}

// Customer account information
export interface CustomerAccount {
  id: string;
  user_id: string;
  account_type: 'residential' | 'business' | 'enterprise';
  plan_id: string;
  status: 'active' | 'suspended' | 'cancelled';
  billing_address?: Address;
  service_address?: Address;
  created_at: string;
  updated_at: string;
}

// Address type
export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Service plan information
export interface ServicePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  download_speed_mbps: number;
  upload_speed_mbps: number;
  data_cap_gb?: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bandwidth usage record
export interface BandwidthUsage {
  id: string;
  user_id: string;
  bytes_downloaded: number;
  bytes_uploaded: number;
  period_start: string;
  period_end: string;
  service_plan_id: string;
  created_at: string;
}

// Payment information
export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Support ticket
export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

// Knowledge base article
export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// Knowledge Base Types (from migration 20251117_knowledge_base_schema.sql)
export interface KbCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id: string;
  author_id: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  featured: boolean;
  sort_order: number;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  search_rank: number;
  tags: string[];
  related_articles?: string[];
  video_url?: string;
  video_thumbnail?: string;
  reading_time_minutes?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KbRating {
  id: string;
  article_id: string;
  user_id?: string;
  rating: number; // 1-5 stars
  helpful: boolean;
  feedback?: string;
  ip_address?: string;
  created_at: string;
}

export interface KbSearchLog {
  id: string;
  query: string;
  results_count: number;
  clicked_article_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface KbArticleHistory {
  id: string;
  article_id: string;
  version: number;
  title: string;
  content: string;
  excerpt?: string;
  changed_by: string;
  change_summary?: string;
  created_at: string;
}

export interface KbAttachment {
  id: string;
  article_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

// Extended types for knowledge base with relations
export interface ArticleWithCategory extends KbArticle {
  category: KbCategory;
  author: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface PopularArticle {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  helpful_count: number;
  published_at: string;
  category_name: string;
}

// System metrics
export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  active_connections: number;
  response_time_ms: number;
}

// Alert configuration
export interface AlertConfig {
  id: string;
  name: string;
  type: 'threshold' | 'anomaly' | 'rate';
  metric: string;
  threshold_value?: number;
  comparison_operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Audit log entry
export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// API key information
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Notification preferences (extended)
export interface ExtendedNotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  outage_notifications: boolean;
  maintenance_notifications: boolean;
  billing_notifications: boolean;
  marketing_notifications: boolean;
  security_notifications: boolean;
  product_updates: boolean;
  minimum_severity: 'low' | 'medium' | 'high' | 'critical';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  phone_number?: string;
  preferred_language?: string;
  created_at: string;
  updated_at: string;
}
