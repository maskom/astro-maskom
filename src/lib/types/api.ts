// API-related type definitions

// Standard API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  request_id?: string;
}

// API error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Authentication request types
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  accept_terms: boolean;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// Authentication response types
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// User profile types
export interface UserProfileUpdate {
  name?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  avatar_url?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// Service management types
export interface ServiceStatusUpdate {
  status: 'operational' | 'degraded' | 'outage';
  description?: string;
}

export interface IncidentCreate {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_services: string[];
  affected_regions?: string[];
}

export interface IncidentUpdate {
  title?: string;
  description?: string;
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affected_services?: string[];
  affected_regions?: string[];
  resolution_notes?: string;
}

// Notification types
export interface NotificationPreferencesUpdate {
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
}

export interface NotificationTemplateCreate {
  name: string;
  type: 'outage_started' | 'outage_updated' | 'outage_resolved' | 'maintenance_scheduled';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  subject_template?: string;
  message_template: string;
  variables?: string[];
  is_active?: boolean;
}

// Bandwidth and usage types
export interface BandwidthUsageQuery {
  start_date?: string;
  end_date?: string;
  period?: 'hour' | 'day' | 'week' | 'month';
}

export interface DataCapAlert {
  user_id: string;
  threshold_percentage: number;
  notification_channels: ('email' | 'sms' | 'in_app' | 'push')[];
  is_active: boolean;
}

// Billing and payment types
export interface PaymentMethodCreate {
  type: 'credit_card' | 'bank_account' | 'digital_wallet';
  provider: string;
  token: string;
  is_default?: boolean;
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  payment_method_id?: string;
}

export interface SubscriptionUpdate {
  plan_id: string;
  billing_cycle?: 'monthly' | 'yearly';
  effective_date?: string;
}

// Support ticket types
export interface SupportTicketCreate {
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
}

export interface SupportTicketUpdate {
  subject?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
}

// Knowledge base types
export interface KnowledgeBaseSearch {
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface KnowledgeBaseCreate {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  is_published?: boolean;
}

// Admin types
export interface AdminUserList {
  role?: string;
  status?: string;
  search?: string;
}

export interface SystemHealthCheck {
  services: string[];
  metrics: string[];
  timeout?: number;
}

export interface SystemMaintenance {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  affected_services: string[];
  notification_channels: ('email' | 'sms' | 'in_app' | 'push')[];
}

// File upload types
export interface FileUpload {
  file: File;
  purpose: 'avatar' | 'attachment' | 'document' | 'logo';
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  purpose: string;
  uploaded_at: string;
}

// Webhook types
export interface WebhookCreate {
  url: string;
  events: string[];
  secret?: string;
  is_active?: boolean;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

// Search and filtering types
export interface SearchParams {
  q?: string;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
  value: any;
}

// Export and report types
export interface ExportRequest {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  data_type: string;
  filters?: Record<string, any>;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ReportRequest {
  type: string;
  parameters: Record<string, any>;
  format?: 'json' | 'pdf' | 'csv';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}