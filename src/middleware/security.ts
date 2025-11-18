import { isDevelopment } from '@/lib/env';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export const getSecurityHeaders = (nonce?: string): SecurityHeaders => {
  const isDev = isDevelopment();
  
  // Build CSP based on environment
  const cspDirectives = [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
  ];

  // Script source: different for dev vs prod
  if (isDev) {
    // Development: allow unsafe-eval and unsafe-inline for Astro dev server
    const cspScriptSrc = nonce ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'` : "'self' 'unsafe-eval' 'unsafe-inline'";
    cspDirectives.push(`script-src ${cspScriptSrc}`);
  } else {
    // Production: strict CSP with nonce only
    const cspScriptSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self'";
    cspDirectives.push(`script-src ${cspScriptSrc}`);
  }

  // Style source: allow inline styles with nonce in production, more permissive in dev
  if (isDev) {
    cspDirectives.push("style-src 'self' 'unsafe-inline'");
  } else {
    const cspStyleSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self'";
    cspDirectives.push(`style-src ${cspStyleSrc}`);
  }

  // Other directives (same for both environments)
  cspDirectives.push("img-src 'self' data: https: blob:");
  cspDirectives.push("font-src 'self' data:");
  cspDirectives.push("connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co");

  return {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };
};

export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
