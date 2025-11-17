import { defineMiddleware } from 'astro:middleware';
import { getSecurityHeaders, generateNonce } from './middleware/security';

export const onRequest = async ({ request, locals }, next) => {
  const response = await next();
  const { pathname } = new URL(request.url);

  // Apply cache control for static assets
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/assets/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  } else if (pathname.endsWith('.css') || pathname.endsWith('.js')) {
    response.headers.set('Cache-Control', 'public, max-age=86400');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
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

  // Add performance and monitoring headers
  response.headers.set('Server-Timing', 'cloudflare;desc=cdn');

  return response;
};
