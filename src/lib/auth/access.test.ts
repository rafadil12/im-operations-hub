import { describe, expect, it } from "vitest";
import {
  accountHasPermission,
  canAssignPrivilegedRoles,
  getRoleAccess,
  permissionsIncludeAdminManage,
  PERMISSIONS,
} from "@/lib/auth/access";
import type { AuthAccountPublic } from "@/lib/auth/types";

function account(
  overrides: Partial<AuthAccountPublic> & { permissions: string[] },
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
  it("returns false for null/undefined account", () => {
    expect(accountHasPermission(null, PERMISSIONS.itsmRequestRead)).toBe(
      false,
    );
    expect(
      accountHasPermission(undefined, PERMISSIONS.itsmRequestRead),
    ).toBe(false);
  });

  it("returns true only when code is present", () => {
    const a = account({ permissions: [PERMISSIONS.itsmRequestRead] });
    expect(accountHasPermission(a, PERMISSIONS.itsmRequestRead)).toBe(true);
    expect(accountHasPermission(a, PERMISSIONS.settingsAccess)).toBe(false);
  });
});

describe("getRoleAccess", () => {
  it("treats missing account as guest with no capabilities", () => {
    const access = getRoleAccess(null);
    expect(access.isGuest).toBe(true);
    expect(access.canViewOverview).toBe(false);
    expect(access.canAddDailyRecord).toBe(false);
    expect(access.canUpdateDailyRecord).toBe(false);
    expect(access.canDeleteDailyRecord).toBe(false);
    expect(access.canAccessSettings).toBe(false);
    expect(access.canManageRoles).toBe(false);
    expect(access.canManageAccounts).toBe(false);
    expect(access.canImportDailyRecord).toBe(false);
    expect(access.canExportDailyRecord).toBe(false);
    expect(access.canImportItsmRequest).toBe(false);
  });

  it("gates edit/delete independently from create", () => {
    const access = getRoleAccess(
      account({
        permissions: [
          PERMISSIONS.dailyRecordRead,
          PERMISSIONS.dailyRecordCreate,
          PERMISSIONS.dailyRecordUpdate,
        ],
      }),
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
      }),
    );
    expect(withIo.canImportDailyRecord).toBe(true);
    expect(withIo.canExportDailyRecord).toBe(true);
    expect(withIo.canDownloadDailyTemplate).toBe(true);
    expect(withIo.canAccessSettings).toBe(false);

    const settingsOnly = getRoleAccess(
      account({ permissions: [PERMISSIONS.settingsAccess] }),
    );
    expect(settingsOnly.canAccessSettings).toBe(true);
    expect(settingsOnly.canImportDailyRecord).toBe(false);
    expect(settingsOnly.canExportDailyRecord).toBe(false);
    expect(settingsOnly.canDownloadDailyTemplate).toBe(false);
  });

  it("gates itsm modules independently", () => {
    const access = getRoleAccess(
      account({
        permissions: [
          PERMISSIONS.itsmOverviewView,
          PERMISSIONS.itsmRequestImport,
        ],
      }),
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
      }),
    );
    expect(access.canAccessSettings).toBe(true);
    expect(access.canManageRoles).toBe(true);
    expect(access.canManageAccounts).toBe(false);
    expect(access.canImportDailyRecord).toBe(false);
  });

  it("grants accounts manage independently of roles manage", () => {
    const access = getRoleAccess(
      account({ permissions: [PERMISSIONS.adminAccountsManage] }),
    );
    expect(access.canAccessSettings).toBe(true);
    expect(access.canManageAccounts).toBe(true);
    expect(access.canManageRoles).toBe(false);
  });

  it("maps configuration manage from daily master permission", () => {
    const access = getRoleAccess(
      account({ permissions: [PERMISSIONS.dailyMasterManage] }),
    );
    expect(access.canManageConfiguration).toBe(true);
    expect(access.canAccessSettings).toBe(false);
  });

  it("exposes overview.view as canViewOverview", () => {
    const access = getRoleAccess(
      account({ permissions: [PERMISSIONS.overviewView] }),
    );
    expect(access.canViewOverview).toBe(true);
  });
});

describe("privileged role assignment helpers", () => {
  it("detects admin manage permissions", () => {
    expect(
      permissionsIncludeAdminManage([PERMISSIONS.adminAccountsManage]),
    ).toBe(true);
    expect(
      permissionsIncludeAdminManage([PERMISSIONS.itsmRequestRead]),
    ).toBe(false);
  });

  it("allows privileged assignment for admin role or roles-manage", () => {
    expect(
      canAssignPrivilegedRoles(
        account({ roleName: "admin", permissions: [] }),
      ),
    ).toBe(true);
    expect(
      canAssignPrivilegedRoles(
        account({
          roleName: "custom",
          permissions: [PERMISSIONS.adminRolesManage],
        }),
      ),
    ).toBe(true);
    expect(
      canAssignPrivilegedRoles(
        account({
          roleName: "custom",
          permissions: [PERMISSIONS.adminAccountsManage],
        }),
      ),
    ).toBe(false);
  });
});

describe("PERMISSIONS catalog", () => {
  it("has exactly 19 codes", () => {
    expect(Object.keys(PERMISSIONS)).toHaveLength(19);
  });
});
