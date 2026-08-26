"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { CATEGORY_COLORS, categoryLabel, trainingText } from "@/lib/training/copy";
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
}) {
  const axis = useAxisColor();
  const chartData = data.map((row) => ({
    ...row,
    label: row.month.slice(5),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="participants"
          name={trainingText("participants", language)}
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TrainingCategoryDonut({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["byCategory"];
  language: TrainingLanguage;
}) {
  const chartData = data
    .filter((row) => row.sessions > 0)
    .map((row) => ({
      name: categoryLabel(row.category, language),
      value: row.sessions,
      color: CATEGORY_COLORS[row.category],
    }));

  const total = chartData.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
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

export function TrainingTopParticipantsChart({
  data,
}: {
  data: TrainingOverviewMetrics["topParticipants"];
}) {
  const axis = useAxisColor();
  const chartData = data.map((row) => ({
    label: row.name,
    count: row.sessions,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" horizontal={false} />
        <XAxis type="number" stroke={axis} fontSize={11} allowDecimals={false} />
        <YAxis type="category" dataKey="label" stroke={axis} fontSize={10} width={88} />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrainingAttachmentChart({
  data,
  language,
}: {
  data: TrainingOverviewMetrics["attachmentByCategory"];
  language: TrainingLanguage;
}) {
  const axis = useAxisColor();
  const chartData = data.map((row) => ({
    category: categoryLabel(row.category, language),
    withAttachment: row.withAttachment,
    withoutAttachment: row.withoutAttachment,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
        <XAxis dataKey="category" stroke={axis} fontSize={11} />
        <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="withAttachment"
          name={trainingText("withAttachment", language)}
          stackId="a"
          fill="#22c55e"
        />
        <Bar
          dataKey="withoutAttachment"
          name={trainingText("withoutAttachment", language)}
          stackId="a"
          fill="#f59e0b"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
