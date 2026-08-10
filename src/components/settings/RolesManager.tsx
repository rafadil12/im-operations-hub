"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PermissionTreePicker } from "./PermissionTreePicker";
import { SettingsTabs } from "./SettingsTabs";

type Permission = {
  id: number;
  code: string;
  description: string | null;
};

type RoleRow = {
  id: number;
  name: string;
  description: string | null;
  permissionIds: number[];
};

type FormState = {
  name: string;
  description: string;
  permissionIds: number[];
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";
const th =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 text-xs text-text-muted";

export function RolesManager() {
  const { t } = useLang();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<RoleRow | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    permissionIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiGetAbs<{ rows: RoleRow[] }>("/api/settings/roles"),
        apiGetAbs<{ rows: Permission[] }>("/api/settings/permissions"),
      ]);
      setRows(rolesRes.rows);
      setPermissions(permsRes.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void load();
  }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditRow(null);
    setFormError(null);
  };

  const openAdd = () => {
    setEditRow(null);
    setForm({ name: "", description: "", permissionIds: [] });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: RoleRow) => {
    setEditRow(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      permissionIds: [...row.permissionIds],
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError(t.common.required);
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim().toLowerCase(),
        description: form.description.trim() || null,
        permissionIds: form.permissionIds,
      };
      if (editRow) {
        await apiSendAbs(`/api/settings/roles/${editRow.id}`, "PUT", body);
      } else {
        await apiSendAbs("/api/settings/roles", "POST", body);
      }
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await apiSendAbs(`/api/settings/roles/${deleteRow.id}`, "DELETE");
      setDeleteRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setDeleting(false);
    }
  };

  const permissionLabel = (id: number) => {
    const p = permissions.find((x) => x.id === id);
    return p?.description?.trim() || p?.code || String(id);
  };

  return (
    <div>
      <SettingsTabs />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.settings.rolesTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.settings.rolesDesc}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + {t.common.add}
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
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-border-subtle bg-bg/40">
              <tr>
                <th className={th}>{t.settings.roleName}</th>
                <th className={th}>{t.settings.roleDescription}</th>
                <th className={th}>{t.settings.permissions}</th>
                <th className={th}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={`${td} py-8 text-center`} colSpan={4}>
                    {t.common.noData}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                  >
                    <td className={`${td} font-medium text-text`}>{row.name}</td>
                    <td className={td}>{row.description ?? "-"}</td>
                    <td className={td}>
                      <span className="text-text">
                        {row.permissionIds.length}
                      </span>
                      <span className="ml-1 text-text-dim">
                        (
                        {row.permissionIds
                          .slice(0, 3)
                          .map(permissionLabel)
                          .join(", ")}
                        {row.permissionIds.length > 3 ? "…" : ""})
                      </span>
                    </td>
                    <td className={td}>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRow(row)}
                          disabled={row.name === "superadmin"}
                          className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10 disabled:opacity-40"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <Modal
          title={editRow ? t.common.edit : t.common.add}
          onClose={closeForm}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? t.common.loading : t.common.save}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3">
            {formError ? (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {formError}
              </p>
            ) : null}
            <div>
              <label className={labelCls}>{t.settings.roleName}</label>
              <input
                className={inputCls}
                value={form.name}
                disabled={editRow?.name === "superadmin"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. operator"
              />
            </div>
            <div>
              <label className={labelCls}>{t.settings.roleDescription}</label>
              <input
                className={inputCls}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>{t.settings.permissions}</label>
              <PermissionTreePicker
                permissions={permissions}
                selectedIds={form.permissionIds}
                onChange={(permissionIds) =>
                  setForm((f) => ({ ...f, permissionIds }))
                }
              />
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteRow ? (
        <ConfirmDialog
          title={t.confirmDelete.title}
          message={t.settings.deleteRoleConfirm}
          busy={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
