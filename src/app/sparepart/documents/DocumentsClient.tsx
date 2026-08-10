"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";
import type { MovementType, SparepartMatDoc } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/components/sparepart/StockTable";

const DEFAULT_PAGE_SIZE: PageSize = 10;

type ListResponse = { rows: SparepartMatDoc[] };
type DetailResponse = { document: SparepartMatDoc };

const th =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
const td = "px-3 py-2 align-top text-xs text-text-muted";

function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function movementLabel(
  type: MovementType,
  t: ReturnType<typeof useLang>["t"],
): string {
  switch (type) {
    case "101":
      return t.sparepart.movement101;
    case "201":
      return t.sparepart.movement201;
    case "311":
      return t.sparepart.movement311;
    case "102":
      return t.sparepart.movement102;
    case "202":
      return t.sparepart.movement202;
    case "312":
      return t.sparepart.movement312;
    default:
      return type;
  }
}

function formatPostingDateTime(
  postingDate: string | null | undefined,
): string {
  const postingValue = String(postingDate ?? "").trim();
  if (!postingValue) return "-";

  const normalizedPosting = postingValue.replace("T", " ");
  const postingMatch = normalizedPosting.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?/,
  );
  if (!postingMatch) return postingValue;

  const [, year, month, day, timePart] = postingMatch;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel = months[Number(month) - 1] ?? month;
  const dateLabel = `${day} ${monthLabel} ${year}`;
  return timePart ? `${dateLabel} ${timePart}` : dateLabel;
}

function formatPostingDateOnly(postingDate: string | null | undefined): string {
  const postingValue = String(postingDate ?? "").trim();
  if (!postingValue) return "-";
  const match = postingValue.replace("T", " ").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? postingValue.slice(0, 10);
}

function isReversalMovement(type: MovementType): boolean {
  return type === "102" || type === "202" || type === "312";
}

