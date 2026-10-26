import { describe, expect, it } from "vitest";
import {
  canonicalCategoryCode,
  categoryColor,
  categoryMatchSql,
  normalizeCategoryCode,
} from "./categories";

describe("normalizeCategoryCode vs canonicalCategoryCode", () => {
  it("maps ASM to ASSEMBLY and keeps known codes", () => {
    expect(normalizeCategoryCode("asm")).toBe("ASSEMBLY");
    expect(normalizeCategoryCode("IT")).toBe("IT");
    expect(normalizeCategoryCode("DOCKING AND TROLLEY")).toBeNull();
  });

  it("keeps any DB category code via canonicalCategoryCode", () => {
    expect(canonicalCategoryCode("DOCKING AND TROLLEY")).toBe("DOCKING AND TROLLEY");
    expect(canonicalCategoryCode("asm")).toBe("ASSEMBLY");
    expect(canonicalCategoryCode("  mes ")).toBe("MES");
  });
});

describe("categoryMatchSql", () => {
  it("matches ASSEMBLY aliases", () => {
    expect(categoryMatchSql("c.code", "ASSEMBLY")).toEqual({
      sql: "UPPER(TRIM(c.code)) IN (?, ?)",
      params: ["ASSEMBLY", "ASM"],
    });
  });

  it("matches free-form DB category codes", () => {
    expect(categoryMatchSql("c.code", "DOCKING AND TROLLEY")).toEqual({
      sql: "UPPER(TRIM(c.code)) = ?",
      params: ["DOCKING AND TROLLEY"],
    });
  });
});

describe("categoryColor", () => {
  it("uses palette for known codes and a stable color for others", () => {
    expect(categoryColor("IT")).toBe("#3b82f6");
    expect(categoryColor("DOCKING AND TROLLEY")).toMatch(/^hsl\(\d+ 55% 45%\)$/);
    expect(categoryColor("DOCKING AND TROLLEY")).toBe(categoryColor("docking and trolley"));
  });
});
