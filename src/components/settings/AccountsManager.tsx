"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { isProtectedAccountEmployeeNo, isProtectedRoleName } from "@/lib/auth/access";
import { useLang } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsTabs } from "./SettingsTabs";
import { AccountFormModal } from "./accounts/AccountFormModal";
import { AccountsTable } from "./accounts/AccountsTable";
import type { AccountRow, DivisionOption, RoleOption } from "./accounts/accountsTypes";

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
  const [deleteRow, setDeleteRow] = useState<AccountRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employeeNo, setEmployeeNo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameCn, setNameCn] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const assignableRoles = roles.filter((role) => {
    if (!isProtectedRoleName(role.name)) return true;
    return Boolean(editRow && isProtectedAccountEmployeeNo(editRow.employeeNo));
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, rolesRes] = await Promise.all([
        apiGetAbs<{ rows: AccountRow[]; divisions?: DivisionOption[] }>("/api/settings/accounts"),
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

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    setError(null);
    try {
      await apiSendAbs(`/api/settings/accounts/${deleteRow.id}`, "DELETE");
      setDeleteRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setDeleteRow(null);
    } finally {
      setDeleting(false);
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
          <h1 className="text-lg font-semibold text-text">{t.settings.accountsTitle}</h1>
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
        <AccountsTable
          rows={rows}
          t={t}
          displayName={displayName}
          onEdit={openEdit}
          onDelete={setDeleteRow}
        />
      )}

      {modalOpen ? (
        <AccountFormModal
          t={t}
          lang={lang}
          addOpen={addOpen}
          editRow={editRow}
          assignableRoles={assignableRoles}
          divisions={divisions}
          employeeNo={employeeNo}
          nameEn={nameEn}
          nameCn={nameCn}
          divisionId={divisionId}
          roleId={roleId}
          isActive={isActive}
          password={password}
          confirmPassword={confirmPassword}
          formError={formError}
          temporaryPassword={temporaryPassword}
          saving={saving}
          setEmployeeNo={setEmployeeNo}
          setNameEn={setNameEn}
          setNameCn={setNameCn}
          setDivisionId={setDivisionId}
          setRoleId={setRoleId}
          setIsActive={setIsActive}
          setPassword={setPassword}
          setConfirmPassword={setConfirmPassword}
          displayName={displayName}
          onClose={closeForm}
          onSubmit={(generate) => void (addOpen ? submitAdd(generate) : submitEdit(generate))}
        />
      ) : null}

      {deleteRow ? (
        <ConfirmDialog
          title={t.confirmDelete.title}
          message={t.settings.deleteAccountConfirm}
          busy={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}
