"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { isProtectedAccountEmployeeNo, isProtectedRoleName } from "@/lib/auth/access";
import { localizedName, useLang } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { SettingsTabs } from "./SettingsTabs";

type RoleOption = {
  id: number;
  name: string;
  description: string | null;
  permissionIds: number[];
};

type DivisionOption = {
  id: number;
  nameEn: string | null;
  nameCn: string | null;
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
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<AccountRow | null>(null);
  const [employeeNo, setEmployeeNo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameCn, setNameCn] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  const assignableRoles = roles.filter((role) => {
    if (!isProtectedRoleName(role.name)) return true;
    return Boolean(
      editRow && isProtectedAccountEmployeeNo(editRow.employeeNo),
    );
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, rolesRes] = await Promise.all([
        apiGetAbs<{ rows: AccountRow[]; divisions?: DivisionOption[] }>(
          "/api/settings/accounts",
        ),
        apiGetAbs<{ rows: RoleOption[] }>("/api/settings/roles"),
      ]);
      setRows(accountsRes.rows);
      setDivisions(accountsRes.divisions ?? []);
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
    setAddOpen(false);
    setEditRow(null);
    setFormError(null);
    setEmployeeNo("");
    setNameEn("");
    setNameCn("");
    setDivisionId(null);
    setPassword("");
    setConfirmPassword("");
    setTemporaryPassword(null);
  };

  const openAdd = () => {
    setEditRow(null);
    setAddOpen(true);
    setEmployeeNo("");
    setNameEn("");
    setNameCn("");
    setDivisionId(null);
    setRoleId(null);
    setIsActive(true);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setTemporaryPassword(null);
  };

  const openEdit = (row: AccountRow) => {
    setAddOpen(false);
    setEditRow(row);
    setRoleId(row.roleId);
    setIsActive(row.isActive);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setTemporaryPassword(null);
  };

  const submitAdd = async (generateTemporaryPassword = false) => {
    if (!employeeNo.trim()) {
      setFormError(t.settings.employeeIdRequired);
      return;
    }
    if (!nameEn.trim() && !nameCn.trim()) {
      setFormError(t.common.required);
      return;
    }
    if (!generateTemporaryPassword) {
      if (!password) {
        setFormError(t.settings.passwordRequired);
        return;
      }
      if (password !== confirmPassword) {
        setFormError(t.auth.passwordMismatch);
        return;
      }
      if (password.length < 8) {
        setFormError(t.auth.passwordTooShort);
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      const body: {
        employee_no: string;
        name_en: string | null;
        name_cn: string | null;
        division_id: number | null;
        role_id: number | null;
        is_active: boolean;
        password?: string;
        confirm_password?: string;
        generate_temporary_password?: boolean;
      } = {
        employee_no: employeeNo.trim(),
        name_en: nameEn.trim() || null,
        name_cn: nameCn.trim() || null,
        division_id: divisionId,
        role_id: roleId,
        is_active: isActive,
      };
      if (generateTemporaryPassword) {
        body.generate_temporary_password = true;
      } else {
        body.password = password;
        body.confirm_password = confirmPassword;
      }
      const res = await apiSendAbs<{
        ok: true;
        temporaryPassword?: string;
      }>("/api/settings/accounts", "POST", body);
      if (res.temporaryPassword) {
        setTemporaryPassword(res.temporaryPassword);
        setPassword("");
        setConfirmPassword("");
        await load();
        return;
      }
      closeForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (generateTemporaryPassword = false) => {
    if (!editRow) return;

    if (!generateTemporaryPassword && (password || confirmPassword)) {
      if (password !== confirmPassword) {
        setFormError(t.auth.passwordMismatch);
        return;
      }
      if (password.length < 8) {
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
        generate_temporary_password?: boolean;
      } = {
        role_id: roleId,
        is_active: isActive,
      };
      if (generateTemporaryPassword) {
        body.generate_temporary_password = true;
      } else if (password) {
        body.password = password;
        body.confirm_password = confirmPassword;
      }
      const res = await apiSendAbs<{
        ok: true;
        temporaryPassword?: string;
      }>(`/api/settings/accounts/${editRow.id}`, "PUT", body);
      if (res.temporaryPassword) {
        setTemporaryPassword(res.temporaryPassword);
        setPassword("");
        setConfirmPassword("");
        await load();
        return;
      }
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

  const modalOpen = addOpen || Boolean(editRow);

  return (
    <div>
      <SettingsTabs />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.settings.accountsTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.settings.accountsDesc}</p>
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

      {modalOpen ? (
        <Modal
          title={addOpen ? t.settings.addAccount : t.common.edit}
          onClose={closeForm}
          footer={
            <>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
              >
                {temporaryPassword ? t.common.close : t.common.cancel}
              </button>
              {!temporaryPassword ? (
                <button
                  type="button"
                  onClick={() =>
                    void (addOpen ? submitAdd(false) : submitEdit(false))
                  }
                  disabled={saving}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? t.common.loading : t.common.save}
                </button>
              ) : null}
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3">
            {formError ? (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {formError}
              </p>
            ) : null}
            {temporaryPassword ? (
              <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-3 text-xs text-text">
                <p className="mb-2 font-medium">
                  {t.settings.temporaryPasswordShown}
                </p>
                <code className="block break-all rounded bg-bg/60 px-2 py-1.5 font-mono text-sm text-text">
                  {temporaryPassword}
                </code>
                <p className="mt-2 text-[11px] text-text-dim">
                  {t.settings.temporaryPasswordHint}
                </p>
              </div>
            ) : null}
            {addOpen ? (
              <>
                <div>
                  <label className={labelCls} htmlFor="account-employee-no">
                    {t.settings.employeeNo}
                  </label>
                  <input
                    id="account-employee-no"
                    className={inputCls}
                    value={employeeNo}
                    disabled={Boolean(temporaryPassword)}
                    onChange={(e) => setEmployeeNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="account-name-en">
                    {t.settings.nameEn}
                  </label>
                  <input
                    id="account-name-en"
                    className={inputCls}
                    value={nameEn}
                    disabled={Boolean(temporaryPassword)}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="account-name-cn">
                    {t.settings.nameCn}
                  </label>
                  <input
                    id="account-name-cn"
                    className={inputCls}
                    value={nameCn}
                    disabled={Boolean(temporaryPassword)}
                    onChange={(e) => setNameCn(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="account-division">
                    {t.settings.division}
                  </label>
                  <select
                    id="account-division"
                    className={inputCls}
                    value={divisionId ?? ""}
                    disabled={Boolean(temporaryPassword)}
                    onChange={(e) =>
                      setDivisionId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">{t.common.none}</option>
                    {divisions.map((division) => (
                      <option key={division.id} value={division.id}>
                        {localizedName(
                          { name_en: division.nameEn, name_cn: division.nameCn },
                          lang,
                        )}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : editRow ? (
              <>
                <div>
                  <label className={labelCls}>{t.settings.employeeNo}</label>
                  <p className="text-sm text-text">{editRow.employeeNo ?? "-"}</p>
                </div>
                <div>
                  <label className={labelCls}>{t.settings.accountName}</label>
                  <p className="text-sm text-text">{displayName(editRow)}</p>
                </div>
              </>
            ) : null}
            <div>
              <label className={labelCls}>{t.settings.roleName}</label>
              <select
                className={inputCls}
                value={roleId ?? ""}
                disabled={
                  Boolean(temporaryPassword) ||
                  Boolean(
                    editRow && isProtectedAccountEmployeeNo(editRow.employeeNo),
                  )
                }
                onChange={(e) =>
                  setRoleId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">{t.common.none}</option>
                {assignableRoles.map((role) => (
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
                  disabled={
                    Boolean(temporaryPassword) ||
                    Boolean(
                      editRow && isProtectedAccountEmployeeNo(editRow.employeeNo),
                    )
                  }
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {t.settings.active}
              </label>
            </div>
            {!temporaryPassword ? (
              <div className="border-t border-border-subtle pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-text">
                    {addOpen
                      ? t.settings.newPassword
                      : t.settings.resetPassword}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void (addOpen ? submitAdd(true) : submitEdit(true))
                    }
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-60"
                  >
                    {t.settings.generateTemporaryPassword}
                  </button>
                </div>
                {addOpen ? null : (
                  <p className="mb-3 text-[11px] text-text-dim">
                    {t.settings.passwordOptionalHint}
                  </p>
                )}
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
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
