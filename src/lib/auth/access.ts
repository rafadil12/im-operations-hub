import type { AuthAccountPublic } from "./types";
import { DEFAULT_GUEST_PERMISSION_CODES } from "./guest";

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
  safetyOverviewView: "safety.overview.view",
  safetySubmissionRead: "safety.submission.read",
  safetySubmissionCreate: "safety.submission.create",
  safetySubmissionUpdate: "safety.submission.update",
  safetySubmissionDelete: "safety.submission.delete",
  trainingOverviewView: "training.overview.view",
  trainingSessionRead: "training.session.read",
  trainingSessionCreate: "training.session.create",
  trainingSessionUpdate: "training.session.update",
  trainingSessionDelete: "training.session.delete",
  reportOverviewView: "report.overview.view",
  reportLineRead: "report.line.read",
  reportLineCreate: "report.line.create",
  reportLineUpdate: "report.line.update",
  reportLineDelete: "report.line.delete",
  reportSubmissionSubmit: "report.submission.submit",
  reportSubmissionReopen: "report.submission.reopen",
  sparepartOverviewView: "sparepart.overview.view",
  sparepartStockView: "sparepart.stock.view",
  sparepartDocumentRead: "sparepart.document.read",
  sparepartDocumentPost: "sparepart.document.post",
  sparepartDocumentReverse: "sparepart.document.reverse",
  sparepartMaterialsRead: "sparepart.materials.read",
  sparepartMaterialsCreate: "sparepart.materials.create",
  sparepartMaterialsUpdate: "sparepart.materials.update",
  sparepartMaterialsDelete: "sparepart.materials.delete",
  sparepartMaterialsImport: "sparepart.materials.import",
  sparepartMaterialsExport: "sparepart.materials.export",
  sparepartMaterialsTemplate: "sparepart.materials.template",
  sparepartLocationsManage: "sparepart.locations.manage",
  organizationOverviewView: "organization.overview.view",
  organizationEmployeeRead: "organization.employee.read",
  organizationEmployeeCreate: "organization.employee.create",
  organizationEmployeeUpdate: "organization.employee.update",
  organizationEmployeeDelete: "organization.employee.delete",
  organizationShiftRead: "organization.shift.read",
  organizationShiftManage: "organization.shift.manage",
  organizationAttendanceRead: "organization.attendance.read",
  organizationAttendanceManage: "organization.attendance.manage",
  adminRolesManage: "admin.roles.manage",
  adminAccountsManage: "admin.accounts.manage",
} as const;

/** System role that cannot be deleted/renamed (protections key off name, not id). */
export const PROTECTED_ROLE_NAME = "superadmin";

/** Bootstrap account employee_no that cannot be demoted/deactivated. */
export const PROTECTED_ACCOUNT_EMPLOYEE_NO = "SUPERADMIN";

export function isProtectedRoleName(name: string | null | undefined): boolean {
  return String(name ?? "").toLowerCase() === PROTECTED_ROLE_NAME;
}

export function isProtectedAccountEmployeeNo(employeeNo: string | null | undefined): boolean {
  return String(employeeNo ?? "").toUpperCase() === PROTECTED_ACCOUNT_EMPLOYEE_NO;
}

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default seed for the guest role (read/view only). Runtime guest access comes
 * from the DB `guest` role via `loadGuestPermissions`.
 */
