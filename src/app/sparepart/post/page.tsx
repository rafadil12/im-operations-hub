"use client";

import Link from "next/link";
import { useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartStorageLocation } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { LocationCombobox } from "@/components/sparepart/LocationCombobox";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { TransactionTypeSelect } from "@/components/sparepart/TransactionTypeSelect";

type LineDraft = {
  key: string;
  item_id: string;
  qty: string;
  note: string;
  storage_location_id: string;
  to_storage_location_id: string;
  item?: SparepartItem | null;
};

const MAX_LINES_PER_DOC = 10;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function todayLocalDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function combineDateWithCurrentTime(dateValue: string): string {
  const now = new Date();
  return `${dateValue} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(
    now.getSeconds(),
  )}`;
}

function newLine(defaultLocId = ""): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id: "",
    qty: "1",
    note: "",
    storage_location_id: defaultLocId,
    to_storage_location_id: "",
    item: null,
  };
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PostGoodsMovementPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const [movementType, setMovementType] = useState<"101" | "201" | "311">("101");
  const [postingDate, setPostingDate] = useState(todayLocalDateInputValue);
  const [headerText, setHeaderText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [busy, setBusy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ id: number; doc_number: string } | null>(
    null,
  );

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  const locationLabel = (loc: SparepartStorageLocation) => `${loc.code} — ${loc.name}`;

  const locationOptionsForItem = (item?: SparepartItem | null) => {
    if (!item) return [] as SparepartStorageLocation[];

    const byId = new Map<number, SparepartStorageLocation>();
    for (const balance of item.balances ?? []) {
      if (Number(balance.qty) <= 0) continue;
      byId.set(balance.storage_location_id, {
        id: balance.storage_location_id,
        code: balance.location_code ?? "",
        name: balance.location_name ?? "",
        is_active: 1,
        created_at: null,
        updated_at: null,
      });
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  };

  const handlePost = async () => {
    setBusy(true);
    setLastDoc(null);
    try {
      const payloadLines = lines.map((l) => ({
        item_id: Number(l.item_id),
        qty: Number(l.qty),
        note: l.note,
        storage_location_id: Number(l.storage_location_id),
        to_storage_location_id:
          movementType === "311" ? Number(l.to_storage_location_id) : undefined,
      }));

      const result = await apiSendAbs<{ id: number; doc_number: string }>(
        "/api/sparepart/goods-movements",
        "POST",
        {
          movement_type: movementType,
          posting_date: combineDateWithCurrentTime(postingDate),
          header_text: headerText,
          recipient,
          client_request_id: newClientRequestId(),
          lines: payloadLines,
        },
      );
      toastSuccess(
        t.sparepart.postSuccess.replace("{doc}", result.doc_number),
      );
      setLastDoc(result);
      setLines([newLine()]);
      setHeaderText("");
      setRecipient("");
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SparepartGate allow={(a) => a.canPostSparepartDocument}>
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-text">{t.sparepart.postTitle}</h1>
        <p className="text-sm text-text-muted">{t.sparepart.postDesc}</p>
      </div>

      {lastDoc ? (
        <p className="mb-4 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-text">
          {t.sparepart.postSuccess.replace("{doc}", lastDoc.doc_number)}{" "}
          <Link
            href={`/sparepart/documents?id=${lastDoc.id}`}
            className="font-medium text-accent hover:underline"
          >
            {t.sparepart.viewDocument}
          </Link>
        </p>
      ) : null}

      <div className="space-y-4 rounded-lg border border-border-subtle bg-surface p-4">
        <div
          className={`grid grid-cols-1 gap-3 ${
            movementType === "201"
              ? "md:grid-cols-[2fr_2fr_3fr_3fr]"
              : "md:grid-cols-[2fr_2fr_6fr]"
          }`}
        >
          <div>
            <label className={label}>{t.sparepart.movementType} *</label>
            <TransactionTypeSelect
              value={movementType}
              onChange={setMovementType}
            />
          </div>
          <div>
            <label className={label}>{t.sparepart.date} *</label>
            <input
              type="date"
              className={field}
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>{t.sparepart.headerText}</label>
            <input
              className={field}
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder={t.sparepart.headerTextHint}
            />
          </div>
          {movementType === "201" ? (
            <div>
              <label className={label}>{t.sparepart.recipient} *</label>
              <input
                className={field}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t.sparepart.recipientHint}
              />
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">{t.sparepart.lines}</h2>
            <button
              type="button"
              disabled={lines.length >= MAX_LINES_PER_DOC}
              title={
                lines.length >= MAX_LINES_PER_DOC
                  ? t.sparepart.maxLinesReached
                  : undefined
              }
              onClick={() =>
                setLines((prev) =>
                  prev.length >= MAX_LINES_PER_DOC
                    ? prev
                    : [...prev, newLine()],
                )
              }
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              + {t.sparepart.addLine}
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, index) => (
              <div
                key={line.key}
                className="grid grid-cols-1 gap-2 rounded-md border border-border-subtle bg-bg/40 p-3 md:grid-cols-12"
              >
                <div className="md:col-span-4">
                  <label className={label}>
                    {t.sparepart.item} #{index + 1}
                  </label>
                  <MaterialCombobox
                    value={line.item_id}
                    onChange={(itemId, item) => {
                      if (!itemId) {
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  item_id: "",
                                  item: null,
                                  storage_location_id: "",
                                  to_storage_location_id: "",
                                }
                              : l,
                          ),
                        );
                        return;
                      }

                      void (async () => {
                        const fullItem = await apiGetAbs<{ row: SparepartItem }>(
                          `/api/sparepart/materials/${itemId}`,
                        )
                          .then((data) => data.row)
                          .catch(() => item ?? null);

                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  item_id: itemId,
                                  item: fullItem,
                                  // Clear location so user must choose explicitly
                                  storage_location_id: "",
                                  to_storage_location_id: "",
                                }
                              : l,
                          ),
                        );
                      })();
                    }}
                    className={field}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={label}>
                    {movementType === "311"
                      ? t.sparepart.fromLocation
                      : t.sparepart.location}{" "}
                    *
                  </label>
                  {movementType === "101" ? (
                    <LocationCombobox
                      value={line.storage_location_id}
                      onChange={(locId) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, storage_location_id: locId }
                              : l,
                          ),
                        )
                      }
                      className={field}
                    />
                  ) : (
                    <SparepartDropdown
                      value={line.storage_location_id}
                      options={locationOptionsForItem(line.item).map((loc) => ({
                        value: String(loc.id),
                        label: locationLabel(loc),
                      }))}
                      onChange={(locId) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  storage_location_id: locId,
                                  to_storage_location_id:
                                    l.to_storage_location_id === locId
                                      ? ""
                                      : l.to_storage_location_id,
                                }
                              : l,
                          ),
                        )
                      }
                      placeholder={t.sparepart.locationName}
                      disabled={!line.item_id}
                    />
                  )}
                </div>
                {movementType === "311" ? (
                  <div className="md:col-span-2">
                    <label className={label}>{t.sparepart.toLocation} *</label>
                    <LocationCombobox
                      value={line.to_storage_location_id}
                      excludeId={line.storage_location_id}
                      onChange={(locId) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, to_storage_location_id: locId }
                              : l,
                          ),
                        )
                      }
                      className={field}
                    />
                  </div>
                ) : null}
                <div className="md:col-span-1">
                  <label className={label}>{t.sparepart.qty}</label>
                  <input
                    type="number"
                    min={1}
                    className={field}
                    value={line.qty}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, qty: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </div>
                <div
                  className={
                    movementType === "311" ? "md:col-span-2" : "md:col-span-4"
                  }
                >
                  <label className={label}>{t.sparepart.note}</label>
                  <input
                    className={field}
                    value={line.note}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, note: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex items-end md:col-span-1">
                  <button
                    type="button"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                    className="w-full rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.sparepart.removeLine}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={handlePost}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.sparepart.posting : t.sparepart.post}
          </button>
        </div>
      </div>
    </div>
    </SparepartGate>
  );
}
