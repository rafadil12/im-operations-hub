import type { RemarkChange, RemarkEvent } from "./renderRemark";
import { recordLogsCenter } from "./record";

const MONTH_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ACTIVITIES: Record<string, { en: string; cn: string }> = {
  training: { en: "Safety Training Records", cn: "安全培训记录" },
  routine_meeting: { en: "BBS Behavior Observation", cn: "BBS行为观察" },
  hse_tuesday: { en: "Regular HSE Meeting", cn: "HSE例会" },
  ert: { en: "ERT Report", cn: "ERT报告" },
  five_s: { en: "5S", cn: "5S" },
  potential_hazard: { en: "Potential Hazards", cn: "潜在危险" },
  monthly_meeting: { en: "Monthly Safety Meeting", cn: "月度会议" },
  fire_drill: { en: "Fire Drill Simulation", cn: "消防演练" },
  safety_case: { en: "Hazard Finding / Case", cn: "安全隐患 / 案件" },
  monthly_ppt: { en: "Safety PPT", cn: "安全PPT" },
  reward_finding: { en: "Reward-Based Finding", cn: "奖励发现" },
};

const STATUS: Record<string, { en: string; cn: string }> = {
  completed: { en: "Completed", cn: "已完成" },
  not_submitted: { en: "Not Submitted", cn: "未提交" },
  not_applicable: { en: "No Case", cn: "无案件" },
  case_found: { en: "Case Found", cn: "发现案件" },
};

export type SafetySnapshot = {
  status: string | null;
  submissionDate: string | null;
  picEn: string | null;
  picCn: string | null;
  location: string | null;
  descriptionEn: string | null;
  descriptionCn: string | null;
};

export type SafetyRemarkInput = {
  action: "submit" | "update" | "delete";
  kind: "weekly" | "monthly";
  week?: number | null;
  year: number;
  month: number;
  activityType: string;
  activityIndex?: number;
  submissionDate?: string | null;
  detail?: RemarkChange | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function dateKey(value: string | null | undefined): string {
  const raw = clean(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw;
}

function statusLabel(value: string): { en: string; cn: string } {
  return STATUS[value] ?? { en: value, cn: value };
}

export function safetyPeriod(year: number, month: number): { en: string; cn: string } {
  const name = MONTH_EN[month - 1] ?? String(month);
  return { en: `${name} ${year}`, cn: `${year}年${month}月` };
}

export function activityTitle(
  code: string,
  options?: { index?: number; date?: string | null }
): { en: string; cn: string } {
  const base = ACTIVITIES[code] ?? { en: code, cn: code };
  const index = options?.index && options.index > 0 ? options.index : 0;
  let en = index ? `${base.en} ${index}` : base.en;
  let cn = index ? `${base.cn} ${index}` : base.cn;
  if (code === "reward_finding") {
    const date = dateKey(options?.date);
    if (date) {
      en = `${en}, ${date}`;
      cn = `${cn}，${date}`;
    }
  }
  return { en, cn };
}

function linesChange(parts: Array<{ en: string; cn: string }>): RemarkChange | null {
  if (!parts.length) return null;
  return {
    field: "lines",
    to: parts.map((part) => part.en).join(", "),
    toCn: parts.map((part) => part.cn).join("，"),
  };
}

function fileCountPart(count: number): { en: string; cn: string } | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count === 1) return { en: "1 file", cn: "1 个文件" };
  return { en: `${count} files`, cn: `${count} 个文件` };
}

export function safetyCreateDetail(input: {
  fileCount: number;
  status?: string | null;
}): RemarkChange | null {
  const parts: Array<{ en: string; cn: string }> = [];
  const status = clean(input.status).toLowerCase();
  if (status) {
    const label = statusLabel(status);
    parts.push({ en: `status ${label.en}`, cn: `状态${label.cn}` });
  }
  const files = fileCountPart(input.fileCount);
  if (files) parts.push(files);
  return linesChange(parts);
}