export const GUEST_PERMISSIONS: readonly PermissionCode[] = DEFAULT_GUEST_PERMISSION_CODES;

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
  canViewSafetyOverview: boolean;
  canViewSafetySubmissions: boolean;
  canCreateSafetySubmission: boolean;
  canUpdateSafetySubmission: boolean;
  canDeleteSafetySubmission: boolean;
  canViewTrainingOverview: boolean;
  canViewTrainingSessions: boolean;
  canCreateTrainingSession: boolean;
  canUpdateTrainingSession: boolean;
  canDeleteTrainingSession: boolean;
  canViewReportOverview: boolean;
  canViewReportLines: boolean;
  canCreateReportLine: boolean;
  canUpdateReportLine: boolean;
  canDeleteReportLine: boolean;
  canSubmitReport: boolean;
  canReopenReport: boolean;
  canViewSparepartOverview: boolean;
  canViewSparepartStock: boolean;
  canViewSparepartDocuments: boolean;
  canPostSparepartDocument: boolean;
  canReverseSparepartDocument: boolean;
  canViewSparepartMaterials: boolean;
  canCreateSparepartMaterial: boolean;
  canUpdateSparepartMaterial: boolean;
  canDeleteSparepartMaterial: boolean;
  canImportSparepartMaterials: boolean;
  canExportSparepartMaterials: boolean;
  canDownloadSparepartTemplate: boolean;
  canManageSparepartLocations: boolean;
  canViewOrganizationOverview: boolean;
  canViewOrganizationEmployees: boolean;
  canCreateOrganizationEmployee: boolean;
  canUpdateOrganizationEmployee: boolean;
  canDeleteOrganizationEmployee: boolean;
  canViewOrganizationShift: boolean;
  canManageOrganizationShift: boolean;
  canViewOrganizationAttendance: boolean;
  canManageOrganizationAttendance: boolean;
  /** Enter Settings module (settings.access or roles/accounts manage). */
  canAccessSettings: boolean;
  canManageRoles: boolean;
  canManageAccounts: boolean;
};

export function accountHasPermission(
  account: AuthAccountPublic | null | undefined,
  code: string,
  guestPermissions: readonly string[] = []
): boolean {
  if (!account) {
    return guestPermissions.includes(code);
  }
  return Boolean(account.permissions?.includes(code));
}

export function guestHasPermission(code: string, guestPermissions: readonly string[]): boolean {
  return guestPermissions.includes(code);
}

/** Privileged admin-management capabilities (role assignment / RBAC). */
export function permissionsIncludeAdminManage(permissions: string[]): boolean {
  return (
    permissions.includes(PERMISSIONS.adminRolesManage) ||
    permissions.includes(PERMISSIONS.adminAccountsManage)
  );
}

/** True when the caller may assign privileged roles (superadmin / admin / roles-manage). */
export function canAssignPrivilegedRoles(account: AuthAccountPublic | null | undefined): boolean {
  if (!account) return false;
  if (isProtectedRoleName(account.roleName)) return true;
  if (account.roleName === "admin") return true;
  return accountHasPermission(account, PERMISSIONS.adminRolesManage);
}

