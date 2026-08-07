import type { AuthAccountPublic } from "./types";

/** Permission codes — descriptions live in DB `permissions.description`. */
export const PERMISSIONS = {
  settingsAccess: "settings.access",
  dailyRecordRead: "daily_operation.record.read",
  dailyRecordCreate: "daily_operation.record.create",
  dailyRecordUpdate: "daily_operation.record.update",
  dailyRecordDelete: "daily_operation.record.delete",
  dailyAnalysisView: "daily_operation.analysis.view",
  dailyMasterManage: "daily_operation.master.manage",
  itsmView: "itsm.view",
  adminRolesManage: "admin.roles.manage",
  adminAccountsManage: "admin.accounts.manage",
} as const;

export type RoleAccess = {
  isGuest: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
  canImportExport: boolean;
  canDownloadTemplate: boolean;
  canAddDailyRecord: boolean;
  canManageConfiguration: boolean;
  canAccessSettings: boolean;
};

function hasPermission(
  account: AuthAccountPublic | null | undefined,
  code: string,
): boolean {
  return Boolean(account?.permissions?.includes(code));
}

export function getRoleAccess(
  account: AuthAccountPublic | null | undefined,
): RoleAccess {
  const roleName = account?.roleName ?? null;
  const isGuest = !account;
  const isAdmin = roleName === "admin";
  const isTechnician = roleName === "technician";

  // Gate by permission codes (see permissions.description in Settings).
  // Import/Export/Template: no dedicated codes — use settings.access
  // ("Access Settings module") as the admin-level capability gate.
  const canAccessSettings = hasPermission(
    account,
    PERMISSIONS.settingsAccess,
  );
  const canManageConfiguration = hasPermission(
    account,
    PERMISSIONS.dailyMasterManage,
  );
  const canAddDailyRecord = hasPermission(
    account,
    PERMISSIONS.dailyRecordCreate,
  );

  return {
    isGuest,
    isAdmin,
    isTechnician,
    canImportExport: canAccessSettings,
    canDownloadTemplate: canAccessSettings,
    canAddDailyRecord,
    canManageConfiguration,
    canAccessSettings,
  };
}
