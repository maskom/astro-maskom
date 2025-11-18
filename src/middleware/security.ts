export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export const getSecurityHeaders = (nonce?: string): SecurityHeaders => {
  const cspScriptSrc = nonce ? `'nonce-${nonce}'` : "'self'";
  const cspStyleSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self'";

  // Check if we're in development mode
  const isDevelopment =
    import.meta.env.MODE === 'development' || import.meta.env.DEV;

  // Only allow unsafe-eval in development for Astro HMR
  const scriptSrc = isDevelopment
    ? `${cspScriptSrc} 'unsafe-eval'`
    : cspScriptSrc;

  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${cspStyleSrc}`,
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "manifest-src 'self'",
    ].join('; '),
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
