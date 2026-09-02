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
 * Default capabilities for unauthenticated visitors (Guest Mode).
 * Not a DB role — mirrors the read-oriented set configured for public browse.
 */
export const GUEST_PERMISSIONS: readonly PermissionCode[] = [
  PERMISSIONS.overviewView,
  PERMISSIONS.itsmOverviewView,
  PERMISSIONS.itsmRequestRead,
  PERMISSIONS.itsmRequestExport,
  PERMISSIONS.itsmAnalysisView,
  PERMISSIONS.dailyRecordRead,
  PERMISSIONS.dailyRecordExport,
  PERMISSIONS.dailyAnalysisView,
  PERMISSIONS.safetyOverviewView,
  PERMISSIONS.safetySubmissionRead,
  PERMISSIONS.trainingOverviewView,
  PERMISSIONS.trainingSessionRead,
  PERMISSIONS.reportOverviewView,
  PERMISSIONS.reportLineRead,
  PERMISSIONS.sparepartOverviewView,
  PERMISSIONS.sparepartStockView,
  PERMISSIONS.sparepartDocumentRead,
] as const;

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
  code: string
): boolean {
  if (!account) {
    return (GUEST_PERMISSIONS as readonly string[]).includes(code);
  }
  return Boolean(account.permissions?.includes(code));
}

export function guestHasPermission(code: string): boolean {
  return (GUEST_PERMISSIONS as readonly string[]).includes(code);
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

function hasPermission(account: AuthAccountPublic | null | undefined, code: string): boolean {
  return accountHasPermission(account, code);
}

export function getRoleAccess(account: AuthAccountPublic | null | undefined): RoleAccess {
  const roleName = account?.roleName ?? null;
  const isGuest = !account;
  const isAdmin = roleName === "admin" || isProtectedRoleName(roleName);
  const isTechnician = roleName === "technician";

  const hasSettingsModule = hasPermission(account, PERMISSIONS.settingsAccess);
  const canManageRoles = hasPermission(account, PERMISSIONS.adminRolesManage);
  const canManageAccounts = hasPermission(account, PERMISSIONS.adminAccountsManage);

  return {
    isGuest,
    isAdmin,
    isTechnician,
    canViewOverview: hasPermission(account, PERMISSIONS.overviewView),
    canViewDailyRecords: hasPermission(account, PERMISSIONS.dailyRecordRead),
    canAddDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordCreate),
    canUpdateDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordUpdate),
    canDeleteDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordDelete),
    canImportDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordImport),
    canExportDailyRecord: hasPermission(account, PERMISSIONS.dailyRecordExport),
    canDownloadDailyTemplate: hasPermission(account, PERMISSIONS.dailyRecordTemplate),
    canViewDailyAnalysis: hasPermission(account, PERMISSIONS.dailyAnalysisView),
    canManageConfiguration: hasPermission(account, PERMISSIONS.dailyMasterManage),
    canViewItsmOverview: hasPermission(account, PERMISSIONS.itsmOverviewView),
    canViewItsmRequests: hasPermission(account, PERMISSIONS.itsmRequestRead),
    canImportItsmRequest: hasPermission(account, PERMISSIONS.itsmRequestImport),
    canExportItsmRequest: hasPermission(account, PERMISSIONS.itsmRequestExport),
    canDownloadItsmTemplate: hasPermission(account, PERMISSIONS.itsmRequestTemplate),
    canViewItsmAnalysis: hasPermission(account, PERMISSIONS.itsmAnalysisView),
    canViewSafetyOverview: hasPermission(account, PERMISSIONS.safetyOverviewView),
    canViewSafetySubmissions: hasPermission(account, PERMISSIONS.safetySubmissionRead),
    canCreateSafetySubmission: hasPermission(account, PERMISSIONS.safetySubmissionCreate),
    canUpdateSafetySubmission: hasPermission(account, PERMISSIONS.safetySubmissionUpdate),
    canDeleteSafetySubmission: hasPermission(account, PERMISSIONS.safetySubmissionDelete),
    canViewTrainingOverview: hasPermission(account, PERMISSIONS.trainingOverviewView),
    canViewTrainingSessions: hasPermission(account, PERMISSIONS.trainingSessionRead),
    canCreateTrainingSession: hasPermission(account, PERMISSIONS.trainingSessionCreate),
    canUpdateTrainingSession: hasPermission(account, PERMISSIONS.trainingSessionUpdate),
    canDeleteTrainingSession: hasPermission(account, PERMISSIONS.trainingSessionDelete),
    canViewReportOverview: hasPermission(account, PERMISSIONS.reportOverviewView),
    canViewReportLines: hasPermission(account, PERMISSIONS.reportLineRead),
    canCreateReportLine: hasPermission(account, PERMISSIONS.reportLineCreate),
    canUpdateReportLine: hasPermission(account, PERMISSIONS.reportLineUpdate),
    canDeleteReportLine: hasPermission(account, PERMISSIONS.reportLineDelete),
    canSubmitReport: hasPermission(account, PERMISSIONS.reportSubmissionSubmit),
    canReopenReport: hasPermission(account, PERMISSIONS.reportSubmissionReopen),
    canViewSparepartOverview: hasPermission(account, PERMISSIONS.sparepartOverviewView),
    canViewSparepartStock: hasPermission(account, PERMISSIONS.sparepartStockView),
    canViewSparepartDocuments: hasPermission(account, PERMISSIONS.sparepartDocumentRead),
    canPostSparepartDocument: hasPermission(account, PERMISSIONS.sparepartDocumentPost),
    canReverseSparepartDocument: hasPermission(account, PERMISSIONS.sparepartDocumentReverse),
    canViewSparepartMaterials: hasPermission(account, PERMISSIONS.sparepartMaterialsRead),
    canCreateSparepartMaterial: hasPermission(account, PERMISSIONS.sparepartMaterialsCreate),
    canUpdateSparepartMaterial: hasPermission(account, PERMISSIONS.sparepartMaterialsUpdate),
    canDeleteSparepartMaterial: hasPermission(account, PERMISSIONS.sparepartMaterialsDelete),
    canImportSparepartMaterials: hasPermission(account, PERMISSIONS.sparepartMaterialsImport),
    canExportSparepartMaterials: hasPermission(account, PERMISSIONS.sparepartMaterialsExport),
    canDownloadSparepartTemplate: hasPermission(account, PERMISSIONS.sparepartMaterialsTemplate),
    canManageSparepartLocations: hasPermission(account, PERMISSIONS.sparepartLocationsManage),
    canViewOrganizationOverview: hasPermission(account, PERMISSIONS.organizationOverviewView),
    canViewOrganizationEmployees: hasPermission(account, PERMISSIONS.organizationEmployeeRead),
    canCreateOrganizationEmployee: hasPermission(account, PERMISSIONS.organizationEmployeeCreate),
    canUpdateOrganizationEmployee: hasPermission(account, PERMISSIONS.organizationEmployeeUpdate),
    canDeleteOrganizationEmployee: hasPermission(account, PERMISSIONS.organizationEmployeeDelete),
    canViewOrganizationShift: hasPermission(account, PERMISSIONS.organizationShiftRead),
    canManageOrganizationShift: hasPermission(account, PERMISSIONS.organizationShiftManage),
    canViewOrganizationAttendance: hasPermission(account, PERMISSIONS.organizationAttendanceRead),
    canManageOrganizationAttendance: hasPermission(account, PERMISSIONS.organizationAttendanceManage),
    canAccessSettings: hasSettingsModule || canManageRoles || canManageAccounts,
    canManageRoles,
    canManageAccounts,
  };
}
