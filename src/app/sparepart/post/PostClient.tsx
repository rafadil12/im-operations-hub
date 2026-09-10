"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartStockLevel } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { LocationCombobox } from "@/components/sparepart/LocationCombobox";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { TransactionTypeSelect } from "@/components/sparepart/TransactionTypeSelect";
import {
  combineDateWithCurrentTime,
  MAX_LINES_PER_DOC,
  newClientRequestId,
  newLine,
  todayLocalDateInputValue,
  type LineDraft,
} from "@/lib/sparepart/postDraft";

export default function PostGoodsMovementPage() {
  const { t, lang } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const [movementType, setMovementType] = useState<"101" | "201" | "311">("101");
  const [postingDate, setPostingDate] = useState(todayLocalDateInputValue);
  const [headerText, setHeaderText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [busy, setBusy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ id: number; doc_number: string } | null>(null);
  const [levels, setLevels] = useState<SparepartStockLevel[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetAbs<{ rows: SparepartStockLevel[] }>("/api/sparepart/levels")
      .then((data) => {
        if (!cancelled) setLevels(data.rows);
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  const levelLabel = (level: Pick<SparepartStockLevel, "code" | "name_en" | "name_cn">) =>
    `${level.code} — ${localizedName(level, lang)}`;

  const levelOptions = levels.map((level) => ({
    value: String(level.id),
    label: levelLabel(level),
  }));

  const stockPointOptionsForItem = (item?: SparepartItem | null) => {
    if (!item) return [] as { value: string; label: string }[];
    return (item.balances ?? [])
      .filter((balance) => Number(balance.qty) > 0)
      .map((balance) => ({
        value: `${balance.storage_location_id}:${balance.level_id}`,
        label: `${balance.location_code ?? ""} — ${localizedName(
          {
            name_en: balance.location_name_en ?? balance.location_name ?? null,
            name_cn: balance.location_name_cn ?? null,
          },
          lang
        )} / ${balance.level_code ?? ""} — ${localizedName(
          {
            name_en: balance.level_name_en ?? null,
            name_cn: balance.level_name_cn ?? null,
          },
          lang
        )} (${balance.qty})`,
      }));
  };

  const applyStockPoint = (value: string) => {
    const [locId, levelId] = value.split(":");
    return { storage_location_id: locId ?? "", storage_level_id: levelId ?? "" };
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
        storage_level_id: Number(l.storage_level_id),
        to_storage_location_id:
          movementType === "311" ? Number(l.to_storage_location_id) : undefined,
        to_storage_level_id: movementType === "311" ? Number(l.to_storage_level_id) : undefined,
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
        }
      );
      toastSuccess(t.sparepart.postSuccess.replace("{doc}", result.doc_number));
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
              <TransactionTypeSelect value={movementType} onChange={setMovementType} />
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
                title={lines.length >= MAX_LINES_PER_DOC ? t.sparepart.maxLinesReached : undefined}
                onClick={() =>
                  setLines((prev) =>
                    prev.length >= MAX_LINES_PER_DOC ? prev : [...prev, newLine()]
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
                                    storage_level_id: "",
                                    to_storage_location_id: "",
                                    to_storage_level_id: "",
                                  }
                                : l
                            )
                          );
                          return;
                        }

                        void (async () => {
                          const fullItem = await apiGetAbs<{ row: SparepartItem }>(
                            `/api/sparepart/materials/${itemId}`
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
                                    storage_location_id: "",
                                    storage_level_id: "",
                                    to_storage_location_id: "",
                                    to_storage_level_id: "",
                                  }
                                : l
                            )
                          );
                        })();
                      }}
                      className={field}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>
                      {movementType === "311" ? t.sparepart.fromLocation : t.sparepart.location} *
                    </label>
                    {movementType === "101" ? (
                      <LocationCombobox
                        value={line.storage_location_id}
                        onChange={(locId) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, storage_location_id: locId } : l
                            )
                          )
                        }
                        className={field}
                      />
                    ) : (
                      <SparepartDropdown
                        value={
                          line.storage_location_id && line.storage_level_id
                            ? `${line.storage_location_id}:${line.storage_level_id}`
                            : ""
                        }
                        options={stockPointOptionsForItem(line.item)}
                        onChange={(value) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, ...applyStockPoint(value) } : l
                            )
                          )
                        }
                        placeholder={t.sparepart.locationName}
                        disabled={!line.item_id}
                      />
                    )}
                  </div>
                  {movementType === "101" ? (
                    <div className="md:col-span-2">
                      <label className={label}>{t.sparepart.level} *</label>
                      <SparepartDropdown
                        value={line.storage_level_id}
                        options={levelOptions}
                        onChange={(levelId) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, storage_level_id: levelId } : l
                            )
                          )
                        }
                        placeholder={t.sparepart.level}
                      />
                    </div>
                  ) : null}
                  {movementType === "311" ? (
                    <>
                      <div className="md:col-span-2">
                        <label className={label}>{t.sparepart.toLocation} *</label>
                        <LocationCombobox
                          value={line.to_storage_location_id}
                          onChange={(locId) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, to_storage_location_id: locId } : l
                              )
                            )
                          }
                          className={field}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={label}>{t.sparepart.toLevel} *</label>
                        <SparepartDropdown
                          value={line.to_storage_level_id}
                          options={levelOptions}
                          onChange={(levelId) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, to_storage_level_id: levelId } : l
                              )
                            )
                          }
                          placeholder={t.sparepart.toLevel}
                        />
                      </div>
                    </>
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
                          prev.map((l) => (l.key === line.key ? { ...l, qty: e.target.value } : l))
                        )
                      }
                    />
                  </div>
                  <div className={movementType === "311" ? "md:col-span-2" : "md:col-span-4"}>
                    <label className={label}>{t.sparepart.note}</label>
                    <input
                      className={field}
                      value={line.note}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, note: e.target.value } : l))
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
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
