"use client";

import type { ModuleCardData } from "@/data/overview";
import { VerticalBarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ChartSection } from "../ModuleCardShared";
import { DefaultBody } from "./DefaultBody";

export function SafetyBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  if (!data.trendBars && !data.bars) {
    return <DefaultBody data={data} expanded={expanded} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.trendBars ? (
          <section className="min-w-0 rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-2 text-xs font-medium text-text-muted">{data.trendBars.title}</h4>

            <div className={expanded ? "h-[170px]" : "h-[120px]"}>
              <VerticalBarChartPlaceholder items={data.trendBars.items} />
            </div>
          </section>
        ) : null}

        {data.bars ? (
          <section className="min-w-0 rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-2 text-xs font-medium text-text-muted">{data.bars.title}</h4>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {data.bars.items.map((item) => {
                const max = Number(item.max) > 0 ? Number(item.max) : 1;
                const value = Number(item.value) || 0;
                const percentage = Math.min(100, Math.max(0, (value / max) * 100));

                return (
                  <div key={item.label} className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] font-medium text-text">
                        {item.label}
                      </span>

                      <span className="shrink-0 text-[10px] font-semibold text-text-muted">
                        {value}/{item.max}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
        <ChartSection
          data={data}
          expanded={expanded}
          align="center"
          trendHeight={{
            compact: 120,
            expanded: 190,
          }}
        />
      </section>
    </div>
  );
}
