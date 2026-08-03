"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type {
  MovementType,
  SparepartItem,
} from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";

type ListResponse = { rows: SparepartItem[] };

type LineDraft = {
  key: string;
  item_id: string;
  qty: string;
  note: string;
};

function newLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id: "",
    qty: "1",
    note: "",
  };
}

export default function PostGoodsMovementPage() {
  const { t } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const [materials, setMaterials] = useState<SparepartItem[]>([]);
  const [movementType, setMovementType] = useState<MovementType>("101");
  const [postingDate, setPostingDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [headerText, setHeaderText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [busy, setBusy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ id: number; doc_number: string } | null>(
    null,
  );

  useEffect(() => {
    apiGetAbs<ListResponse>("/api/sparepart/materials")
      .then((data) => setMaterials(data.rows))
      .catch((e) =>
        toastError(e instanceof Error ? e.message : t.common.error),
      );
  }, [t.common.error, toastError]);

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  const handlePost = async () => {
    setBusy(true);
    setLastDoc(null);
    try {
      const result = await apiSendAbs<{ id: number; doc_number: string }>(
        "/api/sparepart/goods-movements",
        "POST",
        {
          movement_type: movementType,
          posting_date: postingDate,
          header_text: headerText,
          recipient,
          lines: lines.map((l) => ({
            item_id: Number(l.item_id),
            qty: Number(l.qty),
            note: l.note,
          })),
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={label}>{t.sparepart.movementType} *</label>
            <select
              className={field}
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
            >
              <option value="101">{t.sparepart.movement101}</option>
              <option value="201">{t.sparepart.movement201}</option>
            </select>
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
          <div className="md:col-span-2">
            <label className={label}>{t.sparepart.headerText}</label>
            <input
              className={field}
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
            />
          </div>
          {movementType === "201" ? (
            <div className="md:col-span-2">
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
              onClick={() => setLines((prev) => [...prev, newLine()])}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
            >
              + {t.sparepart.addLine}
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, index) => {
              return (
                <div
                  key={line.key}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border-subtle bg-bg/40 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <label className={label}>
                      {t.sparepart.item} #{index + 1}
                    </label>
                    <MaterialCombobox
                      materials={materials}
                      value={line.item_id}
                      onChange={(itemId) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, item_id: itemId }
                              : l,
                          ),
                        )
                      }
                      className={field}
                    />
                  </div>
                  <div className="md:col-span-2">
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
                  <div className="md:col-span-4">
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
              );
            })}
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