export function safetyUpdateDetail(
  before: SafetySnapshot,
  after: SafetySnapshot,
  filesReplaced: boolean
): RemarkChange | null {
  const parts: Array<{ en: string; cn: string }> = [];

  const statusFrom = clean(before.status).toLowerCase();
  const statusTo = clean(after.status).toLowerCase();
  if (statusFrom && statusTo && statusFrom !== statusTo) {
    const from = statusLabel(statusFrom);
    const to = statusLabel(statusTo);
    parts.push({
      en: `status from ${from.en} to ${to.en}`,
      cn: `状态从${from.cn}改为${to.cn}`,
    });
  }

  const beforePicEn = clean(before.picEn);
  const beforePicCn = clean(before.picCn);
  const afterPicEn = clean(after.picEn);
  const afterPicCn = clean(after.picCn);
  if (beforePicEn !== afterPicEn || beforePicCn !== afterPicCn) {
    const fromEn = beforePicEn || beforePicCn || "none";
    const toEn = afterPicEn || afterPicCn || "none";
    const fromCn = beforePicCn || beforePicEn || "无";
    const toCn = afterPicCn || afterPicEn || "无";
    if (fromEn !== toEn || fromCn !== toCn) {
      parts.push({
        en: `PIC from ${fromEn} to ${toEn}`,
        cn: `负责人从${fromCn}改为${toCn}`,
      });
    }
  }

  const locationFrom = clean(before.location);
  const locationTo = clean(after.location);
  if (locationFrom !== locationTo) {
    parts.push({
      en: `location from ${locationFrom || "none"} to ${locationTo || "none"}`,
      cn: `地点从${locationFrom || "无"}改为${locationTo || "无"}`,
    });
  }

  const dateFrom = dateKey(before.submissionDate);
  const dateTo = dateKey(after.submissionDate);
  if (dateFrom !== dateTo) {
    parts.push({
      en: `date from ${dateFrom || "none"} to ${dateTo || "none"}`,
      cn: `日期从${dateFrom || "无"}改为${dateTo || "无"}`,
    });
  }

  if (
    clean(before.descriptionEn) !== clean(after.descriptionEn) ||
    clean(before.descriptionCn) !== clean(after.descriptionCn)
  ) {
    parts.push({ en: "description updated", cn: "描述已更新" });
  }

  if (filesReplaced) {
    parts.push({ en: "files replaced", cn: "文件已替换" });
  }

  return linesChange(parts);
}

export function toSafetySnapshot(row: {
  status?: string | null;
  submission_date?: string | null;
  pic?: string | null;
  pic_en?: string | null;
  pic_cn?: string | null;
  location?: string | null;
  description_en?: string | null;
  description_cn?: string | null;
}): SafetySnapshot {
  const legacyPic = clean(row.pic);
  const picEn = clean(row.pic_en) || legacyPic;
  const picCn = clean(row.pic_cn) || picEn;
  return {
    status: row.status ?? null,
    submissionDate: row.submission_date ?? null,
    picEn: picEn || null,
    picCn: picCn || null,
    location: row.location ?? null,
    descriptionEn: row.description_en ?? null,
    descriptionCn: row.description_cn ?? null,
  };
}

export function safetyRemarkEvent(input: SafetyRemarkInput): RemarkEvent {
  const activity = activityTitle(input.activityType, {
    index: input.activityIndex,
    date: input.submissionDate,
  });
  const period = safetyPeriod(input.year, input.month);
  const changes: RemarkChange[] = [
    { field: "name", to: activity.en, toCn: activity.cn },
    { field: "period", to: period.en, toCn: period.cn },
  ];
  if (input.detail) changes.push(input.detail);
  return {
    action: input.action,
    summary: "",
    objectType: input.kind === "weekly" ? "weekly safety report" : "monthly safety report",
    objectRef: input.kind === "weekly" && input.week ? String(input.week) : null,
    changes,
  };
}

export async function recordSafetyReport(input: SafetyRemarkInput): Promise<void> {
  const event = safetyRemarkEvent(input);
  await recordLogsCenter({
    module: "safety",
    action: event.action,
    objectType: event.objectType,
    objectRef: event.objectRef,
    changes: event.changes,
  });
}
