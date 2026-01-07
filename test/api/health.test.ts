import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, HEAD } from '../../src/pages/api/health';

// Mock dependencies
vi.mock('../../src/lib/supabase', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Health API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv(
      'SUPABASE_KEY',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3Qtc3VwYWJhc2UiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.test123456789012345678901234567890123456789012345678901234567890'
    );
    vi.stubEnv('MODE', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const { createServerClient } = await import('../../src/lib/supabase');
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn(),
          getSession: vi
            .fn()
            .mockResolvedValue({ data: { session: null }, error: null }),
        },
      } as unknown as ReturnType<typeof createServerClient>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.supabase.status).toBe('healthy');
      expect(data.env_check.status).toBe('healthy');
    });

    it('should return degraded status when environment variables are missing', async () => {
      vi.stubEnv('SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_KEY', '');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('degraded');
      expect(data.env_check.status).toBe('error');
      expect(data.env_check.missing_vars).toContain('SUPABASE_URL');
      expect(data.env_check.missing_vars).toContain('SUPABASE_KEY');
    });

    it('should handle Supabase client creation errors gracefully', async () => {
      const { createServerClient } = await import('../../src/lib/supabase');
      vi.mocked(createServerClient).mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const response = await GET();
      const data = await response.json();

      expect(data.services.supabase.status).toBe('error');
      expect(data.services.supabase.error).toBe('Supabase connection failed');
    });

    it('should skip Supabase check in development mode', async () => {
      vi.stubEnv('MODE', 'development');
      const { createServerClient } = await import('../../src/lib/supabase');
      vi.mocked(createServerClient).mockImplementation(() => {
        throw new Error('Development error');
      });

      const response = await GET();
      const data = await response.json();

      expect(data.services.supabase.status).toBe('skipped');
      expect(data.services.supabase.error).toBe(
        'Supabase not available in development'
      );
    });

    it('should include proper CORS headers', async () => {
      const response = await GET();

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, HEAD'
      );
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
      expect(response.headers.get('X-Health-Check')).toBe('astro-maskom');
    });

    it('should include required health check fields', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('responseTime');
      expect(data).toHaveProperty('env_check');
      expect(data).toHaveProperty('services');
    });

    it('should handle KV binding when available', async () => {
      // Mock globalThis.SESSION for KV testing
      const mockKV = {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue('123'),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      (globalThis as unknown as { SESSION: typeof mockKV }).SESSION = mockKV;

      await GET({ url: new URL('https://example.com/api/health') });

      expect(mockKV.put).toHaveBeenCalled();
      expect(mockKV.get).toHaveBeenCalled();
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should handle KV test failures', async () => {
      const mockKV = {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue('different-value'), // Simulate read/write mismatch
        delete: vi.fn().mockResolvedValue(undefined),
      };
      (globalThis as unknown as { SESSION: typeof mockKV }).SESSION = mockKV;

      const response = await GET();
      const data = await response.json();

      expect(data.services.cloudflare.kv.status).toBe('error');
      expect(data.services.cloudflare.kv.error).toBe(
        'KV read/write test failed'
      );
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 status with no body', async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
    });
  });

  describe('Response Time Measurement', () => {
    it('should measure and include response time', async () => {
      const startTime = Date.now();
      const response = await GET();
      const endTime = Date.now();
      const data = await response.json();

      expect(data.responseTime).toBeGreaterThanOrEqual(0);
      expect(data.responseTime).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
    });
  });

  describe('Environment Detection', () => {
    it('should detect Cloudflare Workers environment', async () => {
      // Mock Cloudflare Workers user agent
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Cloudflare-Workers',
        },
        writable: true,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.services.cloudflare.features).toContain('workers-runtime');
    });

    it('should include deployment information when available', async () => {
      vi.stubEnv('CF_PAGES_URL', 'https://test.pages.dev');
      vi.stubEnv('CF_PAGES_BRANCH', 'main');
      vi.stubEnv('GITHUB_SHA', 'abc123');

      const response = await GET();
      const data = await response.json();

      expect(data.services.deployment.deployment_url).toBe(
        'https://test.pages.dev'
      );
      expect(data.services.deployment.environment).toBe('main');
      expect(data.services.deployment.commit_sha).toBe('abc123');
    });
  });
});
