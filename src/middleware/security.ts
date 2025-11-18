export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export const getSecurityHeaders = (
  nonce?: string,
  isDevelopment?: boolean
): SecurityHeaders => {
  // Use provided isDevelopment flag or fall back to environment
  const devMode =
    isDevelopment !== undefined ? isDevelopment : import.meta.env.DEV;

  // Development CSP - more relaxed for development experience
  const developmentCsp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${nonce ? `'nonce-${nonce}'` : ''}`, // Allow unsafe-eval and unsafe-inline in development, plus nonce
    `style-src 'self' 'unsafe-inline' ${nonce ? `'nonce-${nonce}'` : ''}`, // Include nonce for styles too
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https://api.openai.com https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
  ];

  // Production CSP - strict with nonce-based script execution
  const productionCsp = [
    "default-src 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} 'unsafe-inline'`, // Use nonce and allow inline handlers
    `style-src 'self' ${nonce ? `'nonce-${nonce}'` : ''}`, // Use nonce for styles too
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
  ];

  const csp = devMode ? developmentCsp : productionCsp;

  return {
    'Content-Security-Policy': csp.join('; '),
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
