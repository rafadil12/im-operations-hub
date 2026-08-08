    "use client";
    
    import { useCallback, useMemo, useRef, useState } from "react";
    import { toBlob, toPng } from "html-to-image";
    import {
      LineChart,
      Line,
      CartesianGrid,
      Cell,
      LabelList,
      Legend,
      BarChart,
      Bar,
      Pie,
      PieChart,
      ResponsiveContainer,
      Tooltip,
      XAxis,
      YAxis,
    } from "recharts";
    import { Modal } from "@/components/ui/Modal";
    import { useLang } from "@/lib/i18n";
    import { CHART_COLORS, useTheme, type ChartColors } from "@/lib/theme";
    import type { ItsmAnalysisResult } from "@/lib/types";

    const REQUEST_TYPE_COLORS = [
      "#3B82F6", // Incident
      "#10B981", // Service Request
    ];
    
    /** Hook for the chart neutrals of the active theme. */
    function useChartColors(): ChartColors {
      const { theme } = useTheme();
      return CHART_COLORS[theme];
    }
    
    type StyleBackup = { el: HTMLElement; cssText: string };
    
    /** Temporarily remove overflow/max-height clips so html-to-image can capture full scroll content. */
    function prepareFullCapture(root: HTMLElement): () => void {
      const backups: StyleBackup[] = [];
    
      const unlock = (el: HTMLElement) => {
        const computed = getComputedStyle(el);
        const clipped =
          computed.overflow !== "visible" ||
          computed.overflowY !== "visible" ||
          computed.overflowX !== "visible" ||
          (computed.maxHeight !== "none" && computed.maxHeight !== "");
        if (!clipped && el !== root) return;
        backups.push({ el, cssText: el.style.cssText });
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("overflow-x", "visible", "important");
        el.style.setProperty("overflow-y", "visible", "important");
      };
    
      unlock(root);
      root.querySelectorAll<HTMLElement>("*").forEach(unlock);
    
      let parent: HTMLElement | null = root.parentElement;
      while (parent) {
        unlock(parent);
        if (parent.getAttribute("role") === "dialog") break;
        parent = parent.parentElement;
      }
    
      return () => {
        for (const backup of backups) {
          backup.el.style.cssText = backup.cssText;
        }
      };
    }
    
    async function captureChartImage(
      node: HTMLElement,
      mode: "png" | "blob",
      backgroundColor: string,
    ): Promise<string | Blob> {
      const restore = prepareFullCapture(node);
      try {
        // Wait two frames so layout expands after unlocking overflow.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    
        const options = {
          pixelRatio: 2,
          backgroundColor,
          cacheBust: true,
          width: Math.ceil(node.scrollWidth),
          height: Math.ceil(node.scrollHeight),
        };
    
        if (mode === "png") {
          return await toPng(node, options);
        }
        const blob = await toBlob(node, options);
        if (!blob) throw new Error("Failed to create image blob");
        return blob;
      } finally {
        restore();
      }
    }
    
    function tooltipStyleFor(colors: ChartColors) {
      return {
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 8,
        color: colors.tooltipText,
        fontSize: 12,
      };
    }
    
    type Slice = { label: string; value: number; color: string };

    function ChartValueTooltip({
      active,
      payload,
      total,
      valueKey = "value",
      colors,
    }: {
      active?: boolean;
      payload?: Array<{ payload?: Record<string, unknown> }>;
      total: number;
      valueKey?: "value" | "count";
      colors: ChartColors;
    }) {
      if (!active || !payload?.[0]?.payload) return null;
      const row = payload[0].payload;
      const label = String(row.label ?? "");
      const value = Number(row[valueKey] ?? 0);
      const pct = total ? (value / total) * 100 : 0;
      return (
        <div style={tooltipStyleFor(colors)} className="px-2.5 py-1.5 shadow-lg">
          <p className="font-medium" style={{ color: colors.tooltipText }}>
            {label}
          </p>
          <p style={{ color: colors.tooltipMuted }}>total : {value}</p>
          <p style={{ color: colors.tooltipMuted }}>{pct.toFixed(1)}%</p>
        </div>
      );
    }
    
 function PieWithLegend({
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

        <ResponsiveContainer
          width="100%"
          height={chartHeight}
        >
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
                <Cell
                  key={i}
                  fill={s.color}
                />
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
              content={
                <ChartValueTooltip
                  total={total}
                  valueKey="value"
                  colors={colors}
                />
              }
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

          const percent =
            total === 0
              ? 0
              : Number((s.value / total * 100).toFixed(1));

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
    
    function ChartCard({
      title,
      children,
      expandedContent,
      className,
      modalSize = "2xl",
    }: {
      title: string;
      children: React.ReactNode;
      expandedContent?: React.ReactNode;
      className?: string;
      modalSize?: "md" | "lg" | "xl" | "2xl";
    }) {
      const { t } = useLang();
      const colors = useChartColors();
      const [open, setOpen] = useState(false);
      const [exportStatus, setExportStatus] = useState<"idle" | "copying" | "copied" | "failed">(
        "idle",
      );
      const exportRef = useRef<HTMLDivElement>(null);
      const captureBg = colors.captureBg;
    
      const runExport = useCallback(async (mode: "download" | "copy") => {
        const node = exportRef.current;
        if (!node) return;
    
        try {
          if (mode === "download") {
            const dataUrl = (await captureChartImage(node, "png", captureBg)) as string;
            const link = document.createElement("a");
            const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            link.download = `${safeName || "chart"}.png`;
            link.href = dataUrl;
            link.click();
            return;
          }
    
          setExportStatus("copying");
          const blob = (await captureChartImage(node, "blob", captureBg)) as Blob;
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setExportStatus("copied");
          window.setTimeout(() => setExportStatus("idle"), 1800);
        } catch {
          setExportStatus("failed");
          window.setTimeout(() => setExportStatus("idle"), 2200);
        }
      }, [title, captureBg]);
    
      const copyLabel =
        exportStatus === "copying"
          ? t.analysis.copying
          : exportStatus === "copied"
            ? t.analysis.copied
            : exportStatus === "failed"
              ? t.analysis.copyFailed
              : t.analysis.copyImage;
    
      return (
        <>
          <section
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className={`cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${className ?? ""}`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <span className="shrink-0 rounded-md border border-border-subtle px-2 py-0.5 text-[10px] text-text-dim">
                {t.analysis.clickToExpand}
              </span>
            </div>
            <div>{children}</div>
          </section>
    
          {open ? (
            <Modal
              title={title}
              size={modalSize}
              onClose={() => {
                setOpen(false);
                setExportStatus("idle");
              }}
              headerActions={
                <>
                  <button
                    type="button"
                    onClick={() => runExport("download")}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  >
                    {t.analysis.downloadPng}
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("copy")}
                    disabled={exportStatus === "copying"}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-60"
                  >
                    {copyLabel}
                  </button>
                </>
              }
            >
              <div ref={exportRef} className="rounded-lg bg-surface p-2">
                {expandedContent ?? children}
              </div>
            </Modal>
          ) : null}
        </>
      );
    }
    
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


  // =============================
  // DATA
  // =============================

  const technicians = result.technicianRanking ?? [];
  const requesters = result.requesterRanking ?? [];
  const trend = result.trend ?? {
    current: [],
    previous: [],
  };

  // =============================
  // PIE
  // =============================

  const requestTypeSlices = useMemo(
  () =>
    (result.byRequestType ?? [])
      .map((item, index) => ({
        label: (lang === "cn" ? item.name_cn : item.name_en) ?? "Unknown",
        value: item.count,
        color: REQUEST_TYPE_COLORS[index % REQUEST_TYPE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value),
  [result.byRequestType, lang],
);

  // =============================
  // TECHNICIAN / REQUESTER
  // =============================
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

    {/* Ticket Trend */}
   <ChartCard title={`📈 ${t.itsmAnalysis.ticketTrend}`}>
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

                return new Date(
                  Number(year),
                  Number(month) - 1
                ).toLocaleDateString(
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
                      {lang === "cn"
                        ? "当前时间段"
                        : "Current Period"}
                    </span>
                  );
                }

                return (
                  <span
                    style={{
                      color: theme === "dark" ? "#CBD5E1" : "#475569",
                    }}
                  >
                    {lang === "cn"
                      ? "对比时间段"
                      : "Previous Period"}
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

                currentLabel = date.toLocaleDateString(
                  lang === "cn" ? "zh-CN" : "en-US",
                  { month: "long" }
                );

                const prev = new Date(date);
                prev.setMonth(prev.getMonth() - 1);

                previousLabel = prev.toLocaleDateString(
                  lang === "cn" ? "zh-CN" : "en-US",
                  { month: "long" }
                );
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
    <ChartCard title={`👨‍💻 ${t.itsmAnalysis.topTechnician}`}>
  <div className="relative h-[280px] w-full overflow-hidden">

    {technicians.map((item, index) => {

      const COLORS = [
        "#2563EB",
        "#F59E0B",
        "#10B981",
        "#EC4899",
        "#8B5CF6",
      ];

     const maxSize = 80;   // sebelumnya 100
    const minSize = 35;   // sebelumnya 45

    const POSITIONS = technicians.map((item, index) => {
      const angle =
        (2 * Math.PI * index) / technicians.length - Math.PI / 2;

      // Radius lingkaran diperkecil
      const radius =
        technicians.length <= 3
          ? 18   // sebelumnya 25
          : technicians.length <= 6
          ? 24   // sebelumnya 32
          : 28;  // sebelumnya 38

      return {
        left: `${50 + radius * Math.cos(angle)}%`,
        top: `${50 + radius * Math.sin(angle)}%`,
        size: Math.round(
          Math.max(
            minSize,
            maxSize -
              index *
                ((maxSize - minSize) /
                  Math.max(1, technicians.length - 1))
          )
        ),
      };
    });
      const p = POSITIONS[index];
      if (!p) return null;
      return (
    <div
        key={item.name}
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{
            left: p.left, top: p.top,
        }}
        >
        <div
            className="
            animate-bubble-in
            relative
            flex
            items-center
            justify-center
            rounded-full
            border-4
            border-white
            text-white
            font-bold
            shadow-xl
            transition-all
            duration-500
            hover:scale-110
            "
    style={{
      width: p.size,
      height: p.size,
      background: `linear-gradient(135deg, ${COLORS[index]}, ${COLORS[index]}CC)`,
      boxShadow: `0 10px 25px ${COLORS[index]}55`,
      animationDelay: `${index * 200}ms`,
      animationFillMode: "both",
    }}
  >
      {item.count}
  </div>

  <div className="mt-3 text-center text-sm font-semibold">
      {item.name}
  </div>

</div>

      );

    })}

  </div>
</ChartCard>

  <ChartCard
  title={`👤 ${t.itsmAnalysis.topRequester}`}
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

          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
          />

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
              fill:
                theme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.04)",
            }}
           content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div
        style={{
          background: theme === "dark" ? "#1E293B" : "#FFFFFF",
          border: `1px solid ${
            theme === "dark" ? "#334155" : "#E2E8F0"
          }`,
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
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          >
            {requesterBar.map((_, index) => (
              <Cell
                key={index}
                fill={`url(#gradient-expand-${index % BAR_COLORS.length})`}
              />
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
          <linearGradient
            key={index}
            id={`gradient-${index}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={lighten(color)} />
          </linearGradient>
        ))}
      </defs>

      <CartesianGrid horizontal={false} vertical={false} />

      <XAxis
        type="number"
        hide
        domain={[0, "dataMax"]}
      />

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
          fill:
            theme === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,23,42,0.04)",
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
                border: `1px solid ${
                  theme === "dark" ? "#334155" : "#E2E8F0"
                }`,
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

      <Bar
        dataKey="count"
        radius={[8, 8, 8, 8]}
        barSize={18}
      >
        {requesterBarCompact.map((_, index) => (
          <Cell
            key={index}
            fill={`url(#gradient-${index % BAR_COLORS.length})`}
          />
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
    {/* Service Request vs Incident */}
    <ChartCard title={`📑 ${t.itsmAnalysis.requestType}`}>
      <PieWithLegend
        slices={requestTypeSlices}
        chartHeight={260}
      />
    </ChartCard>

    
  </div>
);
}
    