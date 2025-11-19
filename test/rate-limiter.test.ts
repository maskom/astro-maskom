import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RateLimiter,
  getRateLimitConfig,
  getClientIdentifier,
} from '../src/lib/rate-limiter';

// Import the KVNamespace type
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

// Mock KV namespace
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
};

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests within limit', async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    const rateLimiter = new RateLimiter(mockKV as KVNamespace, 60000, 10);
    const result = await rateLimiter.isAllowed('test-client');

    expect(result.allowed).toBe(true);
    expect(result.info.count).toBe(1);
    expect(result.info.maxRequests).toBe(10);
    expect(mockKV.put).toHaveBeenCalled();
  });

  it('should block requests exceeding limit', async () => {
    const now = Date.now();
    const existingData = JSON.stringify({
      count: 10,
      resetTime: now + 60000,
      windowMs: 60000,
      maxRequests: 10,
    });

    mockKV.get.mockResolvedValue(existingData);
    mockKV.put.mockResolvedValue(undefined);

    const rateLimiter = new RateLimiter(mockKV as KVNamespace, 60000, 10);
    const result = await rateLimiter.isAllowed('test-client');

    expect(result.allowed).toBe(false);
    expect(result.info.count).toBe(11);
  });

  it('should reset window when expired', async () => {
    const pastTime = Date.now() - 1000;
    const existingData = JSON.stringify({
      count: 10,
      resetTime: pastTime,
      windowMs: 60000,
      maxRequests: 10,
    });

    mockKV.get.mockResolvedValue(existingData);
    mockKV.put.mockResolvedValue(undefined);

    const rateLimiter = new RateLimiter(mockKV as KVNamespace, 60000, 10);
    const result = await rateLimiter.isAllowed('test-client');

    expect(result.allowed).toBe(true);
    expect(result.info.count).toBe(1);
    expect(result.info.resetTime).toBeGreaterThan(pastTime);
  });

  it('should generate correct rate limit headers', () => {
    const rateLimiter = new RateLimiter(mockKV as KVNamespace);
    const info = {
      count: 5,
      resetTime: Date.now() + 3600000, // Use milliseconds like the actual implementation
      windowMs: 60000,
      maxRequests: 100,
    };

    const headers = rateLimiter.getRateLimitHeaders(info);

    expect(headers['X-RateLimit-Limit']).toBe('100');
    expect(headers['X-RateLimit-Remaining']).toBe('95');
    expect(headers['X-RateLimit-Reset']).toBe(
      Math.ceil(info.resetTime / 1000).toString()
    );
    expect(headers['X-RateLimit-Retry-After']).toBe('0');
  });

  it('should set retry-after when limit exceeded', () => {
    const rateLimiter = new RateLimiter(mockKV as KVNamespace);
    const info = {
      count: 100,
      resetTime: Date.now() + 3600000, // Use milliseconds like the actual implementation
      windowMs: 60000,
      maxRequests: 100,
    };

    const headers = rateLimiter.getRateLimitHeaders(info);

    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['X-RateLimit-Retry-After']).toBe(
      Math.ceil(info.resetTime / 1000).toString()
    );
  });
});

describe('getRateLimitConfig', () => {
  it('should return auth config for auth endpoints', () => {
    const config = getRateLimitConfig('/api/auth/signin');
    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(10);
  });

  it('should return payments config for payment endpoints', () => {
    const config = getRateLimitConfig('/api/payments/create');
    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(20);
  });

  it('should return chat config for chat endpoints', () => {
    const config = getRateLimitConfig('/api/chat/send');
    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(30);
  });

  it('should return general API config for other API endpoints', () => {
    const config = getRateLimitConfig('/api/users/profile');
    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(100);
  });

  it('should return default config for non-API endpoints', () => {
    const config = getRateLimitConfig('/some/path');
    expect(config.windowMs).toBe(60000);
    expect(config.maxRequests).toBe(100);
  });
});

describe('getClientIdentifier', () => {
  it('should use Cloudflare connecting IP when available', () => {
    const request = {
      cf: { connecting_ip: '192.168.1.1' },
      headers: new Headers({ 'user-agent': 'TestAgent/1.0' }),
    } as any;

    const identifier = getClientIdentifier(request);
    expect(identifier).toContain('192.168.1.1');
  });

  it('should use x-forwarded-for header when Cloudflare IP not available', () => {
    const request = {
      cf: {},
      headers: new Headers({
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
      }),
    } as any;

    const identifier = getClientIdentifier(request);
    expect(identifier).toContain('10.0.0.1');
  });

  it('should use unknown IP when no IP information available', () => {
    const request = {
      cf: {},
      headers: new Headers({ 'user-agent': 'TestAgent/1.0' }),
    } as any;

    const identifier = getClientIdentifier(request);
    expect(identifier).toContain('unknown');
  });

  it('should include user agent fingerprint', () => {
    const request = {
      cf: { connecting_ip: '192.168.1.1' },
      headers: new Headers({ 'user-agent': 'Mozilla/5.0 (Test Browser)' }),
    } as any;

    const identifier = getClientIdentifier(request);
    expect(identifier).toContain('192.168.1.1');
    expect(identifier.split(':')).toHaveLength(2);
  });
});
