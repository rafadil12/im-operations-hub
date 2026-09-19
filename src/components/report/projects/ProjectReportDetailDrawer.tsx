"use client";

import { Drawer } from "@/components/ui/Drawer";
import {
  formatRatePercent,
  HEALTH_BADGE_CLASS,
  HEALTH_DOT_CLASS,
  healthLabel,
  lineStatusLabel,
  projectText,
  worstHealthFromCounts,
  type ReportProjectAttachment,
  type ReportProjectReport,
} from "@/lib/report";
import type { Lang } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDisplayDate(iso: string | null, lang: Lang): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "cn" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ProjectReportDetailDrawerProps = {
  lang: Lang;
  report: ReportProjectReport;
  attachments: ReportProjectAttachment[];
  onClose: () => void;
};

export function ProjectReportDetailDrawer({
  lang,
  report,
  attachments,
  onClose,
}: ProjectReportDetailDrawerProps) {
  const copy = projectText(lang);
  const worst =
    worstHealthFromCounts(report.healthCounts) ??
    report.lines[0]?.health ??
    null;

  return (
    <Drawer
      width="detail"
      title={copy.viewTitle}
      subtitle={`${copy.weekShort(report.weekNumber)} · ${formatDisplayDate(report.reportDate, lang)}`}
      onClose={onClose}
      footer={
        <div className="w-full text-[11px] text-text-dim">
          {copy.updatedBy} {report.reporterName}
          {report.updatedAt ? ` · ${formatDateTime(report.updatedAt, lang)}` : ""}
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="text-base font-semibold text-text">{report.projectDepartment}</h2>
            {worst ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${HEALTH_BADGE_CLASS[worst]}`}
              >
                <span className={`size-1.5 rounded-full ${HEALTH_DOT_CLASS[worst]}`} />
                {healthLabel(worst, lang)}
              </span>
            ) : null}
            {report.status === "draft" ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
                {copy.statusDraft}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {copy.reporter}: {report.reporterName}
          </p>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {copy.reportInformation}
          </h3>
          <dl className="space-y-2 rounded-lg border border-border-subtle bg-bg/30 p-3 text-xs">
            <InfoRow label={copy.year} value={String(report.year)} />
            <InfoRow label={copy.week} value={copy.weekLabel(report.weekNumber)} />
            <InfoRow
              label={copy.reportDate}
              value={formatDisplayDate(report.reportDate, lang)}
            />
            <InfoRow label={copy.projectDepartment} value={report.projectDepartment} />
            <InfoRow label={copy.reporter} value={report.reporterName} />
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {copy.projectTargets}
          </h3>
          {report.lines.length === 0 ? (
            <p className="text-xs text-text-dim">—</p>
          ) : (
            <ol className="space-y-3">
              {report.lines.map((line, i) => (
                <li
                  key={line.id ?? i}
                  className="rounded-lg border border-border-subtle bg-bg/30 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-xs font-medium text-text">{line.target}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`size-1.5 rounded-full ${HEALTH_DOT_CLASS[line.health]}`}
                          />
                          {healthLabel(line.health, lang)}
                        </span>
                        <span>·</span>
                        <span>{lineStatusLabel(line.lineStatus, lang)}</span>
                        {line.progressRatio != null ? (
                          <>
                            <span>·</span>
                            <span>{formatRatePercent(line.progressRatio)}</span>
                          </>
                        ) : null}
                      </div>
                      {line.pic ? (
                        <p className="text-[11px] text-text-dim">
                          {copy.pic}: {line.pic}
                        </p>
                      ) : null}
                      {line.planStart || line.planEnd ? (
                        <p className="text-[11px] text-text-dim">
                          {line.planStart ?? "—"} → {line.planEnd ?? "—"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {copy.weeklyUpdate}
          </h3>
          <div className="space-y-3">
            {report.lines.map((line, i) => (
              <div
                key={`weekly-${line.id ?? i}`}
                className="rounded-lg border border-border-subtle bg-bg/30 p-3 space-y-2"
              >
                {report.lines.length > 1 ? (
                  <p className="text-[11px] font-medium text-text-muted">
                    {copy.target} {i + 1}
                  </p>
                ) : null}
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-text-dim">
                    {copy.thisWeekProgress}
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-text">
                    {line.thisWeekProgress.trim() || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-text-dim">
                    {copy.nextWeekPlan}
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-text">
                    {line.nextWeekPlan.trim() || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {copy.attachments}
          </h3>
          {attachments.length === 0 ? (
            <p className="text-xs text-text-dim">{copy.noAttachments}</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs font-medium text-accent hover:underline"
                    >
                      {att.originalName}
                    </a>
                    {att.size != null ? (
                      <p className="mt-0.5 text-[10px] text-text-dim">
                        {formatSize(att.size)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-text-dim">{label}</dt>
      <dd className="min-w-0 text-right text-text">{value}</dd>
    </div>
  );
}
