"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { localizedName } from "@/lib/i18n";
import { divisionColor, trainingText } from "@/lib/training/copy";
import type { TrainingLanguage, TrainingOverviewMetrics } from "@/lib/training/types";

function useAxisColor() {
  return "var(--color-text-dim, #94a3b8)";
}

export function TrainingTrendChart({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["monthlyTrend"];
  language: TrainingLanguage;
  granularity: TrainingOverviewMetrics["trendGranularity"];
}) {
  const axis = useAxisColor();

  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-text-muted">
        {trainingText("trendNoData", language)}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
        <XAxis dataKey="label" stroke={axis} fontSize={11} />
        <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="sessions"
          name={trainingText("sessions", language)}
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        >
          <LabelList
            dataKey="sessions"
            position="top"
            offset={8}
            fill="#6366f1"
            fontSize={10}
            fontWeight={600}
          />
        </Line>
        <Line
          type="monotone"
          dataKey="participants"
          name={trainingText("participants", language)}
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        >
          <LabelList
            dataKey="participants"
            position="bottom"
            offset={8}
            fill="#22c55e"
            fontSize={10}
            fontWeight={600}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TrainingCategoryDonut({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["byDivision"];
  language: TrainingLanguage;
}) {
  const chartData = data
    .filter((row) => row.sessions > 0)
    .map((row) => ({
      name: localizedName({ name_en: row.nameEn, name_cn: row.nameCn }, language),
      value: row.sessions,
      color: divisionColor(row.nameEn),
    }));

  const total = chartData.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            labelLine={false}
            label={({ cx, cy, midAngle, outerRadius, value, percent, payload }) => {
              if (cx == null || cy == null || midAngle == null || outerRadius == null) return null;

              const RADIAN = Math.PI / 180;
              const sin = Math.sin(-midAngle * RADIAN);
              const cos = Math.cos(-midAngle * RADIAN);
              const color =
                (payload as { color?: string } | undefined)?.color ??
                "var(--color-text, #0f172a)";

              const sx = cx + outerRadius * cos;
              const sy = cy + outerRadius * sin;
              const mx = cx + (outerRadius + 12) * cos;
              const my = cy + (outerRadius + 12) * sin;
              const ex = cx + (cos >= 0 ? 1 : -1) * (outerRadius + 26);
              const ey = my;
              const textX = ex + (cos >= 0 ? 1 : -1) * 8;
              const pct = Math.round((percent ?? 0) * 100);

              return (
                <g style={{ pointerEvents: "none" }}>
                  <path
                    d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                    stroke={color}
                    fill="none"
                    strokeWidth={1}
                  />
                  <circle cx={ex} cy={ey} r={2.5} fill={color} stroke="none" />
                  <text
                    x={textX}
                    y={ey}
                    fill={color}
                    textAnchor={cos >= 0 ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {`${value} (${pct}%)`}
                  </text>
                </g>
              );
            }}
          >
            {chartData.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text">{total}</span>
        <span className="text-[10px] text-text-dim">{trainingText("sessions", language)}</span>
      </div>
    </div>
  );
}

const TOP_PARTICIPANT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

export function TrainingTopParticipantsChart({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["topParticipants"];
  language: TrainingLanguage;
}) {
  const axis = useAxisColor();
  const chartData = data.map((row) => ({
    label: localizedName({ name_en: row.nameEn, name_cn: row.nameCn }, language),
    sessions: row.sessions,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" horizontal={false} />
        <XAxis type="number" stroke={axis} fontSize={11} allowDecimals={false} />
        <YAxis type="category" dataKey="label" stroke={axis} fontSize={10} width={88} />
        <Tooltip />
        <Bar
          dataKey="sessions"
          name={trainingText("sessions", language)}
          radius={[0, 4, 4, 0]}
        >
          {chartData.map((row, index) => (
            <Cell
              key={row.label}
              fill={TOP_PARTICIPANT_COLORS[index % TOP_PARTICIPANT_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrainingTopicsByDivisionChart({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["byDivision"];
  language: TrainingLanguage;
}) {
  const axis = useAxisColor();
  const chartData = data.map((row) => ({
    division: localizedName({ name_en: row.nameEn, name_cn: row.nameCn }, language),
    topics: row.topics,
    color: divisionColor(row.nameEn),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
        <XAxis dataKey="division" stroke={axis} fontSize={11} />
        <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="topics" name={trainingText("topics", language)} radius={[4, 4, 0, 0]}>
          {chartData.map((row) => (
            <Cell key={row.division} fill={row.color} />
          ))}
          <LabelList
            dataKey="topics"
            position="top"
            fill="var(--color-text, #0f172a)"
            fontSize={10}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
