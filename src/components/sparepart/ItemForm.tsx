"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartItemInput } from "@/lib/types";

export type SparepartItemFormExtras = {
  file: File | null;
  removeImage: boolean;
};

type Props = {
  initial: SparepartItem | null;
  onClose: () => void;
  onSubmit: (
    input: SparepartItemInput,
    extras: SparepartItemFormExtras,
  ) => Promise<void>;
};

export function ItemForm({ initial, onClose, onSubmit }: Props) {
  const { t } = useLang();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExistingImage = Boolean(initial?.image_url) && !removeImage;
  const previewSrc = objectUrl ?? (hasExistingImage ? initial?.image_url : null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        {
          code: code.trim(),
          name: name.trim(),
          brand: brand.trim(),
          model: model.trim(),
          notes: notes.trim(),
        },
        { file, removeImage },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const clearImageSelection = () => {
    setFile(null);
    setRemoveImage(true);
    setLightboxOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";
  const card =
    "flex size-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border bg-bg";

  return (
    <>
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
              <input
                className={field}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.name} *</label>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.brand}</label>
              <input
                className={field}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.model}</label>
              <input
                className={field}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>{t.sparepart.notes}</label>
              <textarea
                className={`${field} min-h-[72px]`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>{t.sparepart.image}</span>
              <div className="mt-1 flex flex-wrap items-start gap-2">
                {previewSrc ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setLightboxOpen(true)}
                    className={`${card} border-border-subtle p-0 hover:ring-2 hover:ring-accent/40 disabled:opacity-60`}
                    title={t.sparepart.image}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or API image */}
                    <img
                      src={previewSrc}
                      alt=""
                      className="size-full object-contain"
                    />
                  </button>
                ) : (
                  <label
                    htmlFor={fileInputId}
                    className={`${card} cursor-pointer border-dashed border-border text-text-muted hover:border-accent hover:text-accent ${
                      busy ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <span className="text-2xl leading-none">+</span>
                    <span className="mt-1 text-[11px] font-medium">
                      {t.sparepart.imageUpload}
                    </span>
                  </label>
                )}
                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="sr-only"
                  disabled={busy || Boolean(previewSrc)}
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null;
                    setFile(next);
                    if (next) setRemoveImage(false);
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-text-dim">{t.sparepart.imageHint}</p>
              {previewSrc ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={clearImageSelection}
                  className="mt-2 rounded border border-border px-2 py-0.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-60"
                >
                  {t.sparepart.imageRemove}
                </button>
              ) : null}
              {removeImage && initial?.image_url && !file ? (
                <p className="mt-1 text-xs text-text-muted">
                  {t.sparepart.imageWillRemove}
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </Modal>

      {lightboxOpen && previewSrc ? (
        <ImageLightbox
          src={previewSrc}
          alt={`${code} ${name}`.trim()}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
