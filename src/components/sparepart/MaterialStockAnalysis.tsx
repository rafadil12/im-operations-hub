"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGetAbs } from "@/lib/apiClient";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { localizedField, localizedName, useLang } from "@/lib/i18n";
import { formatUomDisplay } from "@/lib/sparepart/uoms";
import type { MovementType, SparepartItem } from "@/lib/types";

type HistoryRow = {
  doc_id: number;
  doc_number: string;
  movement_type: MovementType;
  posting_date: string;
  qty: number;
  note: string | null;
  created_by: string | null;
  from_location_id: number | null;
  from_location_code: string | null;
  from_location_name_en: string | null;
  from_location_name_cn: string | null;
  to_location_id: number | null;
  to_location_code: string | null;
  to_location_name_en: string | null;
  to_location_name_cn: string | null;
};

type ChartInterval = "day" | "week" | "month";
type ChartView = "stock" | "movement";
type ChartPoint = {
  date: string;
  label: string;
  stock: number;
  incoming: number;
  outgoing: number;
  netChange: number;
  transfer: number;
};

type MovementTooltipPayload = {
  name?: string;
  value?: string | number;
  color?: string;
  dataKey?: string;
};

function MovementChartTooltip({
  active,
  payload,
  label,
  uom,
  lang,
}: {
  active?: boolean;
  payload?: MovementTooltipPayload[];
  label?: string;
  uom: string;
  lang: "en" | "cn";
}) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((entry) => Number(entry.value) !== 0);
  const numberFormat = new Intl.NumberFormat(lang === "cn" ? "zh-CN" : "en-US");

  return (
    <div className="max-w-40 rounded-lg border border-border-subtle border-l-2 border-l-accent bg-surface px-2.5 py-2 shadow-lg">
      <p className="text-xs font-semibold leading-tight text-text">{label}</p>
      <p className="mt-0.5 text-[9px] text-text-dim">
        {lang === "cn" ? "周期数量" : "Period quantity"}
      </p>
      {rows.length ? (
        <div className="mt-1.5 space-y-1 border-t border-border-subtle pt-1.5">
          {rows.map((entry) => {
            const seriesColor =
              entry.dataKey === "incoming"
                ? "#16a34a"
                : entry.dataKey === "outgoing"
                  ? "#dc2626"
                  : "#7c3aed";
            return (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-3 rounded px-1.5 py-1 text-[10px] leading-tight"
              style={{ backgroundColor: `${seriesColor}12` }}
            >
              <span
                className="flex min-w-0 items-center gap-1.5 font-medium"
                style={{ color: seriesColor }}
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: seriesColor }} />
                {entry.name}
              </span>
              <strong className="shrink-0 font-semibold tabular-nums" style={{ color: seriesColor }}>
                {numberFormat.format(Math.abs(Number(entry.value)))} {uom}
              </strong>
            </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-1.5 border-t border-border-subtle pt-1.5 text-[10px] text-text-muted">
          {lang === "cn" ? "本周期没有变动" : "No movement in this period"}
        </p>
      )}
    </div>
  );
}

function periodFor(value: string, interval: ChartInterval, lang: "en" | "cn") {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (interval === "month") {
    const key = value.slice(0, 7);
    return {
      key,
      label: new Intl.DateTimeFormat(lang === "cn" ? "zh-CN" : "en", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date),
    };
  }
  if (interval === "week") {
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    return { key, label: lang === "cn" ? `周起 ${key.slice(5)}` : `Week of ${key.slice(5)}` };
  }
  return { key: value.slice(0, 10), label: value.slice(5, 10).replace("-", lang === "cn" ? "/" : "-") };
}

function totalDelta(type: MovementType, qty: number) {
  if (type === "101" || type === "202") return qty;
  if (type === "201" || type === "102") return -qty;
  return 0;
}

export function MaterialStockAnalysis({ materialId }: { materialId: string }) {
  const { lang } = useLang();
  const [item, setItem] = useState<SparepartItem | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [days, setDays] = useState(90);
  const [interval, setInterval] = useState<ChartInterval>("week");
  const [chartView, setChartView] = useState<ChartView>("movement");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGetAbs<{ row: SparepartItem }>(`/api/sparepart/materials/${materialId}`),
      apiGetAbs<{ rows: HistoryRow[] }>(`/api/sparepart/materials/${materialId}/history`),
    ])
      .then(([detail, movements]) => {
        if (!cancelled) {
          setItem(detail.row);
          setHistory(movements.rows);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const chartData = useMemo(() => {
    const periods = new Map<string, ChartPoint>();
    const ordered = [...history].sort((a, b) =>
      `${a.posting_date}-${a.doc_id}`.localeCompare(`${b.posting_date}-${b.doc_id}`)
    );
    const movementsByDate = new Map<string, number>();
    for (const row of ordered) {
      const qty = Number(row.qty);
      const { key, label } = periodFor(row.posting_date, interval, lang);
      const delta = totalDelta(row.movement_type, qty);
      const point: ChartPoint = periods.get(key) ?? {
        date: key,
        label,
        stock: 0,
        incoming: 0,
        outgoing: 0,
        netChange: 0,
        transfer: 0,
      };
      movementsByDate.set(row.posting_date.slice(0, 10),
        (movementsByDate.get(row.posting_date.slice(0, 10)) ?? 0) + delta);
      if (delta > 0) point.incoming = Number(point.incoming) + delta;
      if (delta < 0) point.outgoing = Number(point.outgoing) + delta;
      point.netChange += delta;
      if (delta === 0 && (row.movement_type === "311" || row.movement_type === "312"))
        point.transfer = Number(point.transfer) + qty;
      periods.set(key, point);
    }
    // Anchor historical balances to the authoritative current material balance. This
    // avoids assuming the ledger starts at zero when older movement history is absent.
    let laterMovement = 0;
    for (const point of [...periods.values()].sort((a, b) => b.date.localeCompare(a.date))) {
      const currentPeriodDelta = [...movementsByDate.entries()]
        .filter(([date]) => periodFor(date, interval, lang).key === point.date)
        .reduce((sum, [, delta]) => sum + delta, 0);
      point.stock = Number(item?.stock_current ?? 0) - laterMovement;
      laterMovement += currentPeriodDelta;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffText = cutoff.toISOString().slice(0, 10);
    const visiblePeriods = [...periods.values()].filter(
      (point) => days === 0 || String(point.date) >= cutoffText
    );
    return visiblePeriods;
  }, [history, days, interval, lang, item?.stock_current]);

  const movementSummary = useMemo(
    () =>
      chartData.reduce(
        (result, point) => ({
          incoming: result.incoming + Number(point.incoming),
          outgoing: result.outgoing + Number(point.outgoing),
          transfer: result.transfer + Number(point.transfer),
          netChange: result.netChange + Number(point.netChange),
        }),
        { incoming: 0, outgoing: 0, transfer: 0, netChange: 0 }
      ),
    [chartData]
  );

  const showBarValues = chartData.length <= 18;
  const formatBarValue = (value: unknown) =>
    Number(value) === 0 ? "" : Number(value).toLocaleString();

  if (loading)
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-sm text-text-muted">
        {lang === "cn" ? "正在加载物料分析…" : "Loading material analysis…"}
      </div>
    );
  if (error || !item)
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        {error || (lang === "cn" ? "未找到物料。" : "Material not found.")}
      </div>
    );

  const uom = formatUomDisplay({ code: item.uom_code, name_cn: item.uom_name_cn }, lang);
  const name = localizedName(item, lang);
  const status =
    item.min_stock > 0 && item.stock_current <= item.min_stock ? "Low stock" : "Normal";
  const copy = lang === "cn"
    ? {
        loading: "正在加载物料分析…",
        notFound: "未找到物料。",
        lowStock: "库存偏低",
        normal: "正常",
        currentStock: "当前库存",
        minimumStock: "最低库存",
        category: "类别",
        locations: "存储位置数",
        movement: "库存收发",
        stockTrend: "库存趋势",
        movementDescription: "按所选周期比较入库、出库和调拨数量。",
        stockDescription: "每个周期结束时的库存余额。",
        incoming: "入库",
        outgoing: "出库",
        transfers: "调拨",
        netChange: "净变化",
        inOut: "收发",
        stockLevel: "库存水平",
        day: "日",
        week: "周",
        month: "月",
        all: "全部",
        closingStock: "期末库存",
        minimum: "最低库存",
        noData: "此时间段没有数据。",
        stockByLocation: "按位置查看库存",
        movementLedger: "物料移动记录",
        date: "日期",
        document: "单据",
        type: "类型",
        fromTo: "来源 / 去向",
        qty: "数量",
        user: "操作人",
        noBalance: "没有库存余额。",
      }
    : {
        loading: "Loading material analysis…",
        notFound: "Material not found.",
        lowStock: "Low stock",
        normal: "Normal",
        currentStock: "Current stock",
        minimumStock: "Minimum stock",
        category: "Category",
        locations: "Storage locations",
        movement: "Stock in / out",
        stockTrend: "Stock balance trend",
        movementDescription: "Compare incoming, outgoing, and transfer quantities by period.",
        stockDescription: "Closing stock balance for each selected period.",
        incoming: "Incoming",
        outgoing: "Outgoing",
        transfers: "Transfers",
        netChange: "Net change",
        inOut: "In / out",
        stockLevel: "Stock level",
        day: "Day",
        week: "Week",
        month: "Month",
        all: "All",
        closingStock: "Closing stock",
        minimum: "Minimum",
        noData: "No data for this period.",
        stockByLocation: "Stock by location",
        movementLedger: "Movement ledger",
        date: "Date",
        document: "Document",
        type: "Type",
        fromTo: "From / To",
        qty: "Qty",
        user: "User",
        noBalance: "No stock balance.",
      };

  return (
    <SparepartGate
      allow={(access) => access.canViewSparepartMaterials || access.canViewSparepartStock}
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="mt-0.5 text-base font-semibold leading-tight text-text">
              {item.code} · {name}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              {localizedField(item.brand_en, item.brand_cn, lang) || "-"} · {item.model || "-"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Normal" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
          >
            {status === "Normal" ? copy.normal : copy.lowStock}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            [copy.currentStock, `${item.stock_current} ${uom}`],
            [copy.minimumStock, `${item.min_stock} ${uom}`],
            [
              copy.category,
              localizedName(
                { name_en: item.category_name_en ?? null, name_cn: item.category_name_cn ?? null },
                lang
              ) ||
                item.category_code ||
                "-",
            ],
            [copy.locations, String(item.balances?.length || 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
              <p className="mt-0.5 text-base font-semibold leading-tight text-text">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text">
                {chartView === "movement" ? copy.movement : copy.stockTrend}
              </h2>
              <p className="text-xs text-text-muted">
                {chartView === "movement"
                  ? copy.movementDescription
                  : copy.stockDescription}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border-subtle bg-bg p-0.5">
                {([
                  ["movement", copy.inOut],
                  ["stock", copy.stockLevel],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChartView(value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${chartView === value ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {([
                  ["day", copy.day],
                  ["week", copy.week],
                  ["month", copy.month],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setInterval(value)}
                    className={`rounded-md px-2 py-1 text-xs ${interval === value ? "bg-surface-hover font-semibold text-text" : "text-text-muted hover:text-text"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {[
                  [30, "30D"],
                  [90, "90D"],
                  [365, "1Y"],
                  [0, copy.all],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDays(Number(value))}
                    className={`rounded-md px-2 py-1 text-xs ${days === value ? "bg-accent/10 font-semibold text-accent" : "text-text-muted hover:bg-surface-hover"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {chartView === "movement" ? (
            <div className="mb-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                [copy.incoming, movementSummary.incoming, "text-success"],
                [copy.outgoing, Math.abs(movementSummary.outgoing), "text-danger"],
                [copy.transfers, movementSummary.transfer, "text-violet-600"],
                [copy.netChange, movementSummary.netChange, "text-accent"],
              ] as const).map(([label, value, color]) => (
                <div key={String(label)} className="rounded-md bg-bg/70 px-2.5 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
                  <p className={`text-sm font-semibold tabular-nums ${color}`}>
                    {label === copy.netChange && Number(value) > 0 ? "+" : ""}{Number(value).toLocaleString()} {uom}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="h-48 sm:h-52">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartView === "movement" ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 14, right: 18, left: 4, bottom: 4 }}
                    barCategoryGap="32%"
                    barGap={8}
                  >
                    <defs>
                      <linearGradient id="movement-incoming" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity={0.86} />
                      </linearGradient>
                      <linearGradient id="movement-outgoing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={1} />
                        <stop offset="100%" stopColor="#fb7185" stopOpacity={0.86} />
                      </linearGradient>
                      <linearGradient id="movement-transfer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.86} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#dbe3ef" strokeDasharray="4 6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={22}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                    />
                    <Tooltip
                      content={<MovementChartTooltip uom={uom} lang={lang} />}
                      cursor={{ fill: "#eff6ff", opacity: 0.65 }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingBottom: 12 }}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="incoming" name={copy.incoming} fill="url(#movement-incoming)" radius={[6, 6, 2, 2]} maxBarSize={42}>
                      {showBarValues ? <LabelList dataKey="incoming" position="top" formatter={formatBarValue} style={{ fill: "#15803d", fontSize: 10, fontWeight: 600 }} /> : null}
                    </Bar>
                    <Bar dataKey="outgoing" name={copy.outgoing} fill="url(#movement-outgoing)" radius={[2, 2, 6, 6]} maxBarSize={42}>
                      {showBarValues ? <LabelList dataKey="outgoing" position="bottom" formatter={(value) => Number(value) === 0 ? "" : Math.abs(Number(value)).toLocaleString()} style={{ fill: "#b91c1c", fontSize: 10, fontWeight: 600 }} /> : null}
                    </Bar>
                    <Bar dataKey="transfer" name={copy.transfers} fill="url(#movement-transfer)" radius={[6, 6, 2, 2]} maxBarSize={42}>
                      {showBarValues ? <LabelList dataKey="transfer" position="top" formatter={formatBarValue} style={{ fill: "#6d28d9", fontSize: 10, fontWeight: 600 }} /> : null}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
                    <Tooltip formatter={(value) => [`${value} ${uom}`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={item.min_stock} stroke="#f87171" strokeDasharray="5 4" label={copy.minimum} />
                    <Line type="monotone" dataKey="stock" name={copy.closingStock} stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                {copy.noData}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-2 lg:grid-cols-[1fr_2fr]">
          <section className="rounded-lg border border-border-subtle bg-surface px-3 py-2">
            <h2 className="mb-2 text-sm font-semibold text-text">{copy.stockByLocation}</h2>
            <div className="space-y-2">
              {item.balances?.length ? (
                item.balances.map((balance) => (
                  <div
                    key={balance.id}
                    className="flex justify-between border-b border-border-subtle pb-1.5 text-xs last:border-0"
                  >
                    <span>
                      {balance.location_code} ·{" "}
                      {localizedName(
                        {
                          name_en: balance.location_name_en ?? null,
                          name_cn: balance.location_name_cn ?? null,
                        },
                        lang
                      )}
                    </span>
                    <strong>
                      {balance.qty} {uom}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">{copy.noBalance}</p>
              )}
            </div>
          </section>
          <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-text">{copy.movementLedger}</h2>
            </div>
            <div className="max-h-32 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-bg">
                  <tr>
                    {[copy.date, copy.document, copy.type, copy.fromTo, copy.qty, copy.user].map((head) => (
                      <th key={head} className="px-3 py-2 text-text-dim">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((row) => (
                    <tr
                      key={`${row.doc_id}-${row.posting_date}-${row.qty}`}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.posting_date.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2">{row.doc_number}</td>
                      <td className="px-3 py-2 font-semibold">{row.movement_type}</td>
                      <td className="px-3 py-2">
                        {row.from_location_code || "-"}
                        {row.to_location_code ? ` → ${row.to_location_code}` : ""}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.qty} {uom}
                      </td>
                      <td className="px-3 py-2">{row.created_by || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </SparepartGate>
  );
}
