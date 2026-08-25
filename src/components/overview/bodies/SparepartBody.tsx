"use client";

import type { ModuleCardData } from "@/data/overview";
import { BarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ChartSection } from "../ModuleCardShared";

export function SparepartBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  return (
    <>
      {data.bars ? (
        <section className="mb-4 flex min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{data.bars.title}</h4>

          <div className="min-h-0">
            <BarChartPlaceholder items={data.bars.items} />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
        <ChartSection data={data} expanded={expanded} />
      </section>
    </>
  );
}
