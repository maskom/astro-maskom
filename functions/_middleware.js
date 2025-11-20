import {
  getSecurityHeaders,
  generateNonce,
} from '../src/middleware/security.js';

export const onRequest = async ({ request, next }) => {
  const response = await next();
  const { pathname } = new URL(request.url);

  // Apply cache control
  if (pathname.startsWith('/assets/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }

  // Apply security headers
  const nonce = generateNonce();
  const securityHeaders = getSecurityHeaders(nonce);

  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });

  // Add nonce to response for use in templates
  response.headers.set('X-Nonce', nonce);

  return response;
};
