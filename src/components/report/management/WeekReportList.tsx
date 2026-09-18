"use client";

import { reportText, type ReportLanguage, type WeekReportUiStatus } from "@/lib/report";
import type { AreaWeekReportRow } from "@/lib/report/weekReportIdentity";

const reportTh =
  "sticky top-0 z-20 border-b border-border bg-surface px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-dim shadow-[0_2px_6px_-2px_var(--shadow-color-soft)]";
const reportTd = "border-b border-border-subtle px-3 py-3 align-middle text-sm";
const stickyTh =
  "sticky top-0 right-0 z-30 min-w-[8.5rem] border-b border-border bg-surface px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text-dim shadow-[-8px_0_12px_-8px_var(--shadow-color-soft),0_2px_6px_-2px_var(--shadow-color-soft)]";
const stickyTd =
  "sticky right-0 z-10 min-w-[8.5rem] border-b border-border-subtle bg-surface px-3 py-3 align-middle text-center text-sm shadow-[-8px_0_12px_-8px_var(--shadow-color-soft)]";

type WeekReportListProps = {
  language: ReportLanguage;
  lang: "en" | "cn";
  title: string;
  rows: AreaWeekReportRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canReopen: boolean;
  submitting: boolean;
  onAdd: (weekNumber: number) => void;
  onEdit: (weekNumber: number) => void;
  onView: (weekNumber: number) => void;
  onDelete: (row: AreaWeekReportRow) => void;
  onSubmit: (weekNumber: number) => void;
  onReopen: (weekNumber: number) => void;
};

function statusClass(status: WeekReportUiStatus): string {
  if (status === "submitted") return "bg-success/10 text-success";
  if (status === "draft") return "bg-warning/10 text-warning";
  return "bg-border-subtle text-text-muted";
}

function statusLabel(status: WeekReportUiStatus, language: ReportLanguage): string {
  if (status === "submitted") return reportText("submitted", language);
  if (status === "draft") return reportText("draft", language);
  return reportText("noReport", language);
}

function actionBtn(tone: "accent" | "danger" | "success" | "warning"): string {
  const colors = {
    accent: "border-accent text-accent hover:bg-accent/10",
    danger: "border-danger text-danger hover:bg-danger/10",
    success: "border-success text-success hover:bg-success/10",
    warning: "border-warning text-warning hover:bg-warning/10",
  };
  return `cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium ${colors[tone]} disabled:cursor-not-allowed disabled:opacity-50`;
}

function formatRange(startsOn: string, endsOn: string, lang: "en" | "cn"): string {
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parse = (iso: string) => {
    const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
    return { year, month, day };
  };
  const start = parse(startsOn);
  const end = parse(endsOn);
  if (lang === "cn") {
    return `${start.year}年${start.month}月${start.day}日 – ${end.year}年${end.month}月${end.day}日`;
  }
  return `${monthsEn[start.month - 1]} ${start.day} – ${monthsEn[end.month - 1]} ${end.day}, ${end.year}`;
}

function ActorCell({
  at,
  by,
  status,
}: {
  at: string | null;
  by: string | null;
  status: WeekReportUiStatus;
}) {
  if (status === "none" || (!at && !by)) {
    return <span className="text-text-dim">—</span>;
  }
  const stamp = at ? at.replace("T", " ").replace("Z", "").slice(0, 16) : "";
  return (
    <div className="min-w-0 text-left">
      {by ? <div className="truncate font-medium text-text">{by}</div> : null}
      {stamp ? <div className="truncate text-[11px] text-text-dim">{stamp}</div> : null}
    </div>
  );
}

function lineCountLabel(count: number, language: ReportLanguage): string {
  if (count === 1) return reportText("lineCountOne", language);
  return reportText("linesCount", language).replace("{n}", String(count));
}

