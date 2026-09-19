import { describe, expect, it } from "vitest";
import {
  accountHasPermission,
  canAssignPrivilegedRoles,
  getRoleAccess,
  GUEST_PERMISSIONS,
  guestHasPermission,
  permissionsIncludeAdminManage,
  PERMISSIONS,
} from "@/lib/auth/access";
import { DEFAULT_GUEST_PERMISSION_CODES } from "@/lib/auth/guestPolicy";
import type { AuthAccountPublic } from "@/lib/auth/types";

function account(
  overrides: Partial<AuthAccountPublic> & { permissions: string[] }
): AuthAccountPublic {
  return {
    id: 1,
    systemUserId: 10,
    employeeId: "E001",
    displayName: "Test User",
    roleName: "operator",
    roleLabel: "Operator",
    sessionVersion: 1,
    ...overrides,
  };
}

describe("accountHasPermission", () => {
  it("uses guestPermissions when account is missing", () => {
    const guestPerms = [PERMISSIONS.itsmRequestRead];
    expect(accountHasPermission(null, PERMISSIONS.itsmRequestRead, guestPerms)).toBe(true);
    expect(accountHasPermission(undefined, PERMISSIONS.overviewView, guestPerms)).toBe(false);
    expect(accountHasPermission(null, PERMISSIONS.settingsAccess, guestPerms)).toBe(false);
    expect(accountHasPermission(null, PERMISSIONS.dailyRecordCreate, guestPerms)).toBe(false);
  });

  it("returns true only when code is present for logged-in accounts", () => {
    const a = account({ permissions: [PERMISSIONS.itsmRequestRead] });
    expect(accountHasPermission(a, PERMISSIONS.itsmRequestRead)).toBe(true);
    expect(accountHasPermission(a, PERMISSIONS.settingsAccess)).toBe(false);
  });
});

describe("guestHasPermission", () => {
  it("checks against the provided guest permission list", () => {
    const guestPerms = [...DEFAULT_GUEST_PERMISSION_CODES];
    expect(guestHasPermission(PERMISSIONS.overviewView, guestPerms)).toBe(true);
    expect(guestHasPermission(PERMISSIONS.itsmRequestExport, guestPerms)).toBe(false);
    expect(guestHasPermission(PERMISSIONS.dailyRecordExport, guestPerms)).toBe(false);
    expect(guestHasPermission(PERMISSIONS.adminRolesManage, guestPerms)).toBe(false);
  });
});

describe("GUEST_PERMISSIONS seed", () => {
  it("matches DEFAULT_GUEST_PERMISSION_CODES and excludes export", () => {
    expect([...GUEST_PERMISSIONS].sort()).toEqual([...DEFAULT_GUEST_PERMISSION_CODES].sort());
    expect(GUEST_PERMISSIONS).not.toContain(PERMISSIONS.itsmRequestExport);
    expect(GUEST_PERMISSIONS).not.toContain(PERMISSIONS.dailyRecordExport);
    expect(GUEST_PERMISSIONS).not.toContain(PERMISSIONS.sparepartHistoryExport);
  });
});

