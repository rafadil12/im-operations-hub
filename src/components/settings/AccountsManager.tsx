"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { DEFAULT_PASSWORD } from "@/lib/auth/constants";
import { useLang } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { SettingsTabs } from "./SettingsTabs";

type RoleOption = {
  id: number;
  name: string;
  description: string | null;
  permissionIds: number[];
};

type AccountRow = {
  id: number;
  userId: number;
  employeeNo: string | null;
  nameEn: string | null;
  nameCn: string | null;
  isActive: boolean;
  roleId: number | null;
  roleName: string | null;
  lastLoginAt: string | null;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";
const th =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 text-xs text-text-muted";

export function AccountsManager() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AccountRow | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, rolesRes] = await Promise.all([
        apiGetAbs<{ rows: AccountRow[] }>("/api/settings/accounts"),
        apiGetAbs<{ rows: RoleOption[] }>("/api/settings/roles"),
      ]);
      setRows(accountsRes.rows);
      setRoles(rolesRes.rows);
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
    setEditRow(null);
    setFormError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const openEdit = (row: AccountRow) => {
    setEditRow(row);
    setRoleId(row.roleId);
    setIsActive(row.isActive);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
  };

  const submit = async () => {
    if (!editRow) return;

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setFormError(t.auth.passwordMismatch);
        return;
      }
      if (password !== DEFAULT_PASSWORD && password.length < 8) {
        setFormError(t.auth.passwordTooShort);
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      const body: {
        role_id: number | null;
        is_active: boolean;
        password?: string;
        confirm_password?: string;
      } = {
        role_id: roleId,
        is_active: isActive,
      };
      if (password) {
        body.password = password;
        body.confirm_password = confirmPassword;
      }
      await apiSendAbs(`/api/settings/accounts/${editRow.id}`, "PUT", body);
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const displayName = (row: AccountRow) => {
    if (lang === "cn") return row.nameCn || row.nameEn || row.employeeNo || "-";
    return row.nameEn || row.nameCn || row.employeeNo || "-";
  };

  return (
    <div>
      <SettingsTabs />

      <div className="mb-4">
        <h1 className="text-lg font-semibold text-text">
          {t.settings.accountsTitle}
        </h1>
        <p className="text-sm text-text-muted">{t.settings.accountsDesc}</p>
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
                <th className={th}>{t.settings.roleName}</th>
                <th className={th}>{t.settings.active}</th>
                <th className={th}>{t.settings.lastLogin}</th>
                <th className={th}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={`${td} py-8 text-center`} colSpan={6}>
                    {t.common.noData}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                  >
                    <td className={`${td} text-text`}>
                      {row.employeeNo ?? "-"}
                    </td>
                    <td className={td}>{displayName(row)}</td>
                    <td className={td}>{row.roleName ?? t.common.none}</td>
                    <td className={td}>
                      {row.isActive ? t.settings.yes : t.settings.no}
                    </td>
                    <td className={td}>{row.lastLoginAt ?? "-"}</td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                      >
                        {t.common.edit}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editRow ? (
        <Modal
          title={t.common.edit}
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
              <label className={labelCls}>{t.settings.employeeNo}</label>
              <p className="text-sm text-text">{editRow.employeeNo ?? "-"}</p>
            </div>
            <div>
              <label className={labelCls}>{t.settings.accountName}</label>
              <p className="text-sm text-text">{displayName(editRow)}</p>
            </div>
            <div>
              <label className={labelCls}>{t.settings.roleName}</label>
              <select
                className={inputCls}
                value={roleId ?? ""}
                onChange={(e) =>
                  setRoleId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">{t.common.none}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-text">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {t.settings.active}
              </label>
            </div>
            <div className="border-t border-border-subtle pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-text">
                  {t.settings.resetPassword}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(DEFAULT_PASSWORD);
                    setConfirmPassword(DEFAULT_PASSWORD);
                    setFormError(null);
                  }}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                >
                  {t.settings.resetToDefaultPassword}
                </button>
              </div>
              <p className="mb-3 text-[11px] text-text-dim">
                {t.settings.passwordOptionalHint}
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls} htmlFor="admin-new-password">
                    {t.settings.newPassword}
                  </label>
                  <input
                    id="admin-new-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="admin-confirm-password">
                    {t.settings.confirmPassword}
                  </label>
                  <input
                    id="admin-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
