"use client";

import type { AccountRow } from "./accountsTypes";
import { accountsTd as td, accountsTh as th } from "./accountsTypes";
import type { Dict } from "@/lib/i18n";

type Props = {
  rows: AccountRow[];
  t: Dict;
  displayName: (row: AccountRow) => string;
  onEdit: (row: AccountRow) => void;
};

export function AccountsTable({ rows, t, displayName, onEdit }: Props) {
  return (
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
                <td className={`${td} text-text`}>{row.employeeNo ?? "-"}</td>
                <td className={td}>{displayName(row)}</td>
                <td className={td}>{row.roleName ?? t.common.none}</td>
                <td className={td}>{row.isActive ? t.settings.yes : t.settings.no}</td>
                <td className={td}>{row.lastLoginAt ?? "-"}</td>
                <td className={td}>
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
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
  );
}
