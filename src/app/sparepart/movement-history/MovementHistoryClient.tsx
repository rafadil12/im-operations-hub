"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { localizedField, useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import {
  DOCUMENTS_TD as td,
  DOCUMENTS_TH as th,
  appendLevelLabel,
  formatLocationLabel,
  formatPostingDateTime,
  movementLabel,
} from "@/lib/sparepart/documentDisplay";
import {
  DEFAULT_HISTORY_COLUMN_VISIBILITY,
  loadHistoryColumnVisibility,
  saveHistoryColumnVisibility,
  type MovementHistoryColumnId,
  type MovementHistoryColumnVisibility,
} from "@/lib/sparepart/movementHistoryColumns";
import { pad2, todayLocalDateInputValue } from "@/lib/sparepart/postDraft";
import { formatUomDisplay } from "@/lib/sparepart/uoms";
import { exportFilename } from "@/lib/exportFilenames";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/components/sparepart/StockTable";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import { MovementHistoryColumnFilter } from "@/components/sparepart/MovementHistoryColumnFilter";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { SkeletonTable } from "@/components/ui/skeletons";
import { ExportIcon } from "@/components/ui/ActionIcons";
import { useToast } from "@/components/ui/ToastProvider";
import type { SparepartMatDoc, SparepartMovementHistoryRow } from "@/lib/types";
import { DocumentDetailModal } from "../documents/DocumentDetailModal";

const DEFAULT_PAGE_SIZE: PageSize = 10;
const DEFAULT_RANGE_DAYS = 30;

type ListResponse = { rows: SparepartMovementHistoryRow[] };
type DetailResponse = { document: SparepartMatDoc };

type HistoryFilters = {
  q: string;
  itemId: string;
  movementType: string;
  location: string;
  start: string;
  end: string;
};

function localDateDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function defaultHistoryFilters(): HistoryFilters {
  return {
    q: "",
    itemId: "",
    movementType: "",
    location: "",
    start: localDateDaysAgo(DEFAULT_RANGE_DAYS),
    end: todayLocalDateInputValue(),
  };
}

function locationLabel(
  row: SparepartMovementHistoryRow,
  side: "from" | "to",
  lang: "en" | "cn"
): string {
  const label =
    side === "from"
      ? appendLevelLabel(
          formatLocationLabel(
            row.from_location_code,
            row.from_location_name_en,
            row.from_location_name_cn,
            lang
          ),
          row.from_level_code,
          row.from_level_name_en,
          row.from_level_name_cn,
          lang
        )
      : appendLevelLabel(
          formatLocationLabel(
            row.to_location_code,
            row.to_location_name_en,
            row.to_location_name_cn,
            lang
          ),
          row.to_level_code,
          row.to_level_name_en,
          row.to_level_name_cn,
          lang
        );
  return !label || label === "-" ? "—" : label;
}

