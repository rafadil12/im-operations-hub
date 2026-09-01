"use client";

import { useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import { formatDisplay } from "@/lib/datetime";
import type { ItsmRequest } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type Props = {
  rows: ItsmRequest[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
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
}: Props) {
  const { t } = useLang();

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
              <th className={th}>{t.itsm.requestId}</th>
              <th className={th}>{t.itsm.subject}</th>
              <th className={th}>{t.itsm.requester}</th>
              <th className={th}>{t.itsm.technician}</th>
              <th className={th}>{t.fields.status}</th>
              <th className={th}>{t.itsm.priority}</th>
              <th className={th}>{t.itsm.dueDate}</th>
              <th className={th}>{t.itsm.createdDate}</th>
              <th className={th}>{t.itsm.group}</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.request_id}
                className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
              >
                <td className={`${td} whitespace-nowrap`}>{row.request_id}</td>

                <td className={`${td} max-w-sm`}>
                  <span className="line-clamp-2">{row.subject}</span>
                </td>

                <td className={`${td} whitespace-nowrap`}>{row.requester}</td>

                <td className={`${td} whitespace-nowrap`}>{row.technician}</td>

                <td className={td}>
                  <StatusBadge label={row.status} toneKey={row.status} />
                </td>

                <td className={`${td} whitespace-nowrap`}>{row.priority ?? "-"}</td>

                <td className={`${td} whitespace-nowrap`}>
                  {row.due_by_date ? formatDisplay(row.due_by_date) : "-"}
                </td>

                <td className={`${td} whitespace-nowrap`}>{formatDisplay(row.created_date)}</td>

                <td className={`${td} whitespace-nowrap`}>{row.group_name ?? "-"}</td>
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

          <span>
            {fillTemplate(t.common.showingRange, {
              from,
              to,
              total: totalCount,
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>
            {fillTemplate(t.common.pageOf, {
              page,
              total: totalPages,
            })}
          </span>

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
