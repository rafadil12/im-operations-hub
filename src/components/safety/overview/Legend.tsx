"use client";

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} />

      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  );
}

export function LegendStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger";
}) {
  const classes = {
    success: "bg-emerald-500/12 text-emerald-400",
    warning: "bg-amber-500/12 text-amber-400",
    danger: "bg-rose-500/12 text-rose-400",
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-bg/30 p-3 text-center">
      <p className={`text-lg font-semibold ${classes[tone].split(" ")[1]}`}>{value}</p>

      <p className="mt-1 text-[9px] text-text-dim">{label}</p>
    </div>
  );
}
