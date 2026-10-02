"use client";

import type { BarItem, ModuleCardData } from "@/data/overview";
import { BarChartPlaceholder, VerticalBarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ChartSection } from "../ModuleCardShared";
import { DefaultBody } from "./DefaultBody";
import { TwoZoneCardBody } from "./TwoZoneCardBody";

function hasBarValues(items: BarItem[]): boolean {
  return items.some((item) => Number(item.value) > 0);
}

export function SafetyBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  if (!data.trendBars && !data.bars) {
    return <DefaultBody data={data} expanded={expanded} />;
  }

  const trendItems = data.trendBars && hasBarValues(data.trendBars.items) ? data.trendBars.items : [];
  const barItems = data.bars && hasBarValues(data.bars.items) ? data.bars.items : [];

  return (
    <TwoZoneCardBody
      mid={
        <>
          {data.trendBars ? (
            <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
              <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
                {data.trendBars.title}
              </h4>
              <div className="min-h-0 flex-1">
                <VerticalBarChartPlaceholder items={trendItems} />
              </div>
            </section>
          ) : null}

          {data.bars ? (
            <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
              <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{data.bars.title}</h4>
              <div className="min-h-0 flex-1">
                <BarChartPlaceholder items={barItems} density="compact" />
              </div>
            </section>
          ) : null}
        </>
      }
      bottom={<ChartSection data={data} expanded={expanded} align="center" fill />}
    />
  );
}
