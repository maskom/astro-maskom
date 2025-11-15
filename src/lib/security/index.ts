// Security Types
export * from './types';

// Security Services
export { securityAuditLogger } from './audit';
export { mfaService } from './mfa';
export { rbacService } from './rbac';
export { dataProtectionService } from './data-protection';
export { sessionManager } from './session';

// Security Middleware
export { 
  SecurityMiddleware, 
  getSecurityContext, 
  checkPermission, 
  checkRole 
} from './middleware';

// Security Configuration
export { 
  securityConfig, 
  securityHeaders, 
  isIPWhitelisted, 
  isOriginTrusted, 
  generateNonce 
} from './config';

// Re-export commonly used enums and interfaces
export {
  SecurityAction,
  SecurityEventType,
  SecuritySeverity,
  RiskLevel,
  UserRole,
  Permission,
  ConsentType
} from './types';

export type {
  SecurityAuditLog,
  SecurityEvent,
  UserSecurityProfile,
  SessionSecurity,
  DataConsent,
  SecurityContext
} from './types';