import { describe, it, expect } from 'vitest';
import { getSecurityHeaders, generateNonce } from '../src/middleware/security';

describe('Security Middleware', () => {
  describe('getSecurityHeaders', () => {
    it('should generate security headers with nonce', () => {
      const nonce = 'test-nonce-123';
      const headers = getSecurityHeaders(nonce);

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    });

    it('should include nonce in CSP for scripts and styles', () => {
      const nonce = 'test-nonce-123';
      const headers = getSecurityHeaders(nonce);
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain(`script-src 'nonce-${nonce}'`);
      expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should use self for scripts and styles when no nonce provided', () => {
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
      expect(csp).toContain("connect-src 'self' https://api.openai.com https://*.supabase.co");
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
});