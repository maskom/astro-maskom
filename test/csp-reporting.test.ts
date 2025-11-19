import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, OPTIONS } from '../src/pages/api/security/csp-report';
import { logger } from '../src/lib/logger';

// Mock the logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Type definitions for API request/response
interface MockRequest {
  headers: Headers;
  json: ReturnType<typeof vi.fn>;
}

interface APIContext {
  request: MockRequest;
}

describe('CSP Violation Reporting API', () => {
  let mockRequest: MockRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      headers: new Headers(),
      json: vi.fn(),
    };
  });

  describe('POST endpoint', () => {
    it('should handle valid CSP violation reports', async () => {
      const validViolation = {
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

      mockRequest.headers.set('content-type', 'application/csp-report');
      mockRequest.json.mockResolvedValue(validViolation);

      const response = await POST({ request: mockRequest } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.severity).toBe('high');
      expect(logger.warn).toHaveBeenCalledWith(
        'CSP violation detected',
        expect.objectContaining({
          module: 'csp-report',
          severity: 'high',
          documentUri: 'https://example.com/page',
          violatedDirective: 'script-src',
        })
      );
    });

    it('should reject invalid content types', async () => {
      mockRequest.headers.set('content-type', 'text/plain');

      const response = await POST({ request: mockRequest } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid content type');
    });

    it('should handle malformed JSON', async () => {
      mockRequest.headers.set('content-type', 'application/json');
      mockRequest.json.mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST({ request: mockRequest } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid JSON in CSP report',
        expect.objectContaining({
          module: 'csp-report',
        })
      );
    });

    it('should reject invalid violation report structure', async () => {
      const invalidViolation = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          // Missing required fields
        },
      };

      mockRequest.headers.set('content-type', 'application/json');
      mockRequest.json.mockResolvedValue(invalidViolation);

      const response = await POST({ request: mockRequest } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid violation report');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid CSP violation report structure',
        expect.objectContaining({
          module: 'csp-report',
        })
      );
    });

    it('should handle high-severity violations with error logging', async () => {
      const highSeverityViolation = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          referrer: 'https://example.com/',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/script.js',
        },
      };

      mockRequest.headers.set('content-type', 'application/csp-report');
      mockRequest.json.mockResolvedValue(highSeverityViolation);

      const response = await POST({ request: mockRequest } as APIContext);

      expect(response.status).toBe(200);
      expect(logger.error).toHaveBeenCalledWith(
        'High-severity CSP violation - immediate attention required',
        undefined,
        expect.objectContaining({
          module: 'csp-report',
          severity: 'high',
        })
      );
    });

    it('should handle server errors gracefully', async () => {
      mockRequest.headers.set('content-type', 'application/json');
      mockRequest.json.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await POST({ request: mockRequest } as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON');
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid JSON in CSP report',
        expect.objectContaining({
          module: 'csp-report',
        })
      );
    });

    it('should limit script sample length in logs', async () => {
      const violationWithLongScript = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          referrer: 'https://example.com/',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/script.js',
          'script-sample': 'a'.repeat(200), // Very long script sample
        },
      };

      mockRequest.headers.set('content-type', 'application/csp-report');
      mockRequest.json.mockResolvedValue(violationWithLongScript);

      await POST({ request: mockRequest } as APIContext);

      expect(logger.warn).toHaveBeenCalledWith(
        'CSP violation detected',
        expect.objectContaining({
          scriptSample: expect.stringMatching(/^a{100}$/), // Should be truncated to 100 chars
        })
      );
    });

    it('should include user agent in violation logs', async () => {
      const validViolation = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          disposition: 'report',
          'blocked-uri': 'https://evil.com/script.js',
        },
      };

      mockRequest.headers.set('content-type', 'application/csp-report');
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 (Test Browser)');
      mockRequest.json.mockResolvedValue(validViolation);

      await POST({ request: mockRequest } as APIContext);

      expect(logger.warn).toHaveBeenCalledWith(
        'CSP violation detected',
        expect.objectContaining({
          userAgent: 'Mozilla/5.0 (Test Browser)',
        })
      );
    });
  });

  describe('OPTIONS endpoint', () => {
    it('should return correct CORS headers for preflight', async () => {
      const response = await OPTIONS({} as APIContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'POST, OPTIONS'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type'
      );
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});
