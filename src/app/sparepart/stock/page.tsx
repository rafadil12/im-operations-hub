"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartStockBalanceRow } from "@/lib/types";
import { MaterialDetailModal } from "@/components/sparepart/MaterialDetailModal";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import {
  StockTable,
  type PageSize,
  type SortDir,
  type SortKey,
} from "@/components/sparepart/StockTable";
import { sortStockBalanceRows } from "@/lib/sparepartSort";

const DEFAULT_PAGE_SIZE: PageSize = 10;

type StockResponse = {
  rows: SparepartStockBalanceRow[];
  summary: { totalItems: number; zeroStock: number; totalCurrent: number };
  locations: string[];
  locationOptions?: { code: string; name: string }[];
};

export default function StockOverviewPage() {
  const { t } = useLang();
  const [rows, setRows] = useState<SparepartStockBalanceRow[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    zeroStock: 0,
    totalCurrent: 0,
  });
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detail, setDetail] = useState<SparepartItem | null>(null);

  const load = useCallback(
    async (filters: { q: string; location: string; lowStock: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        if (filters.location) params.set("location", filters.location);
        if (filters.lowStock) params.set("lowStock", "1");
        const data = await apiGetAbs<StockResponse>(
          `/api/sparepart/stock?${params.toString()}`,
        );
        setRows(data.rows);
        setSummary(data.summary);
        setLocations(data.locations);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      } finally {
        setLoading(false);
      }
    },
    [t.common.error],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load({ q: "", location: "", lowStock: false });
  }, [load]);

  const sortedRows = useMemo(
    () => sortStockBalanceRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSortChange = (key: SortKey | null, dir: SortDir | null) => {
    setSortKey(key);
    if (dir) setSortDir(dir);
    setPage(1);
  };

  const openDetail = async (row: SparepartStockBalanceRow) => {
    try {
      const data = await apiGetAbs<{ row: SparepartItem }>(
        `/api/sparepart/materials/${row.item_id}`,
      );
      setDetail(data.row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    }
  };

  const field =
    "rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const locationOptions = [
    { value: "", label: t.common.all },
    ...locations.map((loc) => ({ value: loc, label: loc })),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.sparepart.stockTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.sparepart.stockDesc}</p>
        </div>
        <Link
          href="/sparepart/post"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t.sparepart.goPost}
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-text-dim">
            {t.sparepart.totalItems}
          </p>
          <p className="mt-1 text-xl font-semibold text-text">
            {summary.totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-text-dim">
            {t.sparepart.zeroStock}
          </p>
          <p className="mt-1 text-xl font-semibold text-text">
            {summary.zeroStock}
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-text-dim">
            {t.sparepart.totalUnits}
          </p>
          <p className="mt-1 text-xl font-semibold text-text">
            {summary.totalCurrent}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.common.search}
          </label>
          <input
            className={`${field} w-full`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.sparepart.stockSearchHint}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.sparepart.location}
          </label>
          <SparepartDropdown
            className="w-full"
            value={location}
            onChange={setLocation}
            options={locationOptions}
            placeholder={t.common.all}
          />
        </div>
        <label className="mb-2 flex items-center gap-2 text-[10px] uppercase text-text-dim">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
          />
          {t.sparepart.lowStockOnly}
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load({ q, location, lowStock });
          }}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
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
      ) : (
        <StockTable
          rows={pagedRows}
          totalCount={sortedRows.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          variant="stock"
          readOnly
          onRowClick={(row) => {
            if ("item_id" in row) openDetail(row);
          }}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      )}

      {detail ? (
        <MaterialDetailModal item={detail} onClose={() => setDetail(null)} />
      ) : null}
    </div>
  );
}
