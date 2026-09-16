import { describe, expect, it } from "vitest";
import { formatUomDisplay } from "./uoms";

describe("formatUomDisplay", () => {
  it("uses code in EN", () => {
    expect(formatUomDisplay({ code: "PCS", name_cn: "件" }, "en")).toBe("PCS");
  });

  it("uses name_cn in CN", () => {
    expect(formatUomDisplay({ code: "PCS", name_cn: "件" }, "cn")).toBe("件");
  });

  it("falls back to code when CN name is empty", () => {
    expect(formatUomDisplay({ code: "PACK", name_cn: "  " }, "cn")).toBe("PACK");
    expect(formatUomDisplay({ code: "ROLL", name_cn: null }, "cn")).toBe("ROLL");
  });

  it("returns empty when both missing", () => {
    expect(formatUomDisplay({ code: null, name_cn: null }, "en")).toBe("");
  });
});
