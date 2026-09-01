"use client";

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  tone: "accent" | "success" | "warning" | "danger";
}) {
  const iconClass = {
    accent: "bg-cyan-500/10",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    danger: "bg-rose-500/10",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${iconClass[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold text-text">{value}</p>

      <p className="mt-1 text-[11px] text-text-muted">{subtitle}</p>
    </div>
  );
}
