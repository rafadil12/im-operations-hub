import { describe, expect, it } from "vitest";
import {
  assertIssueComplete,
  collectIssueErrors,
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
  it("names only the fields that fail", () => {
    expect(() =>
      assertIssueComplete({
        issue_material: true,
        sparepart_item_id: 1,
        sparepart_qty: null,
        sparepart_storage_location_id: 2,
        sparepart_level_id: 3,
        sparepart_recipient: "",
      })
    ).toThrow("Issued To is required. Quantity is required.");
  });

  it("rejects a zero quantity as invalid", () => {
    expect(
      collectIssueErrors({
        issue_material: true,
        sparepart_item_id: 1,
        sparepart_qty: 0,
        sparepart_storage_location_id: 2,
        sparepart_level_id: 3,
        sparepart_recipient: "Line A",
      })
    ).toEqual(["qty_invalid"]);
  });

  it("rejects a quantity above available stock", () => {
    expect(
      collectIssueErrors(
        {
          issue_material: true,
          sparepart_item_id: 1,
          sparepart_qty: 5,
          sparepart_storage_location_id: 2,
          sparepart_level_id: 3,
          sparepart_recipient: "Line A",
        },
        4
      )
    ).toEqual(["qty_exceeds"]);
  });
});
