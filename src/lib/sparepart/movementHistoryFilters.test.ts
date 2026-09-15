import { describe, expect, it } from "vitest";
import {
  buildMovementHistoryFilters,
  parseOptionalItemId,
} from "./movementHistoryFilters";
import { parseHistoryColumnVisibility } from "./movementHistoryColumns";

describe("parseOptionalItemId", () => {
  it("treats empty as all materials", () => {
    expect(parseOptionalItemId(null)).toBeNull();
    expect(parseOptionalItemId("")).toBeNull();
  });

  it("accepts a positive integer", () => {
    expect(parseOptionalItemId("12")).toBe(12);
  });

  it("rejects invalid ids", () => {
    expect(parseOptionalItemId("0")).toBe("invalid");
    expect(parseOptionalItemId("-1")).toBe("invalid");
    expect(parseOptionalItemId("abc")).toBe("invalid");
  });
});

describe("buildMovementHistoryFilters", () => {
  it("builds no where clause when empty", () => {
    const result = buildMovementHistoryFilters(new URLSearchParams());
    expect(result.itemIdError).toBe(false);
    expect(result.where).toBe("");
    expect(result.params).toEqual([]);
  });

  it("filters by item, type, dates, search, and location", () => {
    const sp = new URLSearchParams({
      item_id: "4",
      movementType: "311",
      start: "2026-08-01",
      end: "2026-09-15",
      q: "AGV",
      location: "SL013",
    });
    const result = buildMovementHistoryFilters(sp);
    expect(result.itemIdError).toBe(false);
    expect(result.where.startsWith("WHERE ")).toBe(true);
    expect(result.where).toContain("li.item_id = ?");
    expect(result.where).toContain("d.movement_type = ?");
    expect(result.where).toContain("d.posting_date >= ?");
    expect(result.where).toContain("d.posting_date <= ?");
    expect(result.params[0]).toBe(4);
    expect(result.params[1]).toBe("311");
    expect(result.params[2]).toBe("2026-08-01 00:00:00");
    expect(result.params[3]).toBe("2026-09-15 23:59:59");
  });

  it("flags invalid item_id", () => {
    const result = buildMovementHistoryFilters(new URLSearchParams({ item_id: "nope" }));
    expect(result.itemIdError).toBe(true);
  });
});

describe("parseHistoryColumnVisibility", () => {
  it("keeps defaults for junk input", () => {
    expect(parseHistoryColumnVisibility(null).date).toBe(true);
    expect(parseHistoryColumnVisibility({ eval: "1" }).user).toBe(true);
  });

  it("accepts known boolean flags only", () => {
    const parsed = parseHistoryColumnVisibility({ user: false, uom: false, hack: false });
    expect(parsed.user).toBe(false);
    expect(parsed.uom).toBe(false);
    expect(parsed.date).toBe(true);
    expect("hack" in parsed).toBe(false);
  });

  it("rejects hiding every column", () => {
    const allOff = {
      date: false,
      doc: false,
      line: false,
      material: false,
      movementType: false,
      qty: false,
      uom: false,
      fromLocation: false,
      toLocation: false,
      user: false,
      note: false,
    };
    expect(parseHistoryColumnVisibility(allOff).date).toBe(true);
  });
});
