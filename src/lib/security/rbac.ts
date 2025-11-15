import { createClient } from '@supabase/supabase-js';
import type { UserRole, Permission, UserSecurityProfile } from './types';

export class RBACService {
  private supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  private rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.CUSTOMER]: [
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_ACCOUNT,
      Permission.VIEW_BILLING,
      Permission.MANAGE_BILLING,
    ],
    [UserRole.SUPPORT]: [
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_ACCOUNT,
      Permission.VIEW_BILLING,
      Permission.VIEW_CUSTOMERS,
      Permission.VIEW_ANALYTICS,
    ],
    [UserRole.ADMIN]: [
      Permission.VIEW_DASHBOARD,
      Permission.MANAGE_ACCOUNT,
      Permission.VIEW_BILLING,
      Permission.MANAGE_BILLING,
      Permission.VIEW_CUSTOMERS,
      Permission.MANAGE_CUSTOMERS,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_SYSTEM,
      Permission.VIEW_SECURITY_LOGS,
      Permission.DATA_EXPORT,
    ],
    [UserRole.SUPER_ADMIN]: Object.values(Permission),
  };

  async assignRole(
    userId: string,
    role: UserRole,
    assignedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_security_profiles')
        .upsert({
          user_id: userId,
          role,
          updated_at: new Date(),
        });

      if (error) {
        console.error('Failed to assign role:', error);
        return false;
      }

      // Log the role change
      await this.supabase.from('security_audit_logs').insert({
        user_id: assignedBy,
        action: 'role_change',
        resource: `user:${userId}`,
        details: { new_role: role, target_user: userId },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Role assignment error:', error);
      return false;
    }
  }

  async grantPermission(
    userId: string,
    permission: Permission,
    grantedBy: string
  ): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('user_security_profiles')
        .select('permissions')
        .eq('user_id', userId)
        .single();

      const currentPermissions = (profile?.permissions as Permission[]) || [];

      if (currentPermissions.includes(permission)) {
        return true; // Permission already granted
      }

      const updatedPermissions = [...currentPermissions, permission];

      const { error } = await this.supabase
        .from('user_security_profiles')
        .update({
          permissions: updatedPermissions,
          updated_at: new Date(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to grant permission:', error);
        return false;
      }

      // Log the permission grant
      await this.supabase.from('security_audit_logs').insert({
        user_id: grantedBy,
        action: 'permission_grant',
        resource: `user:${userId}`,
        details: { permission, target_user: userId },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Permission grant error:', error);
      return false;
    }
  }

  async revokePermission(
    userId: string,
    permission: Permission,
    revokedBy: string
  ): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('user_security_profiles')
        .select('permissions')
        .eq('user_id', userId)
        .single();

      const currentPermissions = (profile?.permissions as Permission[]) || [];

      if (!currentPermissions.includes(permission)) {
        return true; // Permission not present
      }

      const updatedPermissions = currentPermissions.filter(
        p => p !== permission
      );

      const { error } = await this.supabase
        .from('user_security_profiles')
        .update({
          permissions: updatedPermissions,
          updated_at: new Date(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to revoke permission:', error);
        return false;
      }

      // Log the permission revocation
      await this.supabase.from('security_audit_logs').insert({
        user_id: revokedBy,
        action: 'permission_revoke',
        resource: `user:${userId}`,
        details: { permission, target_user: userId },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Permission revocation error:', error);
      return false;
    }
  }

  async hasPermission(
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    try {
      const profile = await this.getUserSecurityProfile(userId);

      if (!profile) {
        return false;
      }

      // Check role-based permissions
      const rolePermissions = this.rolePermissions[profile.role] || [];

      // Check explicit permissions
      const explicitPermissions = profile.permissions || [];

      return (
        rolePermissions.includes(permission) ||
        explicitPermissions.includes(permission)
      );
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_security_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        return false;
      }

      return profile?.role === role;
    } catch (error) {
      console.error('Role check error:', error);
      return false;
    }
  }

  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const profile = await this.getUserSecurityProfile(userId);
      return profile?.role || null;
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const profile = await this.getUserSecurityProfile(userId);

      if (!profile) {
        return [];
      }

      const rolePermissions = this.rolePermissions[profile.role] || [];
      const explicitPermissions = profile.permissions || [];

      // Combine and deduplicate permissions
      return [...new Set([...rolePermissions, ...explicitPermissions])];
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  async getUsersByRole(role: UserRole): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_security_profiles')
        .select('user_id')
        .eq('role', role);

      if (error) {
        console.error('Failed to get users by role:', error);
        return [];
      }

      return data?.map(profile => profile.user_id) || [];
    } catch (error) {
      console.error('Users by role error:', error);
      return [];
    }
  }

  private async getUserSecurityProfile(
    userId: string
  ): Promise<UserSecurityProfile | null> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_security_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return null;
      }

      return profile as UserSecurityProfile;
    } catch (error) {
      console.error('Get security profile error:', error);
      return null;
    }
  }

  // Middleware helper for checking permissions in API routes
  requirePermission(permission: Permission) {
    return async (userId: string): Promise<boolean> => {
      return await this.hasPermission(userId, permission);
    };
  }

  // Middleware helper for checking roles in API routes
  requireRole(role: UserRole) {
    return async (userId: string): Promise<boolean> => {
      return await this.hasRole(userId, role);
    };
  }
}

export const rbacService = new RBACService();
