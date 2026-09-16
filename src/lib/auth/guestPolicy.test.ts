import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "./access";
import {
  DEFAULT_GUEST_PERMISSION_CODES,
  filterGuestAllowedPermissionCodes,
  isGuestPermissionAllowed,
  isGuestRoleName,
} from "./guestPolicy";

describe("isGuestRoleName", () => {
  it("matches guest role only", () => {
    expect(isGuestRoleName("guest")).toBe(true);
    expect(isGuestRoleName("Guest")).toBe(true);
    expect(isGuestRoleName("superadmin")).toBe(false);
    expect(isGuestRoleName("viewer")).toBe(false);
  });
});

describe("isGuestPermissionAllowed", () => {
  it("allows view and read codes only", () => {
    expect(isGuestPermissionAllowed(PERMISSIONS.overviewView)).toBe(true);
    expect(isGuestPermissionAllowed(PERMISSIONS.itsmRequestRead)).toBe(true);
    expect(isGuestPermissionAllowed(PERMISSIONS.dailyRecordExport)).toBe(false);
    expect(isGuestPermissionAllowed(PERMISSIONS.dailyRecordCreate)).toBe(false);
    expect(isGuestPermissionAllowed(PERMISSIONS.adminRolesManage)).toBe(false);
    expect(isGuestPermissionAllowed(PERMISSIONS.sparepartLocationsManage)).toBe(false);
  });
});

describe("DEFAULT_GUEST_PERMISSION_CODES", () => {
  it("excludes export and write permissions", () => {
    for (const code of DEFAULT_GUEST_PERMISSION_CODES) {
      expect(isGuestPermissionAllowed(code)).toBe(true);
    }
    expect(DEFAULT_GUEST_PERMISSION_CODES).not.toContain(PERMISSIONS.dailyRecordExport);
    expect(DEFAULT_GUEST_PERMISSION_CODES).not.toContain(PERMISSIONS.itsmRequestExport);
  });
});

describe("filterGuestAllowedPermissionCodes", () => {
  it("strips disallowed codes", () => {
    const input = [
      PERMISSIONS.reportLineRead,
      PERMISSIONS.reportLineCreate,
      PERMISSIONS.itsmRequestExport,
    ];
    expect(filterGuestAllowedPermissionCodes(input)).toEqual([PERMISSIONS.reportLineRead]);
  });
});
