import { describe, expect, it } from "vitest";
import {
  actionBadgeTone,
  formatChangeLines,
  formatLogEventId,
  formatLogIp,
  formatLogTarget,
} from "./logDetail";

describe("formatLogEventId", () => {
  it("builds LOG-YYYYMMDD with a padded id", () => {
    expect(formatLogEventId(1234, "2026-10-22 11:18:44")).toBe("LOG-20261022-001234");
  });
});

describe("formatLogTarget", () => {
  it("joins the localized noun and object ref", () => {
    expect(formatLogTarget("material", "DTR00001", "en")).toBe("material DTR00001");
    expect(formatLogTarget("material", "DTR00001", "cn")).toBe("物料 DTR00001");
  });

  it("returns a dash when both are empty", () => {
    expect(formatLogTarget(null, null, "en")).toBe("-");
  });
});

describe("formatChangeLines", () => {
  it("returns dashes when there are no changes", () => {
    expect(formatChangeLines(null, "en")).toEqual({ before: ["-"], after: ["-"] });
  });

  it("builds before and after lines from changes_json", () => {
    expect(
      formatChangeLines(
        [
          {
            field: "status",
            from: "Pending",
            to: "Completed",
            fromCn: "待处理",
            toCn: "已完成",
          },
        ],
        "en"
      )
    ).toEqual({
      before: ["status: Pending"],
      after: ["status: Completed"],
    });
    expect(
      formatChangeLines(
        [
          {
            field: "status",
            from: "Pending",
            to: "Completed",
            fromCn: "待处理",
            toCn: "已完成",
          },
        ],
        "cn"
      )
    ).toEqual({
      before: ["状态: 待处理"],
      after: ["状态: 已完成"],
    });
  });
});

describe("actionBadgeTone", () => {
  it("maps known actions", () => {
    expect(actionBadgeTone("create")).toBe("green");
    expect(actionBadgeTone("update")).toBe("orange");
    expect(actionBadgeTone("delete")).toBe("red");
    expect(actionBadgeTone("import")).toBe("blue");
    expect(actionBadgeTone("reopen")).toBe("purple");
    expect(actionBadgeTone("logout")).toBe("gray");
  });
});

describe("formatLogIp", () => {
  it("returns a dash for empty values", () => {
    expect(formatLogIp(null)).toBe("-");
    expect(formatLogIp("  ")).toBe("-");
    expect(formatLogIp("192.168.1.25")).toBe("192.168.1.25");
  });
});
