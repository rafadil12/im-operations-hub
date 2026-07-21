import type { ModuleCardData } from "@/data/overview-mock";
import { StatPill } from "@/components/ui/StatPill";
import {
  BarChartPlaceholder,
  DonutChartPlaceholder,
  TrendChartPlaceholder,
} from "@/components/ui/ChartPlaceholder";

type ModuleCardProps = {
  data: ModuleCardData;
  expanded?: boolean;
  onOpen?: () => void;
};

function CardIcon({ type, color }: { type: ModuleCardData["icon"]; color: string }) {
  if (type === "calendar") {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-md text-sm"
        style={{ backgroundColor: `${color}22`, color }}
        aria-hidden
      >
        ▣
      </span>
    );
  }

  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-md text-sm"
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden
    >
      ⌕
    </span>
  );
}

export function ModuleCard({ data, expanded = false, onOpen }: ModuleCardProps) {
  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={[
        "flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors",
        onOpen
          ? "cursor-pointer hover:border-accent/50 hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          : "",
        expanded ? "shadow-2xl shadow-black/40" : "",
      ].join(" ")}
    >
      <header className="mb-4 flex items-center gap-2.5">
        <CardIcon type={data.icon} color={data.accentColor} />
        <h3 className="text-sm font-semibold tracking-wide text-text">
          {data.number}. {data.title}
        </h3>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatPill key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 text-xs font-medium text-text-muted">{data.bars.title}</h4>
          <BarChartPlaceholder items={data.bars.items} />
        </section>

        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 text-xs font-medium text-text-muted">{data.pics.title}</h4>
          <ul className="space-y-2">
            {data.pics.items.map((pic) => (
              <li key={pic.name} className="flex items-center gap-2.5">
                <span
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: data.accentColor }}
                >
                  {pic.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text">{pic.name}</p>
                  <p className="truncate text-[10px] text-text-dim">{pic.role}</p>
                </div>
                <span className="text-xs font-semibold text-text-muted">{pic.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
        <h4 className="mb-3 text-xs font-medium text-text-muted">{data.chart.title}</h4>
        {data.chart.type === "trend" ? (
          <TrendChartPlaceholder legend={data.chart.legend} />
        ) : (
          <DonutChartPlaceholder legend={data.chart.legend} />
        )}
      </section>
    </article>
  );
}
