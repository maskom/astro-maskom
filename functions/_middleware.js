export const onRequest = async ({ request, next }) => {
  const response = await next();
  const { pathname } = new URL(request.url);
  
  // Apply cache control
  if (pathname.startsWith('/assets/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }
  
  // Apply security headers
  const nonce = crypto.getRandomValues(new Uint8Array(16))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  return response;
};
