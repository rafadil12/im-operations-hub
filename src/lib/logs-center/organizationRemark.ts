import type { RemarkChange, RemarkEvent } from "./renderRemark";
import { recordLogsCenter } from "./record";

const STATUS: Record<string, [string, string]> = {
  Active: ["Active", "在职"],
  "On Leave": ["On Leave", "休假"],
  Inactive: ["Inactive", "停用"],
  Resigned: ["Resigned", "离职"],
  Terminated: ["Terminated", "已终止"],
  Pending: ["Pending", "待审核"],
  Approved: ["Approved", "已批准"],
  Rejected: ["Rejected", "已拒绝"],
};

const EMPLOYMENT_TYPE: Record<string, [string, string]> = {
  Permanent: ["Permanent", "正式员工"],
  Contract: ["Contract", "合同员工"],
  Probation: ["Probation", "试用期员工"],
  Intern: ["Intern", "实习生"],
  Outsource: ["Outsource", "外包员工"],
};

const LEAVE_TYPE: Record<string, [string, string]> = {
  AL: ["Annual Leave", "年假"],
  MC: ["Sick Leave", "病假"],
  UPL: ["Unpaid Leave", "请假 / 外出"],
  OT: ["Overtime", "加班"],
  ALPA: ["Absent Without Leave", "旷工"],
  NO_ATTENDANCE: ["No Attendance", "未打卡"],
};

const NO_ATTENDANCE: Record<string, [string, string]> = {
  NO_CHECK_IN: ["No Check-in", "未打上班卡"],
  NO_CHECK_OUT: ["No Check-out", "未打下班卡"],
  NO_CHECK_IN_OUT: ["No Check-in & Check-out", "上下班均未打卡"],
};

export type EmployeeIdentity = {
  employeeNo: string;
  nameEn: string;
  nameCn: string;
};

export type EmployeeFields = {
  positionEn: string;
  positionCn: string;
  divisionEn: string;
  divisionCn: string;
  status: string;
  employmentType: string;
  joinDate: string;
  location: string;
  team: string;
  managerNo: string;
  managerEn: string;
  managerCn: string;
};

export type LeaveSnapshot = {
  employeeNo: string;
  nameEn?: string | null;
  nameCn?: string | null;
  date: string;
  type: string;
  startTime?: string | null;
  endTime?: string | null;
  noAttendanceType?: string | null;
  reason?: string | null;
  oaNumber?: string | null;
};

type Phrase = { en: string; cn: string };

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function organizationDay(value: unknown): string {
  const text = String(value ?? "").trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match?.[1] ?? "";
}

function clock(value: string | null | undefined): string {
  const match = /^(\d{2}:\d{2})/.exec(clean(value));
  return match?.[1] ?? "";
}

function clip(value: string | null | undefined): string {
  const text = clean(value).replace(/\s+/g, " ");
  if (text.length <= 80) return text;
  return `${text.slice(0, 77)}...`;
}

function pair(value: string, table: Record<string, [string, string]>): Phrase {
  const row = table[clean(value)];
  if (!row) {
    const raw = clean(value);
    return { en: raw, cn: raw };
  }
  return { en: row[0], cn: row[1] };
}

function fromTo(labelEn: string, labelCn: string, from: Phrase | string, to: Phrase | string): Phrase | null {
  const fromEn = typeof from === "string" ? clean(from) : clean(from.en);
  const toEn = typeof to === "string" ? clean(to) : clean(to.en);
  const fromCn = typeof from === "string" ? fromEn : clean(from.cn) || fromEn;
  const toCn = typeof to === "string" ? toEn : clean(to.cn) || toEn;
  const leftEn = fromEn || "none";
  const rightEn = toEn || "none";
  const leftCn = fromCn || "无";
  const rightCn = toCn || "无";
  if (leftEn === rightEn && leftCn === rightCn) return null;
  return {
    en: `${labelEn} from ${leftEn} to ${rightEn}`,
    cn: `${labelCn}从${leftCn}改为${rightCn}`,
  };
}

