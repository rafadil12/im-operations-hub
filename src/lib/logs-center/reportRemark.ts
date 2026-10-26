import type { RemarkChange } from "./renderRemark";
import { identityChange, type BilingualName } from "./dailyRemark";
import { recordLogsCenter } from "./record";

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function rateKey(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return String(Math.round(Number(value) * 10000) / 10000);
}

function percent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return `${Math.round(Number(value) * 100)}%`;
}

function storedPair(primary: string | null | undefined, fallback: string | null | undefined): string {
  return clean(primary) || clean(fallback);
}

function label(value: string): string {
  const trimmed = clean(value);
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}...`;
}

export type WeekLineSnapshot = {
  id?: number | null;
  subItemId: number | null;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate?: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn?: string | null;
  planCn?: string | null;
  sortOrder?: number;
};

export type WeekLineCounts = {
  added: number;
  updated: number;
  removed: number;
  orderChanged: boolean;
};

function sameWeekLine(before: WeekLineSnapshot, after: WeekLineSnapshot): boolean {
  return (
    (before.subItemId ?? null) === (after.subItemId ?? null) &&
    storedPair(before.workTargetEn, before.workTargetCn) ===
      storedPair(after.workTargetEn, after.workTargetCn) &&
    storedPair(before.workTargetCn, before.workTargetEn) ===
      storedPair(after.workTargetCn, after.workTargetEn) &&
    rateKey(before.weeklyCompletionRate) === rateKey(after.weeklyCompletionRate) &&
    storedPair(before.summaryEn, before.summaryCn) === storedPair(after.summaryEn, after.summaryCn) &&
    storedPair(before.summaryCn, before.summaryEn) === storedPair(after.summaryCn, after.summaryEn) &&
    storedPair(before.planEn, before.planCn) === storedPair(after.planEn, after.planCn) &&
    storedPair(before.planCn, before.planEn) === storedPair(after.planCn, after.planEn)
  );
}

export function countWeekLineChanges(
  before: WeekLineSnapshot[],
  after: WeekLineSnapshot[]
): WeekLineCounts {
  const beforeById = new Map<number, WeekLineSnapshot>();
  for (const line of before) {
    if (line.id != null) beforeById.set(line.id, line);
  }

  const kept = new Set<number>();
  let added = 0;
  let updated = 0;
  const afterIds: number[] = [];
  for (const line of after) {
    if (line.id == null) {
      added += 1;
      continue;
    }
    afterIds.push(line.id);
    kept.add(line.id);
    const previous = beforeById.get(line.id);
    if (!previous || !sameWeekLine(previous, line)) updated += 1;
  }

  const removed = before.filter((line) => line.id != null && !kept.has(line.id)).length;
  const beforeIds = before
    .filter((line) => line.id != null)
    .sort(
      (left, right) =>
        (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || (left.id ?? 0) - (right.id ?? 0)
    )
    .map((line) => line.id as number);
  const orderChanged =
    added === 0 &&
    removed === 0 &&
    updated === 0 &&
    beforeIds.length === afterIds.length &&
    beforeIds.some((id, index) => id !== afterIds[index]);

  return { added, updated, removed, orderChanged };
}

export function weekLineDetail(counts: WeekLineCounts): RemarkChange | null {
  const en: string[] = [];
  const cn: string[] = [];
  if (counts.added > 0) {
    en.push(`${counts.added} ${counts.added === 1 ? "line" : "lines"} added`);
    cn.push(`新增 ${counts.added} 行`);
  }
  if (counts.updated > 0) {
    en.push(`${counts.updated} ${counts.updated === 1 ? "line" : "lines"} updated`);
    cn.push(`更新 ${counts.updated} 行`);
  }
  if (counts.removed > 0) {
    en.push(`${counts.removed} ${counts.removed === 1 ? "line" : "lines"} removed`);
    cn.push(`删除 ${counts.removed} 行`);
  }
  if (en.length === 0 && counts.orderChanged) {
    return { field: "lines", to: "line order updated", toCn: "行顺序已更新" };
  }
  if (en.length === 0) return null;
  return { field: "lines", to: en.join(", "), toCn: cn.join("，") };
}

export function weekDeleteDetail(count: number): RemarkChange {
  const noun = count === 1 ? "line" : "lines";
  return { field: "lines", to: `${count} ${noun}`, toCn: `${count} 行` };
}

export function addedLineDetail(nameEn: string | null, nameCn: string | null): RemarkChange {
  const en = clean(nameEn) || clean(nameCn) || "line";
  const cn = clean(nameCn) || clean(nameEn) || "行";
  return { field: "lines", to: `1 line added, ${en}`, toCn: `新增 1 行，${cn}` };
}

export function removedLineDetail(nameEn: string | null, nameCn: string | null): RemarkChange {
  const en = clean(nameEn) || clean(nameCn) || "line";
  const cn = clean(nameCn) || clean(nameEn) || "行";
  return { field: "lines", to: `line ${en}`, toCn: `子项 ${cn}` };
}

export type WeekLineEdit = {
  subItemId: number | null;
  subItemNameEn: string | null;
  subItemNameCn: string | null;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn: string | null;
  planCn: string | null;
};

export function weekLineEditDetail(before: WeekLineEdit, after: WeekLineEdit): RemarkChange | null {
  const en: string[] = [];
  const cn: string[] = [];
  if ((before.subItemId ?? null) !== (after.subItemId ?? null)) {
    const fromEn = clean(before.subItemNameEn) || clean(before.subItemNameCn) || "none";
    const toEn = clean(after.subItemNameEn) || clean(after.subItemNameCn) || "none";
    const fromCn = clean(before.subItemNameCn) || clean(before.subItemNameEn) || "无";
    const toCn = clean(after.subItemNameCn) || clean(after.subItemNameEn) || "无";
    en.push(`sub-item from ${fromEn} to ${toEn}`);
    cn.push(`子项从${fromCn}改为${toCn}`);
  }

  const labelEn = clean(after.subItemNameEn) || clean(after.subItemNameCn) || "line";
  const labelCn = clean(after.subItemNameCn) || clean(after.subItemNameEn) || "行";
  const beforeRate = percent(before.weeklyCompletionRate);
  const afterRate = percent(after.weeklyCompletionRate);
  if (beforeRate !== afterRate) {
    en.push(`${labelEn} completion from ${beforeRate || "none"} to ${afterRate || "none"}`);
    cn.push(`${labelCn} 完成度从${beforeRate || "无"}改为${afterRate || "无"}`);
  }
  if (
    storedPair(before.workTargetEn, before.workTargetCn) !==
      storedPair(after.workTargetEn, after.workTargetCn) ||
    storedPair(before.workTargetCn, before.workTargetEn) !==
      storedPair(after.workTargetCn, after.workTargetEn)
  ) {
    en.push(`${labelEn} target updated`);
    cn.push(`${labelCn} 目标已更新`);
  }
  if (
    storedPair(before.summaryEn, before.summaryCn) !== storedPair(after.summaryEn, after.summaryCn) ||
    storedPair(before.summaryCn, before.summaryEn) !== storedPair(after.summaryCn, after.summaryEn)
  ) {
    en.push(`${labelEn} summary updated`);
    cn.push(`${labelCn} 总结已更新`);
  }
  if (
    storedPair(before.planEn, before.planCn) !== storedPair(after.planEn, after.planCn) ||
    storedPair(before.planCn, before.planEn) !== storedPair(after.planCn, after.planEn)
  ) {
    en.push(`${labelEn} plan updated`);
    cn.push(`${labelCn} 计划已更新`);
  }
  if (en.length === 0) return null;
  return { field: "lines", to: en.join(", "), toCn: cn.join("，") };
}

export type ProjectRemarkHeader = {
  projectDepartment: string;
  reporterName: string;
  reportDate: string;
  cycleLabel: string;
  year: number;
  weekNumber: number;
  status: string;
};

export type ProjectRemarkLine = {
  target: string;
  mainTask?: string | null;
  currentPriority?: string | null;
  planStart?: string | null;
  planEnd?: string | null;
  health: string;
  lineStatus: string;
  progressRatio?: number | null;
  pic?: string | null;
  thisWeekProgress?: string | null;
  nextWeekPlan?: string | null;
};

export type ProjectRemarkSnapshot = {
  header: ProjectRemarkHeader;
  lines: ProjectRemarkLine[];
};

const REPORT_STATUS: Record<string, { en: string; cn: string }> = {
  draft: { en: "Draft", cn: "草稿" },
  submitted: { en: "Submitted", cn: "已提交" },
};

const HEALTH: Record<string, { en: string; cn: string }> = {
  healthy: { en: "Healthy", cn: "健康" },
  mild: { en: "Watch", cn: "轻微" },
  serious: { en: "Critical", cn: "严重" },
};

const LINE_STATUS: Record<string, { en: string; cn: string }> = {
  in_progress: { en: "In Progress", cn: "进行中" },
  completed: { en: "Completed", cn: "完成" },
};

function named(value: string, table: Record<string, { en: string; cn: string }>, lang: "en" | "cn"): string {
  return table[value]?.[lang] ?? value;
}

function fromTo(
  field: string,
  before: string,
  after: string,
  beforeCn = before,
  afterCn = after
): RemarkChange | null {
  if (before === after && beforeCn === afterCn) return null;
  return {
    field,
    from: before || "none",
    to: after || "none",
    fromCn: beforeCn || "无",
    toCn: afterCn || "无",
  };
}

function pushLineDiffs(before: ProjectRemarkLine, after: ProjectRemarkLine, en: string[], cn: string[]) {
  const target = label(after.target) || label(before.target) || "target";
  const beforeProgress = percent(before.progressRatio);
  const afterProgress = percent(after.progressRatio);
  if (beforeProgress !== afterProgress) {
    en.push(`progress of ${target} from ${beforeProgress || "none"} to ${afterProgress || "none"}`);
    cn.push(`${target} 进度从${beforeProgress || "无"}改为${afterProgress || "无"}`);
  }
  const beforeStart = clean(before.planStart);
  const afterStart = clean(after.planStart);
  if (beforeStart !== afterStart) {
    en.push(`plan start of ${target} from ${beforeStart || "none"} to ${afterStart || "none"}`);
    cn.push(`${target} 计划启动从${beforeStart || "无"}改为${afterStart || "无"}`);
  }
  const beforeEnd = clean(before.planEnd);
  const afterEnd = clean(after.planEnd);
  if (beforeEnd !== afterEnd) {
    en.push(`plan end of ${target} from ${beforeEnd || "none"} to ${afterEnd || "none"}`);
    cn.push(`${target} 计划完成从${beforeEnd || "无"}改为${afterEnd || "无"}`);
  }
  if (before.health !== after.health) {
    en.push(
      `health of ${target} from ${named(before.health, HEALTH, "en")} to ${named(after.health, HEALTH, "en")}`
    );
    cn.push(
      `${target} 健康指示从${named(before.health, HEALTH, "cn")}改为${named(after.health, HEALTH, "cn")}`
    );
  }
  if (before.lineStatus !== after.lineStatus) {
    en.push(
      `status of ${target} from ${named(before.lineStatus, LINE_STATUS, "en")} to ${named(after.lineStatus, LINE_STATUS, "en")}`
    );
    cn.push(
      `${target} 状态从${named(before.lineStatus, LINE_STATUS, "cn")}改为${named(after.lineStatus, LINE_STATUS, "cn")}`
    );
  }
  if (clean(before.pic) !== clean(after.pic)) {
    en.push(`PIC of ${target} from ${clean(before.pic) || "none"} to ${clean(after.pic) || "none"}`);
    cn.push(`${target} 负责人从${clean(before.pic) || "无"}改为${clean(after.pic) || "无"}`);
  }
  if (clean(before.mainTask) !== clean(after.mainTask)) {
    en.push(`main task of ${target} updated`);
    cn.push(`${target} 重点工作已更新`);
  }
  if (clean(before.currentPriority) !== clean(after.currentPriority)) {
    en.push(`priority of ${target} updated`);
    cn.push(`${target} 当前优先级已更新`);
  }
  if (clean(before.thisWeekProgress) !== clean(after.thisWeekProgress)) {
    en.push(`this week progress of ${target} updated`);
    cn.push(`${target} 当前进展已更新`);
  }
  if (clean(before.nextWeekPlan) !== clean(after.nextWeekPlan)) {
    en.push(`next week plan of ${target} updated`);
    cn.push(`${target} 未来计划已更新`);
  }
}

function projectLinePhrase(before: ProjectRemarkLine[], after: ProjectRemarkLine[]): RemarkChange | null {
  const pool = before.map((line) => ({ ...line }));
  const en: string[] = [];
  const cn: string[] = [];
  for (const line of after) {
    const index = pool.findIndex((item) => clean(item.target) === clean(line.target));
    if (index < 0) {
      en.push(`added target ${label(line.target)}`);
      cn.push(`新增目标 ${label(line.target)}`);
      continue;
    }
    const previous = pool.splice(index, 1)[0];
    pushLineDiffs(previous, line, en, cn);
  }
  for (const line of pool) {
    en.push(`removed target ${label(line.target)}`);
    cn.push(`移除目标 ${label(line.target)}`);
  }
  if (en.length === 0) return null;
  return { field: "lines", to: en.join(", "), toCn: cn.join("，") };
}

function targetDetail(header: ProjectRemarkHeader, lines: ProjectRemarkLine[], status: boolean): RemarkChange {
  const weekEn = `week ${header.weekNumber}`;
  const weekCn = `第${header.weekNumber}周`;
  let detailEn = weekEn;
  let detailCn = weekCn;
  if (lines.length === 1) {
    detailEn += `, target ${label(lines[0]?.target ?? "")}`;
    detailCn += `，目标 ${label(lines[0]?.target ?? "")}`;
  } else {
    detailEn += `, ${lines.length} targets`;
    detailCn += `，${lines.length} 个目标`;
  }
  if (status && header.status === "submitted") {
    detailEn += ", status Submitted";
    detailCn += "，状态已提交";
  }
  return { field: "lines", to: detailEn, toCn: detailCn };
}

export function projectCreateChanges(header: ProjectRemarkHeader, lines: ProjectRemarkLine[]): RemarkChange[] {
  return [
    { field: "name", to: header.projectDepartment, toCn: header.projectDepartment },
    targetDetail(header, lines, true),
  ];
}

export function projectDeleteChanges(header: ProjectRemarkHeader, lines: ProjectRemarkLine[]): RemarkChange[] {
  return [
    { field: "name", to: header.projectDepartment, toCn: header.projectDepartment },
    targetDetail(header, lines, false),
  ];
}

export function projectUpdateChanges(
  before: ProjectRemarkSnapshot,
  after: ProjectRemarkSnapshot
): RemarkChange[] {
  const changes: RemarkChange[] = [
    { field: "name", to: after.header.projectDepartment, toCn: after.header.projectDepartment },
  ];
  const projectName = fromTo(
    "project_name",
    clean(before.header.projectDepartment),
    clean(after.header.projectDepartment)
  );
  if (projectName) changes.push(projectName);
  const reporter = fromTo("reporter", clean(before.header.reporterName), clean(after.header.reporterName));
  if (reporter) changes.push(reporter);
  const reportDate = fromTo("report_date", clean(before.header.reportDate), clean(after.header.reportDate));
  if (reportDate) changes.push(reportDate);
  const cycle = fromTo("cycle", clean(before.header.cycleLabel), clean(after.header.cycleLabel));
  if (cycle) changes.push(cycle);
  if (before.header.year !== after.header.year) {
    changes.push({
      field: "year",
      from: String(before.header.year),
      to: String(after.header.year),
      fromCn: String(before.header.year),
      toCn: String(after.header.year),
    });
  }
  if (before.header.weekNumber !== after.header.weekNumber) {
    changes.push({
      field: "week",
      from: String(before.header.weekNumber),
      to: String(after.header.weekNumber),
      fromCn: String(before.header.weekNumber),
      toCn: String(after.header.weekNumber),
    });
  }
  const status = fromTo(
    "status",
    named(before.header.status, REPORT_STATUS, "en"),
    named(after.header.status, REPORT_STATUS, "en"),
    named(before.header.status, REPORT_STATUS, "cn"),
    named(after.header.status, REPORT_STATUS, "cn")
  );
  if (status) changes.push(status);
  const lines = projectLinePhrase(before.lines, after.lines);
  if (lines) changes.push(lines);
  return changes;
}

type NameRow = { name_en: string | null; name_cn: string | null };

async function loadName(sql: string, id: number): Promise<BilingualName | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const { query } = await import("@/lib/db");
  const rows = await query<NameRow[]>(sql, [id]);
  return rows[0] ?? null;
}

export function loadReportAreaNames(id: number): Promise<BilingualName | null> {
  return loadName("SELECT name_en, name_cn FROM report_areas WHERE id = ? LIMIT 1", id);
}

export function loadSubItemNames(id: number): Promise<BilingualName | null> {
  return loadName("SELECT name_en, name_cn FROM report_sub_items WHERE id = ? LIMIT 1", id);
}

type WeekRow = { id: number; year: number; week_number: number };

function mapWeek(row: WeekRow | undefined): { id: number; year: number; weekNumber: number } | null {
  if (!row) return null;
  return { id: Number(row.id), year: Number(row.year), weekNumber: Number(row.week_number) };
}

export async function loadReportWeekByNumber(
  year: number,
  weekNumber: number
): Promise<{ id: number; year: number; weekNumber: number } | null> {
  const { query } = await import("@/lib/db");
  const rows = await query<WeekRow[]>(
    "SELECT id, year, week_number FROM report_weeks WHERE year = ? AND week_number = ? LIMIT 1",
    [year, weekNumber]
  );
  return mapWeek(rows[0]);
}

export async function loadReportWeekById(
  weekId: number
): Promise<{ id: number; year: number; weekNumber: number } | null> {
  if (!Number.isInteger(weekId) || weekId <= 0) return null;
  const { query } = await import("@/lib/db");
  const rows = await query<WeekRow[]>(
    "SELECT id, year, week_number FROM report_weeks WHERE id = ? LIMIT 1",
    [weekId]
  );
  return mapWeek(rows[0]);
}

export async function loadWeekArea(
  weekId: number,
  areaId: number
): Promise<{ weekNumber: number; area: BilingualName } | null> {
  if (!Number.isInteger(weekId) || weekId <= 0 || !Number.isInteger(areaId) || areaId <= 0) return null;
  const { query } = await import("@/lib/db");
  const rows = await query<(NameRow & { week_number: number })[]>(
    `SELECT rw.week_number, ra.name_en, ra.name_cn
     FROM report_weeks rw
     JOIN report_areas ra ON ra.id = ?
     WHERE rw.id = ?
     LIMIT 1`,
    [areaId, weekId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    weekNumber: Number(row.week_number),
    area: { name_en: row.name_en, name_cn: row.name_cn },
  };
}

export async function recordReportWeek(input: {
  action: string;
  weekNumber: number;
  area: BilingualName | null;
  detail?: RemarkChange | null;
}): Promise<void> {
  await recordLogsCenter({
    module: "report",
    action: input.action,
    objectType: "week",
    objectRef: String(input.weekNumber),
    changes: [
      {
        field: "name",
        to: input.area?.name_en ?? null,
        toCn: input.area?.name_cn ?? input.area?.name_en ?? null,
      },
      ...(input.detail ? [input.detail] : []),
    ],
  });
}

export async function recordReportAttachment(input: {
  action: "create" | "delete";
  fileName: string;
  parent:
    | { type: "week"; weekNumber: number; area: BilingualName | null }
    | { type: "project"; name: string };
}): Promise<void> {
  const link =
    input.parent.type === "week"
      ? {
          type: "week",
          ref: String(input.parent.weekNumber),
          detailEn: input.parent.area?.name_en ?? null,
          detailCn: input.parent.area?.name_cn ?? input.parent.area?.name_en ?? null,
        }
      : { type: "project", ref: input.parent.name };
  await recordLogsCenter({
    module: "report",
    action: input.action,
    objectType: "attachment",
    objectRef: input.fileName,
    links: [link],
  });
}

export async function recordReportProject(
  action: "create" | "update" | "delete",
  changes: RemarkChange[]
): Promise<void> {
  await recordLogsCenter({
    module: "report",
    action,
    objectType: "project",
    changes,
  });
}

export async function recordReportSubItem(name: BilingualName, area: BilingualName | null): Promise<void> {
  const areaName = clean(area?.name_en) || clean(area?.name_cn);
  await recordLogsCenter({
    module: "report",
    action: "create",
    objectType: "sub-item",
    changes: [
      identityChange(name),
      ...(areaName
        ? [
            {
              field: "area",
              to: clean(area?.name_en) || clean(area?.name_cn),
              toCn: clean(area?.name_cn) || clean(area?.name_en),
            },
          ]
        : []),
    ],
  });
}
