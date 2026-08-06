"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

type Props = {
  initial: SparepartItem | null;
  onClose: () => void;
  onSubmit: (input: SparepartItemInput) => Promise<void>;
};

export function ItemForm({ initial, onClose, onSubmit }: Props) {
  const { t } = useLang();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <Modal
      title={initial ? t.common.edit : t.common.add}
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
            form="sparepart-item-form"
            disabled={busy}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="sparepart-item-form" onSubmit={handleSubmit} className="space-y-3">
        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{t.sparepart.code} *</label>
            <input className={field} value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div>
            <label className={label}>{t.sparepart.name} *</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>{t.sparepart.brand}</label>
            <input className={field} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.sparepart.model}</label>
            <input className={field} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t.sparepart.notes}</label>
            <textarea
              className={`${field} min-h-[72px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
