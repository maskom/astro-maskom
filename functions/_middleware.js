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
  
  // Apply security headers to HTML pages
  if (pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.')) {
    const nonce = generateNonce();
    applySecurityHeaders(response, nonce);
    
    // Inject nonce into HTML for script tags
    const html = await response.text();
    const htmlWithNonce = html.replace(/<script/g, `<script nonce="${nonce}"`);
    
    return new Response(htmlWithNonce, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
  
  return response;
};
