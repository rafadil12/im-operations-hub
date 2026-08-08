import type { AuthAccountPublic } from "./types";

/** Permission codes — descriptions live in DB `permissions.description`. */
export const PERMISSIONS = {
  overviewView: "overview.view",
  settingsAccess: "settings.access",
  dailyRecordRead: "daily_operation.record.read",
  dailyRecordCreate: "daily_operation.record.create",
  dailyRecordUpdate: "daily_operation.record.update",
  dailyRecordDelete: "daily_operation.record.delete",
  dailyRecordImport: "daily_operation.record.import",
  dailyRecordExport: "daily_operation.record.export",
  dailyRecordTemplate: "daily_operation.record.template",
  dailyAnalysisView: "daily_operation.analysis.view",
  dailyMasterManage: "daily_operation.master.manage",
  itsmOverviewView: "itsm.overview.view",
  itsmRequestRead: "itsm.request.read",
  itsmRequestImport: "itsm.request.import",
  itsmRequestExport: "itsm.request.export",
  itsmRequestTemplate: "itsm.request.template",
  itsmAnalysisView: "itsm.analysis.view",
  adminRolesManage: "admin.roles.manage",
  adminAccountsManage: "admin.accounts.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleAccess = {
  isGuest: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
  canViewOverview: boolean;
  canViewDailyRecords: boolean;
  canAddDailyRecord: boolean;
  canUpdateDailyRecord: boolean;
  canDeleteDailyRecord: boolean;
  canImportDailyRecord: boolean;
  canExportDailyRecord: boolean;
  canDownloadDailyTemplate: boolean;
  canViewDailyAnalysis: boolean;
  canManageConfiguration: boolean;
  canViewItsmOverview: boolean;
  canViewItsmRequests: boolean;
  canImportItsmRequest: boolean;
  canExportItsmRequest: boolean;
  canDownloadItsmTemplate: boolean;
  canViewItsmAnalysis: boolean;
  /** Enter Settings module (settings.access or roles/accounts manage). */
  canAccessSettings: boolean;
  canManageRoles: boolean;
  canManageAccounts: boolean;
};

export function accountHasPermission(
  account: AuthAccountPublic | null | undefined,
  code: string,
): boolean {
  return Boolean(account?.permissions?.includes(code));
}

/** Privileged admin-management capabilities (role assignment / RBAC). */
export function permissionsIncludeAdminManage(permissions: string[]): boolean {
  return (
    permissions.includes(PERMISSIONS.adminRolesManage) ||
    permissions.includes(PERMISSIONS.adminAccountsManage)
  );
}

/** True when the caller may assign privileged roles (admin / admin.* manage). */
export function canAssignPrivilegedRoles(
  account: AuthAccountPublic | null | undefined,
): boolean {
  if (!account) return false;
  if (account.roleName === "admin") return true;
  return accountHasPermission(account, PERMISSIONS.adminRolesManage);
}

function hasPermission(
  account: AuthAccountPublic | null | undefined,
  code: string,
): boolean {
  return accountHasPermission(account, code);
}

export function getRoleAccess(
  account: AuthAccountPublic | null | undefined,
): RoleAccess {
  const roleName = account?.roleName ?? null;
  const isGuest = !account;
  const isAdmin = roleName === "admin";
  const isTechnician = roleName === "technician";

  const hasSettingsModule = hasPermission(
    account,
    PERMISSIONS.settingsAccess,
  );
  const canManageRoles = hasPermission(
    account,
    PERMISSIONS.adminRolesManage,
  );
  const canManageAccounts = hasPermission(
    account,
    PERMISSIONS.adminAccountsManage,
  );

  return {
    isGuest,
    isAdmin,
    isTechnician,
    canViewOverview: hasPermission(account, PERMISSIONS.overviewView),
    canViewDailyRecords: hasPermission(account, PERMISSIONS.dailyRecordRead),
    canAddDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordCreate),
    canUpdateDailyRecord: hasPermission(
      account,
      PERMISSIONS.dailyRecordUpdate,
    ),
    canDeleteDailyRecord: hasPermission(
      account,
      PERMISSIONS.dailyRecordDelete,
    ),
    canImportDailyRecord: hasPermission(
      account,
      PERMISSIONS.dailyRecordImport,
    ),
    canExportDailyRecord: hasPermission(
      account,
      PERMISSIONS.dailyRecordExport,
    ),
    canDownloadDailyTemplate: hasPermission(
      account,
      PERMISSIONS.dailyRecordTemplate,
    ),
    canViewDailyAnalysis: hasPermission(
      account,
      PERMISSIONS.dailyAnalysisView,
    ),
    canManageConfiguration: hasPermission(
      account,
      PERMISSIONS.dailyMasterManage,
    ),
    canViewItsmOverview: hasPermission(account, PERMISSIONS.itsmOverviewView),
    canViewItsmRequests: hasPermission(account, PERMISSIONS.itsmRequestRead),
    canImportItsmRequest: hasPermission(
      account,
      PERMISSIONS.itsmRequestImport,
    ),
    canExportItsmRequest: hasPermission(
      account,
      PERMISSIONS.itsmRequestExport,
    ),
    canDownloadItsmTemplate: hasPermission(
      account,
      PERMISSIONS.itsmRequestTemplate,
    ),
    canViewItsmAnalysis: hasPermission(account, PERMISSIONS.itsmAnalysisView),
    canAccessSettings:
      hasSettingsModule || canManageRoles || canManageAccounts,
    canManageRoles,
    canManageAccounts,
  };
}
