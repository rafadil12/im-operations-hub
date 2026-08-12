"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImportIcon } from "@/components/ui/ActionIcons";
import { useToast } from "@/components/ui/ToastProvider";
import { ImportItemsModal } from "@/components/sparepart/ImportItemsModal";
import { ItemForm } from "@/components/sparepart/ItemForm";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import {
  StockTable,
  type PageSize,
  type SortDir,
  type SortKey,
} from "@/components/sparepart/StockTable";
import { sortSparepartItems } from "@/lib/sparepartSort";

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ListResponse = { rows: SparepartItem[] };

export default function MaterialMasterPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const {
    canCreateSparepartMaterial,
    canUpdateSparepartMaterial,
    canDeleteSparepartMaterial,
    canImportSparepartMaterials,
    canDownloadSparepartTemplate,
  } = useRoleAccess();
  const [rows, setRows] = useState<SparepartItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editRow, setEditRow] = useState<SparepartItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<SparepartItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        const data = await apiGetAbs<ListResponse>(
          `/api/sparepart/materials?${params.toString()}`,
        );
        setRows(data.rows);
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
    load("");
  }, [load]);

  const sortedRows = useMemo(
    () => sortSparepartItems(rows, sortKey, sortDir),
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

  const uploadMaterialImage = async (itemId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/sparepart/materials/${itemId}/image`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error || t.toast.saveFailed,
      );
    }
  };

  const removeMaterialImage = async (itemId: number) => {
    await apiSendAbs(`/api/sparepart/materials/${itemId}/image`, "DELETE");
  };

  const handleCreate = async (
    input: SparepartItemInput,
    extras: { file: File | null; removeImage: boolean },
  ) => {
    const created = await apiSendAbs<{ id: number }>(
      "/api/sparepart/materials",
      "POST",
      input,
    );
    if (extras.file) {
      await uploadMaterialImage(created.id, extras.file);
    }
    setFormOpen(false);
    setEditRow(null);
    toastSuccess(t.toast.createSuccess);
    await load(q);
  };

  const handleUpdate = async (
    input: SparepartItemInput,
    extras: { file: File | null; removeImage: boolean },
  ) => {
    if (!editRow) return;
    await apiSendAbs(`/api/sparepart/materials/${editRow.id}`, "PUT", input);
    if (extras.removeImage && !extras.file) {
      await removeMaterialImage(editRow.id);
    } else if (extras.file) {
      await uploadMaterialImage(editRow.id, extras.file);
    }
    setFormOpen(false);
    setEditRow(null);
    toastSuccess(t.toast.updateSuccess);
    await load(q);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await apiSendAbs(`/api/sparepart/materials/${deleteRow.id}`, "DELETE");
      setDeleteRow(null);
      toastSuccess(t.toast.updateSuccess);
      await load(q);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setDeleting(false);
    }
  };

  const downloadBlob = async (url: string, filename: string) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(t.toast.exportFailed);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const field =
    "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
  const toolbarBtn =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60";

  return (
    <SparepartGate allow={(a) => a.canViewSparepartMaterials}>
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.sparepart.materialsTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.sparepart.materialsDesc}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canDownloadSparepartTemplate ? (
          <button
            type="button"
            onClick={async () => {
              setTemplateDownloading(true);
              try {
                await downloadBlob(
                  "/api/sparepart/materials/template",
                  "sparepart-template.xlsx",
                );
              } catch (e) {
                toastError(
                  e instanceof Error
                    ? e.message
                    : t.toast.templateDownloadFailed,
                );
              } finally {
                setTemplateDownloading(false);
              }
            }}
            disabled={templateDownloading}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {t.common.downloadTemplate}
          </button>
          ) : null}
          {canImportSparepartMaterials ? (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className={toolbarBtn}
          >
            <ImportIcon className="size-3.5" />
            {t.common.import}
          </button>
          ) : null}
          {canCreateSparepartMaterial ? (
          <button
            type="button"
            onClick={() => {
              setEditRow(null);
              setFormOpen(true);
            }}
            className={toolbarBtn}
          >
            + {t.common.add}
          </button>
          ) : null}
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load(q);
              }
            }}
            placeholder={t.sparepart.materialsSearchHint}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load(q);
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
          onEdit={
            canUpdateSparepartMaterial
              ? (row) => {
                  setEditRow(row);
                  setFormOpen(true);
                }
              : undefined
          }
          onDelete={canDeleteSparepartMaterial ? setDeleteRow : undefined}
          variant="master"
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      )}

      {formOpen &&
      (editRow ? canUpdateSparepartMaterial : canCreateSparepartMaterial) ? (
        <ItemForm
          initial={editRow}
          onClose={() => {
            setFormOpen(false);
            setEditRow(null);
          }}
          onSubmit={editRow ? handleUpdate : handleCreate}
        />
      ) : null}

      {importOpen && canImportSparepartMaterials ? (
        <ImportItemsModal
          onClose={() => setImportOpen(false)}
          onImported={async (count) => {
            setImportOpen(false);
            toastSuccess(
              t.toast.importSuccess.replace("{count}", String(count)),
            );
            await load(q);
          }}
        />
      ) : null}

      {deleteRow && canDeleteSparepartMaterial ? (
        <ConfirmDialog
          title={t.confirmDelete.title}
          message={t.confirmDelete.message}
          busy={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
    </SparepartGate>
  );
}
