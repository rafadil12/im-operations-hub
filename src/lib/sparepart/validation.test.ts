import { describe, expect, it } from "vitest";
import { parseSparepartItemBody } from "./validation";

const validBody = {
  code: "IT00001",
  name_en: "Cable",
  name_cn: "线缆",
  brand_en: "Acme",
  brand_cn: "",
  model: "X1",
  notes: "",
  category_id: 1,
  uom_id: 2,
  min_stock: 5,
  is_active: true,
};

describe("parseSparepartItemBody", () => {
  it("accepts a minimal valid body and trims strings", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      code: "  IT00001  ",
      name_en: "  Cable  ",
      min_stock: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.code).toBe("IT00001");
      expect(result.data.name_en).toBe("Cable");
      expect(result.data.min_stock).toBe(0);
      expect(result.data.is_active).toBe(true);
    }
  });

  it("allows name_cn only when name_en is empty", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      name_en: "   ",
      name_cn: "线缆",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name_en).toBe("");
      expect(result.data.name_cn).toBe("线缆");
    }
  });

  it("rejects missing code and both names empty", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      code: "  ",
      name_en: "",
      name_cn: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
      expect(result.errors.some((e) => e.field === "name_en")).toBe(true);
    }
  });

  it("rejects code longer than 32 characters", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      code: "A".repeat(33),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "code" && e.message.includes("32"))).toBe(true);
    }
  });

  it("rejects missing or invalid category_id and uom_id", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      category_id: 0 as never,
      uom_id: "x" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "category_id")).toBe(true);
      expect(result.errors.some((e) => e.field === "uom_id")).toBe(true);
    }
  });

  it("rejects non-integer or negative min_stock", () => {
    expect(parseSparepartItemBody({ ...validBody, min_stock: -1 }).ok).toBe(false);
    expect(parseSparepartItemBody({ ...validBody, min_stock: 1.5 }).ok).toBe(false);
    expect(parseSparepartItemBody({ ...validBody, min_stock: "abc" as never }).ok).toBe(false);
  });

  it("defaults empty min_stock to 0", () => {
    const result = parseSparepartItemBody({ ...validBody, min_stock: "" as never });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.min_stock).toBe(0);
  });

  it("parses is_active falsy forms", () => {
    for (const falsy of [false, 0, "0", "false"] as const) {
      const result = parseSparepartItemBody({ ...validBody, is_active: falsy as never });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.is_active).toBe(false);
    }
    const truthy = parseSparepartItemBody({ ...validBody, is_active: "yes" as never });
    expect(truthy.ok).toBe(true);
    if (truthy.ok) expect(truthy.data.is_active).toBe(true);
  });

  it("parses numeric strings for ids and min_stock", () => {
    const result = parseSparepartItemBody({
      ...validBody,
      category_id: "3" as never,
      uom_id: "4" as never,
      min_stock: "10" as never,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.category_id).toBe(3);
      expect(result.data.uom_id).toBe(4);
      expect(result.data.min_stock).toBe(10);
    }
  });
});
