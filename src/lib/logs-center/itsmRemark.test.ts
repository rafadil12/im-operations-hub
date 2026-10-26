import { describe, expect, it } from "vitest";
import { itsmImportCounts, itsmImportEvent } from "./itsmRemark";
import { renderRemark } from "./renderRemark";

function sentence(imported: number, updated: number, lang: "en" | "cn") {
  return renderRemark(itsmImportEvent(imported, updated), lang);
}

describe("itsm import remarks", () => {
  it("counts new, changed, and unchanged rows from the write result", () => {
    expect(itsmImportCounts(18, 0, 18)).toEqual({ imported: 18, updated: 0 });
    expect(itsmImportCounts(18, 18, 36)).toEqual({ imported: 0, updated: 18 });
    expect(itsmImportCounts(18, 18, 0)).toEqual({ imported: 0, updated: 0 });
    expect(itsmImportCounts(15, 10, 15)).toEqual({ imported: 5, updated: 5 });
    expect(itsmImportCounts(10, 5, 5)).toEqual({ imported: 5, updated: 0 });
  });

  it("names how many requests were imported and updated", () => {
    expect(sentence(18, 0, "en")).toBe("Imported 18 requests");
    expect(sentence(18, 0, "cn")).toBe("已导入 18 个请求");
    expect(sentence(1, 0, "en")).toBe("Imported 1 request");
    expect(sentence(12, 6, "en")).toBe("Imported 12 requests, updated 6 requests");
    expect(sentence(12, 6, "cn")).toBe("已导入 12 个请求，已更新 6 个请求");
    expect(sentence(0, 6, "en")).toBe("Updated 6 requests");
    expect(sentence(0, 1, "cn")).toBe("已更新 1 个请求");
  });
});