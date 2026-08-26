"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend, getApiErrorMessage } from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";
import { FilterBar, type Filters } from "@/components/daily-operation/FilterBar";
import { ActivitiesTable, type PageSize } from "@/components/daily-operation/ActivitiesTable";
import { ImportMesDataModal } from "@/components/daily-operation/ImportMesDataModal";
import { MesDataForm } from "@/components/daily-operation/MesDataForm";
import { ExportIcon, ImportIcon } from "@/components/ui/ActionIcons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const week = getOperationalWeek();
const defaultFilters: Filters = {
  start: week.start.slice(0, 10),
  end: week.end.slice(0, 10),
  divisionId: "",
  statusId: "",
  typeId: "",
  q: "",
};

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ListResponse = { rows: MesDataRow[] };

export default function ManagementPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const {
    canImportDailyRecord,
    canExportDailyRecord,
    canDownloadDailyTemplate,
    canAddDailyRecord,
    canUpdateDailyRecord,
    canDeleteDailyRecord,
  } = useRoleAccess();
  const [masters, setMasters] = useState<Masters | null>(null);
  const [rows, setRows] = useState<MesDataRow[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editRow, setEditRow] = useState<MesDataRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<MesDataRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("start", f.start);
      params.set("end", f.end);
      if (f.divisionId) params.set("divisionId", f.divisionId);
      if (f.statusId) params.set("statusId", f.statusId);
      if (f.typeId) params.set("typeId", f.typeId);
      if (f.q) params.set("q", f.q);
      const data = await apiGet<ListResponse>(`/mes-record?${params.toString()}`);
      setRows(data.rows);
    } catch (e) {
      setError(getApiErrorMessage(e) || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiGet<Masters>("/masters")
      .then(setMasters)
      .catch((e) => setError(getApiErrorMessage(e) || "Failed to load masters."));
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

  const handleCreate = async (input: MesDataInput) => {
    try {
      await apiSend("/mes-record", "POST", input);
      setFormOpen(false);
      setEditRow(null);
      toastSuccess(t.toast.createSuccess);
      await loadRows(filters);
    } catch (e) {
      const message =
        e instanceof TypeError
          ? t.toast.networkError
          : e instanceof Error
            ? e.message
            : t.toast.saveFailed;
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const handleUpdate = async (input: MesDataInput) => {
    if (!editRow) return;
    try {
      await apiSend(`/mes-record/${editRow.id}`, "PUT", input);
      setFormOpen(false);
      setEditRow(null);
      toastSuccess(t.toast.updateSuccess);
      await loadRows(filters);
    } catch (e) {
      const message =
        e instanceof TypeError
          ? t.toast.networkError
          : e instanceof Error
            ? e.message
            : t.toast.saveFailed;
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await apiSend(`/mes-record/${deleteRow.id}`, "DELETE");
      setDeleteRow(null);
      await loadRows(filters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const res = await fetch("/api/daily-operation/mes-record/template", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(t.toast.templateDownloadFailed);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daily-activities-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.templateDownloadFailed);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleExport = async () => {
    if (rows.length === 0) {
      toastError(t.toast.exportEmpty);
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("start", filters.start);
      params.set("end", filters.end);
      if (filters.divisionId) params.set("divisionId", filters.divisionId);
      if (filters.statusId) params.set("statusId", filters.statusId);
      if (filters.typeId) params.set("typeId", filters.typeId);
      if (filters.q) params.set("q", filters.q);

      const res = await fetch(`/api/daily-operation/mes-record/export?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? t.toast.exportFailed);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `daily-activities-export_${filters.start}_${filters.end}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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

  const handleImported = async (count: number) => {
    setImportOpen(false);
    toastSuccess(t.toast.importSuccess.replace("{count}", String(count)));
    await loadRows(filters);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.dailyOp.manageTitle}</h1>
          <p className="text-sm text-text-muted">{t.dailyOp.manageDesc}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canDownloadDailyTemplate ? (
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={templateDownloading}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
            >
              {t.common.downloadTemplate}
            </button>
          ) : null}
          {canExportDailyRecord ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <ExportIcon className="size-3.5" />
              {exporting ? t.common.exporting : t.common.export}
            </button>
          ) : null}
          {canImportDailyRecord ? (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={!masters}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <ImportIcon className="size-3.5" />
              {t.common.import}
            </button>
          ) : null}
          {canAddDailyRecord ? (
            <button
              type="button"
              onClick={() => {
                setEditRow(null);
                setFormOpen(true);
              }}
              disabled={!masters}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              + {t.common.add}
            </button>
          ) : null}
        </div>
      </div>

      <FilterBar masters={masters} initial={defaultFilters} onApply={applyFilters} />

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
        <ActivitiesTable
          rows={pagedRows}
          totalCount={rows.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onEdit={
            canUpdateDailyRecord
              ? (row) => {
                  setEditRow(row);
                  setFormOpen(true);
                }
              : undefined
          }
          onDelete={canDeleteDailyRecord ? (row) => setDeleteRow(row) : undefined}
        />
      )}

      {formOpen && masters ? (
        <MesDataForm
          masters={masters}
          initial={editRow}
          onClose={() => {
            setFormOpen(false);
            setEditRow(null);
          }}
          onSubmit={editRow ? handleUpdate : handleCreate}
        />
      ) : null}

      {importOpen && canImportDailyRecord ? (
        <ImportMesDataModal onClose={() => setImportOpen(false)} onImported={handleImported} />
      ) : null}

      {deleteRow ? (
        <ConfirmDialog
          title={t.confirmDelete.title}
          message={t.confirmDelete.message}
          busy={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
