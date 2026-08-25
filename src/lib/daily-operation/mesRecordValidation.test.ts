import { describe, expect, it } from "vitest";
import {
  firstErrorField,
  isValidCnText,
  isValidEnText,
  parseAndValidateMesBody,
  parseDateTimeValue,
  toMysqlDateTime,
  validateMesRecord,
  type MesFormValues,
} from "./mesRecordValidation";

const validValues: MesFormValues = {
  user_id: 1,
  division_id: 2,
  category_id: 3,
  subcategory_id: 4,
  type_id: 5,
  status_id: 6,
  description_cn: "系统故障 API",
  description_en: "System fault API",
  solution_cn: "已重启服务",
  solution_en: "Restarted service",
  start_time: "2026-03-15T09:00",
  end_time: "2026-03-15T10:30",
};

describe("parseDateTimeValue / toMysqlDateTime", () => {
  it("parses datetime-local and space-separated forms", () => {
    const a = parseDateTimeValue("2026-03-15T09:00");
    expect(a?.getFullYear()).toBe(2026);
    expect(a?.getMonth()).toBe(2);
    expect(a?.getDate()).toBe(15);
    expect(a?.getHours()).toBe(9);
    expect(a?.getMinutes()).toBe(0);

    const b = parseDateTimeValue("2026-03-15 09:00:30");
    expect(b?.getSeconds()).toBe(30);
  });

  it("rejects empty, malformed, and impossible values", () => {
    expect(parseDateTimeValue("")).toBeNull();
    expect(parseDateTimeValue("not-a-date")).toBeNull();
    expect(parseDateTimeValue("2026-02-30T10:00")).toBeNull();
    expect(parseDateTimeValue("2026-03-15T24:00")).toBeNull();
  });

  it("formats to MySQL datetime", () => {
    expect(toMysqlDateTime("2026-03-15T09:05")).toBe("2026-03-15 09:05:00");
    expect(toMysqlDateTime("bad")).toBeNull();
  });
});

describe("isValidEnText / isValidCnText", () => {
  it("blocks Han characters in EN and requires them in CN", () => {
    expect(isValidEnText("Broken printer")).toBe(true);
    expect(isValidEnText("Broken 打印机")).toBe(false);
    expect(isValidCnText("系统故障")).toBe(true);
    expect(isValidCnText("API only")).toBe(false);
    expect(isValidCnText("重启 MES")).toBe(true);
  });
});

describe("validateMesRecord", () => {
  it("accepts a complete valid record", () => {
    const result = validateMesRecord(validValues);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.start_time).toBe("2026-03-15 09:00:00");
      expect(result.data.end_time).toBe("2026-03-15 10:30:00");
      expect(result.data.description_cn).toBe("系统故障 API");
    }
  });

  it("reports required fields when ids/text are missing", () => {
    const result = validateMesRecord({
      ...validValues,
      user_id: null,
      description_cn: "  ",
      description_en: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "user_id" && e.key === "required")).toBe(true);
      expect(result.errors.some((e) => e.field === "description_cn" && e.key === "required")).toBe(
        true
      );
      expect(result.errors.some((e) => e.field === "description_en" && e.key === "required")).toBe(
        true
      );
      expect(result.messageKey).toBe("required");
    }
  });

  it("flags CN without Han and EN with Han", () => {
    const result = validateMesRecord({
      ...validValues,
      description_cn: "API only",
      description_en: "故障 description",
      solution_cn: "fixed",
      solution_en: "已修复",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          { field: "description_cn", key: "cnNeedsChinese" },
          { field: "description_en", key: "enHasChinese" },
          { field: "solution_cn", key: "cnNeedsChinese" },
          { field: "solution_en", key: "enHasChinese" },
        ])
      );
    }
  });

  it("rejects end_time before or equal to start_time", () => {
    const equal = validateMesRecord({
      ...validValues,
      end_time: "2026-03-15T09:00",
    });
    expect(equal.ok).toBe(false);
    if (!equal.ok) {
      expect(equal.errors.some((e) => e.key === "startBeforeEnd")).toBe(true);
    }

    const before = validateMesRecord({
      ...validValues,
      end_time: "2026-03-15T08:00",
    });
    expect(before.ok).toBe(false);
    if (!before.ok) {
      expect(before.errors.some((e) => e.field === "end_time" && e.key === "startBeforeEnd")).toBe(
        true
      );
    }
  });

  it("rejects invalid datetime strings", () => {
    const result = validateMesRecord({
      ...validValues,
      start_time: "yesterday",
      end_time: "2026-13-01T10:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "start_time" && e.key === "invalidDateTime")).toBe(
        true
      );
      expect(result.errors.some((e) => e.field === "end_time" && e.key === "invalidDateTime")).toBe(
        true
      );
    }
  });
});

describe("parseAndValidateMesBody / firstErrorField", () => {
  it("coerces raw body values then validates", () => {
    const result = parseAndValidateMesBody({
      user_id: "1",
      division_id: "2",
      category_id: 3,
      subcategory_id: 4,
      type_id: 5,
      status_id: 6,
      description_cn: "  系统故障  ",
      description_en: "Fault",
      solution_cn: "已处理",
      solution_en: "Handled",
      start_time: "2026-03-15T09:00",
      end_time: "2026-03-15T10:00",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user_id).toBe(1);
      expect(result.data.description_cn).toBe("系统故障");
    }
  });

  it("returns first field by FIELD_ORDER", () => {
    expect(
      firstErrorField([
        { field: "description_en", key: "required" },
        { field: "user_id", key: "required" },
      ])
    ).toBe("user_id");
    expect(firstErrorField([])).toBeNull();
  });
});