export default function MovementHistoryPage() {
  const { t, lang } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const { canReverseSparepartDocument, canExportSparepartHistory } = useRoleAccess();
  const [filters, setFilters] = useState<HistoryFilters>(defaultHistoryFilters);
  const [applied, setApplied] = useState<HistoryFilters>(defaultHistoryFilters);
  const [rows, setRows] = useState<SparepartMovementHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [detail, setDetail] = useState<SparepartMatDoc | null>(null);
  const [reversing, setReversing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<MovementHistoryColumnVisibility>(
    DEFAULT_HISTORY_COLUMN_VISIBILITY
  );
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate column prefs from localStorage
    setColumnVisibility(loadHistoryColumnVisibility());
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    saveHistoryColumnVisibility(columnVisibility);
  }, [columnVisibility, prefsReady]);

  const load = useCallback(
    async (next: HistoryFilters) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (next.q) params.set("q", next.q);
        if (next.itemId) params.set("item_id", next.itemId);
        if (next.movementType) params.set("movementType", next.movementType);
        if (next.location) params.set("location", next.location);
        if (next.start) params.set("start", next.start);
        if (next.end) params.set("end", next.end);
        const data = await apiGetAbs<ListResponse>(
          `/api/sparepart/movement-history?${params.toString()}`
        );
        setRows(data.rows);
        setApplied(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.common.error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [t.common.error]
  );

  const openDetail = useCallback(
    async (id: number) => {
      try {
        const data = await apiGetAbs<DetailResponse>(`/api/sparepart/documents/${id}`);
        setDetail(data.document);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.common.error);
      }
    },
    [t.common.error]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void load(defaultHistoryFilters());
  }, [load]);

  const applyFilters = () => {
    setPage(1);
    void load(filters);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("lang", lang);
      if (applied.q) params.set("q", applied.q);
      if (applied.itemId) params.set("item_id", applied.itemId);
      if (applied.movementType) params.set("movementType", applied.movementType);
      if (applied.location) params.set("location", applied.location);
      if (applied.start) params.set("start", applied.start);
      if (applied.end) params.set("end", applied.end);
      const res = await fetch(`/api/sparepart/movement-history/export?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(t.toast.exportFailed);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename("sparepartMovementHistory", lang);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t.toast.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const setColumnVisible = (columnId: MovementHistoryColumnId, visible: boolean) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [columnId]: visible };
      const stillVisible = Object.values(next).some(Boolean);
      return stillVisible ? next : prev;
    });
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return rows.slice(startIdx, startIdx + pageSize);
  }, [rows, currentPage, pageSize]);

  const field =
    "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
  const toolbarBtn =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60";
  const movementTypeOptions = [
    { value: "", label: t.sparepart.allTypes },
    { value: "101", label: t.sparepart.movement101 },
    { value: "201", label: t.sparepart.movement201 },
    { value: "311", label: t.sparepart.movement311 },
    { value: "102", label: t.sparepart.movement102 },
    { value: "202", label: t.sparepart.movement202 },
    { value: "312", label: t.sparepart.movement312 },
  ];
  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((n) => ({
    value: String(n),
    label: String(n),
  }));

  const show = (id: MovementHistoryColumnId) => columnVisibility[id];

  return (
    <SparepartGate allow={(access) => access.canViewSparepartHistory}>
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t.sparepart.movementHistoryTitle}</h1>
            <p className="text-sm text-text-muted">{t.sparepart.movementHistoryDesc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MovementHistoryColumnFilter
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisible}
            />
            {canExportSparepartHistory ? (
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting || loading}
                className={toolbarBtn}
              >
                <ExportIcon className="size-3.5" />
                {exporting ? t.common.exporting : t.common.export}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.common.search}
            </label>
            <input
              className={`${field} w-full`}
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder={t.sparepart.movementHistorySearchHint}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.item}
            </label>
            <MaterialCombobox
              compact
              value={filters.itemId}
              onChange={(itemId) => setFilters((prev) => ({ ...prev, itemId }))}
              className={`${field} w-full`}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.movementType}
            </label>
            <SparepartDropdown
              compact
              value={filters.movementType}
              onChange={(movementType) => setFilters((prev) => ({ ...prev, movementType }))}
              options={movementTypeOptions}
              placeholder={t.sparepart.allTypes}
            />
          </div>
          <div className="w-[110px] shrink-0">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.location}
            </label>
            <input
              className={`${field} w-full`}
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              placeholder={t.sparepart.locationCode}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.fields.from}
            </label>
            <input
              type="date"
              className={field}
              value={filters.start}
              onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.to}</label>
            <input
              type="date"
              className={field}
              value={filters.end}
              onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <SkeletonTable />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
            {t.common.noData}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-border-subtle bg-bg/40">
                  <tr>
                    {show("date") ? <th className={th}>{t.sparepart.date}</th> : null}
                    {show("doc") ? <th className={th}>{t.sparepart.docNumber}</th> : null}
                    {show("line") ? <th className={th}>{t.sparepart.lineNo}</th> : null}
                    {show("materialCode") ? <th className={th}>{t.sparepart.code}</th> : null}
                    {show("description") ? <th className={th}>{t.sparepart.name}</th> : null}
                    {show("movementType") ? (
                      <th className={th}>{t.sparepart.movementType}</th>
                    ) : null}
                    {show("qty") ? <th className={th}>{t.sparepart.qty}</th> : null}
                    {show("uom") ? <th className={th}>{t.sparepart.uom}</th> : null}
                    {show("fromLocation") ? (
                      <th className={th}>{t.sparepart.fromLocation}</th>
                    ) : null}
                    {show("toLocation") ? <th className={th}>{t.sparepart.toLocation}</th> : null}
                    {show("user") ? <th className={th}>{t.sparepart.createdBy}</th> : null}
                    {show("note") ? <th className={th}>{t.sparepart.note}</th> : null}
                    <th className={th}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => {
                    const itemName = localizedField(row.item_name_en, row.item_name_cn, lang);
                    return (
                      <tr
                        key={`${row.doc_id}-${row.line_no}`}
                        className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                      >
                        {show("date") ? (
                          <td className={`${td} whitespace-nowrap`}>
                            {formatPostingDateTime(row.posting_date)}
                          </td>
                        ) : null}
                        {show("doc") ? (
                          <td className={`${td} font-medium text-text`}>{row.doc_number}</td>
                        ) : null}
                        {show("line") ? (
                          <td className={`${td} tabular-nums`}>{row.line_no}</td>
                        ) : null}
                        {show("materialCode") ? (
                          <td className={`${td} whitespace-nowrap font-medium text-text`}>
                            {row.item_code}
                          </td>
                        ) : null}
                        {show("description") ? (
                          <td className={`${td} max-w-xs`}>
                            <span className="line-clamp-2">{itemName !== "-" ? itemName : "—"}</span>
                          </td>
                        ) : null}
                        {show("movementType") ? (
                          <td className={td}>{movementLabel(row.movement_type, t)}</td>
                        ) : null}
                        {show("qty") ? (
                          <td className={`${td} tabular-nums`}>{row.qty}</td>
                        ) : null}
                        {show("uom") ? (
                          <td className={td}>
                            {formatUomDisplay(
                              { code: row.uom_code, name_cn: row.uom_name_cn },
                              lang
                            ) || "—"}
                          </td>
                        ) : null}
                        {show("fromLocation") ? (
                          <td className={td}>{locationLabel(row, "from", lang)}</td>
                        ) : null}
                        {show("toLocation") ? (
                          <td className={td}>{locationLabel(row, "to", lang)}</td>
                        ) : null}
                        {show("user") ? <td className={td}>{row.created_by || "—"}</td> : null}
                        {show("note") ? (
                          <td className={`${td} max-w-xs`}>
                            <span className="line-clamp-2">{row.note || "—"}</span>
                          </td>
                        ) : null}
                        <td className={td}>
                          <button
                            type="button"
                            onClick={() => void openDetail(row.doc_id)}
                            className="text-accent hover:underline"
                          >
                            {t.sparepart.viewDocument}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5">
              <p className="text-xs text-text-dim">
                {fillTemplate(t.common.showingRange, {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, rows.length),
                  total: rows.length,
                })}
              </p>
              <div className="flex items-center gap-2">
                <SparepartDropdown
                  compact
                  menuPlacement="top"
                  value={String(pageSize)}
                  onChange={(next) => {
                    setPageSize(Number(next) as PageSize);
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                  className="min-w-[4.5rem]"
                />
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.common.previous}
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.common.next}
                </button>
              </div>
            </div>
          </div>
        )}

        {detail ? (
          <DocumentDetailModal
            detail={detail}
            lang={lang}
            t={t}
            canReverse={canReverseSparepartDocument}
            reversing={reversing}
            onClose={() => setDetail(null)}
            onReversingChange={setReversing}
            onReversed={() => load(applied)}
            toastSuccess={toastSuccess}
            toastError={toastError}
          />
        ) : null}
      </div>
    </SparepartGate>
  );
}
