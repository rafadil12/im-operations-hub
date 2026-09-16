"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

import { useLang } from "@/lib/i18n";
import type { OldestTicket, RecentTicket } from "./types";

type Props = {
  recentRows: RecentTicket[];
  oldestRows: OldestTicket[];
};

type TicketRow = {
  requestId: string;
  subject: string;
  requester: string;
  technician: string;
  status: string;
  createdDate?: string;
  daysOpen?: number;
};

const PAGE_SIZE = 8;

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isClosed(status: string) {
  const value = status.toLowerCase();

  return (
    value.includes("closed") ||
    value.includes("resolved") ||
    value.includes("已关闭") ||
    value.includes("已解决")
  );
}

function statusClass(status: string) {
  const value = status.toLowerCase();

  if (isClosed(status)) {
    return "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-400";
  }

  if (
    value.includes("progress") ||
    value.includes("processing") ||
    value.includes("处理中") ||
    value.includes("进行中")
  ) {
    return "border-blue-500/20 bg-blue-500/[0.07] text-blue-600 dark:text-blue-400";
  }

  if (
    value.includes("pending") ||
    value.includes("open") ||
    value.includes("待处理") ||
    value.includes("打开") ||
    value.includes("已分配")
  ) {
    return "border-amber-500/20 bg-amber-500/[0.07] text-amber-600 dark:text-amber-400";
  }

  return "border-border-subtle bg-bg/50 text-text-muted";
}

function daysClass(days: number | undefined) {
  if (days === undefined) {
    return "text-text-muted";
  }

  if (days >= 7) {
    return "font-semibold text-red-600 dark:text-red-400";
  }

  if (days >= 3) {
    return "font-semibold text-amber-600 dark:text-amber-400";
  }

  return "text-text-muted";
}

function MiniMetric({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  tone?: "default" | "blue" | "red";
}) {
  const valueClass =
    tone === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-text";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className={`font-mono text-2xl font-bold leading-none ${valueClass}`}>
          {value}
        </div>

        <div className="pb-0.5 text-right text-[10px] leading-tight text-text-muted">
          {description}
        </div>
      </div>
    </div>
  );
}

