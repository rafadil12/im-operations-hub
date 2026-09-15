"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { isValidCnText } from "@/lib/daily-operation/mesRecordValidation";
import { useLang } from "@/lib/i18n";

type Props = {
  title: string;
  onClose: () => void;
  onCreated: (row: { id: number; code: string; name_en: string; name_cn: string }) => void;
  endpoint: "/api/sparepart/categories" | "/api/sparepart/uoms";
};

function sanitizeCategoryCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

function sanitizeUomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

export function SparepartMasterCreateDialog({ title, onClose, onCreated, endpoint }: Props) {
  const { t } = useLang();
  const isCategory = endpoint === "/api/sparepart/categories";
  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameCn, setNameCn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextCode = code.trim().toUpperCase();
    const nextNameCn = nameCn.trim();

    if (isCategory && !/^[A-Z]{1,3}$/.test(nextCode)) {
      setError(t.sparepart.categoryCodeInvalid);
      return;
    }
    if (!isCategory && !/^[A-Z0-9]{1,4}$/.test(nextCode)) {
      setError(t.sparepart.uomCodeInvalid);
      return;
    }
    if (!isValidCnText(nextNameCn)) {
      setError(t.sparepart.nameCnMustBeChinese);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: nextCode,
          name_en: nameEn.trim(),
          name_cn: nextNameCn,
        }),
      });
      const payload = (await response.json()) as {
        row?: { id: number; code: string; name_en: string; name_cn: string };
        error?: string;
      };
      if (!response.ok || !payload.row) {
        throw new Error(payload.error || t.toast.saveFailed);
      }
      onCreated(payload.row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="sparepart-master-create"
            disabled={busy}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="sparepart-master-create" onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div>
          <label className={label}>
            {t.sparepart.masterCode} <span className="text-danger">*</span>
          </label>
          <input
            className={field}
            value={code}
            onChange={(event) =>
              setCode(
                isCategory
                  ? sanitizeCategoryCode(event.target.value)
                  : sanitizeUomCode(event.target.value)
              )
            }
            maxLength={isCategory ? 3 : 4}
            placeholder={
              isCategory ? t.sparepart.categoryCodePlaceholder : t.sparepart.uomCodePlaceholder
            }
            required
          />
          {isCategory ? (
            <p className="mt-1 text-[11px] text-text-dim">{t.sparepart.categoryCodeHint}</p>
          ) : null}
        </div>
        <div>
          <label className={label}>
            {t.sparepart.nameEn} <span className="text-danger">*</span>
          </label>
          <input
            className={field}
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value.toUpperCase())}
            placeholder={
              isCategory
                ? t.sparepart.categoryNameEnPlaceholder
                : t.sparepart.uomNameEnPlaceholder
            }
            required
          />
        </div>
        <div>
          <label className={label}>
            {t.sparepart.nameCn} <span className="text-danger">*</span>
          </label>
          <input
            className={field}
            value={nameCn}
            onChange={(event) => setNameCn(event.target.value)}
            placeholder={
              isCategory
                ? t.sparepart.categoryNameCnPlaceholder
                : t.sparepart.uomNameCnPlaceholder
            }
            required
          />
        </div>
      </form>
    </Modal>
  );
}
