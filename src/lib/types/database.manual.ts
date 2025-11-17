// Manual database type extensions and custom types
// These types complement the auto-generated database types

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
  metadata?: Record<string, any>;
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
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
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