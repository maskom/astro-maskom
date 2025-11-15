import { applySecurityHeaders, generateNonce } from '../src/middleware/security.js';

export const onRequest = async ({ request, next }) => {
  const response = await next();
  const { pathname } = new URL(request.url);
  
  // Apply cache control
  if (pathname.startsWith('/assets/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }
  
  // Generate nonce for pages that might need inline scripts
  const nonce = pathname.includes('chat') || pathname.includes('dashboard') ? generateNonce() : undefined;
  if (nonce) {
    response.headers.set('x-nonce', nonce);
  }
  
  // Apply security headers
  applySecurityHeaders(response, nonce);
  
  return response;
};
