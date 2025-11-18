import { getSecurityHeaders, generateNonce } from './middleware/security';
import {
  RateLimiter,
  getRateLimitConfig,
  getClientIdentifier,
} from './lib/rate-limiter';

export const onRequest = async (
  {
    request,
    locals,
    env,
  }: {
    request: Request;
    locals: Record<string, unknown>;
    env: Record<string, unknown>;
  },
  next: () => Promise<Response>
) => {
  const { pathname } = new URL(request.url);

  // Apply rate limiting to API endpoints
  if (pathname.startsWith('/api/') && env.SESSION) {
    try {
      const config = getRateLimitConfig(pathname);
      const rateLimiter = new RateLimiter(
        env.SESSION,
        config.windowMs,
        config.maxRequests
      );
      const identifier = getClientIdentifier(request);

      const { allowed, info } = await rateLimiter.isAllowed(identifier);

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil((info.resetTime - Date.now()) / 1000)} seconds.`,
            retryAfter: Math.ceil((info.resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(
                (info.resetTime - Date.now()) / 1000
              ).toString(),
              ...rateLimiter.getRateLimitHeaders(info),
            },
          }
        );
      }

      // Store rate limit info for response headers
      locals.rateLimitInfo = info;
    } catch (error) {
      console.warn('Rate limiting failed:', error);
      // Continue without rate limiting if KV is unavailable
    }
  }

  const response = await next();

  // Apply cache control for static assets with granular rules
  const isStaticAsset =
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/');

  const fileExtension = pathname.split('.').pop()?.toLowerCase();

  if (isStaticAsset) {
    // Long-term caching for hashed build assets (immutable)
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  } else if (
    fileExtension &&
    ['css', 'js', 'woff', 'woff2', 'ttf', 'otf', 'eot'].includes(fileExtension)
  ) {
    // Medium-term caching for versioned assets
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=3600'
    );
  } else if (
    fileExtension &&
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif'].includes(
      fileExtension
    )
  ) {
    // Long-term caching for images
    response.headers.set(
      'Cache-Control',
      'public, max-age=2592000, stale-while-revalidate=86400'
    );
  } else if (pathname.startsWith('/api/')) {
    // No caching for API endpoints
    response.headers.set(
      'Cache-Control',
      'no-cache, no-store, must-revalidate'
    );
  } else if (
    pathname.endsWith('.xml') ||
    pathname.endsWith('.txt') ||
    pathname.endsWith('.robots')
  ) {
    // Short-term caching for SEO files
    response.headers.set('Cache-Control', 'public, max-age=3600');
  } else {
    // Default caching for HTML pages
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=1800'
    );
  }

  // Apply security headers
  const nonce = generateNonce();
  const securityHeaders = getSecurityHeaders(nonce);

  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });

  // Add nonce to locals for use in templates
  locals.nonce = nonce;

  // Add Cloudflare-specific headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Add rate limit headers if available
  if (locals.rateLimitInfo) {
    const rateLimiter = new RateLimiter(env?.SESSION);
    const rateLimitHeaders = rateLimiter.getRateLimitHeaders(
      locals.rateLimitInfo
    );
    Object.entries(rateLimitHeaders).forEach(([header, value]) => {
      response.headers.set(header, value);
    });
  }

  // Add performance and monitoring headers
  response.headers.set('Server-Timing', 'cloudflare;desc=cdn');
  return response;
};