export function WeekReportList({
  language,
  lang,
  title,
  rows,
  canCreate,
  canUpdate,
  canDelete,
  canSubmit,
  canReopen,
  submitting,
  onAdd,
  onEdit,
  onView,
  onDelete,
  onSubmit,
  onReopen,
}: WeekReportListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <div className="flex flex-col gap-2 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-0 text-sm font-semibold text-text">{title}</h2>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {(["submitted", "draft", "none"] as WeekReportUiStatus[]).map((status) => (
            <span
              key={status}
              className={`rounded-md px-2 py-0.5 font-medium ${statusClass(status)}`}
            >
              {statusLabel(status, language)}
            </span>
          ))}
        </div>
      </div>

      <div className="max-h-[calc(100dvh-18rem)] overflow-auto sm:max-h-[calc(100dvh-15rem)]">
        <table className="w-full min-w-[640px] border-collapse text-sm lg:min-w-0">
          <thead>
            <tr>
              <th className={`${reportTh} w-[5.5rem]`}>{reportText("week", language)}</th>
              <th className={reportTh}>{reportText("dateRange", language)}</th>
              <th className={`${reportTh} w-[7rem]`}>{reportText("status", language)}</th>
              <th className={`${reportTh} hidden w-[7rem] sm:table-cell`}>
                {reportText("subItemCount", language)}
              </th>
              <th className={`${reportTh} hidden min-w-[9rem] md:table-cell`}>
                {reportText("createdBy", language)}
              </th>
              <th className={`${reportTh} hidden min-w-[9rem] md:table-cell`}>
                {reportText("updatedBy", language)}
              </th>
              <th className={stickyTh}>{reportText("actions", language)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={`${reportTd} py-14 text-center text-text-muted`}>
                  {reportText("noLines", language)}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const range = formatRange(row.startsOn, row.endsOn, lang);
                return (
                  <tr
                    key={`${row.year}-${row.weekNumber}`}
                    className="align-middle transition-colors hover:bg-surface-hover/40"
                  >
                    <td className={reportTd}>
                      <div className="font-semibold text-text">Week {row.weekNumber}</div>
                    </td>
                    <td className={`${reportTd} text-text-muted`}>
                      <span className="whitespace-nowrap">{range}</span>
                    </td>
                    <td className={reportTd}>
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${statusClass(row.status)}`}
                      >
                        {statusLabel(row.status, language)}
                      </span>
                    </td>
                    <td className={`${reportTd} hidden text-text-muted sm:table-cell`}>
                      {lineCountLabel(row.lineCount, language)}
                    </td>
                    <td className={`${reportTd} hidden md:table-cell`}>
                      <ActorCell
                        at={row.createdAt}
                        by={row.createdByLabel}
                        status={row.status}
                      />
                    </td>
                    <td className={`${reportTd} hidden md:table-cell`}>
                      <ActorCell
                        at={row.updatedAt}
                        by={row.updatedByLabel}
                        status={row.status}
                      />
                    </td>
                    <td className={stickyTd}>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {row.status === "none" && canCreate ? (
                          <button
                            type="button"
                            onClick={() => onAdd(row.weekNumber)}
                            className={actionBtn("accent")}
                          >
                            + {reportText("addReport", language)}
                          </button>
                        ) : null}
                        {row.status === "draft" && (canUpdate || canCreate) ? (
                          <button
                            type="button"
                            onClick={() => onEdit(row.weekNumber)}
                            className={actionBtn("accent")}
                          >
                            {reportText("edit", language)}
                          </button>
                        ) : null}
                        {row.status === "draft" && !canUpdate && !canCreate ? (
                          <button
                            type="button"
                            onClick={() => onView(row.weekNumber)}
                            className={actionBtn("accent")}
                          >
                            {reportText("view", language)}
                          </button>
                        ) : null}
                        {row.status === "draft" && canDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className={actionBtn("danger")}
                          >
                            {reportText("delete", language)}
                          </button>
                        ) : null}
                        {row.status === "draft" && canSubmit ? (
                          <button
                            type="button"
                            onClick={() => onSubmit(row.weekNumber)}
                            disabled={submitting || row.lineCount === 0}
                            className={actionBtn("success")}
                          >
                            {reportText("submit", language)}
                          </button>
                        ) : null}
                        {row.status === "submitted" ? (
                          <button
                            type="button"
                            onClick={() => onView(row.weekNumber)}
                            className={actionBtn("accent")}
                          >
                            {reportText("view", language)}
                          </button>
                        ) : null}
                        {row.status === "submitted" && canReopen ? (
                          <button
                            type="button"
                            onClick={() => onReopen(row.weekNumber)}
                            disabled={submitting}
                            className={actionBtn("warning")}
                          >
                            {reportText("reopen", language)}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
