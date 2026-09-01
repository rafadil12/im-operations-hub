"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

const BAR_COLORS = [
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

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const lighten = (hex: string, amount = 0.45) => {
  const { r, g, b } = hexToRgb(hex);

  return `rgb(${Math.round(r + (255 - r) * amount)}, ${Math.round(
    g + (255 - g) * amount
  )}, ${Math.round(b + (255 - b) * amount)})`;
};

export function TopRequesterCard({
  title,
  requesterBar,
  requesterBarCompact,
  theme,
}: {
  title: string;
  requesterBar: { label: string; count: number }[];
  requesterBarCompact: { label: string; count: number }[];
  theme: string;
}) {
  return (
    <ChartCard
      title={title}
      expandedContent={
        <div
          style={{
            width: "100%",
            height: 520,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={requesterBar}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 0,
              }}
              barCategoryGap="10%"
            >
              <defs>
                {BAR_COLORS.map((color, index) => (
                  <linearGradient
                    key={index}
                    id={`gradient-expand-${index}`}
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={lighten(color)} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                interval={0}
                angle={-45}
                textAnchor="end"
                tickMargin={12}
                height={110}
                tick={{
                  fontSize: 11,
                  fill: theme === "dark" ? "#F8FAFC" : "#475569",
                }}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: theme === "dark" ? "#F8FAFC" : "#475569",
                }}
              />

              <Tooltip
                cursor={{
                  fill: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  return (
                    <div
                      style={{
                        background: theme === "dark" ? "#1E293B" : "#FFFFFF",
                        border: `1px solid ${theme === "dark" ? "#334155" : "#E2E8F0"}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        boxShadow: "0 8px 20px rgba(0,0,0,.25)",
                      }}
                    >
                      <div
                        style={{
                          color: theme === "dark" ? "#F8FAFC" : "#0F172A",
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          color: theme === "dark" ? "#CBD5E1" : "#334155",
                          fontWeight: 600,
                        }}
                      >
                        Count : {payload[0].value}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {requesterBar.map((_, index) => (
                  <Cell key={index} fill={`url(#gradient-expand-${index % BAR_COLORS.length})`} />
                ))}

                <LabelList
                  dataKey="count"
                  position="top"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: theme === "dark" ? "#FFFFFF" : "#475569",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={requesterBarCompact}
          layout="vertical"
          barSize={12}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <defs>
            {BAR_COLORS.map((color, index) => (
              <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={lighten(color)} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid horizontal={false} vertical={false} />

          <XAxis type="number" hide domain={[0, "dataMax"]} />

          <YAxis
            type="category"
            dataKey="label"
            width={150}
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: theme === "dark" ? "#F8FAFC" : "#475569",
            }}
          />

          <Tooltip
            cursor={{
              fill: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;

              const row = payload[0].payload as {
                label: string;
                count: number;
              };

              return (
                <div
                  style={{
                    background: theme === "dark" ? "#1E293B" : "#FFFFFF",
                    border: `1px solid ${theme === "dark" ? "#334155" : "#E2E8F0"}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    boxShadow: "0 8px 20px rgba(0,0,0,.25)",
                  }}
                >
                  <div
                    style={{
                      color: theme === "dark" ? "#F8FAFC" : "#0F172A",
                      fontWeight: 700,
                      marginBottom: 8,
                      fontSize: 15,
                    }}
                  >
                    {row.label}
                  </div>

                  <div
                    style={{
                      color: theme === "dark" ? "#CBD5E1" : "#334155",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Count : {row.count}
                  </div>
                </div>
              );
            }}
          />

          <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={18}>
            {requesterBarCompact.map((_, index) => (
              <Cell key={index} fill={`url(#gradient-${index % BAR_COLORS.length})`} />
            ))}

            <LabelList
              dataKey="count"
              position="right"
              offset={8}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fill: theme === "dark" ? "#FFFFFF" : "#475569",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
