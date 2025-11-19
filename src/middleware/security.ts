import { isDevelopment } from '@/lib/env';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'Content-Security-Policy-Report-Only'?: string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

export const getSecurityHeaders = (nonce?: string): SecurityHeaders => {
  const isDev = isDevelopment();

  // Enhanced CSP with comprehensive directives
  const cspDirectives = [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
  ];

  // Script source: hardened for production, controlled for development
  if (isDev) {
    // Development: minimal unsafe allowances for Astro dev server
    const cspScriptSrc = nonce
      ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`
      : "'self' 'unsafe-eval' 'unsafe-inline'";
    cspDirectives.push(`script-src ${cspScriptSrc}`);
  } else {
    // Production: strict nonce-based CSP
    const cspScriptSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self'";
    cspDirectives.push(`script-src ${cspScriptSrc}`);
  }

  // Style source: hardened with nonce support
  if (isDev) {
    cspDirectives.push("style-src 'self' 'unsafe-inline'");
  } else {
    const cspStyleSrc = nonce ? `'self' 'nonce-${nonce}'` : "'self'";
    cspDirectives.push(`style-src ${cspStyleSrc}`);
  }

  // Enhanced resource directives with strict third-party control
  cspDirectives.push("img-src 'self' data: https: blob:");
  cspDirectives.push("font-src 'self' data:");

  // Connect source with explicit allowlist
  const connectSources = [
    "'self'",
    'https://api.openai.com',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ];

  // Add CSP violation reporting endpoint in production
  if (!isDev) {
    connectSources.push("'self'"); // For the CSP report endpoint
  }

  cspDirectives.push(`connect-src ${connectSources.join(' ')}`);

  // Additional security directives
  cspDirectives.push("frame-src 'self'");
  cspDirectives.push("prefetch-src 'self'");
  cspDirectives.push("navigate-to 'self'");

  const headers: SecurityHeaders = {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };

  // Add CSP report-only policy for monitoring in production
  if (!isDev) {
    const reportOnlyDirectives = [
      ...cspDirectives,
      'report-uri /api/security/csp-report',
      'report-to csp-endpoint',
    ];
    headers['Content-Security-Policy-Report-Only'] =
      reportOnlyDirectives.join('; ');
  }

  return headers;
};

export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getCSPReportGroup = (): string => {
  return JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400, // 7 days
    endpoints: [
      {
        url: '/api/security/csp-report',
      },
    ],
    include_subdomains: false,
  });
};

export const validateCSPViolation = (report: CSPViolationReport): boolean => {
  const cspReport = report['csp-report'];

  // Required fields validation
  const requiredFields = [
    'document-uri',
    'violated-directive',
    'effective-directive',
    'original-policy',
    'disposition',
    'blocked-uri',
  ];

  for (const field of requiredFields) {
    if (!(field in cspReport)) {
      return false;
    }
  }

  // Check that required non-empty fields are not empty
  const nonEmptyFields = [
    'document-uri',
    'violated-directive',
    'effective-directive',
    'original-policy',
    'disposition',
  ];

  for (const field of nonEmptyFields) {
    if (!cspReport[field as keyof typeof cspReport]) {
      return false;
    }
  }

  // Validate URI format
  try {
    new URL(cspReport['document-uri']);
    // blocked-uri can be empty, 'none', or a valid URL
    if (
      cspReport['blocked-uri'] &&
      cspReport['blocked-uri'] !== '' &&
      cspReport['blocked-uri'] !== 'none'
    ) {
      new URL(cspReport['blocked-uri']);
    }
  } catch {
    return false;
  }

  return true;
};

export const getCSPSeverity = (
  violation: CSPViolationReport
): 'low' | 'medium' | 'high' => {
  const report = violation['csp-report'];
  const blockedUri = report['blocked-uri'];
  const violatedDirective = report['violated-directive'];

  // High severity: script-src violations, external domains
  if (
    violatedDirective.includes('script-src') &&
    blockedUri &&
    !blockedUri.includes('self') &&
    !blockedUri.includes('data:')
  ) {
    return 'high';
  }

  // Medium severity: style-src, connect-src violations
  if (
    violatedDirective.includes('style-src') ||
    violatedDirective.includes('connect-src')
  ) {
    return 'medium';
  }

  // Low severity: other directive violations
  return 'low';
};
