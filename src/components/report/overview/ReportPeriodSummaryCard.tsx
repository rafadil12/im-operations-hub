"use client";

import { ProgressRingItem } from "@/components/overview/ModuleCardShared";
import { reportText, type ReportLanguage } from "@/lib/report";
import type { ReportPeriodStatus } from "@/lib/report/types";

function StatusBadge({
  status,
  language,
  compact,
}: {
  status: ReportPeriodStatus;
  language: ReportLanguage;
  compact?: boolean;
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
    <span
      className={[
        "rounded-md border font-medium",
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs",
        classes,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function StatRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3",
        compact ? "text-[11px]" : "text-sm",
      ].join(" ")}
    >
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

type ByAreaRing = {
  label: string;
  value: number;
  color: string;
  code?: string;
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
  /** Stretch card and spread metric rows so leftover height is not empty below By category. */
  fillHeight?: boolean;
  className?: string;
};

export function ReportPeriodSummaryCard({
  title,
  subtitle,
  status,
  achievement,
  submittedCount,
  areaCount,
  totalLines,
  byArea,
  language,
  compact = false,
  fillHeight = false,
  className,
}: Props) {
  return (
    <section
      className={[
        compact
          ? "rounded-lg border border-border-subtle bg-bg/30 p-2.5"
          : "rounded-xl border border-border-subtle bg-surface p-4",
        fillHeight ? "flex h-full min-h-0 flex-col" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-2 ${compact ? "mb-2" : "mb-4"}`}
      >
        <div className="min-w-0">
          <h2
            className={
              compact ? "text-[11px] font-bold text-text" : "text-sm font-bold text-text"
            }
          >
            {title}
          </h2>
          <p className={`text-text-dim ${compact ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]"}`}>
            {subtitle}
          </p>
        </div>
        <StatusBadge status={status} language={language} compact={compact} />
      </div>

      <div
        className={[
          fillHeight
            ? "flex min-h-0 flex-1 flex-col justify-evenly"
            : compact
              ? "space-y-1.5"
              : "space-y-3",
        ].join(" ")}
      >
        <StatRow
          compact={compact}
          label={reportText("achievement", language)}
          value={`${achievement}%`}
        />
        <StatRow
          compact={compact}
          label={reportText("submittedAreas", language)}
          value={`${submittedCount} / ${areaCount}`}
        />
        <StatRow
          compact={compact}
          label={reportText("reportLinesKpi", language)}
          value={totalLines}
        />
      </div>

      {byArea.length > 0 ? (
        <div
          className={[
            "shrink-0 border-t border-border-subtle",
            compact ? "mt-2.5 pt-2.5" : "mt-5 pt-4",
          ].join(" ")}
        >
          <h3
            className={`font-medium text-text-muted ${compact ? "mb-2 text-[10px]" : "mb-3 text-xs"}`}
          >
            {reportText("byArea", language)}
          </h3>
          <div
            className={[
              "flex flex-wrap items-center justify-around",
              compact ? "gap-2" : "gap-3",
            ].join(" ")}
          >
            {byArea.map((area) => (
              <ProgressRingItem
                key={area.code ?? area.label}
                size={compact ? "sm" : "md"}
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
