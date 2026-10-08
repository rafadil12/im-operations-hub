import { describe, expect, it } from "vitest";
import {
  actionForWrite,
  describeWrite,
  moduleForTable,
  shouldSkipWrite,
  summarizeWrites,
} from "./describeWrite";

describe("describeWrite", () => {
  it("reads insert, update, and delete targets", () => {
    expect(describeWrite("INSERT INTO mes_record (user_id) VALUES (?)")).toMatchObject({
      verb: "insert",
      table: "mes_record",
      softDelete: false,
    });
    expect(describeWrite("UPDATE `sparepart_items` SET name_en = ? WHERE id = ?")).toMatchObject({
      verb: "update",
      table: "sparepart_items",
    });
    expect(describeWrite("DELETE FROM report_lines WHERE id = ?")).toMatchObject({
      verb: "delete",
      table: "report_lines",
    });
  });

  it("treats deleted_at updates as a delete", () => {
    const write = describeWrite("UPDATE mes_record SET deleted_at = NOW() WHERE id = ?");
    expect(write?.softDelete).toBe(true);
    expect(write && actionForWrite(write)).toBe("delete");
  });

  it("ignores reads", () => {
    expect(describeWrite("SELECT id FROM mes_record WHERE id = ?")).toBeNull();
  });

  it("skips the logs center table and last-login touch", () => {
    const logsCenter = describeWrite("INSERT INTO logs_center_events (summary) VALUES (?)");
    expect(
      logsCenter &&
        shouldSkipWrite("INSERT INTO logs_center_events (summary) VALUES (?)", logsCenter)
    ).toBe(true);
    const login = describeWrite("UPDATE system_users SET last_login_at = NOW() WHERE id = ?");
    expect(
      login &&
        shouldSkipWrite("UPDATE system_users SET last_login_at = NOW() WHERE id = ?", login)
    ).toBe(true);
  });

  it("maps tables to modules and summarizes a batch", () => {
    expect(moduleForTable("sparepart_mat_docs")).toBe("sparepart");
    expect(moduleForTable("roles")).toBe("settings");
    expect(
      summarizeWrites([
        { verb: "insert", table: "sparepart_mat_docs", softDelete: false },
        { verb: "update", table: "sparepart_stock_balances", softDelete: false },
      ])
    ).toEqual({
      module: "sparepart",
      action: "change",
      summary: "create sparepart_mat_docs, update sparepart_stock_balances",
    });
  });
});
