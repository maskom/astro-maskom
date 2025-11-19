import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSecurityHeaders,
  generateNonce,
  getCSPReportGroup,
  validateCSPViolation,
  getCSPSeverity,
  type CSPViolationReport,
} from '../src/middleware/security';

// Mock environment detection
const mockIsDevelopment = vi.fn();
vi.mock('../src/lib/env', () => ({
  isDevelopment: () => mockIsDevelopment(),
}));

describe('Enhanced CSP Security Headers', () => {
  beforeEach(() => {
    mockIsDevelopment.mockReset();
  });

  describe('Production CSP Hardening', () => {
    beforeEach(() => {
      mockIsDevelopment.mockReturnValue(false);
    });

    it('should include comprehensive CSP directives in production', () => {
      const headers = getSecurityHeaders('test-nonce');
      const csp = headers['Content-Security-Policy'];

      // Core security directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");

      // Enhanced directives
      expect(csp).toContain("worker-src 'self' blob:");
      expect(csp).toContain("child-src 'self' blob:");
      expect(csp).toContain("frame-src 'self'");
      expect(csp).toContain("prefetch-src 'self'");
      expect(csp).toContain("navigate-to 'self'");
    });

    it('should use strict nonce-based CSP in production', () => {
      const nonce = 'production-nonce-123';
      const headers = getSecurityHeaders(nonce);
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('should include CSP report-only policy in production', () => {
      const headers = getSecurityHeaders('test-nonce');

      expect(headers).toHaveProperty('Content-Security-Policy-Report-Only');
      const reportOnlyCsp = headers['Content-Security-Policy-Report-Only'];

      expect(reportOnlyCsp).toContain('report-uri /api/security/csp-report');
      expect(reportOnlyCsp).toContain('report-to csp-endpoint');
    });

    it('should have strict third-party domain control', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];

      // Connect source should have explicit allowlist
      expect(csp).toContain(
        "connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co"
      );

      // Image sources should be controlled
      expect(csp).toContain("img-src 'self' data: https: blob:");

      // Font sources should be restricted
      expect(csp).toContain("font-src 'self' data:");
    });
  });

  describe('Development CSP Configuration', () => {
    beforeEach(() => {
      mockIsDevelopment.mockReturnValue(true);
    });

    it('should allow necessary unsafe directives in development', () => {
      const headers = getSecurityHeaders('dev-nonce');
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain(`'nonce-dev-nonce'`);
    });

    it('should not include report-only policy in development', () => {
      const headers = getSecurityHeaders();

      expect(headers).not.toHaveProperty('Content-Security-Policy-Report-Only');
    });
  });

  describe('Enhanced Security Headers', () => {
    it('should include comprehensive permissions policy', () => {
      const headers = getSecurityHeaders();
      const permissionsPolicy = headers['Permissions-Policy'];

      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('payment=()');
      expect(permissionsPolicy).toContain('interest-cohort=()'); // FLoC blocking
    });

    it('should maintain consistent security headers across environments', () => {
      mockIsDevelopment.mockReturnValue(true);
      const devHeaders = getSecurityHeaders();

      mockIsDevelopment.mockReturnValue(false);
      const prodHeaders = getSecurityHeaders();

      // These should be identical across environments
      expect(devHeaders['X-Frame-Options']).toBe(
        prodHeaders['X-Frame-Options']
      );
      expect(devHeaders['X-Content-Type-Options']).toBe(
        prodHeaders['X-Content-Type-Options']
      );
      expect(devHeaders['Referrer-Policy']).toBe(
        prodHeaders['Referrer-Policy']
      );
      expect(devHeaders['Strict-Transport-Security']).toBe(
        prodHeaders['Strict-Transport-Security']
      );
    });
  });

  describe('CSP Report Group Generation', () => {
    it('should generate valid CSP report group configuration', () => {
      const reportGroup = getCSPReportGroup();
      const config = JSON.parse(reportGroup);

      expect(config.group).toBe('csp-endpoint');
      expect(config.max_age).toBe(10886400); // 7 days
      expect(config.endpoints).toHaveLength(1);
      expect(config.endpoints[0].url).toBe('/api/security/csp-report');
      expect(config.include_subdomains).toBe(false);
    });
  });

  describe('CSP Violation Validation', () => {
    const validViolation: CSPViolationReport = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        referrer: 'https://example.com/',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'original-policy': "script-src 'self'",
        disposition: 'report',
        'blocked-uri': 'https://evil.com/script.js',
        'line-number': 15,
        'column-number': 25,
        'source-file': 'https://example.com/page',
        'status-code': 200,
        'script-sample': 'console.log("test")',
      },
    };

    it('should validate correct CSP violation reports', () => {
      expect(validateCSPViolation(validViolation)).toBe(true);
    });

    it('should reject reports missing required fields', () => {
      const invalidViolation = {
        'csp-report': { ...validViolation['csp-report'] },
      };
      delete (invalidViolation['csp-report'] as any)['document-uri'];

      expect(validateCSPViolation(invalidViolation)).toBe(false);
    });

    it('should reject reports with invalid URIs', () => {
      const invalidViolation = {
        'csp-report': { ...validViolation['csp-report'] },
      };
      (invalidViolation['csp-report'] as any)['document-uri'] =
        'not-a-valid-uri';

      expect(validateCSPViolation(invalidViolation)).toBe(false);
    });

    it('should handle empty blocked-uri correctly', () => {
      const violationWithEmptyBlocked = {
        'csp-report': { ...validViolation['csp-report'] },
      };
      (violationWithEmptyBlocked['csp-report'] as any)['blocked-uri'] = '';

      expect(validateCSPViolation(violationWithEmptyBlocked)).toBe(true);
    });
  });

  describe('CSP Severity Assessment', () => {
    it('should classify script-src violations as high severity', () => {
      const violation: CSPViolationReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          referrer: 'https://example.com',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/script.js',
        },
      };

      expect(getCSPSeverity(violation)).toBe('high');
    });

    it('should classify style-src violations as medium severity', () => {
      const violation: CSPViolationReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          referrer: 'https://example.com',
          'violated-directive': 'style-src',
          'effective-directive': 'style-src',
          'original-policy': "style-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/style.css',
        },
      };

      expect(getCSPSeverity(violation)).toBe('medium');
    });

    it('should classify connect-src violations as medium severity', () => {
      const violation: CSPViolationReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          referrer: 'https://example.com',
          'violated-directive': 'connect-src',
          'effective-directive': 'connect-src',
          'original-policy': "connect-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/api',
        },
      };

      expect(getCSPSeverity(violation)).toBe('medium');
    });

    it('should classify other violations as low severity', () => {
      const violation: CSPViolationReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          referrer: 'https://example.com',
          'violated-directive': 'img-src',
          'effective-directive': 'img-src',
          'original-policy': "img-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/image.jpg',
        },
      };

      expect(getCSPSeverity(violation)).toBe('low');
    });

    it('should classify self violations as low severity', () => {
      const violation: CSPViolationReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          referrer: 'https://example.com',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          disposition: 'report',
          'blocked-uri': 'self',
        },
      };

      expect(getCSPSeverity(violation)).toBe('low');
    });
  });

  describe('Nonce Generation', () => {
    it('should generate unique nonces of correct length', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toHaveLength(32);
      expect(nonce2).toHaveLength(32);
      expect(nonce1).toMatch(/^[a-f0-9]{32}$/);
      expect(nonce2).toMatch(/^[a-f0-9]{32}$/);
    });
  });
});