export default function TicketMonitoringTable({
  recentRows,
  oldestRows,
}: Props) {
  const { t, lang } = useLang();

  const [query, setQuery] = useState("");
  const [technician, setTechnician] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const rows = useMemo<TicketRow[]>(() => {
    const map = new Map<string, TicketRow>();

    for (const row of recentRows) {
      map.set(row.requestId, {
        requestId: row.requestId,
        subject: row.subject,
        requester: row.requester,
        technician: row.technician,
        status: row.status,
        createdDate: row.createdDate,
      });
    }

    for (const row of oldestRows) {
  const existing = map.get(row.requestId);

  const detail = row as OldestTicket & {
    requester?: string;
    status?: string;
    createdDate?: string;
  };

  map.set(row.requestId, {
    requestId: row.requestId,
    subject: row.subject,
    requester: detail.requester ?? existing?.requester ?? "—",
    technician: detail.technician,
    status: detail.status ?? existing?.status ?? "—",
    createdDate: detail.createdDate ?? existing?.createdDate,
    daysOpen: detail.daysOpen,
  });
}

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const bTime = b.createdDate ? new Date(b.createdDate).getTime() : 0;

      return bTime - aTime;
    });
  }, [recentRows, oldestRows]);

  const technicians = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.technician).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.status).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        [
          row.requestId,
          row.subject,
          row.requester,
          row.technician,
          row.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesTechnician =
        technician === "all" || row.technician === technician;

      const matchesStatus = status === "all" || row.status === status;

      return matchesSearch && matchesTechnician && matchesStatus;
    });
  }, [rows, query, technician, status]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  useEffect(() => {
    setPage(1);
  }, [query, technician, status]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalCount = filteredRows.length;

  const openCount = filteredRows.filter(
    (row) => !isClosed(row.status)
  ).length;

  const criticalCount = filteredRows.filter(
    (row) => (row.daysOpen ?? 0) >= 7
  ).length;

  const startRecord =
    totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const endRecord = Math.min(
    page * PAGE_SIZE,
    totalCount
  );

  const locale = lang === "cn" ? "zh-CN" : "en-US";

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      {/* Header */}
      <div className="border-b border-border-subtle px-5 py-4 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.01em] text-text">
              {t.itsm.ticketMonitoring}
            </h2>

            <p className="mt-1 text-xs text-text-muted">
              {totalCount} {t.itsmAnalysis.tickets}
            </p>
          </div>

          <div className="shrink-0 text-xs text-text-muted">
            {startRecord}–{endRecord} / {totalCount}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 border-b border-border-subtle px-5 py-4 md:grid-cols-3 md:px-6">
        <MiniMetric
          label={t.itsm.totalTickets}
          value={totalCount}
          description={t.itsmAnalysis.tickets}
        />

        <MiniMetric
          label={t.itsm.openTickets}
          value={openCount}
          description={t.itsmAnalysis.tickets}
          tone="blue"
        />

        <MiniMetric
          label={t.itsm.overdue}
          value={criticalCount}
          description={t.itsm.needAttention}
          tone="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 border-b border-border-subtle px-5 py-3 md:flex-row md:px-6">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.common.search}
            className="h-9 w-full rounded-lg border border-border-subtle bg-surface px-3 pl-9 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex h-9 items-center rounded-lg border border-border-subtle bg-surface px-2.5">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-text-muted" />

            <select
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
              className="bg-transparent text-xs text-text outline-none"
            >
              <option value="all">{t.common.all}</option>

              {technicians.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-surface px-3 text-xs text-text outline-none"
          >
            <option value="all">{t.common.all}</option>

            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg/30">
              <th className="w-[11%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.requestId}
              </th>

              <th className="w-[29%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.subject}
              </th>

              <th className="w-[14%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.requester}
              </th>

              <th className="w-[14%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.technician}
              </th>

              <th className="w-[12%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.status}
              </th>

              <th className="w-[13%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.createdDate}
              </th>

              <th className="w-[7%] px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {t.itsm.days}
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.requestId}
                className="border-b border-border-subtle transition-colors hover:bg-primary/[0.025]"
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text">
                  {row.requestId}
                </td>

                <td className="px-4 py-3">
                  <div
                    className="max-w-[520px] text-[14px] font-normal leading-6 tracking-[0.01em] text-[#43506A]"
                    title={row.subject}
                  >
                    {row.subject}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div
                    className="max-w-[180px] truncate text-xs text-text-muted"
                    title={row.requester}
                  >
                    {row.requester || "—"}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div
                    className="max-w-[160px] truncate text-xs font-medium text-text"
                    title={row.technician}
                  >
                    {row.technician || "—"}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                      row.status
                    )}`}
                  >
                    {row.status || "—"}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                  {formatDate(row.createdDate, locale)}
                </td>

                <td
                  className={`px-4 py-3 text-right font-mono text-xs ${daysClass(
                    row.daysOpen
                  )}`}
                >
                  {row.daysOpen ?? "—"}
                </td>
              </tr>
            ))}

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-sm text-text-muted"
                >
                  {t.common.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3 md:px-6">
        <div className="text-xs text-text-muted">
          {startRecord}–{endRecord} / {totalCount}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) => Math.max(1, current - 1))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
            aria-label={t.itsmAnalysis.previous}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: pageCount }, (_, index) => index + 1)
            .slice(
              Math.max(0, Math.min(page - 3, pageCount - 5)),
              Math.min(pageCount, Math.max(5, page + 2))
            )
            .map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs font-medium transition-colors ${
                  page === item
                    ? "bg-primary text-white"
                    : "border border-border-subtle text-text-muted hover:bg-bg"
                }`}
              >
                {item}
              </button>
            ))}

          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() =>
              setPage((current) =>
                Math.min(pageCount, current + 1)
              )
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
            aria-label={t.itsmAnalysis.next}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
