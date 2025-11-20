import type { APIRoute } from 'astro';
import { logger } from '@/lib/logger';
import {
  validateCSPViolation,
  getCSPSeverity,
  type CSPViolationReport,
} from '@/middleware/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Only accept JSON content type
    const contentType = request.headers.get('content-type');
    if (
      !contentType?.includes('application/json') &&
      !contentType?.includes('csp-report')
    ) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse CSP violation report
    let violation: CSPViolationReport;
    try {
      violation = await request.json();
    } catch (error) {
      logger.warn('Invalid JSON in CSP report', {
        module: 'csp-report',
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the violation report structure
    if (!validateCSPViolation(violation)) {
      logger.warn('Invalid CSP violation report structure', {
        module: 'csp-report',
        violation: JSON.stringify(violation).substring(0, 500),
      });
      return new Response(
        JSON.stringify({ error: 'Invalid violation report' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const report = violation['csp-report'];
    const severity = getCSPSeverity(violation);

    // Log the CSP violation with structured data
    logger.warn('CSP violation detected', {
      module: 'csp-report',
      severity,
      documentUri: report['document-uri'],
      referrer: report['referrer'],
      violatedDirective: report['violated-directive'],
      effectiveDirective: report['effective-directive'],
      blockedUri: report['blocked-uri'],
      lineNumber: report['line-number'],
      columnNumber: report['column-number'],
      sourceFile: report['source-file'],
      statusCode: report['status-code'],
      scriptSample: report['script-sample']?.substring(0, 100), // Limit sample length
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp: new Date().toISOString(),
    });

    // For high-severity violations, we could implement additional alerting
    if (severity === 'high') {
      logger.error(
        'High-severity CSP violation - immediate attention required',
        undefined,
        {
          module: 'csp-report',
          severity,
          documentUri: report['document-uri'],
          violatedDirective: report['violated-directive'],
          blockedUri: report['blocked-uri'],
          timestamp: new Date().toISOString(),
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'CSP violation logged',
        severity,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error(
      'Error processing CSP violation report',
      error instanceof Error ? error : new Error(String(error)),
      { module: 'csp-report' }
    );

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process CSP violation report',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// OPTIONS endpoint for CORS preflight
export const OPTIONS: APIRoute = () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};
