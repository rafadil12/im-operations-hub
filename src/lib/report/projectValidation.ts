import { parseCompletionRate } from "./weekCalendar";
import type {
  ReportProjectHealth,
  ReportProjectLine,
  ReportProjectLineRow,
  ReportProjectLineStatus,
  ReportProjectPayload,
  ReportProjectReport,
  ReportProjectReportRow,
} from "./projectTypes";

const HEALTH: ReportProjectHealth[] = ["healthy", "mild", "serious"];
const LINE_STATUS: ReportProjectLineStatus[] = ["in_progress", "completed"];

export function isReportProjectHealth(value: unknown): value is ReportProjectHealth {
  return typeof value === "string" && (HEALTH as string[]).includes(value);
}

export function isReportProjectLineStatus(value: unknown): value is ReportProjectLineStatus {
  return typeof value === "string" && (LINE_STATUS as string[]).includes(value);
}

function dateOnly(raw: string | Date | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function isValidDateOnly(raw: string | null | undefined): boolean {
  if (!raw) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

export function mapProjectLineRow(row: ReportProjectLineRow): ReportProjectLine {
  return {
    id: Number(row.id),
    sortOrder: Number(row.sort_order ?? 0),
    target: row.target ?? "",
    mainTask: row.main_task ?? "",
    currentPriority: row.current_priority ?? "",
    planStart: dateOnly(row.plan_start),
    planEnd: dateOnly(row.plan_end),
    health: isReportProjectHealth(row.health) ? row.health : "healthy",
    lineStatus: isReportProjectLineStatus(row.line_status) ? row.line_status : "in_progress",
    progressRatio: parseCompletionRate(row.progress_ratio),
    pic: row.pic ?? "",
    thisWeekProgress: row.this_week_progress ?? "",
    nextWeekPlan: row.next_week_plan ?? "",
  };
}

export function mapProjectReportRow(
  row: ReportProjectReportRow,
  lines: ReportProjectLine[] = []
): ReportProjectReport {
  return {
    id: Number(row.id),
    reportDate: dateOnly(row.report_date) ?? String(row.report_date).slice(0, 10),
    projectDepartment: row.project_department ?? "",
    reporterName: row.reporter_name ?? "",
    cycleLabel: row.cycle_label ?? "",
    year: Number(row.year),
    weekNumber: Number(row.week_number),
    lineCount: Number(row.line_count ?? lines.length),
    healthCounts: {
      healthy: Number(row.healthy_count ?? 0),
      mild: Number(row.mild_count ?? 0),
      serious: Number(row.serious_count ?? 0),
    },
    lines,
    createdAt: row.created_at != null ? String(row.created_at) : null,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
  };
}

export function emptyProjectLine(sortOrder = 0): ReportProjectLine {
  return {
    id: null,
    sortOrder,
    target: "",
    mainTask: "",
    currentPriority: "",
    planStart: null,
    planEnd: null,
    health: "healthy",
    lineStatus: "in_progress",
    progressRatio: null,
    pic: "",
    thisWeekProgress: "",
    nextWeekPlan: "",
  };
}

export type ParsedProjectPayload =
  | { ok: true; data: ReportProjectPayload }
  | { ok: false; error: string };

export function parseProjectPayload(body: unknown): ParsedProjectPayload {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body." };
  }
  const raw = body as Record<string, unknown>;
  const reportDate = String(raw.reportDate ?? "").trim();
  const projectDepartment = String(raw.projectDepartment ?? "").trim();
  const reporterName = String(raw.reporterName ?? "").trim();
  const cycleLabel = String(raw.cycleLabel ?? "").trim();
  const year = Number(raw.year);
  const weekNumber = Number(raw.weekNumber);

  if (!isValidDateOnly(reportDate) || !projectDepartment || !reporterName) {
    return { ok: false, error: "Report date, project/department, and reporter are required." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, error: "Invalid year." };
  }
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    return { ok: false, error: "Invalid week." };
  }
  if (!cycleLabel) {
    return { ok: false, error: "Cycle is required." };
  }

  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  if (linesRaw.length === 0) {
    return { ok: false, error: "At least one target row is required." };
  }

  const lines: ReportProjectPayload["lines"] = [];
  for (const item of linesRaw) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Invalid line." };
    }
    const line = item as Record<string, unknown>;
    const target = String(line.target ?? "").trim();
    if (!target) {
      return { ok: false, error: "Each row needs a target." };
    }
    const health = line.health;
    const lineStatus = line.lineStatus;
    if (!isReportProjectHealth(health) || !isReportProjectLineStatus(lineStatus)) {
      return { ok: false, error: "Invalid health or status." };
    }
    const planStartRaw = line.planStart == null || line.planStart === "" ? null : String(line.planStart).trim();
    const planEndRaw = line.planEnd == null || line.planEnd === "" ? null : String(line.planEnd).trim();
    if (planStartRaw && !isValidDateOnly(planStartRaw)) {
      return { ok: false, error: "Invalid plan start date." };
    }
    if (planEndRaw && !isValidDateOnly(planEndRaw)) {
      return { ok: false, error: "Invalid plan end date." };
    }
    let progressRatio: number | null = null;
    if (line.progressRatio !== null && line.progressRatio !== undefined && line.progressRatio !== "") {
      progressRatio = parseCompletionRate(line.progressRatio);
      if (progressRatio == null) {
        return { ok: false, error: "Progress must be between 0 and 1." };
      }
    }

    lines.push({
      target,
      mainTask: String(line.mainTask ?? "").trim() || null,
      currentPriority: String(line.currentPriority ?? "").trim() || null,
      planStart: planStartRaw,
      planEnd: planEndRaw,
      health,
      lineStatus,
      progressRatio,
      pic: String(line.pic ?? "").trim() || null,
      thisWeekProgress: String(line.thisWeekProgress ?? "").trim() || null,
      nextWeekPlan: String(line.nextWeekPlan ?? "").trim() || null,
    });
  }

  return {
    ok: true,
    data: {
      reportDate,
      projectDepartment,
      reporterName,
      cycleLabel,
      year,
      weekNumber,
      lines,
    },
  };
}
