import type { StatItem } from "@/data/overview-mock";

const toneClass: Record<NonNullable<StatItem["tone"]>, string> = {
  default: "text-text",
  success: "text-success",
  warning: "text-warning",
  accent: "text-accent",
};

type StatPillProps = {
  stat: StatItem;
};

export function StatPill({ stat }: StatPillProps) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{stat.label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={`text-lg font-semibold ${toneClass[stat.tone ?? "default"]}`}>
          {stat.value}
        </p>
        {stat.trend ? (
          <span
            className={`text-[11px] ${
              stat.tone === "warning"
                ? "text-warning"
                : stat.tone === "accent"
                  ? "text-accent"
                  : "text-success"
            }`}
          >
            {stat.trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}
