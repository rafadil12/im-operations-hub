"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGetAbs } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import type { SparepartMatDoc } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { ExportIcon } from "@/components/ui/ActionIcons";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/components/sparepart/StockTable";
import {
  DOCUMENTS_TD as td,
  DOCUMENTS_TH as th,
  formatPostingDateOnly,
  movementLabel,
} from "@/lib/sparepart/documentDisplay";
import { DocumentDetailModal } from "./DocumentDetailModal";

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ListResponse = { rows: SparepartMatDoc[] };
type DetailResponse = { document: SparepartMatDoc };

export default function MaterialDocumentsPage() {
  const { t, lang } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const { canReverseSparepartDocument } = useRoleAccess();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SparepartMatDoc[]>([]);
  const [q, setQ] = useState("");
  const [movementType, setMovementType] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [detail, setDetail] = useState<SparepartMatDoc | null>(null);
  const [reversing, setReversing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (filters: {
      q: string;
      movementType: string;
      location: string;
      start: string;
      end: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        if (filters.movementType) params.set("movementType", filters.movementType);
        if (filters.location) params.set("location", filters.location);
        if (filters.start) params.set("start", filters.start);
        if (filters.end) params.set("end", filters.end);
        const data = await apiGetAbs<ListResponse>(`/api/sparepart/documents?${params.toString()}`);
        setRows(data.rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
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
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      }
    },
    [t.common.error]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load({ q: "", movementType: "", location: "", start: "", end: "" });
  }, [load]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opens detail from URL param
      void openDetail(Number(id));
    }
  }, [searchParams, openDetail]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (movementType) params.set("movementType", movementType);
      if (location) params.set("location", location);
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const res = await fetch(`/api/sparepart/documents/export?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(t.toast.exportFailed);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sparepart-transaction-history.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.exportFailed);
    } finally {
      setExporting(false);
    }
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

  return (
    <SparepartGate allow={(a) => a.canViewSparepartDocuments}>
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t.sparepart.documentsTitle}</h1>
            <p className="text-sm text-text-muted">{t.sparepart.documentsDesc}</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className={toolbarBtn}
          >
            <ExportIcon className="size-3.5" />
            {exporting ? t.common.exporting : t.common.export}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.common.search}
            </label>
            <input
              className={`${field} w-full`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load({ q, movementType, location, start, end });
                }
              }}
              placeholder={t.sparepart.documentsSearchHint}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.movementType}
            </label>
            <SparepartDropdown
              compact
              value={movementType}
              onChange={setMovementType}
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.to}</label>
            <input
              type="date"
              className={field}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              load({ q, movementType, location, start, end });
            }}
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
          <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
            {t.common.loading}
          </div>
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
                    <th className={th}>{t.sparepart.docNumber}</th>
                    <th className={th}>{t.sparepart.movementType}</th>
                    <th className={th}>{t.sparepart.date}</th>
                    <th className={th}>{t.sparepart.recipient}</th>
                    <th className={th}>{t.sparepart.headerText}</th>
                    <th className={th}>{t.sparepart.lines}</th>
                    <th className={th}>{t.sparepart.totalQty}</th>
                    <th className={th}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                    >
                      <td className={`${td} font-medium text-text`}>{row.doc_number}</td>
                      <td className={td}>{movementLabel(row.movement_type, t)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        {formatPostingDateOnly(row.posting_date)}
                      </td>
                      <td className={td}>{row.recipient || "-"}</td>
                      <td className={`${td} max-w-xs`}>
                        <span className="line-clamp-2">{row.header_text || "-"}</span>
                      </td>
                      <td className={`${td} tabular-nums`}>{row.line_count ?? 0}</td>
                      <td className={`${td} tabular-nums`}>{row.total_qty ?? 0}</td>
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() => openDetail(row.id)}
                          className="text-accent hover:underline"
                        >
                          {t.sparepart.viewDocument}
                        </button>
                      </td>
                    </tr>
                  ))}
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
            onReversed={() => load({ q, movementType, location, start, end })}
            toastSuccess={toastSuccess}
            toastError={toastError}
          />
        ) : null}
      </div>
    </SparepartGate>
  );
}
