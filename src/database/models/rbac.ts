import { and, eq, inArray, sql } from 'drizzle-orm';

import { LobeChatDatabase } from '@/database/type';

import { RoleItem, permissions, rolePermissions, roles, userRoles } from '../schemas/rbac';

export interface UserPermissionInfo {
  category: string;
  permissionCode: string;
  permissionName: string;
  roleName: string;
}

export class RbacModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Get all permissions for a specific user
   * @param userId - User ID to query permissions for
   * @returns Array of permission codes that the user has
   */
  getUserPermissions = async (userId?: string): Promise<string[]> => {
    const targetUserId = userId || this.userId;

    const result = await this.db
      .select({
        permissionCode: permissions.code,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      );

    return result.map((row) => row.permissionCode);
  };

  /**
   * Get detailed permission information for a user
   * @param userId - User ID to query permissions for
   * @returns Array of detailed permission information
   */
  getUserPermissionDetails = async (userId?: string): Promise<UserPermissionInfo[]> => {
    const targetUserId = userId || this.userId;

    return await this.db
      .select({
        category: permissions.category,
        permissionCode: permissions.code,
        permissionName: permissions.name,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      )
      .orderBy(permissions.category, permissions.code);
  };

  /**
   * Check if user has a specific permission
   * @param permissionCode - Permission code to check
   * @param userId - User ID to check (optional, defaults to instance userId)
   * @returns Boolean indicating if user has the permission
   */
  hasPermission = async (permissionCode: string, userId?: string): Promise<boolean> => {
    const targetUserId = userId || this.userId;

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(permissions.code, permissionCode),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      );

    return (result[0]?.count || 0) > 0;
  };

  /**
   * Check if user has any of the specified permissions (OR logic)
   * @param permissionCodes - Array of permission codes to check
   * @param userId - User ID to check (optional, defaults to instance userId)
   * @returns Boolean indicating if user has at least one of the permissions
   */
  hasAnyPermission = async (permissionCodes: string[], userId?: string): Promise<boolean> => {
    if (permissionCodes.length === 0) return false;

    const targetUserId = userId || this.userId;

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          inArray(permissions.code, permissionCodes),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      );

    return (result[0]?.count || 0) > 0;
  };

  /**
   * Check if user has all of the specified permissions (AND logic)
   * @param permissionCodes - Array of permission codes to check
   * @param userId - User ID to check (optional, defaults to instance userId)
   * @returns Boolean indicating if user has all of the permissions
   */
  hasAllPermissions = async (permissionCodes: string[], userId?: string): Promise<boolean> => {
    if (permissionCodes.length === 0) return true;

    const targetUserId = userId || this.userId;

    const result = await this.db
      .select({ count: sql<number>`count(DISTINCT ${permissions.code})` })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          inArray(permissions.code, permissionCodes),
          eq(roles.isActive, true),
          eq(permissions.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      );

    return (result[0]?.count || 0) === permissionCodes.length;
  };

  /**
   * Get user's active roles
   * @param userId - User ID to query roles for
   * @returns Array of role information
   */
  getUserRoles = async (userId?: string): Promise<RoleItem[]> => {
    const targetUserId = userId || this.userId;

    return await this.db
      .select({
        accessedAt: roles.accessedAt,
        createdAt: roles.createdAt,
        description: roles.description,
        displayName: roles.displayName,
        id: roles.id,
        isActive: roles.isActive,
        isSystem: roles.isSystem,
        metadata: roles.metadata,
        name: roles.name,
        updatedAt: roles.updatedAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, targetUserId),
          eq(roles.isActive, true),
          // Check if role assignment is not expired
          sql`(${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > NOW())`,
        ),
      )
      .orderBy(userRoles.createdAt);
  };

  /**
   * 更新用户角色，为了避免在更新时新旧角色数量不同导致的刷新问题，先删除所有角色，再添加新角色
   * @param userId 用户ID
   * @param roles 角色ID数组
   */
  updateUserRoles = async (userId: string, roles: number[]): Promise<void> => {
    // 删除用户所有角色
    await this.db.delete(userRoles).where(eq(userRoles.userId, userId));

    // 添加新角色
    await this.db.insert(userRoles).values(
      roles.map((roleId) => ({
        roleId,
        userId,
      })),
    );
  };
}
