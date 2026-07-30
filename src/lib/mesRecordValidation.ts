import type { MesDataInput } from "@/lib/types";

/** CJK Unified Ideographs (common Chinese characters). */
const HAN_RE = /[\u4e00-\u9fff]/;
/** Detects any Han character that must not appear in EN fields. */
const HAS_HAN_RE = /[\u4e00-\u9fff]/u;

export type MesFieldKey =
  | "user_id"
  | "division_id"
  | "category_id"
  | "subcategory_id"
  | "type_id"
  | "status_id"
  | "start_time"
  | "end_time"
  | "description_cn"
  | "description_en"
  | "solution_cn"
  | "solution_en";

export type MesValidationErrorKey =
  | "required"
  | "startBeforeEnd"
  | "enHasChinese"
  | "cnNeedsChinese"
  | "invalidDateTime";

export type MesFieldError = {
  field: MesFieldKey;
  key: MesValidationErrorKey;
};

export type MesValidationResult =
  | { ok: true; data: MesDataInput }
  | { ok: false; errors: MesFieldError[]; messageKey: MesValidationErrorKey };

export type MesFormValues = {
  user_id: number | null;
  division_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  type_id: number | null;
  status_id: number | null;
  description_cn: string;
  description_en: string;
  solution_cn: string;
  solution_en: string;
  /** datetime-local style: YYYY-MM-DDTHH:mm */
  start_time: string;
  end_time: string;
};

const FIELD_ORDER: MesFieldKey[] = [
  "division_id",
  "user_id",
  "category_id",
  "subcategory_id",
  "type_id",
  "status_id",
  "start_time",
  "end_time",
  "description_cn",
  "description_en",
  "solution_cn",
  "solution_en",
];

function isFiniteId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Parse "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm:ss" into a Date, or null. */
export function parseDateTimeValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes("T")
    ? trimmed.length === 16
      ? `${trimmed}:00`
      : trimmed
    : trimmed.length === 16
      ? `${trimmed.replace(" ", "T")}:00`
      : trimmed.replace(" ", "T");

  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    normalized,
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");

  if (hour > 23 || minute > 59 || second > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }
  return date;
}

/** EN fields must not contain Chinese characters. */
export function isValidEnText(value: string): boolean {
  return !HAS_HAN_RE.test(value);
}

/**
 * CN fields must contain at least one Han character.
 * Latin letters, digits, and punctuation are allowed (e.g. API, MES).
 */
export function isValidCnText(value: string): boolean {
  return HAN_RE.test(value);
}

/** Convert datetime-local / MySQL value to MySQL "YYYY-MM-DD HH:mm:ss". */
export function toMysqlDateTime(value: string): string | null {
  const date = parseDateTimeValue(value);
  if (!date) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pushRequired(
  errors: MesFieldError[],
  field: MesFieldKey,
  ok: boolean,
) {
  if (!ok) errors.push({ field, key: "required" });
}

export function validateMesRecord(
  values: MesFormValues,
): MesValidationResult {
  const errors: MesFieldError[] = [];

  pushRequired(errors, "division_id", isFiniteId(values.division_id));
  pushRequired(errors, "user_id", isFiniteId(values.user_id));
  pushRequired(errors, "category_id", isFiniteId(values.category_id));
  pushRequired(errors, "subcategory_id", isFiniteId(values.subcategory_id));
  pushRequired(errors, "type_id", isFiniteId(values.type_id));
  pushRequired(errors, "status_id", isFiniteId(values.status_id));

  const descriptionCn = values.description_cn.trim();
  const descriptionEn = values.description_en.trim();
  const solutionCn = values.solution_cn.trim();
  const solutionEn = values.solution_en.trim();

  pushRequired(errors, "description_cn", Boolean(descriptionCn));
  pushRequired(errors, "description_en", Boolean(descriptionEn));
  pushRequired(errors, "solution_cn", Boolean(solutionCn));
  pushRequired(errors, "solution_en", Boolean(solutionEn));
  pushRequired(errors, "start_time", Boolean(values.start_time.trim()));
  pushRequired(errors, "end_time", Boolean(values.end_time.trim()));

  if (descriptionCn && !isValidCnText(descriptionCn)) {
    errors.push({ field: "description_cn", key: "cnNeedsChinese" });
  }
  if (descriptionEn && !isValidEnText(descriptionEn)) {
    errors.push({ field: "description_en", key: "enHasChinese" });
  }
  if (solutionCn && !isValidCnText(solutionCn)) {
    errors.push({ field: "solution_cn", key: "cnNeedsChinese" });
  }
  if (solutionEn && !isValidEnText(solutionEn)) {
    errors.push({ field: "solution_en", key: "enHasChinese" });
  }

  const startMysql = values.start_time.trim()
    ? toMysqlDateTime(values.start_time)
    : null;
  const endMysql = values.end_time.trim()
    ? toMysqlDateTime(values.end_time)
    : null;

  if (values.start_time.trim() && !startMysql) {
    errors.push({ field: "start_time", key: "invalidDateTime" });
  }
  if (values.end_time.trim() && !endMysql) {
    errors.push({ field: "end_time", key: "invalidDateTime" });
  }

  if (startMysql && endMysql) {
    const start = parseDateTimeValue(startMysql);
    const end = parseDateTimeValue(endMysql);
    if (start && end && start.getTime() >= end.getTime()) {
      errors.push({ field: "end_time", key: "startBeforeEnd" });
    }
  }

  if (errors.length) {
    const sorted = [...errors].sort(
      (a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field),
    );
    return {
      ok: false,
      errors: sorted,
      messageKey: sorted[0]?.key ?? "required",
    };
  }

  return {
    ok: true,
    data: {
      user_id: values.user_id as number,
      division_id: values.division_id as number,
      category_id: values.category_id as number,
      subcategory_id: values.subcategory_id as number,
      type_id: values.type_id as number,
      status_id: values.status_id as number,
      description_cn: descriptionCn,
      description_en: descriptionEn,
      solution_cn: solutionCn,
      solution_en: solutionEn,
      start_time: startMysql as string,
      end_time: endMysql as string,
    },
  };
}

/** Parse a raw API body into form values, then validate. */
export function parseAndValidateMesBody(
  body: Partial<MesDataInput> | Record<string, unknown>,
): MesValidationResult {
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown): string =>
    v === null || v === undefined ? "" : String(v);

  return validateMesRecord({
    user_id: num(body.user_id),
    division_id: num(body.division_id),
    category_id: num(body.category_id),
    subcategory_id: num(body.subcategory_id),
    type_id: num(body.type_id),
    status_id: num(body.status_id),
    description_cn: str(body.description_cn),
    description_en: str(body.description_en),
    solution_cn: str(body.solution_cn),
    solution_en: str(body.solution_en),
    start_time: str(body.start_time),
    end_time: str(body.end_time),
  });
}

export function firstErrorField(
  errors: MesFieldError[],
): MesFieldKey | null {
  if (!errors.length) return null;
  return (
    FIELD_ORDER.find((f) => errors.some((e) => e.field === f)) ??
    errors[0].field
  );
}
