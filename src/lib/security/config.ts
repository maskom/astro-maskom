import type { SecurityConfig } from './types';

export const securityConfig: SecurityConfig = {
  max_failed_attempts: 5,
  lockout_duration_minutes: 15,
  session_timeout_minutes: 30,
  password_min_length: 8,
  password_require_special_chars: true,
  mfa_required_for_roles: ['admin', 'super_admin'],
  audit_log_retention_days: 365,
  data_retention_days: 2555, // 7 years for GDPR compliance
  enable_ip_whitelist: false,
  enable_rate_limiting: true,
  rate_limit_requests_per_minute: 60,
};

export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'nonce-{{nonce}}'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Security-Policy': "default-src 'self'",
};

export const ipWhitelist = [
  // Add trusted IP addresses here
  // '192.168.1.0/24',
  // '10.0.0.0/8'
];

export const trustedOrigins = [
  'https://maskom-network.com',
  'https://www.maskom-network.com',
  'http://localhost:3000',
  'http://localhost:4321',
];

export function isIPWhitelisted(ip: string): boolean {
  if (!securityConfig.enable_ip_whitelist) {
    return true;
  }

  return ipWhitelist.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation check (simplified)
      const [network] = allowedIP.split('/');
      return ip.startsWith(network);
    }
    return ip === allowedIP;
  });
}

export function isOriginTrusted(origin: string): boolean {
  return trustedOrigins.includes(origin);
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