function labeled(labelEn: string, labelCn: string, value: Phrase | string): Phrase | null {
  const en = typeof value === "string" ? clean(value) : clean(value.en);
  const cn = typeof value === "string" ? en : clean(value.cn) || en;
  if (!en && !cn) return null;
  return { en: `${labelEn} ${en}`, cn: `${labelCn} ${cn}` };
}

function joinPhrases(parts: Array<Phrase | null>): Phrase | null {
  const kept = parts.filter((part): part is Phrase => Boolean(part));
  if (!kept.length) return null;
  return {
    en: kept.map((part) => part.en).join(", "),
    cn: kept.map((part) => part.cn).join("，"),
  };
}

function nameChange(identity: EmployeeIdentity): RemarkChange {
  return {
    field: "name",
    to: clean(identity.nameEn) || clean(identity.nameCn),
    toCn: clean(identity.nameCn) || clean(identity.nameEn),
  };
}

function linesChange(detail: Phrase): RemarkChange {
  return { field: "lines", to: detail.en, toCn: detail.cn };
}

function person(no: string, en: string, cn: string): Phrase {
  const number = clean(no);
  const nameEn = clean(en) || clean(cn);
  const nameCn = clean(cn) || clean(en);
  return {
    en: [number, nameEn].filter(Boolean).join(" "),
    cn: [number, nameCn].filter(Boolean).join(" "),
  };
}

function normalizeFields(input: EmployeeFields): EmployeeFields {
  return {
    positionEn: clean(input.positionEn),
    positionCn: clean(input.positionCn),
    divisionEn: clean(input.divisionEn),
    divisionCn: clean(input.divisionCn),
    status: clean(input.status),
    employmentType: clean(input.employmentType),
    joinDate: organizationDay(input.joinDate),
    location: clean(input.location),
    team: clean(input.team),
    managerNo: clean(input.managerNo),
    managerEn: clean(input.managerEn),
    managerCn: clean(input.managerCn),
  };
}

function createDetail(fields: EmployeeFields): Phrase | null {
  const value = normalizeFields(fields);
  return joinPhrases([
    labeled("position", "职位", { en: value.positionEn, cn: value.positionCn || value.positionEn }),
    labeled("division", "部门", { en: value.divisionEn, cn: value.divisionCn || value.divisionEn }),
    labeled("status", "状态", pair(value.status, STATUS)),
    labeled("type", "雇佣类型", pair(value.employmentType, EMPLOYMENT_TYPE)),
    labeled("join date", "入职日期", value.joinDate),
    labeled("location", "地点", value.location),
    labeled("team", "班组", value.team),
    value.managerNo || value.managerEn || value.managerCn
      ? labeled("supervisor", "上级", person(value.managerNo, value.managerEn, value.managerCn))
      : null,
  ]);
}

function updateDetail(before: EmployeeFields, after: EmployeeFields, omitStatus: boolean): Phrase | null {
  const left = normalizeFields(before);
  const right = normalizeFields(after);
  return joinPhrases([
    fromTo("position", "职位", { en: left.positionEn, cn: left.positionCn || left.positionEn }, { en: right.positionEn, cn: right.positionCn || right.positionEn }),
    fromTo("division", "部门", { en: left.divisionEn, cn: left.divisionCn || left.divisionEn }, { en: right.divisionEn, cn: right.divisionCn || right.divisionEn }),
    omitStatus ? null : fromTo("status", "状态", pair(left.status, STATUS), pair(right.status, STATUS)),
    fromTo("type", "雇佣类型", pair(left.employmentType, EMPLOYMENT_TYPE), pair(right.employmentType, EMPLOYMENT_TYPE)),
    fromTo("join date", "入职日期", left.joinDate, right.joinDate),
    fromTo("location", "地点", left.location, right.location),
    fromTo("team", "班组", left.team, right.team),
    left.managerNo === right.managerNo
      ? null
      : fromTo("supervisor", "上级", person(left.managerNo, left.managerEn, left.managerCn), person(right.managerNo, right.managerEn, right.managerCn)),
  ]);
}

