"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { Category, Division, Masters } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MasterTabs } from "./MasterTabs";

type Relation = "division" | "category";

type MasterRow = {
  id: number;
  name_en: string | null;
  name_cn: string | null;
  division_id?: number | null;
  category_id?: number | null;
};

type FormState = {
  name_en: string;
  name_cn: string;
  relationId: number | null;
};

type Props = {
  title: string;
  description: string;
  endpoint: string; // e.g. "/users"
  relation: Relation;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 text-xs text-text-muted";

export function MasterManager({ title, description, endpoint, relation }: Props) {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [masters, setMasters] = useState<Masters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterRow | null>(null);
  const [form, setForm] = useState<FormState>({
    name_en: "",
    name_cn: "",
    relationId: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<MasterRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const relationOptions: (Division | Category)[] = masters
    ? relation === "division"
      ? masters.divisions
      : masters.categories
    : [];

  const relationLabel =
    relation === "division" ? t.fields.division : t.fields.category;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, m] = await Promise.all([
        apiGet<{ rows: MasterRow[] }>(endpoint),
        apiGet<Masters>("/masters"),
      ]);
      setRows(list.rows);
      setMasters(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    load();
  }, [load]);

  const relationNameFor = (row: MasterRow): string => {
    const id = relation === "division" ? row.division_id : row.category_id;
    if (!id || !masters) return "-";
    const source =
      relation === "division" ? masters.divisions : masters.categories;
    return localizedName(source.find((x) => x.id === id), lang);
  };

  const openAdd = () => {
    setEditRow(null);
    setForm({ name_en: "", name_cn: "", relationId: null });
    setFormOpen(true);
  };

  const openEdit = (row: MasterRow) => {
    setEditRow(row);
    setForm({
      name_en: row.name_en ?? "",
      name_cn: row.name_cn ?? "",
      relationId:
        (relation === "division" ? row.division_id : row.category_id) ?? null,
    });
    setFormOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.name_en.trim() && !form.name_cn.trim()) {
      setError(t.common.required);
      return;
    }
    setSaving(true);
    try {
      const body = {
        name_en: form.name_en.trim() || null,
        name_cn: form.name_cn.trim() || null,
        [relation === "division" ? "division_id" : "category_id"]:
          form.relationId,
      };
      if (editRow) {
        await apiSend(`${endpoint}/${editRow.id}`, "PUT", body);
      } else {
        await apiSend(endpoint, "POST", body);
      }
      setFormOpen(false);
      setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await apiSend(`${endpoint}/${deleteRow.id}`, "DELETE");
      setDeleteRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <MasterTabs />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={!masters}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
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
                <th className={th}>{t.fields.nameEn}</th>
                <th className={th}>{t.fields.nameCn}</th>
                <th className={th}>{relationLabel}</th>
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
                    <td className={`${td} text-text`}>{row.name_en ?? "-"}</td>
                    <td className={td}>{row.name_cn ?? "-"}</td>
                    <td className={td}>{relationNameFor(row)}</td>
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
                          className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
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
          onClose={() => setFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
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
            <div>
              <label className={labelCls}>{t.fields.nameEn}</label>
              <input
                className={inputCls}
                value={form.name_en}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_en: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>{t.fields.nameCn}</label>
              <input
                className={inputCls}
                value={form.name_cn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_cn: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>
                {relationLabel}
                {relation === "category" ? (
                  <span className="text-danger"> *</span>
                ) : null}
              </label>
              <select
                className={inputCls}
                value={form.relationId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    relationId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">{t.common.none}</option>
                {relationOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {localizedName(opt, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
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