export default function MaterialDocumentsPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const { canReverseSparepartDocument } = useRoleAccess();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SparepartMatDoc[]>([]);
  const [q, setQ] = useState("");
  const [movementType, setMovementType] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [detail, setDetail] = useState<SparepartMatDoc | null>(null);
  const [reversing, setReversing] = useState(false);

  const load = useCallback(
    async (filters: {
      q: string;
      movementType: string;
      location: string;
      start: string;
      end: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        if (filters.movementType) params.set("movementType", filters.movementType);
        if (filters.location) params.set("location", filters.location);
        if (filters.start) params.set("start", filters.start);
        if (filters.end) params.set("end", filters.end);
        const data = await apiGetAbs<ListResponse>(
          `/api/sparepart/documents?${params.toString()}`,
        );
        setRows(data.rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      } finally {
        setLoading(false);
      }
    },
    [t.common.error],
  );

  const openDetail = useCallback(
    async (id: number) => {
      try {
        const data = await apiGetAbs<DetailResponse>(
          `/api/sparepart/documents/${id}`,
        );
        setDetail(data.document);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      }
    },
    [t.common.error],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load({ q: "", movementType: "", location: "", start: "", end: "" });
  }, [load]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opens detail from URL param
      void openDetail(Number(id));
    }
  }, [searchParams, openDetail]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return rows.slice(startIdx, startIdx + pageSize);
  }, [rows, currentPage, pageSize]);

  const field =
    "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";
  const movementTypeOptions = [
    { value: "", label: t.sparepart.allTypes },
    { value: "101", label: t.sparepart.movement101 },
    { value: "201", label: t.sparepart.movement201 },
    { value: "311", label: t.sparepart.movement311 },
    { value: "102", label: t.sparepart.movement102 },
    { value: "202", label: t.sparepart.movement202 },
    { value: "312", label: t.sparepart.movement312 },
  ];
  const pageSizeOptions = PAGE_SIZE_OPTIONS.map((n) => ({
    value: String(n),
    label: String(n),
  }));

  return (
    <SparepartGate allow={(a) => a.canViewSparepartDocuments}>
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-text">
          {t.sparepart.documentsTitle}
        </h1>
        <p className="text-sm text-text-muted">{t.sparepart.documentsDesc}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface p-3">
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.common.search}
          </label>
          <input
            className={`${field} w-full`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load({ q, movementType, location, start, end });
              }
            }}
            placeholder={t.sparepart.documentsSearchHint}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.sparepart.movementType}
          </label>
          <SparepartDropdown
            compact
            value={movementType}
            onChange={setMovementType}
            options={movementTypeOptions}
            placeholder={t.sparepart.allTypes}
          />
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.sparepart.location}
          </label>
          <input
            className={`${field} w-full`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t.sparepart.locationCode}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.fields.from}
          </label>
          <input
            type="date"
            className={field}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-text-dim">
            {t.fields.to}
          </label>
          <input
            type="date"
            className={field}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load({ q, movementType, location, start, end });
          }}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {t.common.apply}
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
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.noData}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-border-subtle bg-bg/40">
                <tr>
                  <th className={th}>{t.sparepart.docNumber}</th>
                  <th className={th}>{t.sparepart.movementType}</th>
                  <th className={th}>{t.sparepart.date}</th>
                  <th className={th}>{t.sparepart.recipient}</th>
                  <th className={th}>{t.sparepart.headerText}</th>
                  <th className={th}>{t.sparepart.lines}</th>
                  <th className={th}>{t.sparepart.totalQty}</th>
                  <th className={th}>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-hover/50"
                  >
                    <td className={`${td} font-medium text-text`}>
                      {row.doc_number}
                    </td>
                    <td className={td}>
                      {movementLabel(row.movement_type, t)}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatPostingDateOnly(row.posting_date)}
                    </td>
                    <td className={td}>{row.recipient || "-"}</td>
                    <td className={`${td} max-w-xs`}>
                      <span className="line-clamp-2">
                        {row.header_text || "-"}
                      </span>
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {row.line_count ?? 0}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {row.total_qty ?? 0}
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => openDetail(row.id)}
                        className="text-accent hover:underline"
                      >
                        {t.sparepart.viewDocument}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5">
            <p className="text-xs text-text-dim">
              {fillTemplate(t.common.showingRange, {
                from: (currentPage - 1) * pageSize + 1,
                to: Math.min(currentPage * pageSize, rows.length),
                total: rows.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <SparepartDropdown
                compact
                menuPlacement="top"
                value={String(pageSize)}
                onChange={(next) => {
                  setPageSize(Number(next) as PageSize);
                  setPage(1);
                }}
                options={pageSizeOptions}
                className="min-w-[4.5rem]"
              />
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.common.previous}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="rounded border border-border px-2.5 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.common.next}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail ? (
        <Modal
          title={t.sparepart.documentDetail}
          subtitle={
            <p className="text-xs text-text-muted">
              {t.sparepart.documentNo}{" "}
              <span className="font-semibold text-accent">
                {detail.doc_number}
              </span>
            </p>
          }
          onClose={() => setDetail(null)}
          size="lg"
          footer={
            <div className="flex w-full flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-stretch gap-4 text-xs">
                <div>
                  <p className="text-text-dim">{t.sparepart.createdBy}:</p>
                  <p className="mt-0.5 font-medium text-text">
                    {detail.created_by || "-"}
                  </p>
                </div>
                <div className="hidden w-px self-stretch bg-border-subtle sm:block" />
                <div>
                  <p className="text-text-dim">{t.sparepart.createdAt}:</p>
                  <p className="mt-0.5 font-medium text-text">
                    {formatPostingDateTime(
                      detail.created_at || detail.posting_date,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canReverseSparepartDocument &&
                ["101", "201", "311"].includes(detail.movement_type) &&
                !detail.reversal_of_doc_id &&
                !detail.already_reversed ? (
                  <button
                    type="button"
                    disabled={reversing}
                    onClick={async () => {
                      setReversing(true);
                      try {
                        const result = await apiSendAbs<{
                          id: number;
                          doc_number: string;
                        }>(
                          `/api/sparepart/documents/${detail.id}/reverse`,
                          "POST",
                          {
                            client_request_id:
                              typeof crypto !== "undefined" &&
                              "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `rev-${Date.now()}`,
                          },
                        );
                        toastSuccess(
                          t.sparepart.reverseSuccess.replace(
                            "{doc}",
                            result.doc_number,
                          ),
                        );
                        setDetail(null);
                        await load({ q, movementType, location, start, end });
                      } catch (e) {
                        toastError(
                          e instanceof Error
                            ? e.message
                            : t.toast.saveFailed,
                        );
                      } finally {
                        setReversing(false);
                      }
                    }}
                    className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-60"
                  >
                    {reversing
                      ? t.sparepart.reversing
                      : t.sparepart.reverseDocument}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-surface-hover"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              <div className="grid w-fit grid-cols-[max-content_1ch_auto] items-baseline gap-x-2 text-xs">
                <span className="py-2.5 text-text-dim">
                  {t.sparepart.movementType}
                </span>
                <span className="py-2.5 text-text-dim">:</span>
                <span
                  className={`py-2.5 font-semibold ${
                    isReversalMovement(detail.movement_type)
                      ? "text-danger"
                      : "text-text"
                  }`}
                >
                  {movementLabel(detail.movement_type, t)}
                </span>
                <span className="py-2.5 text-text-dim">
                  {t.sparepart.recipient}
                </span>
                <span className="py-2.5 text-text-dim">:</span>
                <span className="py-2.5 font-medium text-text">
                  {detail.recipient || "-"}
                </span>
                <span className="py-2.5 text-text-dim">
                  {t.sparepart.headerText}
                </span>
                <span className="py-2.5 text-text-dim">:</span>
                <span className="py-2.5 font-medium text-text">
                  {detail.header_text || "-"}
                </span>
              </div>
              <div>
                <div className="grid w-fit grid-cols-[auto_1ch_auto] items-baseline gap-x-2 py-2.5 text-xs">
                  <span className="text-text-dim">{t.sparepart.date}</span>
                  <span className="text-text-dim">:</span>
                  <span className="whitespace-nowrap font-medium text-text">
                    {formatPostingDateTime(detail.posting_date)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-text">
                {t.sparepart.documentItems}
              </h4>
              <div className="overflow-hidden rounded-md border border-border-subtle">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-bg/50">
                    <tr>
                      <th className={th}>#</th>
                      <th className={th}>{t.sparepart.code}</th>
                      <th className={th}>{t.sparepart.name}</th>
                      <th className={th}>{t.sparepart.qty}</th>
                      {detail.movement_type === "311" ||
                      detail.movement_type === "312" ? (
                        <>
                          <th className={th}>{t.sparepart.fromLocation}</th>
                          <th className={th}>{t.sparepart.toLocation}</th>
                        </>
                      ) : (
                        <th className={th}>{t.sparepart.location}</th>
                      )}
                      <th className={th}>{t.sparepart.note}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.lines ?? []).map((line) => {
                      const fromLabel =
                        line.from_storage_location ||
                        line.storage_location ||
                        "-";
                      const toLabel = line.to_storage_location || "-";
                      const isTransfer =
                        detail.movement_type === "311" ||
                        detail.movement_type === "312";
                      return (
                        <tr
                          key={line.id}
                          className="border-t border-border-subtle/60"
                        >
                          <td className={td}>{line.line_no}</td>
                          <td className={`${td} font-medium text-text`}>
                            {line.item_code}
                          </td>
                          <td className={td}>{line.item_name}</td>
                          <td className={`${td} tabular-nums text-text`}>
                            {line.qty}
                          </td>
                          {isTransfer ? (
                            <>
                              <td className={td}>{fromLabel}</td>
                              <td className={td}>{toLabel}</td>
                            </>
                          ) : (
                            <td className={td}>{fromLabel}</td>
                          )}
                          <td className={td}>{line.note || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
    </SparepartGate>
  );
}
