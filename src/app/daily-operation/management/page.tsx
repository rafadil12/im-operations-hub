"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import { getOperationalWeek } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";
import { FilterBar, type Filters } from "@/components/daily-operation/FilterBar";
import { ManagementTable } from "@/components/daily-operation/ManagementTable";
import { MesDataForm } from "@/components/daily-operation/MesDataForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const week = getOperationalWeek();
const defaultFilters: Filters = {
  start: week.start.slice(0, 10),
  end: week.end.slice(0, 10),
  divisionId: "",
  statusId: "",
  typeId: "",
  q: "",
};

type ListResponse = { rows: MesDataRow[] };

export default function ManagementPage() {
  const { t } = useLang();
  const [masters, setMasters] = useState<Masters | null>(null);
  const [rows, setRows] = useState<MesDataRow[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
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
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiGet<Masters>("/masters")
      .then(setMasters)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load masters."));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    loadRows(defaultFilters);
  }, [loadRows]);

  const applyFilters = (f: Filters) => {
    setFilters(f);
    loadRows(f);
  };

  const handleCreate = async (input: MesDataInput) => {
    await apiSend("/mes-record", "POST", input);
    setFormOpen(false);
    setEditRow(null);
    await loadRows(filters);
  };

  const handleUpdate = async (input: MesDataInput) => {
    if (!editRow) return;
    await apiSend(`/mes-record/${editRow.id}`, "PUT", input);
    setFormOpen(false);
    setEditRow(null);
    await loadRows(filters);
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.dailyOp.manageTitle}</h1>
          <p className="text-sm text-text-muted">{t.dailyOp.manageDesc}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
          disabled={!masters}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          + {t.common.add}
        </button>
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
        <ManagementTable
          rows={rows}
          onEdit={(row) => {
            setEditRow(row);
            setFormOpen(true);
          }}
          onDelete={(row) => setDeleteRow(row)}
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
