import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSecurityHeaders, generateNonce } from '@/middleware/security';

// Mock environment detection
const mockIsDevelopment = vi.fn();
vi.mock('@/lib/env', () => ({
  isDevelopment: () => mockIsDevelopment(),
}));

describe('CSP Security Headers', () => {
  beforeEach(() => {
    mockIsDevelopment.mockReset();
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      mockIsDevelopment.mockReturnValue(true);
    });

    it('should include unsafe-eval in development CSP', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("'unsafe-inline'");
    });

    it('should include nonce when provided in development', () => {
      const nonce = 'test-nonce-123';
      const headers = getSecurityHeaders(nonce);
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("'unsafe-inline'");
    });

    it('should maintain all required CSP directives', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      mockIsDevelopment.mockReturnValue(false);
    });

    it('should NOT include unsafe-eval in production CSP', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should use nonce-based script execution in production', () => {
      const nonce = 'production-nonce-456';
      const headers = getSecurityHeaders(nonce);
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should fallback to self-only when no nonce provided in production', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should maintain all required CSP directives in production', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('Common Security Headers', () => {
    it('should include all required security headers regardless of environment', () => {
      const headers = getSecurityHeaders();
      
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
    });
  });

  describe('Nonce Generation', () => {
    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });
  });
});