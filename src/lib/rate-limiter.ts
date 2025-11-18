// Simple rate limiting utilities for Cloudflare Pages
export interface RateLimitInfo {
  count: number;
  resetTime: number;
  windowMs: number;
  maxRequests: number;
}

// Cloudflare KV namespace type
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

export class RateLimiter {
  private kv: KVNamespace;
  private windowMs: number;
  private maxRequests: number;

  constructor(kv: KVNamespace, windowMs = 60000, maxRequests = 100) {
    this.kv = kv;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async isAllowed(
    identifier: string
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();

    // Get current rate limit data
    const existing = await this.kv.get(key);
    let data: RateLimitInfo;

    if (existing) {
      data = JSON.parse(existing);

      // Reset window if expired
      if (now > data.resetTime) {
        data = {
          count: 1,
          resetTime: now + this.windowMs,
          windowMs: this.windowMs,
          maxRequests: this.maxRequests,
        };
      } else {
        data.count++;
      }
    } else {
      data = {
        count: 1,
        resetTime: now + this.windowMs,
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
      };
    }

    // Store updated data with TTL
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: Math.ceil(this.windowMs / 1000) + 60,
    });

    return {
      allowed: data.count <= this.maxRequests,
      info: data,
    };
  }

  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    const remaining = Math.max(0, info.maxRequests - info.count);
    const resetTime = Math.ceil(info.resetTime / 1000);

    return {
      'X-RateLimit-Limit': info.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
      'X-RateLimit-Retry-After': remaining === 0 ? resetTime.toString() : '0',
    };
  }
}

// Rate limiting configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  // API endpoints - stricter limits
  'api/auth': { windowMs: 60000, maxRequests: 10 }, // 10 requests per minute for auth
  'api/payments': { windowMs: 60000, maxRequests: 20 }, // 20 requests per minute for payments
  'api/chat': { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute for chat

  // General API - moderate limits
  api: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute for general API

  // Static assets - very permissive
  assets: { windowMs: 60000, maxRequests: 1000 }, // 1000 requests per minute for assets
};

export function getRateLimitConfig(pathname: string): {
  windowMs: number;
  maxRequests: number;
} {
  // Find the most specific matching config
  for (const [pattern, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (pathname.includes(pattern)) {
      return config;
    }
  }

  // Default conservative limit
  return { windowMs: 60000, maxRequests: 100 };
}

export function getClientIdentifier(request: Request): string {
  // Use IP address as primary identifier
  const cf = (
    request as unknown as {
      cf?: { connecting_ip?: string; client_ip?: string };
    }
  ).cf;
  const ip =
    cf?.connecting_ip ||
    cf?.client_ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Add user agent fingerprint for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const fingerprint = btoa(userAgent.slice(0, 50))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 10);

  return `${ip}:${fingerprint}`;
}
