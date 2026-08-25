"use client";

import type { ModuleCardData } from "@/data/overview";
import { VerticalBarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ChartSection, ProgressRingItem } from "../ModuleCardShared";

export function ReportBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        {data.trendBars ? (
          <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-3 text-xs font-medium text-text-muted">{data.trendBars.title}</h4>

            <VerticalBarChartPlaceholder items={data.trendBars.items} />
          </section>
        ) : null}

        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <ChartSection data={data} expanded={expanded} />
        </section>
      </div>

      {data.progressRings ? (
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <div className="flex flex-wrap items-center justify-around gap-3">
            {data.progressRings.map((ring) => (
              <ProgressRingItem key={ring.label} ring={ring} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