export function employeeCreateEvent(identity: EmployeeIdentity, fields: EmployeeFields): RemarkEvent {
  const detail = createDetail(fields);
  const changes: RemarkChange[] = [nameChange(identity)];
  if (detail) changes.push(linesChange(detail));
  return {
    action: "create",
    summary: "",
    objectType: "employee",
    objectRef: clean(identity.employeeNo),
    changes,
  };
}

export function employeeUpdateEvent(
  identity: EmployeeIdentity,
  before: EmployeeFields,
  after: EmployeeFields,
): RemarkEvent | null {
  const deactivated = clean(before.status) !== "Inactive" && clean(after.status) === "Inactive";
  const detail = updateDetail(before, after, deactivated);
  if (!deactivated && !detail) return null;
  const changes: RemarkChange[] = [nameChange(identity)];
  if (deactivated) changes.push({ field: "deactivated" });
  if (detail) changes.push(linesChange(detail));
  return {
    action: "update",
    summary: "",
    objectType: "employee",
    objectRef: clean(identity.employeeNo),
    changes,
  };
}

export function employeeDeleteEvent(identity: EmployeeIdentity, fields: EmployeeFields): RemarkEvent {
  const value = normalizeFields(fields);
  const detail = joinPhrases([
    labeled("position", "职位", { en: value.positionEn, cn: value.positionCn || value.positionEn }),
    labeled("division", "部门", { en: value.divisionEn, cn: value.divisionCn || value.divisionEn }),
  ]);
  const changes: RemarkChange[] = [nameChange(identity)];
  if (detail) changes.push(linesChange(detail));
  return {
    action: "delete",
    summary: "",
    objectType: "employee",
    objectRef: clean(identity.employeeNo),
    changes,
  };
}

function leaveType(type: string): Phrase {
  return pair(type, LEAVE_TYPE);
}

function timeSpan(start: string | null | undefined, end: string | null | undefined): Phrase | null {
  const from = clock(start);
  const to = clock(end);
  if (!from && !to) return null;
  if (from && to) return { en: `${from}-${to}`, cn: `${from}至${to}` };
  const single = from || to;
  return { en: single, cn: single };
}

function leaveChanges(row: LeaveSnapshot, detail?: Phrase | null): RemarkChange[] {
  const changes: RemarkChange[] = [
    {
      field: "name",
      to: clean(row.nameEn) || clean(row.nameCn),
      toCn: clean(row.nameCn) || clean(row.nameEn),
    },
    { field: "leave_type", to: leaveType(row.type).en, toCn: leaveType(row.type).cn },
    { field: "when", to: organizationDay(row.date) || clean(row.date) },
  ];
  const span = timeSpan(row.startTime, row.endTime);
  if (span) changes.push({ field: "span", to: span.en, toCn: span.cn });
  const note = pair(clean(row.noAttendanceType), NO_ATTENDANCE);
  if (clean(row.noAttendanceType)) changes.push({ field: "note", to: note.en, toCn: note.cn });
  if (detail) changes.push(linesChange(detail));
  return changes.filter((change) => change.field !== "name" || change.to || change.toCn);
}

function leaveEvent(action: "submit" | "update" | "delete", row: LeaveSnapshot, detail?: Phrase | null): RemarkEvent {
  return {
    action,
    summary: "",
    objectType: "leave",
    objectRef: clean(row.employeeNo),
    changes: leaveChanges(row, detail),
  };
}

export function leaveSubmitEvent(row: LeaveSnapshot): RemarkEvent {
  return leaveEvent("submit", row);
}

