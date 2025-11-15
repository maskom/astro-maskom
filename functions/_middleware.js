import { generateNonce, applySecurityHeaders } from '../src/middleware/security.js';

export const onRequest = async ({ request, next }) => {
  const response = await next();
  const { pathname } = new URL(request.url);
  
  // Apply cache control
  if (pathname.startsWith('/assets/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }
  
  // Generate nonce for this request
  const nonce = generateNonce();
  
  // Apply security headers
  applySecurityHeaders(response, nonce);
  
  // Store nonce in response header for client-side scripts
  response.headers.set('X-CSP-Nonce', nonce);
  
  return response;
};
