"use client";

import { isProtectedAccountEmployeeNo } from "@/lib/auth/access";
import { localizedName, type Dict } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import type { AccountRow, DivisionOption, RoleOption } from "./accountsTypes";
import { accountsInputCls as inputCls, accountsLabelCls as labelCls } from "./accountsTypes";

type Props = {
  t: Dict;
  lang: "en" | "cn";
  addOpen: boolean;
  editRow: AccountRow | null;
  assignableRoles: RoleOption[];
  divisions: DivisionOption[];
  employeeNo: string;
  nameEn: string;
  nameCn: string;
  divisionId: number | null;
  roleId: number | null;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  formError: string | null;
  temporaryPassword: string | null;
  saving: boolean;
  setEmployeeNo: (v: string) => void;
  setNameEn: (v: string) => void;
  setNameCn: (v: string) => void;
  setDivisionId: (v: number | null) => void;
  setRoleId: (v: number | null) => void;
  setIsActive: (v: boolean) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  displayName: (row: AccountRow) => string;
  onClose: () => void;
  onSubmit: (generateTemporaryPassword: boolean) => void;
};

export function AccountFormModal({
  t,
  lang,
  addOpen,
  editRow,
  assignableRoles,
  divisions,
  employeeNo,
  nameEn,
  nameCn,
  divisionId,
  roleId,
  isActive,
  password,
  confirmPassword,
  formError,
  temporaryPassword,
  saving,
  setEmployeeNo,
  setNameEn,
  setNameCn,
  setDivisionId,
  setRoleId,
  setIsActive,
  setPassword,
  setConfirmPassword,
  displayName,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Modal
      title={addOpen ? t.settings.addAccount : t.common.edit}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {temporaryPassword ? t.common.close : t.common.cancel}
          </button>
          {!temporaryPassword ? (
            <button
              type="button"
              onClick={() => onSubmit(false)}
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
            <p className="mb-2 font-medium">{t.settings.temporaryPasswordShown}</p>
            <code className="block break-all rounded bg-bg/60 px-2 py-1.5 font-mono text-sm text-text">
              {temporaryPassword}
            </code>
            <p className="mt-2 text-[11px] text-text-dim">{t.settings.temporaryPasswordHint}</p>
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
                onChange={(e) => setDivisionId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t.common.none}</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {localizedName({ name_en: division.nameEn, name_cn: division.nameCn }, lang)}
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
              Boolean(editRow && isProtectedAccountEmployeeNo(editRow.employeeNo))
            }
            onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
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
                Boolean(editRow && isProtectedAccountEmployeeNo(editRow.employeeNo))
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
                {addOpen ? t.settings.newPassword : t.settings.resetPassword}
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSubmit(true)}
                className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-60"
              >
                {t.settings.generateTemporaryPassword}
              </button>
            </div>
            {addOpen ? null : (
              <p className="mb-3 text-[11px] text-text-dim">{t.settings.passwordOptionalHint}</p>
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
  );
}