export function leaveCancelEvent(row: LeaveSnapshot): RemarkEvent {
  return leaveEvent("delete", row);
}

export function leaveStatusEvent(row: LeaveSnapshot, from: string, to: string): RemarkEvent | null {
  const detail = fromTo("status", "状态", pair(from, STATUS), pair(to, STATUS));
  if (!detail) return null;
  return leaveEvent("update", row, detail);
}

export function leaveOaEvent(row: LeaveSnapshot, from: string | null | undefined, to: string | null | undefined): RemarkEvent | null {
  const detail = fromTo("OA number", "OA号", clean(from), clean(to));
  if (!detail) return null;
  return leaveEvent("update", row, detail);
}

export function leaveEditEvent(before: LeaveSnapshot, after: LeaveSnapshot): RemarkEvent | null {
  const beforeSpan = timeSpan(before.startTime, before.endTime);
  const afterSpan = timeSpan(after.startTime, after.endTime);
  const detail = joinPhrases([
    clean(before.employeeNo) === clean(after.employeeNo)
      ? null
      : fromTo("employee", "员工", clean(before.employeeNo), clean(after.employeeNo)),
    organizationDay(before.date) === organizationDay(after.date)
      ? null
      : fromTo("date", "日期", organizationDay(before.date), organizationDay(after.date)),
    clean(before.type) === clean(after.type)
      ? null
      : fromTo("type", "类型", leaveType(before.type), leaveType(after.type)),
    fromTo("time", "时间", beforeSpan ?? "", afterSpan ?? { en: "", cn: "" }),
    clean(before.noAttendanceType) === clean(after.noAttendanceType)
      ? null
      : fromTo(
          "no attendance",
          "未打卡",
          pair(clean(before.noAttendanceType), NO_ATTENDANCE),
          pair(clean(after.noAttendanceType), NO_ATTENDANCE),
        ),
    clip(before.reason) === clip(after.reason) ? null : fromTo("reason", "原因", clip(before.reason), clip(after.reason)),
  ]);
  if (!detail) return null;
  return leaveEvent("update", after, detail);
}

export function attendanceSyncEvent(year: number, month: number, inserted: number, updated: number): RemarkEvent | null {
  const added = Math.max(0, inserted);
  const changed = Math.max(0, updated);
  if (added === 0 && changed === 0) return null;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return {
    action: "update",
    summary: "",
    objectType: "daily attendance",
    objectRef: `${year}-${String(month).padStart(2, "0")}`,
    changes: [
      { field: "year", to: String(year) },
      { field: "month", to: String(month) },
      { field: "inserted", to: String(added) },
      { field: "updated_rows", to: String(changed) },
    ],
  };
}

export function shiftRosterEvent(year: number, month: number): RemarkEvent | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return {
    action: "create",
    summary: "",
    objectType: "shift roster",
    objectRef: `${year}-${String(month).padStart(2, "0")}`,
    changes: [
      { field: "year", to: String(year) },
      { field: "month", to: String(month) },
    ],
  };
}

export function shiftAssignEvent(input: {
  employeeNo: string;
  nameEn?: string | null;
  nameCn?: string | null;
  before: { shift: string; excluded: boolean } | null;
  after: { shift: string; excluded: boolean };
}): RemarkEvent | null {
  const afterShift = clean(input.after.shift);
  const afterExcluded = input.after.excluded ? "yes" : "no";
  const same =
    input.before &&
    clean(input.before.shift) === afterShift &&
    (input.before.excluded ? "yes" : "no") === afterExcluded;
  if (same) return null;
  const changes: RemarkChange[] = [
    {
      field: "name",
      to: clean(input.nameEn) || clean(input.nameCn),
      toCn: clean(input.nameCn) || clean(input.nameEn),
    },
    {
      field: "shift_code",
      from: input.before ? clean(input.before.shift) : null,
      to: afterShift,
    },
  ];
  if (!input.before) {
    if (input.after.excluded) changes.push({ field: "excluded", to: "yes" });
  } else if ((input.before.excluded ? "yes" : "no") !== afterExcluded) {
    changes.push({
      field: "excluded",
      from: input.before.excluded ? "yes" : "no",
      to: afterExcluded,
    });
  }
  return {
    action: input.before ? "update" : "create",
    summary: "",
    objectType: "shift",
    objectRef: clean(input.employeeNo),
    changes: changes.filter((change) => change.field !== "name" || change.to || change.toCn),
  };
}

