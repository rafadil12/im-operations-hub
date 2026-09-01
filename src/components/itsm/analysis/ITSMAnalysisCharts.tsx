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

  const technicians = result.technicianRanking ?? [];
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
      <TopTechnicianCard title={`👨‍💻 ${t.itsmAnalysis.topTechnician}`} technicians={technicians} />
      <TopRequesterCard
        title={`👤 ${t.itsmAnalysis.topRequester}`}
        requesterBar={requesterBar}
        requesterBarCompact={requesterBarCompact}
        theme={theme}
      />
      <ChartCard title={`📑 ${t.itsmAnalysis.requestType}`}>
        <PieWithLegend slices={requestTypeSlices} chartHeight={260} />
      </ChartCard>
    </div>
  );
}
