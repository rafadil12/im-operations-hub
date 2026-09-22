import type { Lang } from "@/lib/types";
import type { StockLevelStatus } from "@/lib/sparepart/categories";

/** Excel report headers (old stock-status spreadsheet wording — not UI labels). */
export const STOCK_STATUS_REPORT_HEADERS = {
  en: {
    category: "Category",
    materialCode: "Material code",
    materialName: "Material name",
    brand: "Brand",
    model: "Model",
    inboundThisMonth: "Inbound this month",
    lastInboundDate: "Last inbound date",
    consumptionThisMonth: "Consumption this month",
    lastOutboundDate: "Last outbound date",
    currentStock: "Current stock",
    minStock: "Min stock",
    stockStatus: "Stock status",
    amount: "Amount",
  },
  cn: {
    category: "分类",
    materialCode: "物料编码",
    materialName: "物料名称",
    brand: "品牌",
    model: "型号",
    inboundThisMonth: "本月入库数",
    lastInboundDate: "最后入库日",
    consumptionThisMonth: "本月消耗数",
    lastOutboundDate: "最后出库日",
    currentStock: "当前库存数",
    minStock: "最低库存数",
    stockStatus: "库存状态",
    amount: "金额",
  },
} as const;

export type StockStatusReportHeaderKey = keyof typeof STOCK_STATUS_REPORT_HEADERS.en;

/** Status labels for the Excel report only (UI keeps Critical/Low/Normal). */
export const STOCK_STATUS_REPORT_STATUS_LABELS: Record<
  Lang,
  Record<StockLevelStatus, string>
> = {
  en: {
    critical: "Insufficient stock",
    low: "Low stock",
    normal: "Normal",
  },
  cn: {
    critical: "库存不足",
    low: "低库存",
    normal: "正常",
  },
};

export function stockStatusReportHeaders(lang: Lang) {
  return STOCK_STATUS_REPORT_HEADERS[lang] ?? STOCK_STATUS_REPORT_HEADERS.en;
}

export function stockStatusReportStatusLabel(status: StockLevelStatus, lang: Lang): string {
  return STOCK_STATUS_REPORT_STATUS_LABELS[lang]?.[status] ?? STOCK_STATUS_REPORT_STATUS_LABELS.en[status];
}

/** Calendar-month bounds for MySQL datetime comparisons (local server clock). */
export function currentMonthBounds(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { start: fmt(start), end: fmt(end) };
}

/** Report date cell: CN `YYYY年M月D日`, EN `D Mon YYYY`. Empty → blank. */
export function formatStockReportDate(value: string | null | undefined, lang: Lang): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.replace("T", " ").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (lang === "cn") {
    return `${year}年${month}月${day}日`;
  }
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[month - 1] ?? match[2]} ${year}`;
}
