import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../src/pages/api/status';

// Mock dependencies
vi.mock('../../src/lib/status', () => ({
  getStatusData: vi.fn(),
}));

vi.mock('../../src/lib/sanitization', () => ({
  sanitizeString: vi.fn((input: string) => input.replace(/<[^>]*>/g, '')),
}));

vi.mock('../../src/lib/middleware/api', () => ({
  withApiMiddleware: (handler: any) => handler,
}));

describe('Status API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/status', () => {
    it('should return status data with proper headers', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const mockStatusData = {
        services: {
          api: { status: 'healthy' },
          database: { status: 'healthy' },
          email: { status: 'healthy' },
        },
        uptime: 12345,
        version: '1.0.0',
      };

      vi.mocked(getStatusData).mockResolvedValue(mockStatusData);

      const mockUrl = 'https://example.com/api/status';
      const response = await GET({ url: mockUrl.toString() });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStatusData);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should sanitize query parameters', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = new URL(
        'https://example.com/api/status?param=<script>alert("xss")</script>&name=test'
      );
      await GET({ url: mockUrl.toString() });

      expect(sanitizeString).toHaveBeenCalledWith(
        '<script>alert("xss")</script>'
      );
      expect(sanitizeString).toHaveBeenCalledWith('test');
    });

    it('should handle empty query parameters', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = 'https://example.com/api/status';
      await GET({ url: mockUrl.toString() });

      expect(sanitizeString).not.toHaveBeenCalled();
    });

    it('should handle multiple query parameters with same name', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = new URL(
        'https://example.com/api/status?param=value1&param=value2'
      );
      await GET({ url: mockUrl.toString() });

      // Should sanitize both values (URLSearchParams will return the last one for entries())
      expect(sanitizeString).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in query parameters', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = new URL(
        'https://example.com/api/status?query=hello%20world&filter=category%3Dnews'
      );
      await GET({ url: mockUrl.toString() });

      expect(sanitizeString).toHaveBeenCalledWith('hello world');
      expect(sanitizeString).toHaveBeenCalledWith('category=news');
    });

    it('should propagate errors from getStatusData', async () => {
      const { getStatusData } = await import('../../src/lib/status');

      vi.mocked(getStatusData).mockRejectedValue(
        new Error('Database connection failed')
      );

      const mockUrl = 'https://example.com/api/status';

      await expect(GET({ url: mockUrl.toString() })).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle URL parsing errors gracefully', async () => {
      // Test with malformed URL
      await expect(GET({ url: 'not-a-valid-url' })).rejects.toThrow();
    });

    it('should maintain security headers even when status data includes sensitive info', async () => {
      const { getStatusData } = await import('../../src/lib/status');

      const mockStatusData = {
        services: {
          api: { status: 'healthy', details: 'some internal info' },
          database: {
            status: 'healthy',
            connection: 'postgresql://user:pass@localhost:5432/db',
          },
        },
        uptime: 12345,
        version: '1.0.0',
      };

      vi.mocked(getStatusData).mockResolvedValue(mockStatusData);

      const mockUrl = 'https://example.com/api/status';
      const response = await GET({ url: mockUrl.toString() });

      // Security headers should still be present
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );

      // Data should be returned as-is (status endpoint might need internal details)
      const data = await response.json();
      expect(data).toEqual(mockStatusData);
    });

    it('should handle large query parameter values', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const largeValue = 'a'.repeat(10000);
      const mockUrl = new URL(
        `https://example.com/api/status?data=${largeValue}`
      );
      await GET({ url: mockUrl.toString() });

      expect(sanitizeString).toHaveBeenCalledWith(largeValue);
    });

    it('should handle Unicode characters in query parameters', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      const { sanitizeString } = await import('../../src/lib/sanitization');

      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = new URL(
        'https://example.com/api/status?message=Hello%20%E4%B8%96%E7%95%8C&emoji=%F0%9F%98%8A'
      );
      await GET({ url: mockUrl.toString() });

      expect(sanitizeString).toHaveBeenCalledWith('Hello 世界');
      expect(sanitizeString).toHaveBeenCalledWith('😊');
    });
  });

  describe('Security Headers', () => {
    it('should include all required security headers', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = 'https://example.com/api/status';
      const response = await GET({ url: mockUrl.toString() });

      const requiredHeaders = [
        'Content-Type',
        'Cache-Control',
        'Pragma',
        'Expires',
        'X-Content-Type-Options',
      ];

      requiredHeaders.forEach(header => {
        expect(response.headers.get(header)).toBeTruthy();
      });
    });

    it('should prevent caching with proper cache control headers', async () => {
      const { getStatusData } = await import('../../src/lib/status');
      vi.mocked(getStatusData).mockResolvedValue({ status: 'healthy' });

      const mockUrl = 'https://example.com/api/status';
      const response = await GET({ url: mockUrl.toString() });

      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });
});
