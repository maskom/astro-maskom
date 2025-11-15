import type { APIRoute } from 'astro';
import { rbacService } from '../../../lib/security/rbac';
import { dataProtectionService } from '../../../lib/security/data-protection';
import { SecurityMiddleware } from '../../../lib/security/middleware';
import { securityAuditLogger } from '../../../lib/security/audit';
import {
  Permission,
  UserRole,
  SecurityAction,
} from '../../../lib/security/types';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    const searchParams = new URLSearchParams(url.search);
    const targetUserId = searchParams.get('userId');

    // Users can only view their own profile unless they have admin permissions
    if (targetUserId && targetUserId !== securityContext.userId) {
      const hasPermission = await rbacService.hasPermission(
        securityContext.userId,
        Permission.VIEW_CUSTOMERS
      );

      if (!hasPermission) {
        return new Response('Insufficient permissions', { status: 403 });
      }
    }

    const userId = targetUserId || securityContext.userId;

    // Get user security profile
    const profile = await rbacService.getUserSecurityProfile(userId);

    if (!profile) {
      return new Response('User profile not found', { status: 404 });
    }

    // Get user permissions
    const permissions = await rbacService.getUserPermissions(userId);

    // Get data consents
    const { data: consents } = await (
      await import('@supabase/supabase-js')
    )
      .createClient(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY
      )
      .from('data_consents')
      .select('*')
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        profile: {
          ...profile,
          mfa_secret: undefined, // Exclude sensitive data
          backup_codes: undefined,
        },
        permissions,
        consents: consents || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('User profile error:', error);
    return new Response('Failed to fetch user profile', { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    const { targetUserId, role, permissions } = await request.json();

    if (!targetUserId) {
      return new Response('Target user ID is required', { status: 400 });
    }

    // Check permissions for modifying other users
    if (targetUserId !== securityContext.userId) {
      const hasPermission = await rbacService.hasPermission(
        securityContext.userId,
        Permission.MANAGE_CUSTOMERS
      );

      if (!hasPermission) {
        return new Response('Insufficient permissions', { status: 403 });
      }
    }

    let success = true;
    const changes: string[] = [];

    // Update role if provided
    if (role && Object.values(UserRole).includes(role)) {
      const roleSuccess = await rbacService.assignRole(
        targetUserId,
        role,
        securityContext.userId
      );

      if (!roleSuccess) {
        success = false;
      } else {
        changes.push(`role changed to ${role}`);
      }
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Get current permissions
      const currentPermissions =
        await rbacService.getUserPermissions(targetUserId);

      // Grant new permissions
      for (const permission of permissions) {
        if (!currentPermissions.includes(permission as Permission)) {
          const grantSuccess = await rbacService.grantPermission(
            targetUserId,
            permission as Permission,
            securityContext.userId
          );

          if (grantSuccess) {
            changes.push(`granted permission: ${permission}`);
          } else {
            success = false;
          }
        }
      }

      // Revoke permissions not in the new list
      for (const permission of currentPermissions) {
        if (!permissions.includes(permission)) {
          const revokeSuccess = await rbacService.revokePermission(
            targetUserId,
            permission,
            securityContext.userId
          );

          if (revokeSuccess) {
            changes.push(`revoked permission: ${permission}`);
          } else {
            success = false;
          }
        }
      }
    }

    if (!success) {
      return new Response('Failed to update user profile', { status: 500 });
    }

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.ADMIN_ACTION,
      `user:${targetUserId}`,
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { changes, target_user: targetUserId }
    );

    return new Response(
      JSON.stringify({
        message: 'User profile updated successfully',
        changes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('User profile update error:', error);
    return new Response('Failed to update user profile', { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const securityContext = await SecurityMiddleware.createSecurityContext(
      request,
      cookies
    );

    if (!securityContext) {
      return new Response('Authentication required', { status: 401 });
    }

    const { targetUserId, confirm } = await request.json();

    if (!targetUserId || !confirm) {
      return new Response('Target user ID and confirmation are required', {
        status: 400,
      });
    }

    // Only super admins can delete users
    const isSuperAdmin = await rbacService.hasRole(
      securityContext.userId,
      UserRole.SUPER_ADMIN
    );

    if (!isSuperAdmin) {
      return new Response('Insufficient permissions', { status: 403 });
    }

    // Anonymize user data instead of hard delete
    const success = await dataProtectionService.anonymizeUserData(targetUserId);

    if (!success) {
      return new Response('Failed to delete user data', { status: 500 });
    }

    // Invalidate all user sessions
    await (
      await import('../../../lib/security/session')
    ).sessionManager.invalidateAllUserSessions(targetUserId);

    await securityAuditLogger.logSecurityAction(
      securityContext.userId,
      SecurityAction.DATA_DELETE,
      `user:${targetUserId}`,
      securityContext.ipAddress,
      securityContext.userAgent,
      true,
      { target_user: targetUserId, anonymized: true }
    );

    return new Response(
      JSON.stringify({
        message: 'User data deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('User deletion error:', error);
    return new Response('Failed to delete user', { status: 500 });
  }
};