export function getRoleAccess(
  account: AuthAccountPublic | null | undefined,
  guestPermissions: readonly string[] = []
): RoleAccess {
  function hasPermission(code: string): boolean {
    return accountHasPermission(account, code, guestPermissions);
  }
  const roleName = account?.roleName ?? null;
  const isGuest = !account;
  const isAdmin = roleName === "admin" || isProtectedRoleName(roleName);
  const isTechnician = roleName === "technician";

  const hasSettingsModule = hasPermission(PERMISSIONS.settingsAccess);
  const canManageRoles = hasPermission(PERMISSIONS.adminRolesManage);
  const canManageAccounts = hasPermission(PERMISSIONS.adminAccountsManage);

  return {
    isGuest,
    isAdmin,
    isTechnician,
    canViewOverview: hasPermission(PERMISSIONS.overviewView),
    canViewDailyRecords: hasPermission(PERMISSIONS.dailyRecordRead),
    canAddDailyRecord: hasPermission(PERMISSIONS.dailyRecordCreate),
    canUpdateDailyRecord: hasPermission(PERMISSIONS.dailyRecordUpdate),
    canDeleteDailyRecord: hasPermission(PERMISSIONS.dailyRecordDelete),
    canImportDailyRecord: hasPermission(PERMISSIONS.dailyRecordImport),
    canExportDailyRecord: hasPermission(PERMISSIONS.dailyRecordExport),
    canDownloadDailyTemplate: hasPermission(PERMISSIONS.dailyRecordTemplate),
    canViewDailyAnalysis: hasPermission(PERMISSIONS.dailyAnalysisView),
    canManageConfiguration: hasPermission(PERMISSIONS.dailyMasterManage),
    canViewItsmOverview: hasPermission(PERMISSIONS.itsmOverviewView),
    canViewItsmRequests: hasPermission(PERMISSIONS.itsmRequestRead),
    canImportItsmRequest: hasPermission(PERMISSIONS.itsmRequestImport),
    canExportItsmRequest: hasPermission(PERMISSIONS.itsmRequestExport),
    canDownloadItsmTemplate: hasPermission(PERMISSIONS.itsmRequestTemplate),
    canViewItsmAnalysis: hasPermission(PERMISSIONS.itsmAnalysisView),
    canViewSafetyOverview: hasPermission(PERMISSIONS.safetyOverviewView),
    canViewSafetySubmissions: hasPermission(PERMISSIONS.safetySubmissionRead),
    canCreateSafetySubmission: hasPermission(PERMISSIONS.safetySubmissionCreate),
    canUpdateSafetySubmission: hasPermission(PERMISSIONS.safetySubmissionUpdate),
    canDeleteSafetySubmission: hasPermission(PERMISSIONS.safetySubmissionDelete),
    canViewTrainingOverview: hasPermission(PERMISSIONS.trainingOverviewView),
    canViewTrainingSessions: hasPermission(PERMISSIONS.trainingSessionRead),
    canCreateTrainingSession: hasPermission(PERMISSIONS.trainingSessionCreate),
    canUpdateTrainingSession: hasPermission(PERMISSIONS.trainingSessionUpdate),
    canDeleteTrainingSession: hasPermission(PERMISSIONS.trainingSessionDelete),
    canViewReportOverview: hasPermission(PERMISSIONS.reportOverviewView),
    canViewReportLines: hasPermission(PERMISSIONS.reportLineRead),
    canCreateReportLine: hasPermission(PERMISSIONS.reportLineCreate),
    canUpdateReportLine: hasPermission(PERMISSIONS.reportLineUpdate),
    canDeleteReportLine: hasPermission(PERMISSIONS.reportLineDelete),
    canSubmitReport: hasPermission(PERMISSIONS.reportSubmissionSubmit),
    canReopenReport: hasPermission(PERMISSIONS.reportSubmissionReopen),
    canViewSparepartOverview: hasPermission(PERMISSIONS.sparepartOverviewView),
    canViewSparepartStock: hasPermission(PERMISSIONS.sparepartStockView),
    canViewSparepartDocuments: hasPermission(PERMISSIONS.sparepartDocumentRead),
    canPostSparepartDocument: hasPermission(PERMISSIONS.sparepartDocumentPost),
    canReverseSparepartDocument: hasPermission(PERMISSIONS.sparepartDocumentReverse),
    canViewSparepartMaterials: hasPermission(PERMISSIONS.sparepartMaterialsRead),
    canCreateSparepartMaterial: hasPermission(PERMISSIONS.sparepartMaterialsCreate),
    canUpdateSparepartMaterial: hasPermission(PERMISSIONS.sparepartMaterialsUpdate),
    canDeleteSparepartMaterial: hasPermission(PERMISSIONS.sparepartMaterialsDelete),
    canImportSparepartMaterials: hasPermission(PERMISSIONS.sparepartMaterialsImport),
    canExportSparepartMaterials: hasPermission(PERMISSIONS.sparepartMaterialsExport),
    canDownloadSparepartTemplate: hasPermission(PERMISSIONS.sparepartMaterialsTemplate),
    canManageSparepartLocations: hasPermission(PERMISSIONS.sparepartLocationsManage),
    canViewOrganizationOverview: hasPermission(PERMISSIONS.organizationOverviewView),
    canViewOrganizationEmployees: hasPermission(PERMISSIONS.organizationEmployeeRead),
    canCreateOrganizationEmployee: hasPermission(PERMISSIONS.organizationEmployeeCreate),
    canUpdateOrganizationEmployee: hasPermission(PERMISSIONS.organizationEmployeeUpdate),
    canDeleteOrganizationEmployee: hasPermission(PERMISSIONS.organizationEmployeeDelete),
    canViewOrganizationShift: hasPermission(PERMISSIONS.organizationShiftRead),
    canManageOrganizationShift: hasPermission(PERMISSIONS.organizationShiftManage),
    canViewOrganizationAttendance: hasPermission(PERMISSIONS.organizationAttendanceRead),
    canManageOrganizationAttendance: hasPermission(PERMISSIONS.organizationAttendanceManage),
    canAccessSettings: hasSettingsModule || canManageRoles || canManageAccounts,
    canManageRoles,
    canManageAccounts,
  };
}
