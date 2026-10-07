import { describe, expect, it } from "vitest";
import {
  ChangeRequestIssueError,
  assertIssueComplete,
  parseChangeRequestIssue,
} from "./changeRequestIssueParse";

describe("parseChangeRequestIssue", () => {
  it("treats a missing flag as no issue", () => {
    expect(parseChangeRequestIssue({}).issue_material).toBe(false);
  });

  it("keeps positive integer ids", () => {
    const parsed = parseChangeRequestIssue({
      issue_material: true,
      sparepart_item_id: "12",
      sparepart_qty: 2,
      sparepart_storage_location_id: 3,
      sparepart_level_id: 4,
      sparepart_recipient: "  Line A  ",
    });
    expect(parsed).toEqual({
      issue_material: true,
      sparepart_item_id: 12,
      sparepart_qty: 2,
      sparepart_storage_location_id: 3,
      sparepart_level_id: 4,
      sparepart_recipient: "Line A",
    });
  });
});

describe("assertIssueComplete", () => {
  it("rejects an incomplete issue", () => {
    expect(() =>
      assertIssueComplete({
        issue_material: true,
        sparepart_item_id: 1,
        sparepart_qty: null,
        sparepart_storage_location_id: 2,
        sparepart_level_id: 3,
        sparepart_recipient: "",
      })
    ).toThrow(ChangeRequestIssueError);
  });
});
