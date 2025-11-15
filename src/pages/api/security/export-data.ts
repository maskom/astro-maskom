import type { APIRoute } from 'astro';
import { dataProtectionService } from '../../../lib/security/data-protection';
import { rbacService } from '../../../lib/security/rbac';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import { securityAuditLogger } from '../../../lib/security/audit';
import {
  Permission,
  SecurityAction,
  ConsentType,
} from '../../../lib/security/types';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    const { targetUserId, format } = await request.json();
    const userId = targetUserId || securityContext.userId;

    // Check permissions for exporting other users' data
    if (targetUserId && targetUserId !== securityContext.userId) {
      const hasPermission = await rbacService.hasPermission(
        securityContext.userId,
        Permission.DATA_EXPORT
      );

      if (!hasPermission) {
        return new Response('Insufficient permissions', { status: 403 });
      }
    }

    // Check data processing consent
    const hasConsent = await dataProtectionService.hasDataConsent(
      userId,
      ConsentType.DATA_PROCESSING
    );

    if (!hasConsent) {
      return new Response('Data processing consent required', { status: 451 });
    }

    // Export user data
    const userData = await dataProtectionService.exportUserData(userId);

    if (!userData) {
      return new Response('Failed to export user data', { status: 500 });
    }

    let responseContent: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      responseContent = convertToCSV(userData);
      contentType = 'text/csv';
      filename = `user_data_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      responseContent = JSON.stringify(userData, null, 2);
      contentType = 'application/json';
      filename = `user_data_${userId}_${new Date().toISOString().split('T')[0]}.json`;
    }

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.DATA_EXPORT,
      `user:${userId}`,
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      {
        target_user: userId,
        format,
        record_count: Object.keys(userData).length,
      }
    );

    return new Response(responseContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return new Response('Failed to export data', { status: 500 });
  }
};

function convertToCSV(data: Record<string, unknown>[]): string {
  const headers = Object.keys(data[0] || {});

  const flattenObject = (
    obj: Record<string, unknown>,
    prefix = ''
  ): Record<string, unknown> => {
    const flattened: Record<string, unknown> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          Object.assign(flattened, flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = JSON.stringify(obj[key]);
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  };

  // Flatten all data sections
  const flattenedData: Record<string, unknown> = {};

  for (const section in data) {
    if (typeof data[section] === 'object' && data[section] !== null) {
      if (Array.isArray(data[section])) {
        data[section].forEach(
          (item: Record<string, unknown>, index: number) => {
            const flattened = flattenObject(item, `${section}[${index}]`);
            Object.assign(flattenedData, flattened);
          }
        );
      } else {
        const flattened = flattenObject(data[section], section);
        Object.assign(flattenedData, flattened);
      }
    } else {
      flattenedData[section] = data[section];
    }
  }

  // Create header row
  const csvHeaders = Object.keys(flattenedData);
  const csvRows: string[] = [];
  csvRows.push(csvHeaders.join(','));

  // Create data row
  const values = headers.map(header => {
    const value = flattenedData[header];
    if (value === null || value === undefined) {
      return '';
    }
    // Escape commas and quotes in values
    const stringValue = String(value);
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  });
  csvRows.push(values.join(','));

  return csvRows.join('\n');
}
