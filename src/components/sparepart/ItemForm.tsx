"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Modal } from "@/components/ui/Modal";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { SparepartMasterCreateDialog } from "@/components/sparepart/SparepartMasterCreateDialog";
import {
  FormBoxIcon,
  FormDocumentIcon,
  FormNotesIcon,
  FormTagIcon,
  FormTranslateIcon,
} from "@/components/sparepart/formSectionIcons";
import { apiGetAbs } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type {
  SparepartCategory,
  SparepartItem,
  SparepartItemInput,
  SparepartUom,
} from "@/lib/types";

export type SparepartItemFormExtras = {
  file: File | null;
  removeImage: boolean;
};

type Props = {
  initial: SparepartItem | null;
  onClose: () => void;
  onSubmit: (input: SparepartItemInput, extras: SparepartItemFormExtras) => Promise<void>;
};

function toUpperInput(value: string): string {
  return value.toUpperCase();
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          {icon}
        </span>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h4>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
      {children}
    </section>
  );
}

function LangLabel({
  text,
  tag,
  required,
}: {
  text: string;
  tag: "EN" | "CN";
  required?: boolean;
}) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xs font-medium text-text-muted">
        {text}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
        {tag}
      </span>
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-medium text-text-muted">
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </label>
  );
}

export function ItemForm({ initial, onClose, onSubmit }: Props) {
  const { t, lang } = useLang();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState(initial?.code ?? "");
  const [erpItemCode, setErpItemCode] = useState(initial?.erp_item_code ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameCn, setNameCn] = useState(initial?.name_cn ?? "");
  const [brandEn, setBrandEn] = useState(initial?.brand_en ?? "");
  const [brandCn, setBrandCn] = useState(initial?.brand_cn ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.category_id ? String(initial.category_id) : ""
  );
  const [uomId, setUomId] = useState(initial?.uom_id ? String(initial.uom_id) : "");
  const [minStock, setMinStock] = useState(String(initial?.min_stock ?? 0));
  const [isActive, setIsActive] = useState(initial ? Boolean(initial.is_active) : true);
  const [categories, setCategories] = useState<SparepartCategory[]>([]);
  const [uoms, setUoms] = useState<SparepartUom[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<"category" | "uom" | null>(null);

  const hasExistingImage = Boolean(initial?.image_url) && !removeImage;
  const previewSrc = objectUrl ?? (hasExistingImage ? initial?.image_url : null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGetAbs<{ rows: SparepartCategory[] }>("/api/sparepart/categories"),
      apiGetAbs<{ rows: SparepartUom[] }>("/api/sparepart/uoms"),
    ])
      .then(([catData, uomData]) => {
        if (cancelled) return;
        setCategories(catData.rows);
        setUoms(uomData.rows);
        if (!initial?.uom_id) {
          const pcs = uomData.rows.find((row) => row.code === "PCS") ?? uomData.rows[0];
          if (pcs) setUomId(String(pcs.id));
        }
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [initial?.category_id, initial?.uom_id, t.common.error]);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear preview when file is removed
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (initial) return;
    if (!categoryId) return;
    let cancelled = false;
    apiGetAbs<{ code: string }>(`/api/sparepart/materials/next-code?category_id=${categoryId}`)
      .then((data) => {
        if (!cancelled) setCode(data.code);
      })
      .catch(() => {
        if (!cancelled) setCode("");
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() && !nameCn.trim()) {
      setError(t.sparepart.nameRequired);
      return;
    }
    if (initial && !isActive && Number(initial.stock_current) !== 0) {
      setError(t.sparepart.cannotInactiveWithStock);
      return;
    }
    const parsedCategoryId = Number(categoryId);
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setError(t.sparepart.category);
      return;
    }
    const parsedUomId = Number(uomId);
    if (!Number.isFinite(parsedUomId) || parsedUomId <= 0) {
      setError(t.sparepart.uom);
      return;
    }
    const parsedMin = Number(minStock);
    if (!Number.isFinite(parsedMin) || parsedMin < 0 || !Number.isInteger(parsedMin)) {
      setError(t.sparepart.minStock);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        {
          code: code.trim(),
          erp_item_code: erpItemCode.trim(),
          name_en: nameEn.trim(),
          name_cn: nameCn.trim(),
          brand_en: brandEn.trim(),
          brand_cn: brandCn.trim(),
          model: model.trim(),
          notes: notes.trim(),
          category_id: parsedCategoryId,
          uom_id: parsedUomId,
          min_stock: parsedMin,
          is_active: isActive,
        },
        { file, removeImage }
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
  const bilingualArea = `${field} min-h-0 resize-y`;
  const card =
    "flex size-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border bg-bg";

  return (
    <>
      <Modal
        title={initial ? t.common.edit : t.common.add}
        subtitle={
          initial ? undefined : (
            <p className="text-xs text-text-muted">{t.sparepart.formCreateMaterial}</p>
          )
        }
        size="lg"
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
        <form id="sparepart-item-form" onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          <FormSection title={t.sparepart.formBasicInfo} icon={<FormDocumentIcon />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>{t.sparepart.category}</FieldLabel>
                <SparepartDropdown
                  className="w-full"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categories.map((row) => ({
                    value: String(row.id),
                    label: localizedName(row, lang),
                  }))}
                  placeholder={t.sparepart.category}
                  disabled={busy}
                  onAdd={() => setCreateKind("category")}
                  addLabel={`+ ${t.sparepart.addCategory}`}
                />
              </div>
              <div>
                <FieldLabel>{t.sparepart.code}</FieldLabel>
                <input
                  className={`${field} pointer-events-none cursor-default bg-bg/60 text-text-muted`}
                  value={code}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  placeholder={t.sparepart.codeAutoHint}
                  onFocus={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <FieldLabel>{t.sparepart.erpItemCode}</FieldLabel>
                <input
                  className={field}
                  value={erpItemCode}
                  onChange={(e) => setErpItemCode(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{t.sparepart.model}</FieldLabel>
                <input
                  className={field}
                  value={model}
                  onChange={(e) => setModel(toUpperInput(e.target.value))}
                  placeholder={t.sparepart.model}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={t.sparepart.name} icon={<FormTranslateIcon />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <LangLabel text={t.sparepart.labelEnglish} tag="EN" required />
                <textarea
                  className={bilingualArea}
                  rows={2}
                  value={nameEn}
                  onChange={(e) => setNameEn(toUpperInput(e.target.value))}
                  placeholder={t.sparepart.nameEn}
                />
              </div>
              <div>
                <LangLabel text={t.sparepart.labelChinese} tag="CN" required />
                <textarea
                  className={bilingualArea}
                  rows={2}
                  value={nameCn}
                  onChange={(e) => setNameCn(e.target.value)}
                  placeholder={t.sparepart.nameCn}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={t.sparepart.brand} icon={<FormTagIcon />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <LangLabel text={t.sparepart.labelEnglish} tag="EN" />
                <textarea
                  className={bilingualArea}
                  rows={2}
                  value={brandEn}
                  onChange={(e) => setBrandEn(toUpperInput(e.target.value))}
                  placeholder={t.sparepart.brandEn}
                />
              </div>
              <div>
                <LangLabel text={t.sparepart.labelChinese} tag="CN" />
                <textarea
                  className={bilingualArea}
                  rows={2}
                  value={brandCn}
                  onChange={(e) => setBrandCn(e.target.value)}
                  placeholder={t.sparepart.brandCn}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={t.sparepart.formInventory} icon={<FormBoxIcon />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel required>{t.sparepart.uom}</FieldLabel>
                <SparepartDropdown
                  className="w-full"
                  value={uomId}
                  onChange={setUomId}
                  options={uoms.map((row) => ({
                    value: String(row.id),
                    label: `${row.code} — ${localizedName(row, lang)}`,
                  }))}
                  placeholder={t.sparepart.uom}
                  disabled={busy}
                  onAdd={() => setCreateKind("uom")}
                  addLabel={`+ ${t.sparepart.addUom}`}
                />
              </div>
              <div>
                <FieldLabel>{t.sparepart.minStock}</FieldLabel>
                <input
                  className={field}
                  type="number"
                  min={0}
                  step={1}
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel required>{t.sparepart.stockStatus}</FieldLabel>
                <SparepartDropdown
                  className="w-full"
                  value={isActive ? "1" : "0"}
                  onChange={(value) => {
                    if (value === "0" && initial && Number(initial.stock_current) !== 0) {
                      setError(t.sparepart.cannotInactiveWithStock);
                      return;
                    }
                    setIsActive(value !== "0");
                  }}
                  options={[
                    { value: "1", label: t.sparepart.active },
                    ...(initial && Number(initial.stock_current) !== 0
                      ? []
                      : [{ value: "0", label: t.sparepart.nonActive }]),
                  ]}
                  placeholder={t.sparepart.stockStatus}
                  disabled={busy}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={t.sparepart.formAdditional} icon={<FormNotesIcon />}>
            <div className="space-y-3">
              <div>
                <FieldLabel>{t.sparepart.notes}</FieldLabel>
                <textarea
                  className={`${field} min-h-[72px]`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t.sparepart.image}</FieldLabel>
                <div className="relative w-fit">
                  {previewSrc ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setLightboxOpen(true)}
                      className={`${card} overflow-hidden border-border-subtle p-0 hover:ring-2 hover:ring-accent/40 disabled:opacity-60`}
                      title={t.sparepart.image}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or API image */}
                      <img
                        src={previewSrc}
                        alt={t.common.materialPreview}
                        className="size-full object-contain"
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className={`${card} cursor-pointer border-dashed border-border text-text-muted hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-60`}
                    >
                      <span className="text-2xl leading-none">+</span>
                      <span className="mt-1 text-[11px] font-medium">{t.sparepart.imageUpload}</span>
                    </button>
                  )}
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    tabIndex={-1}
                    className="pointer-events-none absolute size-px overflow-hidden opacity-0"
                    disabled={busy || Boolean(previewSrc)}
                    onChange={(e) => {
                      const next = e.target.files?.[0] ?? null;
                      setFile(next);
                      if (next) setRemoveImage(false);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-[11px] text-text-dim">{t.sparepart.imageHint}</p>
                {previewSrc ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={clearImageSelection}
                    className="rounded border border-border px-2 py-0.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-60"
                  >
                    {t.sparepart.imageRemove}
                  </button>
                ) : null}
                {removeImage && initial?.image_url && !file ? (
                  <p className="text-xs text-text-muted">{t.sparepart.imageWillRemove}</p>
                ) : null}
              </div>
            </div>
          </FormSection>
        </form>
      </Modal>

      {lightboxOpen && previewSrc ? (
        <ImageLightbox
          src={previewSrc}
          alt={`${code} ${nameEn || nameCn}`.trim()}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}

      {createKind ? (
        <SparepartMasterCreateDialog
          title={createKind === "category" ? t.sparepart.addCategory : t.sparepart.addUom}
          endpoint={
            createKind === "category" ? "/api/sparepart/categories" : "/api/sparepart/uoms"
          }
          onClose={() => setCreateKind(null)}
          onCreated={(row) => {
            if (createKind === "category") {
              setCategories((current) =>
                current.some((item) => item.id === row.id)
                  ? current
                  : [
                      ...current,
                      {
                        id: row.id,
                        code: row.code,
                        name_en: row.name_en,
                        name_cn: row.name_cn,
                        sort_order: current.length + 1,
                        is_active: 1,
                      },
                    ]
              );
              setCategoryId(String(row.id));
            } else {
              setUoms((current) =>
                current.some((item) => item.id === row.id)
                  ? current
                  : [
                      ...current,
                      {
                        id: row.id,
                        code: row.code,
                        name_en: row.name_en,
                        name_cn: row.name_cn,
                        sort_order: current.length + 1,
                        is_active: 1,
                      },
                    ]
              );
              setUomId(String(row.id));
            }
            setCreateKind(null);
          }}
        />
      ) : null}
    </>
  );
}
