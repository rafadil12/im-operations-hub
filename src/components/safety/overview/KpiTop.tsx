"use client";

export function KpiTop({
  title,
  icon,
  tone,
}: {
  title: string;
  icon: string;
  tone: "accent" | "success" | "warning";
}) {
  const classes = {
    accent: "bg-cyan-500/10",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{title}</p>

      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${classes[tone]}`}
      >
        {icon}
      </div>
    </div>
  );
}
