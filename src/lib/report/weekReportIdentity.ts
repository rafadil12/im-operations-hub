import { weekDateRange } from "./weekCalendar";
import type { ReportLine } from "./types";

export type WeekReportUiStatus = "none" | "draft" | "submitted";

export const WEEK_REPORT_ALREADY_EXISTS =
  "A weekly report already exists for this year, area, and week.";

export type AreaWeekReportRow = {
  year: number;
  weekNumber: number;
  startsOn: string;
  endsOn: string;
  status: WeekReportUiStatus;
  lineCount: number;
  weekId: number | null;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
  lines: ReportLine[];
};

export function createModeConflictMessage(existingLineCount: number): string | null {
  if (existingLineCount > 0) return WEEK_REPORT_ALREADY_EXISTS;
  return null;
}

export function weekReportStatusFromLines(lines: ReportLine[]): WeekReportUiStatus {
  if (!lines.length) return "none";
  if (lines.some((line) => line.submissionStatus === "submitted")) return "submitted";
  return "draft";
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  const dates = values
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => Number.isFinite(value)) as number[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates)).toISOString();
}

export function buildAreaWeekReportRows(args: {
  year: number;
  weekNumbers: number[];
  lines: ReportLine[];
}): AreaWeekReportRow[] {
  const linesByWeek = new Map<number, ReportLine[]>();
  for (const line of args.lines) {
    if (line.weekNumber == null) continue;
    const group = linesByWeek.get(line.weekNumber) ?? [];
    group.push(line);
    linesByWeek.set(line.weekNumber, group);
  }

  return args.weekNumbers.map((weekNumber) => {
    const lines = (linesByWeek.get(weekNumber) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const range = weekDateRange(args.year, weekNumber);
    const status = weekReportStatusFromLines(lines);
    return {
      year: args.year,
      weekNumber,
      startsOn: range.startsOn,
      endsOn: range.endsOn,
      status,
      lineCount: lines.length,
      weekId: lines[0]?.weekId ?? null,
      lastUpdatedAt: latestTimestamp([
        ...lines.map((line) => line.updatedAt),
        ...lines.map((line) => line.submittedAt),
      ]),
      lastUpdatedBy: lines.find((line) => line.submittedByLabel)?.submittedByLabel ?? null,
      lines,
    };
  });
}
