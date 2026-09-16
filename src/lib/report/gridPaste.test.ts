import { describe, expect, it } from "vitest";
import {
  applyGridPaste,
  hasUnmatchedSubItem,
  matchSubItem,
  parseClipboardGrid,
  parseCompletionCell,
} from "./gridPaste";
import { MAX_WEEK_REPORT_LINES, newWeekLineDraft } from "./weekFormDraft";

const subItems = [
  { id: 1, nameEn: "Traceability", nameCn: "追溯" },
  { id: 2, nameEn: "IT Operations", nameCn: "IT运维" },
  { id: 3, nameEn: "Project", nameCn: "项目" },
];

describe("parseClipboardGrid", () => {
  it("splits TSV into rows and columns", () => {
    expect(parseClipboardGrid("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("normalizes CRLF and drops trailing empty lines", () => {
    expect(parseClipboardGrid("x\ty\r\n\r\n")).toEqual([["x", "y"]]);
  });

  it("keeps newlines inside quoted cells as one cell", () => {
    expect(parseClipboardGrid('Traceability\t100\t"1. A\n2. B"\t目标')).toEqual([
      ["Traceability", "100", "1. A\n2. B", "目标"],
    ]);
  });

  it("unescapes doubled quotes inside quoted cells", () => {
    expect(parseClipboardGrid('"Say ""hi"""\tnext')).toEqual([['Say "hi"', "next"]]);
  });

  it("keeps tabs inside quoted cells without splitting columns", () => {
    expect(parseClipboardGrid('"a\tb"\tc')).toEqual([["a\tb", "c"]]);
  });

  it("drops a leading Sub-item / 子项 header row", () => {
    expect(
      parseClipboardGrid("Sub-item\tCompletion\tTarget (EN)\nTraceability\t100\tDone")
    ).toEqual([["Traceability", "100", "Done"]]);
    expect(parseClipboardGrid("子项\t完成度\n数据采集\t40%")).toEqual([["数据采集", "40%"]]);
  });
});

describe("matchSubItem", () => {
  it("matches EN or CN case-insensitively", () => {
    expect(matchSubItem("traceability", subItems)?.id).toBe(1);
    expect(matchSubItem("  IT运维 ", subItems)?.id).toBe(2);
  });

  it("returns null when not found", () => {
    expect(matchSubItem("Unknown", subItems)).toBeNull();
    expect(matchSubItem("", subItems)).toBeNull();
  });
});

describe("parseCompletionCell", () => {
  it("parses percent and plain numbers", () => {
    expect(parseCompletionCell("80%")).toBe(80);
    expect(parseCompletionCell("0")).toBe(0);
    expect(parseCompletionCell("100")).toBe(100);
  });

  it("clamps and rejects blanks / NaN", () => {
    expect(parseCompletionCell("150%")).toBe(100);
    expect(parseCompletionCell("-5")).toBe(0);
    expect(parseCompletionCell("")).toBeNull();
    expect(parseCompletionCell("abc")).toBeNull();
  });
});

describe("applyGridPaste", () => {
  it("fills a full 8-column row from the start cell", () => {
    const rows = [newWeekLineDraft()];
    const cells = [
      [
        "Project",
        "40%",
        "Target EN",
        "目标",
        "Summary EN",
        "总结",
        "Plan EN",
        "计划",
      ],
    ];
    const next = applyGridPaste(rows, { row: 0, col: 0 }, cells, subItems, "en");
    expect(next).toHaveLength(1);
    expect(next[0].subItemId).toBe(3);
    expect(next[0].subItemLabel).toBe("Project");
    expect(next[0].completionPct).toBe(40);
    expect(next[0].targetEn).toBe("Target EN");
    expect(next[0].targetCn).toBe("目标");
    expect(next[0].summaryEn).toBe("Summary EN");
    expect(next[0].summaryCn).toBe("总结");
    expect(next[0].planEn).toBe("Plan EN");
    expect(next[0].planCn).toBe("计划");
  });

  it("preserves multi-line target/summary from quoted clipboard text", () => {
    const text =
      'Traceability\t100%\t"1. Throughput\n2. Data mod"\t"1.直连\n2.修改"\t"Done A\nDone B"\t"完成A\n完成B"\tPlan EN\t计划';
    const cells = parseClipboardGrid(text);
    const next = applyGridPaste([newWeekLineDraft()], { row: 0, col: 0 }, cells, subItems, "en");
    expect(next).toHaveLength(1);
    expect(next[0].subItemId).toBe(1);
    expect(next[0].targetEn).toBe("1. Throughput\n2. Data mod");
    expect(next[0].targetCn).toBe("1.直连\n2.修改");
    expect(next[0].summaryEn).toBe("Done A\nDone B");
    expect(next[0].summaryCn).toBe("完成A\n完成B");
  });

  it("marks unmatched sub-item text without id", () => {
    const rows = [newWeekLineDraft()];
    const next = applyGridPaste(
      rows,
      { row: 0, col: 0 },
      [["Not In Master", "50"]],
      subItems
    );
    expect(next[0].subItemId).toBe("");
    expect(next[0].subItemLabel).toBe("Not In Master");
    expect(hasUnmatchedSubItem(next[0])).toBe(true);
    expect(next[0].completionPct).toBe(50);
  });

  it("extends rows and truncates past the max line cap", () => {
    const rows = [newWeekLineDraft()];
    const cells = Array.from({ length: MAX_WEEK_REPORT_LINES + 5 }, (_, i) => [
      "Project",
      String(i),
    ]);
    const next = applyGridPaste(rows, { row: 0, col: 0 }, cells, subItems);
    expect(next).toHaveLength(MAX_WEEK_REPORT_LINES);
    expect(next[MAX_WEEK_REPORT_LINES - 1].completionPct).toBe(MAX_WEEK_REPORT_LINES - 1);
  });

  it("pastes from a mid-row / mid-column focus", () => {
    const base = newWeekLineDraft();
    base.targetEn = "keep";
    const rows = [base, newWeekLineDraft()];
    const next = applyGridPaste(
      rows,
      { row: 1, col: 2 },
      [["Only Target EN", "Only Target CN"]],
      subItems
    );
    expect(next[0].targetEn).toBe("keep");
    expect(next[1].targetEn).toBe("Only Target EN");
    expect(next[1].targetCn).toBe("Only Target CN");
  });
});
