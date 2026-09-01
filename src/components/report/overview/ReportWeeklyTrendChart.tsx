"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/theme";
import type { ReportTrendRow } from "@/lib/report/types";

type Props = {
  data: ReportTrendRow[];
  height?: number;
  workLabel: string;
  projectLabel: string;
  highlightWeek?: number;
};

export function ReportWeeklyTrendChart({
  data,
  height = 220,
  workLabel,
  projectLabel,
}: Props) {
  const { theme } = useTheme();
  const axisFill = theme === "dark" ? "#FFFFFF" : "#475569";
  const gridStroke = theme === "dark" ? "#E5E7EB" : "#cbd5e1ab";
  const hasProject = data.some((row) => row.projectProgressRate != null);

  const chartData = data.map((row) => ({
    label: row.label,
    work: row.workCompletionRate,
    project: row.projectProgressRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke={gridStroke}
          strokeWidth={theme === "dark" ? 0.5 : 0.8}
          strokeOpacity={theme === "dark" ? 0.5 : 0.8}
          strokeDasharray="5 5"
        />
        <XAxis dataKey="label" stroke="#94A3B8" tick={{ fill: axisFill, fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          stroke="#94A3B8"
          tick={{ fill: axisFill, fontSize: 11 }}
          tickFormatter={(value) => `${value}%`}
          width={40}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${Math.round(value)}%`,
            name === "work" ? workLabel : projectLabel,
          ]}
          contentStyle={{
            backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
            border: "1px solid rgba(148,163,184,0.3)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="work"
          name={workLabel}
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {hasProject ? (
          <Line
            type="monotone"
            dataKey="project"
            name={projectLabel}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