export function scheduleEvent(input: {
  employeeNo: string;
  nameEn?: string | null;
  nameCn?: string | null;
  date: string;
  fromType?: string | null;
  toType?: string | null;
}): RemarkEvent | null {
  const from = clean(input.fromType);
  const to = clean(input.toType);
  if (!from && !to) return null;
  if (from && to && from === to) return null;
  const action = !from ? "create" : !to ? "delete" : "update";
  const changes: RemarkChange[] = [
    {
      field: "name",
      to: clean(input.nameEn) || clean(input.nameCn),
      toCn: clean(input.nameCn) || clean(input.nameEn),
    },
    { field: "when", to: organizationDay(input.date) || clean(input.date) },
    { field: "schedule_type", from: from || null, to: to || null },
  ];
  return {
    action,
    summary: "",
    objectType: "schedule",
    objectRef: clean(input.employeeNo),
    changes: changes.filter((change) => change.field !== "name" || change.to || change.toCn),
  };
}

export function offDayEvent(input: {
  action: "create" | "delete";
  employeeNo: string;
  nameEn?: string | null;
  nameCn?: string | null;
  dates: string[];
}): RemarkEvent | null {
  const dates = [...new Set(input.dates.map((date) => organizationDay(date) || clean(date)).filter(Boolean))];
  if (!dates.length) return null;
  const changes: RemarkChange[] = [
    {
      field: "name",
      to: clean(input.nameEn) || clean(input.nameCn),
      toCn: clean(input.nameCn) || clean(input.nameEn),
    },
  ];
  if (dates.length > 4) changes.push({ field: "count", to: String(dates.length) });
  else changes.push({ field: "dates", to: dates.join(", "), toCn: dates.join("，") });
  return {
    action: input.action,
    summary: "",
    objectType: "off day",
    objectRef: clean(input.employeeNo),
    changes: changes.filter((change) => change.field !== "name" || change.to || change.toCn),
  };
}

export function rotationEvent(
  groups: {
    group: string;
    members: { employeeNo: string; nameEn?: string | null; nameCn?: string | null; shift: string }[];
  }[],
): RemarkEvent | null {
  const kept = groups.filter((group) => group.members.length);
  if (!kept.length) return null;
  const member = (row: { employeeNo: string; nameEn?: string | null; nameCn?: string | null; shift: string }, lang: "en" | "cn") => {
    const name = lang === "cn" ? clean(row.nameCn) || clean(row.nameEn) : clean(row.nameEn) || clean(row.nameCn);
    return [clean(row.employeeNo), name, clean(row.shift)].filter(Boolean).join(" ");
  };
  const en = kept
    .map((group) => `${group.group} ${group.members.map((row) => member(row, "en")).join(", ")}`)
    .join("; ");
  const cn = kept
    .map((group) => `${group.group} ${group.members.map((row) => member(row, "cn")).join("，")}`)
    .join("；");
  return {
    action: "save",
    summary: "",
    objectType: "rotation",
    changes: [{ field: "lines", to: en, toCn: cn }],
  };
}

export async function recordOrganization(event: RemarkEvent | null): Promise<void> {
  if (!event) return;
  try {
    await recordLogsCenter({
      module: "organization",
      action: event.action,
      objectType: event.objectType,
      objectRef: event.objectRef,
      changes: event.changes,
    });
  } catch (error) {
    console.error("organization remark failed", error);
  }
}
