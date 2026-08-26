"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { Division, Masters } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MasterTabs } from "./MasterTabs";

type PicRow = {
  id: number;
  systemUserId: number;
  employeeNo: string | null;
  nameEn: string | null;
  nameCn: string | null;
  divisionId: number | null;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 text-xs text-text-muted";

function picLabel(row: PicRow, lang: "en" | "cn"): string {
  const name =
    lang === "cn"
      ? row.nameCn || row.nameEn || row.employeeNo || "-"
      : row.nameEn || row.nameCn || row.employeeNo || "-";
  return row.employeeNo ? `${row.employeeNo} — ${name}` : name;
}

export function PicManager() {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<PicRow[]>([]);
  const [candidates, setCandidates] = useState<PicRow[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [unassignRow, setUnassignRow] = useState<PicRow | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, masters] = await Promise.all([
        apiGet<{ rows: PicRow[]; candidates: PicRow[] }>("/users"),
        apiGet<Masters>("/masters"),
      ]);
      setRows(list.rows);
      setCandidates(list.candidates);
      setDivisions(masters.divisions);
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
    setFormError(null);
    setUserId(null);
    setDivisionId(null);
  };

  const openAssign = () => {
    setFormError(null);
    setUserId(candidates[0]?.id ?? null);
    const first = candidates[0];
    setDivisionId(first?.divisionId ?? null);
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError(null);
    if (!userId) {
      setFormError(t.common.required);
      return;
    }
    if (!divisionId) {
      setFormError(t.common.required);
      return;
    }
    setSaving(true);
    try {
      await apiSend("/users", "POST", {
        user_id: userId,
        division_id: divisionId,
      });
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const confirmUnassign = async () => {
    if (!unassignRow) return;
    setUnassigning(true);
    try {
      await apiSend(`/users/${unassignRow.id}`, "DELETE");
      setUnassignRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setUnassignRow(null);
    } finally {
      setUnassigning(false);
    }
  };

  const onPickAccount = (id: number | null) => {
    setUserId(id);
    const picked = candidates.find((c) => c.id === id);
    if (picked?.divisionId) setDivisionId(picked.divisionId);
  };

  return (
    <div>
      <MasterTabs />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{t.dailyOp.picTitle}</h1>
          <p className="text-sm text-text-muted">{t.dailyOp.picDesc}</p>
        </div>
        <button
          type="button"
          onClick={openAssign}
          disabled={loading || candidates.length === 0}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          + {t.dailyOp.assignPic}
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
                <th className={th}>{t.settings.employeeNo}</th>
                <th className={th}>{t.settings.accountName}</th>
                <th className={th}>{t.fields.division}</th>
                <th className={th}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={`${td} py-8 text-center`} colSpan={4}>
                    {t.dailyOp.picEmpty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                  >
                    <td className={`${td} text-text`}>{row.employeeNo ?? "-"}</td>
                    <td className={td}>
                      {lang === "cn"
                        ? row.nameCn || row.nameEn || "-"
                        : row.nameEn || row.nameCn || "-"}
                    </td>
                    <td className={td}>
                      {localizedName(
                        divisions.find((d) => d.id === row.divisionId),
                        lang
                      )}
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => setUnassignRow(row)}
                        className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                      >
                        {t.dailyOp.unassign}
                      </button>
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
          title={t.dailyOp.assignPic}
          onClose={closeForm}
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
                onClick={() => void submit()}
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
            {candidates.length === 0 ? (
              <p className="text-sm text-text-muted">{t.dailyOp.noPicCandidates}</p>
            ) : (
              <>
                <div>
                  <label className={labelCls}>{t.dailyOp.selectAccount}</label>
                  <select
                    className={inputCls}
                    value={userId ?? ""}
                    onChange={(e) => onPickAccount(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t.common.none}</option>
                    {candidates.map((row) => (
                      <option key={row.id} value={row.id}>
                        {picLabel(row, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    {t.fields.division}
                    <span className="text-danger"> *</span>
                  </label>
                  <select
                    className={inputCls}
                    value={divisionId ?? ""}
                    onChange={(e) => setDivisionId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t.common.none}</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {localizedName(d, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </Modal>
      ) : null}

      {unassignRow ? (
        <ConfirmDialog
          title={t.confirmDelete.title}
          message={t.dailyOp.unassignPicConfirm}
          busy={unassigning}
          onCancel={() => setUnassignRow(null)}
          onConfirm={confirmUnassign}
        />
      ) : null}
    </div>
  );
}
