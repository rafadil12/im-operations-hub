"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { localizedName, useLang } from "@/lib/i18n";
import type { AnalysisResult } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { PieWithLegend } from "./PieWithLegend";
import { VerticalBarChart } from "./VerticalBarChart";
import {
  COMPACT_TOP_N,
  DIVISION_PALETTE,
  NEUTRAL,
  PALETTE,
  USER_RANKING_COMPACT_TOP_N,
  mergeNamedCounts,
  takeTopN,
  takeTopNSlices,
  tooltipStyleFor,
  useChartColors,
  type Slice,
} from "./insightsChartUtils";

export function InsightsCharts({ result }: { result: AnalysisResult }) {
  const { lang, t } = useLang();
  const colors = useChartColors();
  const byDivision = result.byDivision ?? [];
  const userRanking = result.userRanking ?? [];

  const divisionColor = useMemo(() => {
    const map: Record<string, string> = {};
    (result.byDivision ?? []).forEach((d, i) => {
      const key = d.name_en?.trim() || localizedName(d, "en");
      map[key] = DIVISION_PALETTE[i % DIVISION_PALETTE.length];
    });
    return map;
  }, [result.byDivision]);

  const categorySlices = useMemo(
    () =>
      mergeNamedCounts(
        result.byCategory ?? [],
        lang,
        (_r, _label, i) => PALETTE[i % PALETTE.length]
      ).sort((a, b) => b.value - a.value),
    [result.byCategory, lang]
  );

  const categoryCompact = takeTopNSlices(categorySlices, COMPACT_TOP_N, t.analysis.others);

  const divisionSlices: Slice[] = mergeNamedCounts(
    byDivision,
    lang,
    (d, label) => divisionColor[d.name_en?.trim() || label] ?? NEUTRAL
  );

  const divisionBar = divisionSlices.map((s) => ({
    label: s.label,
    count: s.value,
    color: s.color,
  }));

  const subcategoryBar = useMemo(
    () =>
      mergeNamedCounts(
        result.bySubcategory ?? [],
        lang,
        (_r, _label, i) => PALETTE[i % PALETTE.length]
      )
        .map((s) => ({
          label: s.label,
          count: s.value,
          color: s.color,
        }))
        .sort((a, b) => b.count - a.count),
    [result.bySubcategory, lang]
  );

  const subcategoryCompact = takeTopN(subcategoryBar, COMPACT_TOP_N, t.analysis.others);

  const maxUser = Math.max(1, ...userRanking.map((u) => u.count));

  // Group duration points by division for a colored scatter series each.
  const durationByDivision = useMemo(() => {
    const groups: Record<string, { division: string; duration_hours: number }[]> = {};
    for (const p of result.durationPerDivision ?? []) {
      const key = p.division?.trim() || "Unknown";
      (groups[key] ??= []).push({ division: key, duration_hours: p.duration_hours });
    }
    return groups;
  }, [result.durationPerDivision]);

  const userRankingExpanded = userRanking;
  const userRankingCompact = userRanking.slice(0, USER_RANKING_COMPACT_TOP_N);

  function renderUserRanking(rows: typeof userRanking, opts?: { fillHeight?: boolean }) {
    if (rows.length === 0) {
      return <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>;
    }
    return (
      <div className={opts?.fillHeight ? "flex h-full flex-col" : undefined}>
        <ul className="space-y-2.5">
          {rows.map((u, i) => {
            const left = Math.max(4, (u.count / maxUser) * 100);
            const color = divisionColor[u.division?.trim() ?? ""] ?? NEUTRAL;
            return (
              <li key={`${u.name_en}-${u.name_cn}-${i}`} className="flex items-center gap-3">
                <span
                  className="w-[9.5rem] shrink-0 text-[11px] leading-snug text-text-muted"
                  title={localizedName(u, lang)}
                >
                  {localizedName(u, lang)}
                </span>
                <div className="relative h-4 min-w-[3.5rem] flex-1">
                  <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border-subtle" />
                  <div
                    className="absolute top-1/2 h-px -translate-y-1/2 bg-border"
                    style={{ width: `${left}%` }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                    style={{ left: `${left}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[11px] font-semibold text-text">
                  {u.count}
                </span>
              </li>
            );
          })}
        </ul>
        <div
          className={`${opts?.fillHeight ? "mt-auto" : "mt-3"} flex flex-wrap gap-3 border-t border-border-subtle pt-2`}
        >
          {divisionSlices.map((d, i) => (
            <span
              key={`${d.label}-${i}`}
              className="flex items-center gap-1.5 text-[11px] text-text-muted"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.categoryDistribution}
          modalSize="2xl"
          expandedContent={
            categorySlices.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
            ) : (
              <PieWithLegend
                slices={categorySlices}
                chartHeight={Math.max(560, categorySlices.length * 22 + 200)}
                legendMaxHeight={Math.max(560, categorySlices.length * 22 + 200)}
              />
            )
          }
        >
          {categorySlices.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div>
              <PieWithLegend slices={categoryCompact} chartHeight={280} legendMaxHeight={280} />
              {categorySlices.length > COMPACT_TOP_N ? (
                <p className="mt-2 text-[11px] text-text-dim">
                  {t.analysis.showingTop.replace("{n}", String(COMPACT_TOP_N))} ·{" "}
                  {categorySlices.length} total
                </p>
              ) : null}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t.analysis.userRanking}
          expandedContent={
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {renderUserRanking(userRankingExpanded)}
            </div>
          }
        >
          {renderUserRanking(userRankingCompact, { fillHeight: true })}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.subCategoryDistribution}
          expandedContent={
            subcategoryBar.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
            ) : (
              <div className="w-full">
                {/* GRAFIK */}
                <VerticalBarChart data={subcategoryBar} height={500} compactLabels />

                {/* SUB CATEGORY DI BAWAH */}
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <p className="mb-3 text-xs font-semibold text-text">Sub Category</p>

                  <div className="grid grid-cols-8 gap-x-6 gap-y-2">
                    {subcategoryBar.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="flex min-w-0 items-center gap-2 text-[8.5px]"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.color }}
                        />

                        <span className="truncate text-text-muted" title={item.label}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }
        >
          {subcategoryBar.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t.common.noData}</p>
          ) : (
            <div>
              <VerticalBarChart data={subcategoryCompact} height={300} />
              {subcategoryBar.length > COMPACT_TOP_N ? (
                <p className="mt-2 text-[11px] text-text-dim">
                  {t.analysis.showingTop.replace("{n}", String(COMPACT_TOP_N))} ·{" "}
                  {subcategoryBar.length} total
                </p>
              ) : null}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t.analysis.divisionDistribution}
          modalSize="2xl"
          expandedContent={
            <PieWithLegend slices={divisionSlices} chartHeight={560} legendMaxHeight={560} />
          }
        >
          <PieWithLegend slices={divisionSlices} chartHeight={280} legendMaxHeight={280} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title={t.analysis.divisionAnalysis}
          expandedContent={<HorizontalBarChart data={divisionBar} height={360} yAxisWidth={160} />}
        >
          <HorizontalBarChart data={divisionBar} height={260} yAxisWidth={130} truncateLabels />
        </ChartCard>

        <ChartCard
          title={t.analysis.durationAnalysis}
          expandedContent={
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ bottom: 8, left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  type="category"
                  dataKey="division"
                  name="division"
                  stroke={colors.axis}
                  fontSize={11}
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  type="number"
                  dataKey="duration_hours"
                  name="duration_hours"
                  stroke={colors.axis}
                  fontSize={11}
                  unit="h"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={tooltipStyleFor(colors)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(durationByDivision).map(([division, points]) => (
                  <Scatter
                    key={division}
                    name={division}
                    data={points}
                    fill={divisionColor[division] ?? NEUTRAL}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                type="category"
                dataKey="division"
                name="division"
                stroke={colors.axis}
                fontSize={10}
                allowDuplicatedCategory={false}
              />
              <YAxis
                type="number"
                dataKey="duration_hours"
                name="duration_hours"
                stroke={colors.axis}
                fontSize={11}
                unit="h"
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyleFor(colors)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(durationByDivision).map(([division, points]) => (
                <Scatter
                  key={division}
                  name={division}
                  data={points}
                  fill={divisionColor[division] ?? NEUTRAL}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