describe("getRoleAccess", () => {
  it("grants guest the configured public browse capabilities", () => {
    const guestPerms = [...DEFAULT_GUEST_PERMISSION_CODES];
    const access = getRoleAccess(null, guestPerms);
    expect(access.isGuest).toBe(true);
    expect(access.canViewOverview).toBe(true);
    expect(access.canViewItsmOverview).toBe(true);
    expect(access.canViewItsmRequests).toBe(true);
    expect(access.canExportItsmRequest).toBe(false);
    expect(access.canViewItsmAnalysis).toBe(true);
    expect(access.canExportDailyRecord).toBe(false);
    expect(access.canViewDailyAnalysis).toBe(true);
    expect(access.canViewDailyRecords).toBe(true);
    expect(access.canViewSafetyOverview).toBe(true);
    expect(access.canViewSafetySubmissions).toBe(true);
    expect(access.canCreateSafetySubmission).toBe(false);
    expect(access.canAddDailyRecord).toBe(false);
    expect(access.canUpdateDailyRecord).toBe(false);
    expect(access.canDeleteDailyRecord).toBe(false);
    expect(access.canImportDailyRecord).toBe(false);
    expect(access.canImportItsmRequest).toBe(false);
    expect(access.canAccessSettings).toBe(false);
    expect(access.canManageRoles).toBe(false);
    expect(access.canManageAccounts).toBe(false);
    expect(access.canManageConfiguration).toBe(false);
    expect(access.canViewSparepartOverview).toBe(true);
    expect(access.canViewSparepartStock).toBe(true);
    expect(access.canViewSparepartDocuments).toBe(true);
    expect(access.canViewSparepartHistory).toBe(true);
    expect(access.canExportSparepartHistory).toBe(false);
    expect(access.canPostSparepartDocument).toBe(false);
    expect(access.canReverseSparepartDocument).toBe(false);
    expect(access.canViewOrganizationOverview).toBe(true);
    expect(access.canViewOrganizationEmployees).toBe(true);
    expect(access.canViewOrganizationShift).toBe(true);
    expect(access.canViewOrganizationAttendance).toBe(true);
    expect(access.canManageOrganizationShift).toBe(false);
    expect(access.canManageOrganizationAttendance).toBe(false);
    expect(access.canCreateOrganizationEmployee).toBe(false);
  });

  it("gates edit/delete independently from create", () => {
    const access = getRoleAccess(
      account({
        permissions: [
          PERMISSIONS.dailyRecordRead,
          PERMISSIONS.dailyRecordCreate,
          PERMISSIONS.dailyRecordUpdate,
        ],
      })
    );
    expect(access.canAddDailyRecord).toBe(true);
    expect(access.canUpdateDailyRecord).toBe(true);
    expect(access.canDeleteDailyRecord).toBe(false);
  });

  it("gates daily I/O independently from settings.access", () => {
    const withIo = getRoleAccess(
      account({
        permissions: [
          PERMISSIONS.dailyRecordImport,
          PERMISSIONS.dailyRecordExport,
          PERMISSIONS.dailyRecordTemplate,
        ],
      })
    );
    expect(withIo.canImportDailyRecord).toBe(true);
    expect(withIo.canExportDailyRecord).toBe(true);
    expect(withIo.canDownloadDailyTemplate).toBe(true);
    expect(withIo.canAccessSettings).toBe(false);

    const settingsOnly = getRoleAccess(account({ permissions: [PERMISSIONS.settingsAccess] }));
    expect(settingsOnly.canAccessSettings).toBe(true);
    expect(settingsOnly.canImportDailyRecord).toBe(false);
    expect(settingsOnly.canExportDailyRecord).toBe(false);
    expect(settingsOnly.canDownloadDailyTemplate).toBe(false);
  });

  it("gates itsm modules independently", () => {
    const access = getRoleAccess(
      account({
        permissions: [PERMISSIONS.itsmOverviewView, PERMISSIONS.itsmRequestImport],
      })
    );
    expect(access.canViewItsmOverview).toBe(true);
    expect(access.canViewItsmRequests).toBe(false);
    expect(access.canImportItsmRequest).toBe(true);
    expect(access.canExportItsmRequest).toBe(false);
    expect(access.canViewItsmAnalysis).toBe(false);
  });

  it("grants settings entry via admin.roles.manage without settings.access", () => {
    const access = getRoleAccess(
      account({
        roleName: "custom",
        permissions: [PERMISSIONS.adminRolesManage],
      })
    );
    expect(access.canAccessSettings).toBe(true);
    expect(access.canManageRoles).toBe(true);
    expect(access.canManageAccounts).toBe(false);
    expect(access.canImportDailyRecord).toBe(false);
  });

  it("grants accounts manage independently of roles manage", () => {
    const access = getRoleAccess(account({ permissions: [PERMISSIONS.adminAccountsManage] }));
    expect(access.canAccessSettings).toBe(true);
    expect(access.canManageAccounts).toBe(true);
    expect(access.canManageRoles).toBe(false);
  });

  it("maps configuration manage from daily master permission", () => {
    const access = getRoleAccess(account({ permissions: [PERMISSIONS.dailyMasterManage] }));
    expect(access.canManageConfiguration).toBe(true);
    expect(access.canAccessSettings).toBe(false);
  });

  it("gates sparepart modules independently", () => {
    const access = getRoleAccess(
      account({
        permissions: [
          PERMISSIONS.sparepartOverviewView,
          PERMISSIONS.sparepartStockView,
          PERMISSIONS.sparepartDocumentPost,
        ],
      })
    );
    expect(access.canViewSparepartOverview).toBe(true);
    expect(access.canViewSparepartStock).toBe(true);
    expect(access.canPostSparepartDocument).toBe(true);
    expect(access.canViewSparepartDocuments).toBe(false);
    expect(access.canViewSparepartHistory).toBe(false);
    expect(access.canExportSparepartHistory).toBe(false);
    expect(access.canViewSparepartMaterials).toBe(false);
    expect(access.canManageSparepartLocations).toBe(false);
  });

  it("gates sparepart history independently from documents", () => {
    const historyOnly = getRoleAccess(
      account({
        permissions: [PERMISSIONS.sparepartHistoryRead],
      })
    );
    expect(historyOnly.canViewSparepartHistory).toBe(true);
    expect(historyOnly.canExportSparepartHistory).toBe(false);
    expect(historyOnly.canViewSparepartDocuments).toBe(false);

    const withExport = getRoleAccess(
      account({
        permissions: [PERMISSIONS.sparepartHistoryRead, PERMISSIONS.sparepartHistoryExport],
      })
    );
    expect(withExport.canViewSparepartHistory).toBe(true);
    expect(withExport.canExportSparepartHistory).toBe(true);
  });

  it("gates safety modules independently", () => {
    const access = getRoleAccess(
      account({
        permissions: [PERMISSIONS.safetyOverviewView, PERMISSIONS.safetySubmissionCreate],
      })
    );
    expect(access.canViewSafetyOverview).toBe(true);
    expect(access.canViewSafetySubmissions).toBe(false);
    expect(access.canCreateSafetySubmission).toBe(true);
    expect(access.canUpdateSafetySubmission).toBe(false);
    expect(access.canDeleteSafetySubmission).toBe(false);
  });

  it("gates training modules independently", () => {
    const access = getRoleAccess(
      account({
        permissions: [PERMISSIONS.trainingOverviewView, PERMISSIONS.trainingSessionCreate],
      })
    );
    expect(access.canViewTrainingOverview).toBe(true);
    expect(access.canViewTrainingSessions).toBe(false);
    expect(access.canCreateTrainingSession).toBe(true);
    expect(access.canUpdateTrainingSession).toBe(false);
    expect(access.canDeleteTrainingSession).toBe(false);
  });

  it("exposes overview.view as canViewOverview", () => {
    const access = getRoleAccess(account({ permissions: [PERMISSIONS.overviewView] }));
    expect(access.canViewOverview).toBe(true);
  });
});

describe("privileged role assignment helpers", () => {
  it("detects admin manage permissions", () => {
    expect(permissionsIncludeAdminManage([PERMISSIONS.adminAccountsManage])).toBe(true);
    expect(permissionsIncludeAdminManage([PERMISSIONS.itsmRequestRead])).toBe(false);
  });

  it("allows privileged assignment for admin role or roles-manage", () => {
    expect(canAssignPrivilegedRoles(account({ roleName: "admin", permissions: [] }))).toBe(true);
    expect(canAssignPrivilegedRoles(account({ roleName: "superadmin", permissions: [] }))).toBe(
      true
    );
    expect(
      canAssignPrivilegedRoles(
        account({
          roleName: "custom",
          permissions: [PERMISSIONS.adminRolesManage],
        })
      )
    ).toBe(true);
    expect(
      canAssignPrivilegedRoles(
        account({
          roleName: "custom",
          permissions: [PERMISSIONS.adminAccountsManage],
        })
      )
    ).toBe(false);
  });
});

describe("PERMISSIONS catalog", () => {
  it("has exactly 60 codes", () => {
    expect(Object.keys(PERMISSIONS)).toHaveLength(60);
  });
});
