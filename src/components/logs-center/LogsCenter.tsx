"use client";

import { useCallback, useEffect, useState } from "react";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/components/sparepart/stockTableRows";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";

type LogRow = {
  id: number;
  created_at: string;
  module: string;
  action: string;
  summary: string;
  actor_label: string | null;
  employee_no: string | null;
  actor_name: string | null;
};

type LogResponse = {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

const MODULES = [
  "auth",
  "daily-operation",
  "sparepart",
  "report",
  "safety",
  "training",
  "itsm",
  "organization",
  "settings",
  "system",
];

const ACTIONS = ["login", "logout", "create", "update", "delete", "change"];

function splitCreatedAt(value: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value.trim());
  if (!match) return { date: value, time: "" };
  return { date: match[1], time: match[2] };
}

const fieldCls =
  "w-full rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-[10px] uppercase text-text-dim";

export function LogsCenter() {
  const { t } = useLang();
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ moduleName: "", action: "", q: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [data, setData] = useState<LogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (applied.moduleName) params.set("module", applied.moduleName);
    if (applied.action) params.set("action", applied.action);
    if (applied.q.trim()) params.set("q", applied.q.trim());
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    try {
      const next = await apiGetAbs<LogResponse>(`/api/logs-center?${params.toString()}`);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.logsCenter.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize, t.logsCenter.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));
  const moduleOptions = [
    { value: "", label: t.common.all },
    ...MODULES.map((item) => ({ value: item, label: item })),
  ];
  const actionOptions = [
    { value: "", label: t.common.all },
    ...ACTIONS.map((item) => ({ value: item, label: item })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{t.logsCenter.title}</h1>
        <p className="text-sm text-text-muted">{t.logsCenter.desc}</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ moduleName, action, q, from, to });
          setPage(1);
        }}
      >
        <div className="min-w-[140px]">
          <label className={labelCls}>{t.fields.from}</label>
          <input className={fieldCls} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-[140px]">
          <label className={labelCls}>{t.fields.to}</label>
          <input className={fieldCls} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-[140px]">
          <label className={labelCls}>{t.logsCenter.module}</label>
          <SparepartDropdown
            compact
            className="w-full"
            value={moduleName}
            onChange={setModuleName}
            options={moduleOptions}
            placeholder={t.common.all}
          />
        </div>
        <div className="min-w-[120px]">
          <label className={labelCls}>{t.logsCenter.action}</label>
          <SparepartDropdown
            compact
            className="w-full"
            value={action}
            onChange={setAction}
            options={actionOptions}
            placeholder={t.common.all}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className={labelCls}>{t.common.search}</label>
          <input
            className={fieldCls}
            value={q}
            placeholder={t.logsCenter.search}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {t.common.apply}
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "50%" }} />
          </colgroup>
          <thead className="border-b border-border-subtle text-[10px] uppercase tracking-wide text-text-dim">
            <tr>
              <th className="px-3 py-2">{t.logsCenter.date}</th>
              <th className="px-3 py-2">{t.logsCenter.username}</th>
              <th className="px-3 py-2">{t.logsCenter.module}</th>
              <th className="px-3 py-2">{t.logsCenter.action}</th>
              <th className="px-3 py-2">{t.logsCenter.remarks}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-text-muted" colSpan={5}>
                  {t.common.loading}
                </td>
              </tr>
            ) : data && data.rows.length > 0 ? (
              data.rows.map((row) => {
                const created = splitCreatedAt(row.created_at);
                return (
                  <tr key={row.id} className="border-b border-border-subtle/70 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="block font-semibold text-text">{created.date}</span>
                    {created.time ? (
                      <span className="mt-0.5 block text-[10px] text-text-dim">{created.time}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-text">
                    <span className="block break-words">{row.actor_name || row.actor_label || "-"}</span>
                    {row.employee_no ? (
                      <span className="mt-0.5 block text-[10px] text-text-dim">{row.employee_no}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 break-words text-text">{row.module}</td>
                  <td className="px-3 py-2 break-words text-text">{row.action}</td>
                  <td className="px-3 py-2 break-words text-text">{row.summary}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-3 py-4 text-text-muted" colSpan={5}>
                  {t.logsCenter.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5">
          <p className="text-xs text-text-dim">
            {fillTemplate(t.common.showingRange, { from: rangeFrom, to: rangeTo, total })}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">
              {t.common.rowsPerPage}
              <span className="ml-2 inline-block align-middle">
                <SparepartDropdown
                  compact
                  menuPlacement="top"
                  className="min-w-[4.5rem]"
                  value={String(pageSize)}
                  onChange={(next) => {
                    setPageSize(Number(next) as PageSize);
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                />
              </span>
            </label>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.common.previous}
            </button>
            <span className="text-xs text-text-muted">
              {fillTemplate(t.common.pageOf, { page, total: pageCount })}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.common.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
