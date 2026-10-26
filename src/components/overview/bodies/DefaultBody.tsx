"use client";

import type { ModuleCardData } from "@/data/overview";
import { BarsAndPics, ChartSection } from "../ModuleCardShared";
import { TwoZoneCardBody } from "./TwoZoneCardBody";

export function DefaultBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  // Trend charts need a pixel height — % height breaks in the expand modal (parent has no definite height).
  const isTrend = data.chart.type === "trend";

  return (
    <TwoZoneCardBody
      mid={<BarsAndPics data={data} />}
      bottom={
        <ChartSection
          data={data}
          expanded={expanded}
          align="start"
          fill={!isTrend}
          trendHeight={{ compact: 180, expanded: 300 }}
        />
      }
    />
  );
}
