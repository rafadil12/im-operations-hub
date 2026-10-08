"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";

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

const fieldCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";

export function LogsCenter() {
  const { t } = useLang();
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ moduleName: "", action: "", q: "", from: "", to: "" });
  const [page, setPage] = useState(1);
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
    try {
      const next = await apiGetAbs<LogResponse>(`/api/logs-center?${params.toString()}`);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.logsCenter.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [applied, page, t.logsCenter.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{t.logsCenter.title}</h1>
        <p className="text-sm text-text-muted">{t.logsCenter.desc}</p>
      </div>

      <form
        className="grid grid-cols-1 gap-3 rounded-lg border border-border-subtle bg-surface p-3 md:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ moduleName, action, q, from, to });
          setPage(1);
        }}
      >
        <label className="text-xs text-text-muted">
          {t.fields.from}
          <input className={`${fieldCls} mt-1`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs text-text-muted">
          {t.fields.to}
          <input className={`${fieldCls} mt-1`} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-xs text-text-muted">
          {t.logsCenter.module}
          <select className={`${fieldCls} mt-1`} value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
            <option value="">{t.common.all}</option>
            {MODULES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          {t.logsCenter.action}
          <select className={`${fieldCls} mt-1`} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t.common.all}</option>
            {ACTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted md:col-span-2">
          {t.common.search}
          <input
            className={`${fieldCls} mt-1`}
            value={q}
            placeholder={t.logsCenter.search}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="md:col-span-6">
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-border-subtle text-[10px] uppercase tracking-wide text-text-dim">
            <tr>
              <th className="px-3 py-2">{t.logsCenter.when}</th>
              <th className="px-3 py-2">{t.logsCenter.actor}</th>
              <th className="px-3 py-2">{t.logsCenter.module}</th>
              <th className="px-3 py-2">{t.logsCenter.action}</th>
              <th className="px-3 py-2">{t.logsCenter.summary}</th>
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
              data.rows.map((row) => (
                <tr key={row.id} className="border-b border-border-subtle/70 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-text-muted">{row.created_at}</td>
                  <td className="px-3 py-2 text-text">
                    {row.actor_name || row.actor_label || "-"}
                    {row.employee_no ? (
                      <span className="mt-0.5 block text-[10px] text-text-dim">{row.employee_no}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-text">{row.module}</td>
                  <td className="px-3 py-2 text-text">{row.action}</td>
                  <td className="px-3 py-2 text-text">{row.summary}</td>
                </tr>
              ))
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

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {total} · {page}/{pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t.common.previous}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            {t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
