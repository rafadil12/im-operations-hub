"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet} from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import type { ItsmRequest } from "@/lib/types";
import { FilterBar, type Filters } from "@/components/itsm/FilterBar";
import {
  ManagementTable,
  type PageSize,
} from "@/components/itsm/ManagementTable";

const week = getOperationalWeek();
const defaultFilters: Filters = {
  start: week.start.slice(0, 10),
  end: week.end.slice(0, 10),
  requestId: "",
  subject: "",
  requester: "",
  technician: "",
};

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ListResponse = { rows: ItsmRequest[] };

export default function ManagementPage() {
  const { t } = useLang();
  const [rows, setRows] = useState<ItsmRequest[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRows = useCallback(async (f: Filters) => {
  setLoading(true);
  setError(null);

  try {
    const params = new URLSearchParams();

    params.set("start", f.start);
    params.set("end", f.end);

    if (f.requestId) params.set("requestId", f.requestId);
    if (f.subject) params.set("subject", f.subject);
    if (f.requester) params.set("requester", f.requester);
    if (f.technician) params.set("technician", f.technician);

    const data = await apiGet<ListResponse>(
      `/itsm-request?${params.toString()}`,
        "itsm"
    );
    console.log(data.rows);
    console.log(data.rows.length);
    console.log(data.rows.map(r => r.request_id));

    setRows(data.rows);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Failed to load.");
  } finally {
    setLoading(false);
  }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    loadRows(defaultFilters);
  }, [loadRows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const applyFilters = (f: Filters) => {
    setFilters(f);
    setPage(1);
    loadRows(f);
  };

  const handlePageSizeChange = (nextSize: PageSize) => {
        setPageSize(nextSize);
        setPage(1);
      };
      const handleImport = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = e.target.files?.[0];

      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/itsm/itsm-request/import", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error ?? "Import failed.");
          return;
        }

        alert(
          `Import Success!

    Imported : ${data.imported}
    Updated : ${data.updated}`
        );

        await loadRows(filters);
      } catch (err) {
        console.error(err);
        alert("Import failed.");
      }

      e.target.value = "";
    };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.itsm.manageTitle}</h1>
          <p className="text-sm text-text-muted">{t.itsm.manageDesc}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
             {t.common.import}
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = `/api/itsm/itsm-request/export?${new URLSearchParams({
                start: filters.start,
                end: filters.end,
                requestId: filters.requestId,
                subject: filters.subject,
                requester: filters.requester,
                technician: filters.technician,
              }).toString()}`;
            }}
            className="cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t.common.export}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <FilterBar initial={defaultFilters} onApply={applyFilters} />

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
  <ManagementTable
    rows={pagedRows}
    totalCount={rows.length}
    page={currentPage}
    pageSize={pageSize}
    onPageChange={setPage}
    onPageSizeChange={handlePageSizeChange}
  />
)}
</div>
  );
}