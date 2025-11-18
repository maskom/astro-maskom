import { describe, it, expect } from 'vitest';
import { getSecurityHeaders, generateNonce } from '../src/middleware/security';

describe('CSP Security Headers', () => {
  it('should include unsafe-eval in development CSP', () => {
    const nonce = generateNonce();
    const headers = getSecurityHeaders(nonce, true); // Force development mode
    const csp = headers['Content-Security-Policy'];

    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
    expect(csp).toContain('nonce-'); // Should still include nonce in dev
  });

  it('should not include unsafe-eval in production CSP', () => {
    const nonce = generateNonce();
    const headers = getSecurityHeaders(nonce, false); // Force production mode
    const csp = headers['Content-Security-Policy'];

    expect(csp).toContain('nonce-'); // Should include nonce
    expect(csp).toContain("'unsafe-inline'"); // Should include unsafe-inline for event handlers
    expect(csp).not.toContain("'unsafe-eval'"); // Should NOT include unsafe-eval
  });

  it('should generate valid nonce', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex characters
  });

  it('should include nonce in CSP when provided', () => {
    const nonce = generateNonce();
    const headers = getSecurityHeaders(nonce);
    const csp = headers['Content-Security-Policy'];

    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it('should include all required CSP directives', () => {
    const headers = getSecurityHeaders();
    const csp = headers['Content-Security-Policy'];

    // Check for essential security directives
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('should include all required security headers', () => {
    const headers = getSecurityHeaders();

    expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
    expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
    expect(headers).toHaveProperty(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    );
    expect(headers).toHaveProperty(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    expect(headers).toHaveProperty('Permissions-Policy');
  });
});
