"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ChartValueTooltip } from "./ChartValueTooltip";
import { useChartColors, type Slice } from "./itsmChartUtils";

export function PieWithLegend({
  slices,
  chartHeight = 280,
  legendMaxHeight = 280,
}: {
  slices: Slice[];
  chartHeight?: number;
  legendMaxHeight?: number;
}) {
  const colors = useChartColors();
  const { theme } = useTheme();
  const { t } = useLang();

  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="flex items-center justify-center gap-4">
      {/* ================= DONUT ================= */}

      <div className="w-[330px]">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={110}
              paddingAngle={5}
              cornerRadius={12}
            >
              {slices.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 34,
                fontWeight: 800,
                fill: theme === "dark" ? "#F8FAFC" : "#0F172A",
              }}
            >
              {total}
            </text>

            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 13,
                fill: theme === "dark" ? "#CBD5E1" : "#64748B",
              }}
            >
              {t.itsmAnalysis.tickets}
            </text>

            <Tooltip
              content={<ChartValueTooltip total={total} valueKey="value" colors={colors} />}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ================= LEGEND ================= */}

      <div
        className="w-[260px] space-y-4"
        style={{
          maxHeight: legendMaxHeight,
        }}
      >
        {slices.map((s, i) => {
          const percent = total === 0 ? 0 : Number(((s.value / total) * 100).toFixed(1));

          return (
            <div
              key={i}
              className="
                rounded-2xl
                border
                border-slate-200
                dark:border-slate-700
                p-4
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-xl
              "
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: s.color,
                    }}
                  />

                  <span
                    className="font-semibold"
                    style={{
                      color: theme === "dark" ? "#F8FAFC" : "#111827",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                <span
                  className="text-2xl font-bold"
                  style={{
                    color: theme === "dark" ? "#F8FAFC" : "#111827",
                  }}
                >
                  {s.value}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span
                  style={{
                    color: colors.tooltipText,
                  }}
                >
                  {percent}%
                </span>

                <span
                  style={{
                    color: colors.tooltipText,
                  }}
                >
                  {t.itsmAnalysis.ofTotal}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
