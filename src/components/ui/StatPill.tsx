import type { StatItem } from "@/data/overview";

const toneClass: Record<NonNullable<StatItem["tone"]>, string> = {
  default: "text-text",
  success: "text-success",
  warning: "text-warning",
  accent: "text-accent",
};

type StatPillProps = {
  stat: StatItem;
  /** `open` = large KPI without a pill box (Training / wide cards). */
  variant?: "pill" | "open";
};

export function StatPill({ stat, variant = "pill" }: StatPillProps) {
  if (variant === "open") {
    return (
      <div className="min-w-0 px-0.5 py-1">
        <p
          className="truncate text-[10px] font-medium uppercase tracking-wide text-text-dim"
          title={stat.label}
        >
          {stat.label}
        </p>
        <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-text" title={stat.value}>
          {stat.value}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-bg/40 px-3 py-2">
      <p
        className="truncate text-[8px] font-semibold uppercase tracking-wide text-text-dim"
        title={stat.label}
      >
        {stat.label}
      </p>
      <div className="mt-1 flex min-w-0 items-baseline gap-2">
        <p
          className={`truncate text-lg font-semibold ${toneClass[stat.tone ?? "default"]}`}
          title={stat.value}
        >
          {stat.value}
        </p>
        {stat.trend ? (
          <span
            className={`shrink-0 truncate text-[11px] ${
              stat.tone === "warning"
                ? "text-warning"
                : stat.tone === "accent"
                  ? "text-accent"
                  : "text-success"
            }`}
            title={stat.trend}
          >
            {stat.trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}
