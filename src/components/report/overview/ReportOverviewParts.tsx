"use client";

import type { ReportKpiSnapshot } from "@/lib/report/types";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  if (delta === 0) {
    return <span className="text-[11px] text-text-dim">— 0%</span>;
  }
  const positive = delta > 0;
  return (
    <span className={`text-[11px] font-medium ${positive ? "text-success" : "text-danger"}`}>
      {positive ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
}

export function ReportOverviewKpiCard({
  title,
  snapshot,
  suffix = "%",
  tone = "accent",
  subtitle,
}: {
  title: string;
  snapshot: ReportKpiSnapshot | { value: number; previousValue: number | null; delta: number | null };
  suffix?: string;
  tone?: "accent" | "success" | "warning" | "default";
  subtitle?: string;
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "default"
          ? "text-text"
          : "text-accent";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>
      <p className={`mt-3 text-2xl font-semibold ${valueClass}`}>
        {snapshot.value}
        {suffix}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <DeltaBadge delta={snapshot.delta} />
        {subtitle ? <span className="text-[10px] text-text-dim">{subtitle}</span> : null}
      </div>
    </div>
  );
}

export function DivisionRateBar({
  label,
  value,
  color,
  index,
}: {
  label: string;
  value: number;
  color: string;
  index: number;
}) {
  const barColor = value >= 90 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-text">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-text">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            backgroundColor: color || barColor,
            animationDelay: `${index * 0.08}s`,
          }}
        />
      </div>
    </div>
  );
}
