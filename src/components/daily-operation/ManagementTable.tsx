"use client";

import { localizedField, useLang } from "@/lib/i18n";
import { formatDisplay } from "@/lib/datetime";
import type { MesDataRow } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Props = {
  rows: MesDataRow[];
  onEdit: (row: MesDataRow) => void;
  onDelete: (row: MesDataRow) => void;
};

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 align-top text-xs text-text-muted";

export function ManagementTable({ rows, onEdit, onDelete }: Props) {
  const { lang, t } = useLang();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.noData}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-border-subtle bg-bg/40">
          <tr>
            <th className={th}>{t.fields.pic}</th>
            <th className={th}>{t.fields.division}</th>
            <th className={th}>{t.fields.category}</th>
            <th className={th}>{t.fields.description}</th>
            <th className={th}>{t.fields.type}</th>
            <th className={th}>{t.fields.status}</th>
            <th className={th}>{t.fields.startTime}</th>
            <th className={th}>{t.fields.endTime}</th>
            <th className={th}>{t.common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
            >
              <td className={`${td} whitespace-nowrap text-text`}>
                {localizedField(row.pic_en, row.pic_cn, lang)}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {localizedField(row.division_en, row.division_cn, lang)}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {localizedField(row.category_en, row.category_cn, lang)}
                {row.subcategory_en || row.subcategory_cn ? (
                  <span className="block text-[10px] text-text-dim">
                    {localizedField(row.subcategory_en, row.subcategory_cn, lang)}
                  </span>
                ) : null}
              </td>
              <td className={`${td} max-w-xs`}>
                <span className="line-clamp-2">
                  {localizedField(row.description_en, row.description_cn, lang)}
                </span>
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {localizedField(row.type_en, row.type_cn, lang)}
              </td>
              <td className={td}>
                <StatusBadge
                  label={localizedField(row.status_en, row.status_cn, lang)}
                  toneKey={row.status_en}
                />
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {formatDisplay(row.start_time)}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                {formatDisplay(row.end_time)}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    {t.common.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                  >
                    {t.common.delete}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
