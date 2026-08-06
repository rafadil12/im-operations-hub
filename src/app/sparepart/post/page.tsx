"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartStorageLocation } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import {
  SparepartDropdown,
  sparepartDropdownMenuClass,
  sparepartDropdownOptionClass,
} from "@/components/sparepart/SparepartDropdown";
import { TransactionTypeSelect } from "@/components/sparepart/TransactionTypeSelect";

type LineDraft = {
  key: string;
  item_id: string;
  qty: string;
  note: string;
  storage_location_id: string;
  storage_location_text: string;
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
    storage_location_text: "",
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
  const [locations, setLocations] = useState<SparepartStorageLocation[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [busy, setBusy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ id: number; doc_number: string } | null>(
    null,
  );
  const [openLocationSuggestKey, setOpenLocationSuggestKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAbs<{ rows: SparepartStorageLocation[] }>(
          "/api/sparepart/storage-locations",
        );
        if (!cancelled) setLocations(data.rows);
      } catch {
        if (!cancelled) setLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  const locationLabel = (loc: SparepartStorageLocation) => `${loc.code} — ${loc.name}`;

  const filterLocationList = (
    options: SparepartStorageLocation[],
    needle: string,
  ) => {
    const q = needle.trim().toLowerCase();
    const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (loc) =>
        loc.code.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        locationLabel(loc).toLowerCase().includes(q),
    );
  };

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

  const resolveExistingLocation = (value: string) => {
    const needle = value.trim().toLowerCase();
    if (!needle) return null;
    return (
      locations.find(
        (loc) =>
          loc.code.trim().toLowerCase() === needle ||
          loc.name.trim().toLowerCase() === needle ||
          locationLabel(loc).trim().toLowerCase() === needle,
      ) ?? null
    );
  };

  /** 101 only: type + verify existing location */
  const renderTypedLocationField = (line: LineDraft) => {
    const suggestKey = `${line.key}-from`;
    const suggestions = filterLocationList(locations, line.storage_location_text);
    const open = openLocationSuggestKey === suggestKey;

    return (
      <div className="relative">
        <input
          className={field}
          value={line.storage_location_text}
          onChange={(e) => {
            setOpenLocationSuggestKey(suggestKey);
            setLines((prev) =>
              prev.map((l) =>
                l.key === line.key
                  ? { ...l, storage_location_text: e.target.value }
                  : l,
              ),
            );
          }}
          onFocus={() => setOpenLocationSuggestKey(suggestKey)}
          onBlur={() => {
            window.setTimeout(() => {
              setOpenLocationSuggestKey((key) =>
                key === suggestKey ? null : key,
              );
            }, 120);
          }}
          placeholder={t.sparepart.locationName}
          autoComplete="off"
        />
        {open ? (
          <ul className={`${sparepartDropdownMenuClass} z-20 max-h-48 overflow-auto`}>
            {suggestions.map((loc) => (
              <li key={loc.id}>
                <button
                  type="button"
                  className={`${sparepartDropdownOptionClass(false)} text-xs`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? {
                              ...l,
                              storage_location_text: locationLabel(loc),
                              storage_location_id: String(loc.id),
                            }
                          : l,
                      ),
                    );
                    setOpenLocationSuggestKey(null);
                  }}
                >
                  {locationLabel(loc)}
                </button>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-text-dim">
                {t.common.noData}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    );
  };

  const handlePost = async () => {
    setBusy(true);
    setLastDoc(null);
    try {
      const payloadLines = lines.map((l, index) => {
        if (movementType === "101") {
          const resolved = resolveExistingLocation(l.storage_location_text);
          if (!resolved) {
            throw new Error(
              `Line ${index + 1}: storage location must match an existing location.`,
            );
          }
          return {
            item_id: Number(l.item_id),
            qty: Number(l.qty),
            note: l.note,
            storage_location_id: resolved.id,
            to_storage_location_id: undefined,
          };
        }

        return {
          item_id: Number(l.item_id),
          qty: Number(l.qty),
          note: l.note,
          storage_location_id: Number(l.storage_location_id),
          to_storage_location_id:
            movementType === "311" ? Number(l.to_storage_location_id) : undefined,
        };
      });

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
                                  storage_location_text: "",
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
                                  storage_location_text: "",
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
                  {movementType === "101"
                    ? renderTypedLocationField(line)
                    : (
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
                                  ? { ...l, storage_location_id: locId }
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
                    <SparepartDropdown
                      value={line.to_storage_location_id}
                      options={locations.map((loc) => ({
                        value: String(loc.id),
                        label: locationLabel(loc),
                      }))}
                      onChange={(locId) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, to_storage_location_id: locId }
                              : l,
                          ),
                        )
                      }
                      placeholder={t.sparepart.locationName}
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
                    className="w-full rounded-md border border-border px-2 py-2 text-xs text-danger disabled:opacity-40"
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
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.sparepart.posting : t.sparepart.post}
          </button>
        </div>
      </div>
    </div>
  );
}
