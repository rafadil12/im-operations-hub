"use client";

import { useMemo } from "react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { ItsmAnalysisResult } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { PieWithLegend } from "./PieWithLegend";
import { TicketTrendCard } from "./TicketTrendCard";
import { TopRequesterCard } from "./TopRequesterCard";
import { TopTechnicianCard } from "./TopTechnicianCard";
import { REQUEST_TYPE_COLORS, useChartColors } from "./itsmChartUtils";

export function ITSMAnalysisCharts({
  result,
  activeFilter,
}: {
  result: ItsmAnalysisResult;
  activeFilter: "week" | "month" | "year" | null;
}) {
  const { lang, t } = useLang();
  const colors = useChartColors();
  const { theme } = useTheme();
  
  type TechnicianComparison = {
  name: string;
  count?: number;
  currentCount?: number;
  previousCount?: number;
  incidentCount?: number;
  requestCount?: number;
};

  const technicians = (
  (result.technicianRanking ?? []) as TechnicianComparison[]
).map((item) => ({
  name: item.name,
  count: Number(item.currentCount ?? item.count ?? 0),
  currentCount: Number(item.currentCount ?? item.count ?? 0),
  previousCount: Number(item.previousCount ?? 0),
  incidentCount: Number(item.incidentCount ?? 0),
  requestCount: Number(item.requestCount ?? 0),
}));

  const requesters = result.requesterRanking ?? [];
  const trend = result.trend ?? {
    current: [],
    previous: [],
  };

  const requestTypeSlices = useMemo(
    () =>
      (result.byRequestType ?? [])
        .map((item, index) => ({
          label: (lang === "cn" ? item.name_cn : item.name_en) ?? "Unknown",
          value: item.count,
          color: REQUEST_TYPE_COLORS[index % REQUEST_TYPE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value),
    [result.byRequestType, lang]
  );

  const requesterBar = requesters
    .filter((item) => item.name !== "NUSA IT Test001")
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      label: item.name,
      count: item.count,
    }));

  const requesterBarCompact = requesterBar.slice(0, 10);

  const chartData = trend.current.map((item, index) => ({
    date: item.date,
    current: item.count,
    previous: trend.previous[index]?.count ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <TicketTrendCard
        title={`📈 ${t.itsmAnalysis.ticketTrend}`}
        chartData={chartData}
        colors={colors}
        theme={theme}
        lang={lang}
        activeFilter={activeFilter}
      />
      <TopTechnicianCard title={`👨‍💻 ${t.itsmAnalysis.topTechnician}`} technicians={technicians}activeFilter={activeFilter} />
      <TopRequesterCard
        title={`👤 ${t.itsmAnalysis.topRequester}`}
        requesterBar={requesterBar}
        requesterBarCompact={requesterBarCompact}
        theme={theme}
      />
      <ChartCard title={`📑 ${t.itsmAnalysis.requestType}`}>
  <PieWithLegend
    slices={requestTypeSlices}
    technicians={technicians}
    chartHeight={260}
  />
</ChartCard>
    </div>
  );
}
