"use client";

export function ScoreCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        highlight ? "border-cyan-400/30 bg-cyan-500/5" : "border-border-subtle bg-bg/30",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>

        <span
          className={[
            "text-2xl font-semibold",
            value >= 90 ? "text-success" : value >= 70 ? "text-warning" : "text-danger",
          ].join(" ")}
        >
          {value}
        </span>
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-wide text-text-dim">{title}</p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={[
            "h-full rounded-full",
            value >= 90 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-rose-500",
          ].join(" ")}
          style={{
            width: `${Math.min(value, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
