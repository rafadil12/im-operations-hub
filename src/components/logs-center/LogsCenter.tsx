"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FilePlus, LayoutGrid, NotepadText, RotateCcwClock, User } from "lucide-react";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/components/sparepart/stockTableRows";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Drawer } from "@/components/ui/Drawer";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import { fillTemplate } from "@/lib/i18n/fillTemplate";
import {
  actionBadgeClass,
  actionBadgeTone,
  formatChangeLines,
  formatLogDevice,
  formatLogEventId,
  formatLogIp,
  formatLogTarget,
} from "@/lib/logs-center/logDetail";
import {
  parseRemarkList,
  renderRemark,
  type RemarkChange,
  type RemarkLink,
} from "@/lib/logs-center/renderRemark";

type LogRow = {
  id: number;
  created_at: string;
  module: string;
  action: string;
  object_type: string | null;
  object_ref: string | null;
  summary: string;
  summary_cn?: string | null;
  changes_json: unknown;
  links_json: unknown;
  ip_address: string | null;
  user_agent: string | null;
  actor_label: string | null;
  employee_no: string | null;
  name_en: string | null;
  name_cn: string | null;
};

type LogResponse = {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

type AppliedFilters = {
  moduleName: string;
  action: string;
  q: string;
  from: string;
  to: string;
};

function actorName(row: LogRow, lang: "en" | "cn"): string {
  const en = row.name_en?.trim() || "";
  const cn = row.name_cn?.trim() || "";
  const name = lang === "cn" ? cn || en : en || cn;
  return name || row.actor_label?.trim() || "-";
}

function ActionBadge({ action }: { action: string }) {
  const tone = actionBadgeTone(action);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionBadgeClass(tone)}`}
    >
      {action.toUpperCase()}
    </span>
  );
}

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

const ACTIONS = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "change",
  "save",
  "submit",
  "reopen",
  "import",
];

function currentDayBounds(): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { from: `${date}T00:00:00`, to: `${date}T23:59:59` };
}

function splitCreatedAt(value: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value.trim());
  if (!match) return { date: value, time: "" };
  return { date: match[1], time: match[2] };
}

function fullTimestamp(value: string): string {
  const created = splitCreatedAt(value);
  return created.time ? `${created.date} ${created.time}` : created.date;
}

const fieldCls =
  "w-full rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-[10px] uppercase text-text-dim";

const detailIconCls = "mt-0.5 size-6 shrink-0 text-text-dim";

function DetailField({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-5">
      {icon}
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-wide text-text-dim">{label}</dt>
        <dd className="mt-1 break-words text-sm text-text">{children}</dd>
      </div>
    </div>
  );
}

export function LogsCenter() {
  const { t, lang } = useLang();
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [bounds] = useState(currentDayBounds);
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [applied, setApplied] = useState<AppliedFilters>({
    moduleName: "",
    action: "",
    q: "",
    from: bounds.from,
    to: bounds.to,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [data, setData] = useState<LogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the log when filters change
    void load();
  }, [load]);

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);
  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));
  const moduleOptions = [
    { value: "", label: t.common.all },
    ...MODULES.map((item) => ({ value: item, label: item.toUpperCase() })),
  ];
  const actionOptions = [
    { value: "", label: t.common.all },
    ...ACTIONS.map((item) => ({ value: item, label: item.toUpperCase() })),
  ];
  const selected = data?.rows.find((row) => row.id === selectedId) ?? null;
  const selectedChanges = selected ? parseRemarkList<RemarkChange>(selected.changes_json) : null;
  const selectedLinks = selected ? parseRemarkList<RemarkLink>(selected.links_json) : null;
  const changeLines = formatChangeLines(selectedChanges, lang);
  const activeChips: { key: string; label: string }[] = [];
  if (applied.from || applied.to) {
    activeChips.push({
      key: "range",
      label: `${applied.from.replace("T", " ")} → ${applied.to.replace("T", " ")}`,
    });
  }
  if (applied.moduleName) {
    activeChips.push({ key: "module", label: applied.moduleName.toUpperCase() });
  }
  if (applied.action) {
    activeChips.push({ key: "action", label: applied.action.toUpperCase() });
  }
  if (applied.q.trim()) {
    activeChips.push({ key: "q", label: applied.q.trim() });
  }

  const resetFilters = () => {
    const next = currentDayBounds();
    setModuleName("");
    setAction("");
    setQ("");
    setFrom(next.from);
    setTo(next.to);
    setApplied({
      moduleName: "",
      action: "",
      q: "",
      from: next.from,
      to: next.to,
    });
    setPage(1);
    setSelectedId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{t.logsCenter.title}</h1>
        <p className="text-sm text-text-muted">{t.logsCenter.desc}</p>
      </div>

      <form
        className="space-y-3 rounded-lg border border-border-subtle bg-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ moduleName, action, q, from, to });
          setPage(1);
          setSelectedId(null);
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[11.75rem]">
            <label className={labelCls}>{t.fields.from}</label>
            <DateTimePicker compact withSeconds value={from} onChange={setFrom} />
          </div>
          <div className="min-w-[11.75rem]">
            <label className={labelCls}>{t.fields.to}</label>
            <DateTimePicker compact withSeconds value={to} onChange={setTo} />
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
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.logsCenter.resetFilters}
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.logsCenter.applyFilters}
          </button>
        </div>
        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-text-dim">
              {t.logsCenter.activeFilters}
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="rounded-full border border-border-subtle bg-bg/50 px-2.5 py-0.5 text-[11px] text-text-muted"
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </form>

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead className="border-b border-border-subtle text-[10px] uppercase tracking-wide text-text-dim">
              <tr>
                <th className="px-3 py-2">{t.logsCenter.time}</th>
                <th className="px-3 py-2">{t.logsCenter.userEmployeeId}</th>
                <th className="px-3 py-2">{t.logsCenter.module}</th>
                <th className="px-3 py-2">{t.logsCenter.action}</th>
                <th className="px-3 py-2">{t.logsCenter.remarks}</th>
                <th className="px-3 py-2">{t.logsCenter.details}</th>
              </tr>
            </thead>
            <tbody className={loading && data ? "opacity-60" : undefined}>
              {loading && !data ? (
                <tr>
                  <td className="px-3 py-4 text-text-muted" colSpan={6}>
                    {t.common.loading}
                  </td>
                </tr>
              ) : data && data.rows.length > 0 ? (
                data.rows.map((row) => {
                  const created = splitCreatedAt(row.created_at);
                  const selectedRow = selectedId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={[
                        "border-b border-border-subtle/70 last:border-0",
                        selectedRow ? "bg-accent/5" : "",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="block font-medium text-text">{created.date}</span>
                        {created.time ? (
                          <span className="mt-0.5 block text-[10px] text-text-dim">
                            {created.time}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-text">
                        <span className="block break-words">{actorName(row, lang)}</span>
                        {row.employee_no ? (
                          <span className="mt-0.5 block text-[10px] text-text-dim">
                            {row.employee_no}
                          </span>
                        ) : null}
                      </td>
                      <td className="break-words px-3 py-2 text-text">
                        {row.module.toUpperCase()}
                      </td>
                      <td className="px-3 py-2">
                        <ActionBadge action={row.action} />
                      </td>
                      <td className="px-3 py-2 text-text">
                        <span className="line-clamp-2 break-words">
                          {renderRemark(
                            {
                              action: row.action,
                              summary: row.summary,
                              objectType: row.object_type,
                              objectRef: row.object_ref,
                              changes: parseRemarkList<RemarkChange>(row.changes_json),
                              links: parseRemarkList<RemarkLink>(row.links_json),
                            },
                            lang
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                        >
                          {t.logsCenter.view}
                          <span aria-hidden>›</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-4 text-text-muted" colSpan={6}>
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
                    setSelectedId(null);
                  }}
                  options={pageSizeOptions}
                />
              </span>
            </label>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
                setSelectedId(null);
              }}
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
              onClick={() => {
                setPage((current) => current + 1);
                setSelectedId(null);
              }}
              className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.common.next}
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <Drawer
          title={
            <span className="flex min-w-0 items-center gap-2">
              <RotateCcwClock
                className="size-4 shrink-0 text-text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="truncate">{t.logsCenter.logDetails}</span>
            </span>
          }
          width="detail"
          onClose={() => setSelectedId(null)}
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={selected.action} />
              <span className="text-text-muted">{fullTimestamp(selected.created_at)}</span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <dl className="space-y-4">
              <DetailField
                icon={<User className={detailIconCls} strokeWidth={2} aria-hidden />}
                label={t.logsCenter.username}
              >
                {actorName(selected, lang)}
                {selected.employee_no ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-text-dim">
                    {selected.employee_no}
                  </span>
                ) : null}
              </DetailField>
              <DetailField
                icon={<LayoutGrid className={detailIconCls} strokeWidth={2} aria-hidden />}
                label={t.logsCenter.module}
              >
                {selected.module.toUpperCase()}
              </DetailField>
              <DetailField
                icon={<FilePlus className={detailIconCls} strokeWidth={2} aria-hidden />}
                label={t.logsCenter.target}
              >
                {formatLogTarget(selected.object_type, selected.object_ref, lang)}
              </DetailField>
              <DetailField
                icon={<NotepadText className={detailIconCls} strokeWidth={2} aria-hidden />}
                label={t.logsCenter.remarks}
              >
                {renderRemark(
                  {
                    action: selected.action,
                    summary: selected.summary,
                    objectType: selected.object_type,
                    objectRef: selected.object_ref,
                    changes: selectedChanges,
                    links: selectedLinks,
                  },
                  lang
                )}
              </DetailField>
            </dl>

            <div className="rounded-lg border border-border-subtle bg-bg/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                {t.logsCenter.additionalInfo}
              </p>
              <dl className="mt-3 space-y-2">
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-text-dim">{t.logsCenter.eventId}</dt>
                  <dd className="break-all text-text">
                    {formatLogEventId(selected.id, selected.created_at)}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-text-dim">{t.logsCenter.ipAddress}</dt>
                  <dd className="break-all text-text">{formatLogIp(selected.ip_address)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-text-dim">{t.logsCenter.device}</dt>
                  <dd className="break-words text-text">{formatLogDevice(selected.user_agent)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-text-dim">{t.logsCenter.beforeValue}</dt>
                  <dd className="break-words text-text">
                    {changeLines.before.map((line) => (
                      <span key={`before-${line}`} className="block">
                        {line}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-text-dim">{t.logsCenter.afterValue}</dt>
                  <dd className="break-words text-text">
                    {changeLines.after.map((line) => (
                      <span key={`after-${line}`} className="block">
                        {line}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-[11px] text-accent">
              {t.logsCenter.permanentNote}
            </p>
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
