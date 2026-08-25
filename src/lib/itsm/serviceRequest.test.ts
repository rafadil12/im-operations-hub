import { describe, expect, it } from "vitest";
import { IS_SERVICE_REQUEST_SQL, isServiceRequestValue } from "./serviceRequest";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { formatDisplay } from "@/lib/datetime";
import { formatDateOnly } from "@/lib/dateRange";

describe("isServiceRequestValue", () => {
  it("accepts boolean/number truthy forms used by MySQL and Excel", () => {
    expect(isServiceRequestValue(true)).toBe(true);
    expect(isServiceRequestValue(1)).toBe(true);
    expect(isServiceRequestValue("1")).toBe(true);
    expect(isServiceRequestValue("true")).toBe(true);
    expect(isServiceRequestValue("TRUE")).toBe(true);
    expect(isServiceRequestValue(" yes ")).toBe(true);
  });

  it("rejects falsey and unknown forms", () => {
    expect(isServiceRequestValue(false)).toBe(false);
    expect(isServiceRequestValue(0)).toBe(false);
    expect(isServiceRequestValue("false")).toBe(false);
    expect(isServiceRequestValue("no")).toBe(false);
    expect(isServiceRequestValue(null)).toBe(false);
    expect(isServiceRequestValue(undefined)).toBe(false);
    expect(isServiceRequestValue("")).toBe(false);
  });

  it("treats bare 'y' as service request (aligned with import parser)", () => {
    expect(isServiceRequestValue("y")).toBe(true);
    expect(isServiceRequestValue("Y")).toBe(true);
    expect(IS_SERVICE_REQUEST_SQL).toMatch(/'y'/);
  });
});

describe("generateTemporaryPassword", () => {
  it("meets MIN_PASSWORD_LENGTH", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
  });
});

describe("formatDisplay", () => {
  it("keeps ManageEngine AM/PM timestamps intact", () => {
    expect(formatDisplay("08/08/2026 09:15 AM")).toBe("08/08/2026 09:15 AM");
    expect(formatDisplay("08/08/2026 09:15 PM")).toBe("08/08/2026 09:15 PM");
  });

  it("shortens ISO-like datetimes without AM/PM", () => {
    expect(formatDisplay("2026-08-08T09:15:00")).toBe("2026-08-08 09:15");
  });

  it("returns dash for empty", () => {
    expect(formatDisplay(null)).toBe("-");
    expect(formatDisplay("")).toBe("-");
  });
});

describe("formatDateOnly", () => {
  it("formats local calendar date without UTC shift", () => {
    const d = new Date(2026, 7, 8, 0, 0, 0); // Aug 8 local
    expect(formatDateOnly(d)).toBe("2026-08-08");
  });
});
