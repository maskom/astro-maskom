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
import { logger, generateRequestId } from '../../../lib/logger';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = generateRequestId();
  
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
      responseContent = convertToCSV(
        userData as unknown as Record<string, unknown>
      );
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
    logger.apiError('Data export error:', error, {
      requestId,
      endpoint: '/api/security/export-data',
      method: 'UNKNOWN'
    });
    return new Response('Failed to export data', { status: 500 });
  }
};

function convertToCSV(data: Record<string, unknown>): string {
  const csvRows: string[] = [];

  // Helper function to flatten nested objects
  const flattenObject = (
    obj: unknown,
    prefix = ''
  ): Record<string, unknown> => {
    const flattened: Record<string, unknown> = {};

    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const objValue = (obj as Record<string, unknown>)[key];

        if (
          typeof objValue === 'object' &&
          objValue !== null &&
          !Array.isArray(objValue)
        ) {
          Object.assign(flattened, flattenObject(objValue, newKey));
        } else if (Array.isArray(objValue)) {
          flattened[newKey] = JSON.stringify(objValue);
        } else {
          flattened[newKey] = objValue;
        }
      }
    }

    return flattened;
  };

  // Flatten all data sections
  const flattenedData: Record<string, unknown> = {};

  for (const section in data) {
    const sectionData = (data as Record<string, unknown>)[section];
    if (typeof sectionData === 'object' && sectionData !== null) {
      if (Array.isArray(sectionData)) {
        sectionData.forEach((item: unknown, index: number) => {
          const flattened = flattenObject(item, `${section}[${index}]`);
          Object.assign(flattenedData, flattened);
        });
      } else {
        const flattened = flattenObject(sectionData, section);
        Object.assign(flattenedData, flattened);
      }
    } else {
      flattenedData[section] = sectionData;
    }
  }

  // Create header row
  const headers = Object.keys(flattenedData);
  csvRows.push(headers.join(','));

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
