// Barrel exports for all type definitions
// Import types from this file for clean type access

// Database types
export * from './database.generated';
export * from './database.manual';

// API types
export * from './api';

// Authentication types
export * from './auth';

// Re-export commonly used database types for convenience
export type { Database } from './database.generated';

export type { SubscriberPreferences } from './database.manual';

export type {
  UserProfile,
  CustomerAccount,
  ServicePlan,
  Payment,
  SupportTicket,
  KnowledgeBaseArticle,
  SystemMetrics,
  AlertConfig,
  AuditLog,
  ApiKey as ApiKeyType,
  ExtendedNotificationPreferences,
} from './database.manual';

// Re-export API types for convenience
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  UserProfileUpdate,
  ServiceStatusUpdate,
  IncidentCreate,
  IncidentUpdate,
  NotificationPreferencesUpdate,
  BandwidthUsageQuery,
  PaymentMethodCreate,
  PaymentIntent,
  SupportTicketCreate,
  SupportTicketUpdate,
  KnowledgeBaseSearch,
  KnowledgeBaseCreate,
  FileUpload,
  FileUploadResponse,
  WebhookCreate,
  WebhookEvent,
  SearchParams,
  ExportRequest,
  ReportRequest,
} from './api';

// Re-export auth types for convenience
export type {
  UserRole,
  Permission,
  AuthContext,
  AccessToken,
  RefreshToken,
  AuthCredentials,
  AuthResult,
  AuthUser,
  AuthTokens,
  MFAMethod,
  MFASetupRequest,
  MFASetupResponse,
  MFAVerificationRequest,
  Session,
  SessionList,
  PasswordResetRequest,
  PasswordResetConfirm,
  PasswordChangeRequest,
  PasswordPolicy,
  SecuritySettings,
  TrustedDevice,
  ApiKeyInfo,
  AuthorizationOptions,
  AuthorizationResult,
  RateLimitConfig,
  RateLimitResult,
  SecurityEvent,
  SecurityEventType,
  JWTPayload,
  JWTValidationResult,
  OAuthProvider,
  OAuthUser,
  OAuthCallback,
  SocialProvider,
  SocialProfile,
} from './auth';
