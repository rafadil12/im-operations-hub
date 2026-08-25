"use client";

import { localizedField, useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import { formatDisplay } from "@/lib/datetime";
import type { MesDataRow } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type Props = {
  rows: MesDataRow[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onEdit?: (row: MesDataRow) => void;
  onDelete?: (row: MesDataRow) => void;
};

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 align-top text-xs text-text-muted";

export function ManagementTable({
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: Props) {
  const { lang, t } = useLang();

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.noData}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-border-subtle bg-bg/40">
            <tr>
              <th className={th}>{t.fields.pic}</th>
              <th className={th}>{t.fields.division}</th>
              <th className={th}>{t.fields.category}</th>
              <th className={th}>{t.fields.description}</th>
              <th className={th}>{t.fields.solution}</th>
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
                <td className={`${td} max-w-xs`}>
                  <span className="line-clamp-2">
                    {localizedField(row.solution_en, row.solution_cn, lang)}
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
                <td className={`${td} whitespace-nowrap`}>{formatDisplay(row.start_time)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDisplay(row.end_time)}</td>
                <td className={`${td} whitespace-nowrap`}>
                  {onEdit || onDelete ? (
                    <div className="flex gap-1.5">
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="rounded border border-border px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
                        >
                          {t.common.edit}
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                        >
                          {t.common.delete}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-text-dim">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5 text-xs text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span>{t.common.rowsPerPage}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-accent"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span>{fillTemplate(t.common.showingRange, { from, to, total: totalCount })}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>{fillTemplate(t.common.pageOf, { page, total: totalPages })}</span>
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.common.previous}
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
