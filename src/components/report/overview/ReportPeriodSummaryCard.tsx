"use client";

import { ProgressRingItem } from "@/components/overview/ModuleCardShared";
import { reportText, type ReportLanguage } from "@/lib/report";
import type { ReportPeriodStatus } from "@/lib/report/types";

function StatusBadge({
  status,
  language,
}: {
  status: ReportPeriodStatus;
  language: ReportLanguage;
}) {
  const label =
    status === "on_target"
      ? reportText("onTarget", language)
      : status === "above_target"
        ? reportText("aboveTarget", language)
        : reportText("belowTarget", language);

  const classes =
    status === "below_target"
      ? "border-rose-400/30 bg-rose-500/12 text-rose-300"
      : status === "above_target"
        ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-300"
        : "border-amber-400/30 bg-amber-500/12 text-amber-300";

  return (
    <span className={`rounded-md border px-3 py-1.5 text-xs font-medium ${classes}`}>{label}</span>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

type ByAreaRing = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  subtitle: string;
  status: ReportPeriodStatus;
  achievement: number;
  submittedCount: number;
  draftCount: number;
  areaCount: number;
  totalLines: number;
  byArea: ByAreaRing[];
  language: ReportLanguage;
  compact?: boolean;
  className?: string;
};

export function ReportPeriodSummaryCard({
  title,
  subtitle,
  status,
  achievement,
  submittedCount,
  draftCount,
  areaCount,
  totalLines,
  byArea,
  language,
  compact = false,
  className,
}: Props) {
  const submittedDenominator = submittedCount + draftCount || areaCount;

  return (
    <section
      className={[
        compact
          ? "rounded-lg border border-border-subtle bg-bg/30 p-3"
          : "rounded-xl border border-border-subtle bg-surface p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`flex items-start justify-between gap-3 ${compact ? "mb-3" : "mb-4"}`}>
        <div>
          <h2
            className={
              compact ? "text-xs font-bold" : "text-sm font-bold text-text"
            }
          >
            {title}
          </h2>
          <p className="mt-1 text-[10px] text-text-dim">{subtitle}</p>
        </div>
        <StatusBadge status={status} language={language} />
      </div>

      <div className="space-y-3">
        <StatRow label={reportText("achievement", language)} value={`${achievement}%`} />
        <StatRow
          label={reportText("submittedAreas", language)}
          value={`${submittedCount} / ${submittedDenominator}`}
        />
        <StatRow label={reportText("reportLinesKpi", language)} value={totalLines} />
      </div>

      {byArea.length > 0 ? (
        <div className={`border-t border-border-subtle pt-4 ${compact ? "mt-4" : "mt-5"}`}>
          <h3 className="mb-3 text-xs font-medium text-text-muted">
            {reportText("byArea", language)}
          </h3>
          <div className="flex flex-wrap items-center justify-around gap-3">
            {byArea.map((area) => (
              <ProgressRingItem
                key={area.label}
                ring={{
                  label: area.label,
                  value: area.value,
                  color: area.color,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
