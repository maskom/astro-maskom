// Authentication and authorization type definitions

// User roles and permissions
export type UserRole = 'admin' | 'support' | 'billing' | 'customer';

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  admin: Permission[];
  support: Permission[];
  billing: Permission[];
  customer: Permission[];
}

// Authentication context
export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
    name?: string;
    avatar_url?: string;
  };
  session: {
    id: string;
    expires_at: string;
    created_at: string;
    last_activity: string;
    ip_address?: string;
    user_agent?: string;
  };
  request_id: string;
}

// Authentication tokens
export interface AccessToken {
  sub: string; // user ID
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // JWT ID
  type: 'access';
}

export interface RefreshToken {
  sub: string; // user ID
  session_id: string;
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // JWT ID
  type: 'refresh';
}

// Authentication request/response types
export interface AuthCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  tokens?: AuthTokens;
  error?: string;
  requires_mfa?: boolean;
  mfa_methods?: MFAMethod[];
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  permissions: string[];
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

// Multi-factor authentication
export interface MFAMethod {
  type: 'totp' | 'sms' | 'email' | 'push';
  name: string;
  is_enabled: boolean;
  is_primary: boolean;
  last_used?: string;
}

export interface MFASetupRequest {
  type: 'totp' | 'sms' | 'email';
  name?: string;
}

export interface MFASetupResponse {
  secret?: string; // For TOTP
  qr_code?: string; // For TOTP
  backup_codes?: string[]; // For TOTP
  verification_sent?: boolean; // For SMS/Email
}

export interface MFAVerificationRequest {
  method_type: 'totp' | 'sms' | 'email' | 'push';
  code: string;
  backup_code?: string;
}

// Session management
export interface Session {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  device_info?: {
    type: string;
    os: string;
    browser: string;
  };
}

export interface SessionList {
  current: Session;
  others: Session[];
}

// Password management
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_symbols: boolean;
  prevent_common_passwords: boolean;
  max_age_days?: number;
  history_count?: number;
}

// Account security settings
export interface SecuritySettings {
  mfa_enabled: boolean;
  mfa_methods: MFAMethod[];
  password_last_changed: string;
  active_sessions: number;
  login_notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  trusted_devices: TrustedDevice[];
  api_keys: ApiKeyInfo[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  last_used: string;
  created_at: string;
  expires_at?: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  last_used?: string;
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

// Authorization middleware types
export interface AuthorizationOptions {
  required_role?: UserRole;
  required_permissions?: string[];
  resource_id?: string;
  custom_check?: (context: AuthContext) => boolean;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  user_role?: UserRole;
  required_role?: UserRole;
  missing_permissions?: string[];
}

// Rate limiting
export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
  skip_successful_requests?: boolean;
  skip_failed_requests?: boolean;
  key_generator?: (request: Request) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset_time: number;
  retry_after?: number;
}

// Audit and security logging
export interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: SecurityEventType;
  description: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  details?: Record<string, any>;
  timestamp: string;
}

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verification_success'
  | 'mfa_verification_failure'
  | 'session_created'
  | 'session_terminated'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'permission_granted'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked';

// JWT utilities
export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
  type: 'access' | 'refresh';
}

export interface JWTValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expired?: boolean;
}

// OAuth and external authentication
export interface OAuthProvider {
  name: string;
  display_name: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scope: string[];
  client_id: string;
}

export interface OAuthUser {
  id: string;
  provider: string;
  provider_user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

export interface OAuthCallback {
  code: string;
  state: string;
  provider: string;
}

// Social login providers
export type SocialProvider =
  | 'google'
  | 'facebook'
  | 'twitter'
  | 'github'
  | 'microsoft';

export interface SocialProfile {
  id: string;
  provider: SocialProvider;
  email: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  verified?: boolean;
  locale?: string;
  timezone?: string;
}
