/**
 * Security headers configuration for CSP and other security measures
 */

export interface SecurityConfig {
  contentSecurityPolicy: string;
  frameOptions: string;
  contentTypeOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  strictTransportSecurity: string;
}

/**
 * Generate a nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get security headers configuration
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const cspNonce = nonce || generateNonce();
  
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + cspNonce + "'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: Response, nonce?: string): Response {
  const headers = getSecurityHeaders(nonce);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}