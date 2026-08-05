"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type { SparepartStorageLocation } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { Modal } from "@/components/ui/Modal";

type ListResponse = { rows: SparepartStorageLocation[] };

export default function StorageLocationsPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const [rows, setRows] = useState<SparepartStorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SparepartStorageLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetAbs<ListResponse>(
        "/api/sparepart/storage-locations?active=0",
      );
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setCode("");
    setName("");
    setIsActive(true);
  };

  const openEdit = (row: SparepartStorageLocation) => {
    setEditing(row);
    setCreating(false);
    setCode(row.code);
    setName(row.name);
    setIsActive(Boolean(row.is_active));
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await apiSendAbs("/api/sparepart/storage-locations", "PUT", {
          id: editing.id,
          code: code.trim(),
          name: name.trim(),
          is_active: isActive,
        });
      } else {
        await apiSendAbs("/api/sparepart/storage-locations", "POST", {
          code: code.trim() || undefined,
          name: name.trim(),
          is_active: isActive,
        });
      }
      toastSuccess(editing ? t.toast.updateSuccess : t.toast.createSuccess);
      closeForm();
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (row: SparepartStorageLocation) => {
    if (!confirm(t.common.confirmDelete)) return;
    try {
      await apiSendAbs(
        `/api/sparepart/storage-locations?id=${row.id}`,
        "DELETE",
      );
      toastSuccess(t.toast.updateSuccess);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.saveFailed);
    }
  };

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";
  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-3 py-2 text-xs text-text-muted";

  const showForm = creating || editing;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.sparepart.locationsTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.sparepart.locationsDesc}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t.common.add}
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
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-border-subtle bg-bg/40">
              <tr>
                <th className={th}>{t.sparepart.locationCode}</th>
                <th className={th}>{t.sparepart.locationName}</th>
                <th className={th}>{t.sparepart.locationActive}</th>
                <th className={th}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-subtle/60 last:border-0"
                >
                  <td className={`${td} font-medium text-text`}>{row.code}</td>
                  <td className={td}>{row.name}</td>
                  <td className={td}>
                    {row.is_active ? t.common.yes : t.common.no}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="mr-2 text-accent hover:underline"
                    >
                      {t.common.edit}
                    </button>
                    {row.is_active ? (
                      <button
                        type="button"
                        onClick={() => deactivate(row)}
                        className="text-danger hover:underline"
                      >
                        {t.common.delete}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <Modal
          title={editing ? t.common.edit : t.common.add}
          onClose={closeForm}
          closeDisabled={busy}
          footer={
            <>
              <button
                type="button"
                onClick={closeForm}
                disabled={busy}
                className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:opacity-60"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={busy || !name.trim()}
                onClick={save}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? t.common.loading : t.common.save}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className={label}>{t.sparepart.locationCode}</label>
              <input
                className={field}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AUTO"
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.locationName} *</label>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t.sparepart.locationActive}
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
