"use client";

import { apiSendAbs } from "@/lib/apiClient";
import {
  DOCUMENTS_TD as td,
  DOCUMENTS_TH as th,
  formatLocationLabel,
  formatPostingDateTime,
  isReversalMovement,
  movementLabel,
} from "@/lib/sparepart/documentDisplay";
import type { SparepartMatDoc } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import type { Dict } from "@/lib/i18n";

type Props = {
  detail: SparepartMatDoc;
  lang: "en" | "cn";
  t: Dict;
  canReverse: boolean;
  reversing: boolean;
  onClose: () => void;
  onReversingChange: (value: boolean) => void;
  onReversed: () => Promise<void>;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
};

export function DocumentDetailModal({
  detail,
  lang,
  t,
  canReverse,
  reversing,
  onClose,
  onReversingChange,
  onReversed,
  toastSuccess,
  toastError,
}: Props) {
  return (
    <Modal
      title={t.sparepart.documentDetail}
      subtitle={
        <p className="text-xs text-text-muted">
          {t.sparepart.documentNo}{" "}
          <span className="font-semibold text-accent">{detail.doc_number}</span>
        </p>
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-stretch gap-4 text-xs">
            <div>
              <p className="text-text-dim">{t.sparepart.createdBy}:</p>
              <p className="mt-0.5 font-medium text-text">{detail.created_by || "-"}</p>
            </div>
            <div className="hidden w-px self-stretch bg-border-subtle sm:block" />
            <div>
              <p className="text-text-dim">{t.sparepart.createdAt}:</p>
              <p className="mt-0.5 font-medium text-text">
                {formatPostingDateTime(detail.created_at || detail.posting_date)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canReverse &&
            ["101", "201", "311"].includes(detail.movement_type) &&
            !detail.reversal_of_doc_id &&
            !detail.already_reversed ? (
              <button
                type="button"
                disabled={reversing}
                onClick={async () => {
                  onReversingChange(true);
                  try {
                    const result = await apiSendAbs<{
                      id: number;
                      doc_number: string;
                    }>(`/api/sparepart/documents/${detail.id}/reverse`, "POST", {
                      client_request_id:
                        typeof crypto !== "undefined" && "randomUUID" in crypto
                          ? crypto.randomUUID()
                          : `rev-${Date.now()}`,
                    });
                    toastSuccess(t.sparepart.reverseSuccess.replace("{doc}", result.doc_number));
                    onClose();
                    await onReversed();
                  } catch (e) {
                    toastError(e instanceof Error ? e.message : t.toast.saveFailed);
                  } finally {
                    onReversingChange(false);
                  }
                }}
                className="rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-60"
              >
                {reversing ? t.sparepart.reversing : t.sparepart.reverseDocument}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
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
            <span className="py-2.5 text-text-dim">{t.sparepart.movementType}</span>
            <span className="py-2.5 text-text-dim">:</span>
            <span
              className={`py-2.5 font-semibold ${
                isReversalMovement(detail.movement_type) ? "text-danger" : "text-text"
              }`}
            >
              {movementLabel(detail.movement_type, t)}
            </span>
            <span className="py-2.5 text-text-dim">{t.sparepart.recipient}</span>
            <span className="py-2.5 text-text-dim">:</span>
            <span className="py-2.5 font-medium text-text">{detail.recipient || "-"}</span>
            <span className="py-2.5 text-text-dim">{t.sparepart.headerText}</span>
            <span className="py-2.5 text-text-dim">:</span>
            <span className="py-2.5 font-medium text-text">{detail.header_text || "-"}</span>
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
          <h4 className="mb-2 text-sm font-semibold text-text">{t.sparepart.documentItems}</h4>
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-bg/50">
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>{t.sparepart.code}</th>
                  <th className={th}>{t.sparepart.name}</th>
                  <th className={th}>{t.sparepart.qty}</th>
                  {detail.movement_type === "311" || detail.movement_type === "312" ? (
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
                  const fromLabel = formatLocationLabel(
                    line.from_location_code,
                    line.from_location_name_en,
                    line.from_location_name_cn,
                    lang,
                    line.from_storage_location || line.storage_location
                  );
                  const toLabel = formatLocationLabel(
                    line.to_location_code,
                    line.to_location_name_en,
                    line.to_location_name_cn,
                    lang,
                    line.to_storage_location
                  );
                  const isTransfer =
                    detail.movement_type === "311" || detail.movement_type === "312";
                  return (
                    <tr key={line.id} className="border-t border-border-subtle/60">
                      <td className={td}>{line.line_no}</td>
                      <td className={`${td} font-medium text-text`}>{line.item_code}</td>
                      <td className={td}>{line.item_name}</td>
                      <td className={`${td} tabular-nums text-text`}>{line.qty}</td>
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
  );
}
