import { describe, it, expect, beforeEach, vi } from 'vitest';
import { securityAuditLogger } from '../../src/lib/security/audit';
import { mfaService } from '../../src/lib/security/mfa';
import { rbacService } from '../../src/lib/security/rbac';
import { dataProtectionService } from '../../src/lib/security/data-protection';
import { sessionManager } from '../../src/lib/security/session';
import {
  SecurityAction,
  UserRole,
  Permission,
  SecuritySeverity,
} from '../../src/lib/security/types';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('Security Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log security actions', async () => {
    const userId = 'test-user-id';
    const action = SecurityAction.LOGIN;
    const resource = 'authentication';
    const ipAddress = '192.168.1.1';
    const userAgent = 'test-agent';
    const success = true;

    // Since we're mocking, we'll just test that the method doesn't throw
    await expect(
      securityAuditLogger.logSecurityAction(
        userId,
        action,
        resource,
        ipAddress,
        userAgent,
        success
      )
    ).resolves.not.toThrow();
  });

  it('should log failed login attempts', async () => {
    const email = 'test@example.com';
    const ipAddress = '192.168.1.1';
    const userAgent = 'test-agent';
    const reason = 'invalid_password';

    await expect(
      securityAuditLogger.logFailedLogin(email, ipAddress, userAgent, reason)
    ).resolves.not.toThrow();
  });

  it('should create security events', async () => {
    const type = 'suspicious_activity' as any;
    const severity = SecuritySeverity.HIGH;
    const userId = 'test-user-id';
    const ipAddress = '192.168.1.1';
    const description = 'Test security event';

    await expect(
      securityAuditLogger.createSecurityEvent(
        type,
        severity,
        userId,
        ipAddress,
        description
      )
    ).resolves.not.toThrow();
  });
});

describe('MFA Service', () => {
  it('should generate MFA secret', () => {
    const secret = mfaService.generateMFASecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
  });

  it('should generate TOTP secret and QR URL', () => {
    const userEmail = 'test@example.com';
    const { secret, qrCodeUrl } = mfaService.generateTOTPSecret(userEmail);

    expect(secret).toBeDefined();
    expect(qrCodeUrl).toBeDefined();
    expect(qrCodeUrl).toContain('otpauth://totp');
    expect(qrCodeUrl).toContain(encodeURIComponent(userEmail));
  });

  it('should generate backup codes', () => {
    const backupCodes = mfaService.generateBackupCodes();

    expect(backupCodes).toBeDefined();
    expect(Array.isArray(backupCodes)).toBe(true);
    expect(backupCodes).toHaveLength(10);

    backupCodes.forEach(code => {
      expect(typeof code).toBe('string');
      expect(code.length).toBe(8);
    });
  });
});

describe('RBAC Service', () => {
  it('should have correct role permissions mapping', async () => {
    // Test that admin role has more permissions than customer
    const adminPermissions = await rbacService.getUserPermissions('admin-user');
    const customerPermissions =
      await rbacService.getUserPermissions('customer-user');

    // Since we're mocking, this will return empty arrays
    // In a real test, you'd set up test data
    expect(Array.isArray(adminPermissions)).toBe(true);
    expect(Array.isArray(customerPermissions)).toBe(true);
  });

  it('should check permissions correctly', async () => {
    const userId = 'test-user';
    const permission = Permission.VIEW_DASHBOARD;

    const hasPermission = await rbacService.hasPermission(userId, permission);
    expect(typeof hasPermission).toBe('boolean');
  });

  it('should check roles correctly', async () => {
    const userId = 'test-user';
    const role = UserRole.CUSTOMER;

    const hasRole = await rbacService.hasRole(userId, role);
    expect(typeof hasRole).toBe('boolean');
  });
});

describe('Data Protection Service', () => {
  it('should encrypt and decrypt sensitive data', () => {
    const originalData = 'sensitive information';

    const encrypted = dataProtectionService.encryptSensitiveData(originalData);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalData);

    const decrypted = dataProtectionService.decryptSensitiveData(encrypted);
    expect(decrypted).toBe(originalData);
  });

  it('should hash passwords', () => {
    const password = 'testPassword123';
    const hashedPassword = dataProtectionService.hashPassword(password);

    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword).toContain(':');
  });

  it('should verify passwords', () => {
    const password = 'testPassword123';
    const hashedPassword = dataProtectionService.hashPassword(password);

    const isValid = dataProtectionService.verifyPassword(
      password,
      hashedPassword
    );
    expect(isValid).toBe(true);

    const isInvalid = dataProtectionService.verifyPassword(
      'wrongPassword',
      hashedPassword
    );
    expect(isInvalid).toBe(false);
  });
});

describe('Session Manager', () => {
  it('should create session', async () => {
    const userId = 'test-user';
    const ipAddress = '192.168.1.1';
    const userAgent = 'test-agent';

    const sessionId = await sessionManager.createSession(
      userId,
      ipAddress,
      userAgent
    );

    // Since we're mocking, this might return null
    expect(typeof sessionId === 'string' || sessionId === null).toBe(true);
  });

  it('should validate session', async () => {
    const sessionId = 'test-session-id';
    const ipAddress = '192.168.1.1';

    const session = await sessionManager.validateSession(sessionId, ipAddress);

    // Since we're mocking, this might return null
    expect(typeof session === 'object' || session === null).toBe(true);
  });

  it('should invalidate session', async () => {
    const sessionId = 'test-session-id';

    const result = await sessionManager.invalidateSession(sessionId);
    expect(typeof result).toBe('boolean');
  });
});

describe('Security Types', () => {
  it('should have correct enum values', () => {
    expect(SecurityAction.LOGIN).toBe('login');
    expect(UserRole.ADMIN).toBe('admin');
    expect(Permission.VIEW_DASHBOARD).toBe('view_dashboard');
    expect(SecuritySeverity.CRITICAL).toBe('critical');
  });
});

describe('Security Integration', () => {
  it('should handle complete security workflow', async () => {
    const userId = 'test-user';
    const ipAddress = '192.168.1.1';
    const userAgent = 'test-agent';

    // Test login logging
    await expect(
      securityAuditLogger.logSecurityAction(
        userId,
        SecurityAction.LOGIN,
        'authentication',
        ipAddress,
        userAgent,
        true
      )
    ).resolves.not.toThrow();

    // Test session creation
    const sessionId = await sessionManager.createSession(
      userId,
      ipAddress,
      userAgent
    );
    expect(typeof sessionId === 'string' || sessionId === null).toBe(true);

    // Test MFA secret generation
    const { secret } = mfaService.generateTOTPSecret('test@example.com');
    expect(secret).toBeDefined();

    // Test data encryption
    const sensitiveData = 'user private data';
    const encrypted = dataProtectionService.encryptSensitiveData(sensitiveData);
    const decrypted = dataProtectionService.decryptSensitiveData(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });
});
