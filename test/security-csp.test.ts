import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSecurityHeaders, generateNonce } from '../src/middleware/security';

// Mock environment detection
const mockIsDevelopment = vi.fn();
vi.mock('../src/lib/env', () => ({
  isDevelopment: () => mockIsDevelopment(),
}));

describe('Security Middleware', () => {
  beforeEach(() => {
    mockIsDevelopment.mockReset();
  });

  describe('getSecurityHeaders', () => {
    it('should generate security headers with nonce', () => {
      const nonce = 'test-nonce-123';
      const headers = getSecurityHeaders(nonce);

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should include nonce in CSP for scripts and styles', () => {
      mockIsDevelopment.mockReturnValue(false); // Test production behavior
      const nonce = 'test-nonce-123';
      const headers = getSecurityHeaders(nonce);
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should use self for scripts and styles when no nonce provided', () => {
      mockIsDevelopment.mockReturnValue(false); // Test production behavior
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should have proper CSP directives', () => {
      const headers = getSecurityHeaders('test-nonce');
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("font-src 'self'");
      expect(csp).toContain(
        "connect-src 'self' https://api.openai.com https://*.supabase.co"
      );
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    });

    it('should have proper permissions policy', () => {
      const headers = getSecurityHeaders();
      const permissionsPolicy = headers['Permissions-Policy'];

      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('payment=()');
    });
  });

  describe('generateNonce', () => {
    it('should generate a unique nonce each time', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[a-f0-9]{32}$/);
      expect(nonce2).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate nonce of correct length', () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(32);
    });

    it('should generate valid hexadecimal characters', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('Environment-based CSP', () => {
    it('should include unsafe-eval in development but not production', () => {
      const nonce = 'test-nonce';

      // Test development
      mockIsDevelopment.mockReturnValue(true);
      const devHeaders = getSecurityHeaders(nonce);
      const devCsp = devHeaders['Content-Security-Policy'];

      // Test production
      mockIsDevelopment.mockReturnValue(false);
      const prodHeaders = getSecurityHeaders(nonce);
      const prodCsp = prodHeaders['Content-Security-Policy'];

      // Development should have unsafe-eval and unsafe-inline
      expect(devCsp).toContain("'unsafe-eval'");
      expect(devCsp).toContain("'unsafe-inline'");

      // Production should NOT have unsafe-eval or unsafe-inline
      expect(prodCsp).not.toContain("'unsafe-eval'");
      expect(prodCsp).not.toContain("'unsafe-inline'");
    });

    it('should use nonce in both environments', () => {
      const nonce = 'test-nonce-456';

      // Test development
      mockIsDevelopment.mockReturnValue(true);
      const devHeaders = getSecurityHeaders(nonce);
      const devCsp = devHeaders['Content-Security-Policy'];

      // Test production
      mockIsDevelopment.mockReturnValue(false);
      const prodHeaders = getSecurityHeaders(nonce);
      const prodCsp = prodHeaders['Content-Security-Policy'];

      // Both should include the nonce
      expect(devCsp).toContain(`'nonce-${nonce}'`);
      expect(prodCsp).toContain(`'nonce-${nonce}'`);
    });

    it('should maintain consistent security headers across environments', () => {
      // Test development
      mockIsDevelopment.mockReturnValue(true);
      const devHeaders = getSecurityHeaders();

      // Test production
      mockIsDevelopment.mockReturnValue(false);
      const prodHeaders = getSecurityHeaders();

      // These headers should be the same regardless of environment
      expect(devHeaders['X-Frame-Options']).toBe(
        prodHeaders['X-Frame-Options']
      );
      expect(devHeaders['X-Content-Type-Options']).toBe(
        prodHeaders['X-Content-Type-Options']
      );
      expect(devHeaders['Referrer-Policy']).toBe(
        prodHeaders['Referrer-Policy']
      );
      expect(devHeaders['Permissions-Policy']).toBe(
        prodHeaders['Permissions-Policy']
      );
      expect(devHeaders['Strict-Transport-Security']).toBe(
        prodHeaders['Strict-Transport-Security']
      );
    });
  });
});
