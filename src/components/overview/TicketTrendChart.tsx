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
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type TrendPoint = {
  date: string;
  current: number;
  previous: number;
};

type Props = {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
};

export function TicketTrendChart({
  data,
  height = 140,
  compact = false,
}: Props) {
  const { lang } = useLang();
  const { theme } = useTheme();

  const axisFill = theme === "dark" ? "#FFFFFF" : "#475569";
  const gridStroke = theme === "dark" ? "#E5E7EB" : "#cbd5e1ab";
  const legendColor = theme === "dark" ? "#CBD5E1" : "#475569";
  const currentLabelColor = theme === "dark" ? "#26d371" : "#22b7af";
  const previousLabelColor = theme === "dark" ? "#f8fafc76" : "#33415553";
  const fontSize = compact ? 11 : 13;
  const labelFontSize = compact ? 11 : 15;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{
          top: compact ? 16 : 20,
          right: 12,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="overviewTicketTrendGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#25ebb3" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#cd7364" />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          stroke={gridStroke}
          strokeWidth={theme === "dark" ? 0.5 : 0.8}
          strokeOpacity={theme === "dark" ? 0.5 : 0.8}
          strokeDasharray="5 5"
        />

        <XAxis
          dataKey="date"
          stroke="#94A3B8"
          tick={{ fill: axisFill, fontSize }}
          tickFormatter={(value) => {
            if (/^\d{4}-\d{2}$/.test(value)) {
              const [year, month] = value.split("-");
              return new Date(Number(year), Number(month) - 1).toLocaleDateString(
                lang === "cn" ? "zh-CN" : "en-US",
                { month: "short" },
              );
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return String(value);

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
          width={compact ? 28 : 36}
          tickMargin={8}
          tick={{ fill: axisFill, fontSize }}
        />

        <Legend
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{
            paddingBottom: compact ? 0 : 4,
            fontSize: compact ? 12 : 14,
            fontWeight: 600,
            color: legendColor,
          }}
          formatter={(value) => {
            const label =
              value === "current"
                ? lang === "cn"
                  ? "当前时间段"
                  : "Current Period"
                : lang === "cn"
                  ? "对比时间段"
                  : "Previous Period";

            return <span style={{ color: legendColor }}>{label}</span>;
          }}
        />

        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;

            const current = payload.find((p) => p.dataKey === "current")?.value;
            const previous = payload.find((p) => p.dataKey === "previous")?.value;

            return (
              <div
                style={{
                  background: "#1E293B",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "10px 14px",
                  boxShadow: "0 8px 20px rgba(0,0,0,.25)",
                }}
              >
                <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 14 }}>
                  {String(label)}
                </div>
                <div
                  style={{
                    color: "#60A5FA",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  {lang === "cn" ? "当前" : "Current"}: {current}
                </div>
                <div style={{ color: "#CBD5E1", fontWeight: 700, fontSize: 13 }}>
                  {lang === "cn" ? "上期" : "Previous"}: {previous}
                </div>
              </div>
            );
          }}
        />

        <Line
          type="natural"
          dataKey="previous"
          name="previous"
          stroke="#C9D1DB"
          strokeWidth={2.5}
          animationDuration={1800}
          animationEasing="ease-in-out"
          dot={{
            r: compact ? 3 : 4,
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
          {!compact && (
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
                    y={y - 16}
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    fontWeight={700}
                    fill={previousLabelColor}
                  >
                    {props.value}
                  </text>
                );
              }}
            />
          )}
        </Line>

        <Line
          type="natural"
          dataKey="current"
          name="current"
          stroke="url(#overviewTicketTrendGradient)"
          strokeWidth={3}
          animationDuration={1800}
          animationEasing="ease-in-out"
          dot={(props) => {
            const { cx, cy, payload } = props;

            return (
              <circle
                cx={cx}
                cy={cy}
                r={payload.current >= 15 ? 6 : compact ? 3 : 4}
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
                  y={y - 16}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fontWeight={700}
                  fill={currentLabelColor}
                >
                  {props.value}
                </text>
              );
            }}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
