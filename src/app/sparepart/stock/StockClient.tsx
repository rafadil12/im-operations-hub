"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { localizedName, useLang } from "@/lib/i18n";
import type { SparepartCategory, SparepartItem, SparepartStockBalanceRow } from "@/lib/types";
import { MaterialDetailModal } from "@/components/sparepart/MaterialDetailModal";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { SkeletonTable } from "@/components/ui/skeletons";
import { ExportIcon, NotesIcon } from "@/components/ui/ActionIcons";
import { useToast } from "@/components/ui/ToastProvider";
import {
  StockTable,
  type PageSize,
  type SortDir,
  type SortKey,
} from "@/components/sparepart/StockTable";
import { sortStockBalanceRows } from "@/lib/sparepart/sort";
import type { StockLevelStatus } from "@/lib/sparepart/categories";

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ExportKind = "standard" | "stock-report";

function ExportChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={`ml-0.5 size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StockResponse = {
  rows: SparepartStockBalanceRow[];
  locations: string[];
  locationOptions?: { code: string; name_en: string; name_cn: string }[];
};

type StockFilters = {
  q: string;
  location: string;
  category: string;
  status: "" | StockLevelStatus;
};

export default function StockOverviewPage() {
  const { t, lang } = useLang();
  const { error: toastError } = useToast();
  const { canExportSparepartMaterials, canPostSparepartDocument } = useRoleAccess();
  const [rows, setRows] = useState<SparepartStockBalanceRow[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationOptionsRaw, setLocationOptionsRaw] = useState<
    { code: string; name_en: string; name_cn: string }[]
  >([]);
  const [categories, setCategories] = useState<SparepartCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"" | StockLevelStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detail, setDetail] = useState<SparepartItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (filters: StockFilters) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        if (filters.location) params.set("location", filters.location);
        if (filters.category) params.set("category", filters.category);
        if (filters.status) params.set("status", filters.status);
        const data = await apiGetAbs<StockResponse>(`/api/sparepart/stock?${params.toString()}`);
        setRows(data.rows);
        setLocations(data.locations);
        setLocationOptionsRaw(data.locationOptions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      } finally {
        setLoading(false);
      }
    },
    [t.common.error]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load({ q: "", location: "", category: "", status: "" });
    apiGetAbs<{ rows: SparepartCategory[] }>("/api/sparepart/categories")
      .then((data) => {
        setCategories(data.rows);
        setCategoriesError(null);
      })
      .catch((err) => {
        setCategories([]);
        setCategoriesError(err instanceof Error ? err.message : t.common.error);
      });
  }, [load]);

  const sortedRows = useMemo(
    () => sortStockBalanceRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir]
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
        `/api/sparepart/materials/${row.item_id}`
      );
      setDetail(data.row);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    }
  };

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportMenuOpen]);

  const handleExport = async (kind: ExportKind) => {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const url =
        kind === "stock-report"
          ? `/api/sparepart/stock/export-report?lang=${lang}`
          : `/api/sparepart/materials/export?lang=${lang}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(t.toast.exportFailed);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download =
        kind === "stock-report" ? "sparepart-stock-status-report.xlsx" : "sparepart-export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const field =
    "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
  const toolbarBtn =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60";
  const locationOptions = [
    { value: "", label: t.common.all },
    ...(locationOptionsRaw.length
      ? locationOptionsRaw.map((loc) => ({
          value: loc.code,
          label: `${loc.code} — ${localizedName(loc, lang)}`,
        }))
      : locations.map((loc) => ({ value: loc, label: loc }))),
  ];
  const categoryOptions = [
    { value: "", label: t.sparepart.allCategories },
    ...categories.map((row) => ({
      value: row.code,
      label: localizedName(row, lang),
    })),
  ];
  const statusOptions = [
    { value: "", label: t.common.all },
    { value: "critical", label: t.sparepart.statusCritical },
    { value: "low", label: t.sparepart.statusLow },
    { value: "normal", label: t.sparepart.statusNormal },
  ];

  const applyFilters = () => {
    setPage(1);
    load({ q, location, category, status });
  };

  return (
    <SparepartGate allow={(a) => a.canViewSparepartStock}>
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t.sparepart.stockTitle}</h1>
            <p className="text-sm text-text-muted">{t.sparepart.stockDesc}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canExportSparepartMaterials ? (
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((open) => !open)}
                  disabled={exporting || loading}
                  aria-expanded={exportMenuOpen}
                  aria-haspopup="menu"
                  className={toolbarBtn}
                >
                  <ExportIcon className="size-3.5" />
                  {exporting ? t.common.exporting : t.common.export}
                  <ExportChevron open={exportMenuOpen} />
                </button>
                {exportMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-30 mt-1 min-w-[11.5rem] overflow-hidden rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleExport("standard")}
                      className="flex w-full px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                    >
                      {t.sparepart.exportStandard}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleExport("stock-report")}
                      className="flex w-full px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-hover hover:text-text"
                    >
                      {t.sparepart.exportStockReport}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {canPostSparepartDocument ? (
              <Link href="/sparepart/post" className={toolbarBtn}>
                <NotesIcon className="size-3.5" />
                {t.sparepart.goPost}
              </Link>
            ) : null}
          </div>
        </div>

        {categoriesError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {categoriesError}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.common.search}
            </label>
            <input
              className={`${field} w-full`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder={t.sparepart.stockSearchHint}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.category}
            </label>
            <SparepartDropdown
              className="w-full"
              compact
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              placeholder={t.sparepart.allCategories}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.location}
            </label>
            <SparepartDropdown
              className="w-full"
              compact
              value={location}
              onChange={setLocation}
              options={locationOptions}
              placeholder={t.common.all}
            />
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-[10px] uppercase text-text-dim">
              {t.sparepart.stockStatus}
            </label>
            <SparepartDropdown
              className="w-full"
              compact
              value={status}
              onChange={(next) => setStatus((next || "") as "" | StockLevelStatus)}
              options={statusOptions}
              placeholder={t.common.all}
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

        {detail ? <MaterialDetailModal item={detail} onClose={() => setDetail(null)} /> : null}
      </div>
    </SparepartGate>
  );
}
