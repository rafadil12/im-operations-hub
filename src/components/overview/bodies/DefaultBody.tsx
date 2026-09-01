"use client";

import type { ModuleCardData } from "@/data/overview";
import { BarsAndPics, ChartSection } from "../ModuleCardShared";

export function DefaultBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const isDonut = data.chart.type === "donut";

  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        <BarsAndPics data={data} />
      </div>

      <section
        className={[
          "rounded-lg border border-border-subtle bg-bg/30 p-3",
          isDonut ? "flex min-h-[188px] flex-col justify-center" : "",
        ].join(" ")}
      >
        <ChartSection data={data} expanded={expanded} align="start" />
      </section>
    </>
  );
}
