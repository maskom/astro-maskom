export interface SecurityAuditLog {
  id: string;
  user_id: string;
  action: SecurityAction;
  resource: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  success: boolean;
  details?: AuditDetails;
  risk_level: RiskLevel;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  user_id?: string;
  ip_address: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: EventMetadata;
}

export interface UserSecurityProfile {
  user_id: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  backup_codes?: string[];
  role: UserRole;
  permissions: Permission[];
  failed_login_attempts: number;
  last_login: Date;
  password_changed_at: Date;
  session_timeout_minutes: number;
  data_retention_days: number;
}

export interface SessionSecurity {
  session_id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
  is_active: boolean;
  mfa_verified: boolean;
}

export interface DataConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  timestamp: Date;
  ip_address: string;
  purpose: string;
  legal_basis: string;
  retention_period_days: number;
}

export enum SecurityAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLE = 'mfa_enable',
  MFA_DISABLE = 'mfa_disable',
  ROLE_CHANGE = 'role_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
  ADMIN_ACTION = 'admin_action',
  SECURITY_BREACH = 'security_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  MALICIOUS_REQUEST = 'malicious_request',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum UserRole {
  CUSTOMER = 'customer',
  SUPPORT = 'support',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  MANAGE_ACCOUNT = 'manage_account',
  VIEW_BILLING = 'view_billing',
  MANAGE_BILLING = 'manage_billing',
  VIEW_CUSTOMERS = 'view_customers',
  MANAGE_CUSTOMERS = 'manage_customers',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SYSTEM = 'manage_system',
  VIEW_SECURITY_LOGS = 'view_security_logs',
  MANAGE_SECURITY = 'manage_security',
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
}

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PERSONALIZATION = 'personalization',
  LEGAL_COMPLIANCE = 'legal_compliance',
  DATA_PROCESSING = 'data_processing',
}

export interface SecurityConfig {
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  password_min_length: number;
  password_require_special_chars: boolean;
  mfa_required_for_roles: UserRole[];
  audit_log_retention_days: number;
  data_retention_days: number;
  enable_ip_whitelist: boolean;
  enable_rate_limiting: boolean;
  rate_limit_requests_per_minute: number;
}

export interface SecurityContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  isAuthenticated: boolean;
  mfaVerified: boolean;
  role: UserRole | null;
  permissions: Permission[];
}

// Dynamic data structures with proper typing
export interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
  required_permission?: Permission;
  resource_id?: string;
  old_value?: string | number;
  new_value?: string | number;
  reason?: string;
}

export interface EventMetadata {
  [key: string]: string | number | boolean | null | undefined;
  source?: string;
  detection_method?: string;
  confidence_score?: number;
  related_user_id?: string;
  session_id?: string;
}

export interface UserDataExport {
  user_id: string;
  email: string;
  profile: Record<string, unknown>;
  security_profile?: Record<string, unknown>;
  data_consents?: Array<Record<string, unknown>>;
  billing_history?: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  security_logs: Array<Record<string, unknown>>;
  consent_records: Array<Record<string, unknown>>;
  created_at: string;
  exported_at: string;
}

// Extended Request interface for security context
export interface SecurityRequest extends Request {
  securityContext?: SecurityContext;
}
