import type { Lang } from "@/lib/types";

export type ExportFileKind =
  | "sparepartMaterials"
  | "sparepartStockStatus"
  | "sparepartDocuments"
  | "sparepartMovementHistory"
  | "trainingSessions"
  | "dailyActivities";

const BASE_NAMES: Record<ExportFileKind, Record<Lang, string>> = {
  sparepartMaterials: {
    en: "sparepart-export.xlsx",
    cn: "备件导出.xlsx",
  },
  sparepartStockStatus: {
    en: "sparepart-stock-status-report.xlsx",
    cn: "备件库存状态报表.xlsx",
  },
  sparepartDocuments: {
    en: "sparepart-transaction-history.xlsx",
    cn: "备件事务凭证.xlsx",
  },
  sparepartMovementHistory: {
    en: "sparepart-movement-history.xlsx",
    cn: "备件移动历史.xlsx",
  },
  trainingSessions: {
    en: "training-sessions.xlsx",
    cn: "培训记录.xlsx",
  },
  dailyActivities: {
    en: "daily-activities-export.xlsx",
    cn: "日常活动导出.xlsx",
  },
};

export function exportFilename(
  kind: ExportFileKind,
  lang: Lang,
  opts?: { start?: string; end?: string }
): string {
  const base = BASE_NAMES[kind][lang] ?? BASE_NAMES[kind].en;
  if (kind === "dailyActivities" && opts?.start && opts?.end) {
    const extIdx = base.lastIndexOf(".");
    const stem = extIdx >= 0 ? base.slice(0, extIdx) : base;
    const ext = extIdx >= 0 ? base.slice(extIdx) : ".xlsx";
    return `${stem}_${opts.start}_${opts.end}${ext}`;
  }
  return base;
}

/** Build Content-Disposition with ASCII fallback + RFC 5987 UTF-8 filename*. */
export function contentDispositionAttachment(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/"/g, "")
      .trim() || "export.xlsx";
  const encoded = encodeURIComponent(filename).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Prefer filename* (UTF-8), then quoted filename=. */
export function parseContentDispositionFilename(
  header: string | null | undefined
): string | null {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ""));
    } catch {
      return star[1].trim();
    }
  }
  const plain = header.match(/filename\s*=\s*"([^"]+)"/i) ?? header.match(/filename\s*=\s*([^;]+)/i);
  return plain?.[1]?.trim() ?? null;
}
