"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, getApiErrorMessage } from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import type { ItsmRequest } from "@/lib/types";
import { FilterBar, type Filters } from "@/components/itsm/FilterBar";
import {
  ImportItsmRequestModal,
  type ItsmImportResult,
} from "@/components/itsm/ImportItsmRequestModal";
import { ManagementTable, type PageSize } from "@/components/itsm/ManagementTable";
import { ExportIcon, ImportIcon } from "@/components/ui/ActionIcons";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";

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
  const { success: toastSuccess } = useToast();
  const { canImportItsmRequest, canExportItsmRequest } = useRoleAccess();
  const [rows, setRows] = useState<ItsmRequest[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [importOpen, setImportOpen] = useState(false);

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

      const data = await apiGet<ListResponse>(`/itsm-request?${params.toString()}`, "itsm");

      setRows(data.rows);
    } catch (e) {
      setError(getApiErrorMessage(e) || "Failed to load.");
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

  const handleImported = async (result: ItsmImportResult) => {
    setImportOpen(false);
    toastSuccess(
      t.itsm.importSuccess
        .replace("{imported}", String(result.imported))
        .replace("{updated}", String(result.updated))
        .replace("{total}", String(result.total))
    );
    await loadRows(filters);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.itsm.manageTitle}</h1>
          <p className="text-sm text-text-muted">{t.itsm.manageDesc}</p>
        </div>
        {canImportItsmRequest || canExportItsmRequest ? (
          <div className="flex gap-2">
            {canImportItsmRequest ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                <ImportIcon className="size-3.5" />
                {t.common.import}
              </button>
            ) : null}

            {canExportItsmRequest ? (
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
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                <ExportIcon className="size-3.5" />
                {t.common.export}
              </button>
            ) : null}
          </div>
        ) : null}
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

      {importOpen && canImportItsmRequest ? (
        <ImportItsmRequestModal onClose={() => setImportOpen(false)} onImported={handleImported} />
      ) : null}
    </div>
  );
}
