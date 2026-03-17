import { describe, it, expect } from 'vitest';
import { buildPermissions, hasPermission, UserRole } from '../permissions';

describe('Permission Model', () => {
  describe('buildPermissions', () => {
    it('should grant all permissions to admin', () => {
      const perms = buildPermissions('admin');
      expect(perms.role).toBe('admin');
      expect(perms.canCompleteJob).toBe(true);
      expect(perms.canCancelJob).toBe(true);
      expect(perms.canReopenJob).toBe(true);
      expect(perms.canEditJob).toBe(true);
      expect(perms.canViewAudit).toBe(true);
      expect(perms.canManageUsers).toBe(true);
      expect(perms.canExportData).toBe(true);
      expect(perms.canApproveLabels).toBe(true);
      expect(perms.canDeleteEvidence).toBe(true);
    });

    it('should grant dispatcher job and audit permissions but not user management', () => {
      const perms = buildPermissions('dispatcher');
      expect(perms.canCompleteJob).toBe(true);
      expect(perms.canCancelJob).toBe(true);
      expect(perms.canReopenJob).toBe(true);
      expect(perms.canEditJob).toBe(true);
      expect(perms.canViewAudit).toBe(true);
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canExportData).toBe(false);
      expect(perms.canApproveLabels).toBe(false);
    });

    it('should deny all permissions to technician', () => {
      const perms = buildPermissions('technician');
      expect(perms.canCompleteJob).toBe(false);
      expect(perms.canCancelJob).toBe(false);
      expect(perms.canReopenJob).toBe(false);
      expect(perms.canEditJob).toBe(false);
      expect(perms.canViewAudit).toBe(false);
      expect(perms.canManageUsers).toBe(false);
    });

    it('should deny all permissions to viewer', () => {
      const perms = buildPermissions('viewer');
      expect(perms.canCompleteJob).toBe(false);
      expect(perms.canCancelJob).toBe(false);
      expect(perms.canReopenJob).toBe(false);
      expect(perms.canEditJob).toBe(false);
    });

    it('should build claims array matching permission flags', () => {
      const perms = buildPermissions('admin');
      const completeClaim = perms.claims.find(c => c.action === 'complete' && c.resource === 'job');
      expect(completeClaim?.granted).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true for authorized action', () => {
      const perms = buildPermissions('dispatcher');
      expect(hasPermission(perms, 'complete', 'job')).toBe(true);
    });

    it('should return false for unauthorized action', () => {
      const perms = buildPermissions('technician');
      expect(hasPermission(perms, 'complete', 'job')).toBe(false);
    });

    it('should return false when permissions is null', () => {
      expect(hasPermission(null, 'complete', 'job')).toBe(false);
    });

    it('should return false for non-existent permission', () => {
      const perms = buildPermissions('admin');
      expect(hasPermission(perms, 'nonexistent', 'resource')).toBe(false);
    });
  });

  describe('Role-based restrictions', () => {
    it('should restrict job completion to admin/dispatcher only', () => {
      const roles: UserRole[] = ['admin', 'dispatcher', 'technician', 'viewer'];
      const results = roles.map(role => ({
        role,
        canComplete: buildPermissions(role).canCompleteJob,
      }));

      expect(results.find(r => r.role === 'admin')?.canComplete).toBe(true);
      expect(results.find(r => r.role === 'dispatcher')?.canComplete).toBe(true);
      expect(results.find(r => r.role === 'technician')?.canComplete).toBe(false);
      expect(results.find(r => r.role === 'viewer')?.canComplete).toBe(false);
    });

    it('should restrict user management to admin only', () => {
      const roles: UserRole[] = ['admin', 'dispatcher', 'technician', 'viewer'];
      const results = roles.map(role => ({
        role,
        canManage: buildPermissions(role).canManageUsers,
      }));

      expect(results.find(r => r.role === 'admin')?.canManage).toBe(true);
      expect(results.find(r => r.role === 'dispatcher')?.canManage).toBe(false);
      expect(results.find(r => r.role === 'technician')?.canManage).toBe(false);
      expect(results.find(r => r.role === 'viewer')?.canManage).toBe(false);
    });

    it('should restrict data export to admin only', () => {
      const adminPerms = buildPermissions('admin');
      const dispatcherPerms = buildPermissions('dispatcher');

      expect(adminPerms.canExportData).toBe(true);
      expect(dispatcherPerms.canExportData).toBe(false);
    });
  });
});