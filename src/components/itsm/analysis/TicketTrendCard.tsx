"use client";

import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartColors } from "@/lib/theme";
import type { Lang } from "@/lib/types";
import { ChartCard } from "./ChartCard";

export function TicketTrendCard({
  title,
  chartData,
  colors,
  theme,
  lang,
  activeFilter,
}: {
  title: string;
  chartData: { date: string; current: number; previous: number }[];
  colors: ChartColors;
  theme: string;
  lang: Lang;
  activeFilter: "week" | "month" | "year" | null;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="ticketTrendGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#25ebb3" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#cd7364" />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke={theme === "dark" ? "#E5E7EB" : "#cbd5e1ab"}
            strokeWidth={theme === "dark" ? 0.5 : 0.8}
            strokeOpacity={theme === "dark" ? 0.5 : 0.8}
            strokeDasharray="5 5"
          />

          <XAxis
            dataKey="date"
            stroke={colors.axis}
            tick={{
              fill: theme === "dark" ? "#FFFFFF" : "#475569",
              fontSize: 11,
            }}
            tickFormatter={(value) => {
              if (/^\d{4}-\d{2}$/.test(value)) {
                const [year, month] = value.split("-");

                return new Date(Number(year), Number(month) - 1).toLocaleDateString(
                  lang === "cn" ? "zh-CN" : "en-US",
                  {
                    month: "short",
                  }
                );
              }

              const date = new Date(value);

              if (lang === "cn") {
                return `${date.getMonth() + 1}月${date.getDate()}日`;
              }

              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />

          <YAxis
            allowDecimals={false}
            stroke="#94A3B8"
            tickMargin={12}
            tick={{
              fill: theme === "dark" ? "#FFFFFF" : "#475569",
              fontSize: 11,
            }}
          />

          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              paddingBottom: 10,
              fontSize: 14,
              fontWeight: 600,
              color: theme === "dark" ? "#CBD5E1" : "#475569",
            }}
            formatter={(value) => {
              if (value === "current") {
                return (
                  <span
                    style={{
                      color: theme === "dark" ? "#CBD5E1" : "#475569",
                    }}
                  >
                    {lang === "cn" ? "当前时间段" : "Current Period"}
                  </span>
                );
              }

              return (
                <span
                  style={{
                    color: theme === "dark" ? "#CBD5E1" : "#475569",
                  }}
                >
                  {lang === "cn" ? "对比时间段" : "Previous Period"}
                </span>
              );
            }}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              const current = payload.find((p) => p.dataKey === "current")?.value;
              const previous = payload.find((p) => p.dataKey === "previous")?.value;

              let currentLabel = "";
              let previousLabel = "";

              if (activeFilter === "week") {
                currentLabel = lang === "cn" ? "本周" : "This Week";
                previousLabel = lang === "cn" ? "上周" : "Last Week";
              } else if (activeFilter === "month") {
                const date = new Date(String(label));

                currentLabel = date.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
                  month: "long",
                });

                const prev = new Date(date);
                prev.setMonth(prev.getMonth() - 1);

                previousLabel = prev.toLocaleDateString(lang === "cn" ? "zh-CN" : "en-US", {
                  month: "long",
                });
              } else {
                const date = new Date(String(label));

                currentLabel = String(date.getFullYear());
                previousLabel = String(date.getFullYear() - 1);
              }

              return (
                <div
                  style={{
                    background: "#1E293B",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "12px 16px",
                    boxShadow: "0 8px 20px rgba(0,0,0,.25)",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {label}
                  </div>

                  <div
                    style={{
                      color: "#60A5FA",
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 6,
                    }}
                  >
                    {lang === "cn" ? "当前" : "Current"} ({currentLabel}) : {current}
                  </div>

                  <div
                    style={{
                      color: "#CBD5E1",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {lang === "cn" ? "上期" : "Previous"} ({previousLabel}) : {previous}
                  </div>
                </div>
              );
            }}
          />
          {/* Previous */}
          <Line
            type="natural"
            dataKey="previous"
            stroke="#C9D1DB"
            name="previous"
            strokeWidth={2.5}
            animationDuration={1800}
            animationEasing="ease-in-out"
            dot={{
              r: 4,
              fill: "#BFC7D4",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 5,
              fill: "#AAB4C3",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
          >
            <LabelList
              dataKey="previous"
              content={(props) => {
                const x = Number(props.x ?? 0);
                const y = Number(props.y ?? 0);
                const width = Number(props.width ?? 0);
                const index = props.index ?? 0;

                return (
                  <text
                    x={x + width / 2 + (index === 0 ? 12 : 0)}
                    y={y - 20}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill={theme === "dark" ? "#f8fafc76" : "#33415553"}
                  >
                    {props.value}
                  </text>
                );
              }}
            />
          </Line>
          {/* Current */}
          <Line
            type="natural"
            dataKey="current"
            name="current"
            stroke="url(#ticketTrendGradient)"
            strokeWidth={3}
            animationDuration={1800}
            animationEasing="ease-in-out"
            dot={(props) => {
              const { cx, cy, payload } = props;

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={payload.current >= 15 ? 6 : 4}
                  fill={payload.current >= 15 ? "#EF4444" : "#2563EB"}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
          >
            <LabelList
              dataKey="current"
              content={(props) => {
                const x = Number(props.x ?? 0);
                const y = Number(props.y ?? 0);
                const width = Number(props.width ?? 0);
                const index = props.index ?? 0;

                return (
                  <text
                    x={x + width / 2 + (index === 0 ? 12 : 0)}
                    y={y - 20}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill={theme === "dark" ? "#26d371" : "#22b7af"}
                  >
                    {props.value}
                  </text>
                );
              }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
