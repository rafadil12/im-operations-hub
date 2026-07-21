"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisResult, NamedCount } from "@/lib/types";

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

const STATUS_COLORS: Record<string, string> = {
  "已完成 Completed": "#06b6d4",
  "进行中 In Progress": "#3b82f6",
  "待处理 Pending": "#f59e0b",
};

const DIVISION_PALETTE = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b"];

const tooltipStyle = {
  background: "#151f32",
  border: "1px solid #243047",
  borderRadius: 8,
  color: "#e8eef8",
  fontSize: 12,
};

function bilingual(name_cn: string | null, name_en: string | null): string {
  const cn = name_cn?.trim();
  const en = name_en?.trim();
  if (cn && en) return `${cn} (${en})`;
  return en || cn || "Unknown";
}

type Slice = { label: string; value: number; color: string };

function ChartCard({
  titleCn,
  titleEn,
  children,
  className,
}: {
  titleCn: string;
  titleEn: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-4 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold text-text">
        {titleCn} <span className="text-text-muted">{titleEn}</span>
      </h3>
      {children}
    </section>
  );
}

function PieWithLegend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            outerRadius={90}
            label={(entry: { value?: number | string }) =>
              total
                ? `${(((Number(entry.value) || 0) / total) * 100).toFixed(1)}%`
                : ""
            }
            labelLine={false}
            fontSize={10}
          >
            {slices.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="max-h-56 w-full space-y-1 overflow-y-auto sm:w-56">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="text-text-dim">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisCharts({ result }: { result: AnalysisResult }) {
  const byStatus = result.byStatus ?? [];
  const byCategory = result.byCategory ?? [];
  const bySubcategory = result.bySubcategory ?? [];
  const byDivision = result.byDivision ?? [];
  const userRanking = result.userRanking ?? [];

  const divisionColor = useMemo(() => {
    const map: Record<string, string> = {};
    (result.byDivision ?? []).forEach((d, i) => {
      const key = d.name_en?.trim() || bilingual(d.name_cn, d.name_en);
      map[key] = DIVISION_PALETTE[i % DIVISION_PALETTE.length];
    });
    return map;
  }, [result.byDivision]);

  const namedSlices = (rows: NamedCount[]): Slice[] =>
    rows.map((r, i) => ({
      label: bilingual(r.name_cn, r.name_en),
      value: r.count,
      color: PALETTE[i % PALETTE.length],
    }));

  const statusSlices: Slice[] = byStatus.map((s, i) => ({
    label: s.label,
    value: s.count,
    color: STATUS_COLORS[s.label] ?? PALETTE[i % PALETTE.length],
  }));

  const divisionSlices: Slice[] = byDivision.map((d) => {
    const label = bilingual(d.name_cn, d.name_en);
    return {
      label,
      value: d.count,
      color: divisionColor[d.name_en?.trim() || label] ?? "#64748b",
    };
  });

  const divisionBar = byDivision.map((d) => ({
    label: bilingual(d.name_cn, d.name_en),
    count: d.count,
    color: divisionColor[d.name_en?.trim() || bilingual(d.name_cn, d.name_en)] ?? "#64748b",
  }));

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard titleCn="类别分布" titleEn="Category Distribution">
          <PieWithLegend slices={namedSlices(byCategory)} />
        </ChartCard>

        <ChartCard titleCn="用户排名" titleEn="User Ranking">
          {userRanking.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No data</p>
          ) : (
            <>
              <ul className="space-y-2.5">
                {userRanking.slice(0, 8).map((u) => {
                  const left = Math.max(4, (u.count / maxUser) * 100);
                  const color = divisionColor[u.division?.trim() ?? ""] ?? "#64748b";
                  return (
                    <li key={`${u.name_en}-${u.name_cn}`} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-[11px] text-text-muted">
                        {bilingual(u.name_cn, u.name_en)}
                      </span>
                      <div className="relative h-4 flex-1">
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
                      <span className="w-6 text-right text-[11px] font-semibold text-text">
                        {u.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-border-subtle pt-2">
                {byDivision.map((d) => {
                  const label = bilingual(d.name_cn, d.name_en);
                  return (
                    <span key={label} className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: divisionColor[d.name_en?.trim() || label] }}
                      />
                      {label}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard titleCn="状态分布" titleEn="Status Distribution">
          <PieWithLegend slices={statusSlices} />
        </ChartCard>
        <ChartCard titleCn="子类别分布" titleEn="Sub Category Distribution">
          <PieWithLegend slices={namedSlices(bySubcategory)} />
        </ChartCard>
        <ChartCard titleCn="部门分布" titleEn="Division Distribution">
          <PieWithLegend slices={divisionSlices} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard titleCn="部门统计" titleEn="Division Analysis">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={divisionBar} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243047" horizontal={false} />
              <XAxis type="number" stroke="#5c6b86" fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#5c6b86"
                fontSize={10}
                width={130}
              />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.1)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {divisionBar.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titleCn="持续时间分析" titleEn="Duration Analysis per Division">
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243047" />
              <XAxis
                type="category"
                dataKey="division"
                name="division"
                stroke="#5c6b86"
                fontSize={10}
                allowDuplicatedCategory={false}
              />
              <YAxis
                type="number"
                dataKey="duration_hours"
                name="duration_hours"
                stroke="#5c6b86"
                fontSize={11}
                unit="h"
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(durationByDivision).map(([division, points]) => (
                <Scatter
                  key={division}
                  name={division}
                  data={points}
                  fill={divisionColor[division] ?? "#64748b"}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
