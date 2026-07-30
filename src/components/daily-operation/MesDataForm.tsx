"use client";

import { useMemo, useRef, useState } from "react";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  categoriesForDivision,
  subcategoriesForCategory,
  usersForDivision,
} from "@/lib/cascade";
import { toDateTimeLocal } from "@/lib/datetime";
import { localizedName, useLang } from "@/lib/i18n";
import {
  firstErrorField,
  validateMesRecord,
  type MesFieldKey,
  type MesValidationErrorKey,
} from "@/lib/mesRecordValidation";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";

type Props = {
  masters: Masters;
  initial?: MesDataRow | null;
  onClose: () => void;
  onSubmit: (input: MesDataInput) => Promise<void>;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const inputErrorCls = "border-danger focus:border-danger";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";

function fieldErrorMessage(
  key: MesValidationErrorKey,
  t: ReturnType<typeof useLang>["t"],
): string {
  switch (key) {
    case "required":
      return t.validation.fieldRequired;
    case "startBeforeEnd":
      return t.validation.startBeforeEnd;
    case "enHasChinese":
      return t.validation.enHasChinese;
    case "cnNeedsChinese":
      return t.validation.cnNeedsChinese;
    case "invalidDateTime":
      return t.validation.invalidDateTime;
    default:
      return t.validation.required;
  }
}

export function MesDataForm({ masters, initial, onClose, onSubmit }: Props) {
  const { lang, t } = useLang();
  const { error: toastError } = useToast();
  const savingRef = useRef(false);

  const [divisionId, setDivisionId] = useState<number | null>(
    initial?.division_id ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.category_id ?? null,
  );
  const [subcategoryId, setSubcategoryId] = useState<number | null>(
    initial?.subcategory_id ?? null,
  );
  const [userId, setUserId] = useState<number | null>(initial?.user_id ?? null);
  const [typeId, setTypeId] = useState<number | null>(
    initial?.type_id ?? masters.types[0]?.id ?? null,
  );
  const [statusId, setStatusId] = useState<number | null>(
    initial?.status_id ?? masters.statuses[0]?.id ?? null,
  );
  const [descriptionCn, setDescriptionCn] = useState(
    initial?.description_cn ?? "",
  );
  const [descriptionEn, setDescriptionEn] = useState(
    initial?.description_en ?? "",
  );
  const [solutionCn, setSolutionCn] = useState(initial?.solution_cn ?? "");
  const [solutionEn, setSolutionEn] = useState(initial?.solution_en ?? "");
  const [startTime, setStartTime] = useState(
    toDateTimeLocal(initial?.start_time ?? null),
  );
  const [endTime, setEndTime] = useState(
    toDateTimeLocal(initial?.end_time ?? null),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<MesFieldKey, MesValidationErrorKey>>
  >({});
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(
    () => categoriesForDivision(masters, divisionId),
    [masters, divisionId],
  );
  const subcategoryOptions = useMemo(
    () => subcategoriesForCategory(masters, categoryId),
    [masters, categoryId],
  );
  const userOptions = useMemo(
    () => usersForDivision(masters, divisionId),
    [masters, divisionId],
  );

  const handleDivision = (value: number | null) => {
    setDivisionId(value);
    setCategoryId(null);
    setSubcategoryId(null);
    setUserId(null);
  };

  const handleCategory = (value: number | null) => {
    setCategoryId(value);
    setSubcategoryId(null);
  };

  const clearFieldError = (field: MesFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const focusField = (field: MesFieldKey) => {
    const root = document.querySelector(
      `[data-mes-field="${field}"]`,
    ) as HTMLElement | null;
    if (!root) return;
    const focusable = root.matches("select, textarea, input, button")
      ? root
      : (root.querySelector(
          "select, textarea, input, button",
        ) as HTMLElement | null);
    focusable?.focus?.();
    root.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  };

  const submit = async () => {
    if (savingRef.current) return;
    setError(null);

    const result = validateMesRecord({
      user_id: userId,
      division_id: divisionId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      type_id: typeId,
      status_id: statusId,
      description_cn: descriptionCn,
      description_en: descriptionEn,
      solution_cn: solutionCn,
      solution_en: solutionEn,
      start_time: startTime,
      end_time: endTime,
    });

    if (!result.ok) {
      const map: Partial<Record<MesFieldKey, MesValidationErrorKey>> = {};
      for (const err of result.errors) {
        if (!map[err.field]) map[err.field] = err.key;
      }
      setFieldErrors(map);
      const summary =
        result.messageKey === "required"
          ? t.validation.required
          : fieldErrorMessage(result.messageKey, t);
      setError(summary);

      const first = firstErrorField(result.errors);
      if (first) focusField(first);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFieldErrors({});

    try {
      await onSubmit(result.data);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : t.toast.saveFailed;
      const isNetwork =
        e instanceof TypeError ||
        /failed to fetch|network|load failed/i.test(message);
      const display = isNetwork ? t.toast.networkError : message;
      setError(display);
      toastError(display);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const errMsg = (field: MesFieldKey): string | null => {
    const key = fieldErrors[field];
    return key ? fieldErrorMessage(key, t) : null;
  };

  const markInvalid = (field: MesFieldKey) => Boolean(fieldErrors[field]);

  return (
    <Modal
      title={initial ? t.common.edit : t.common.add}
      onClose={onClose}
      size="lg"
      closeDisabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            aria-busy={saving}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
          >
            {saving ? (
              <>
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                {t.common.loading}
              </>
            ) : (
              t.common.save
            )}
          </button>
        </>
      }
    >
      {error ? (
        <p className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>
            {t.fields.division} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="division_id"
            className={`${inputCls} ${markInvalid("division_id") ? inputErrorCls : ""}`}
            value={divisionId ?? ""}
            disabled={saving}
            aria-invalid={markInvalid("division_id")}
            onChange={(e) => {
              clearFieldError("division_id");
              handleDivision(e.target.value ? Number(e.target.value) : null);
            }}
          >
            <option value="">{t.common.none}</option>
            {masters.divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {localizedName(d, lang)}
              </option>
            ))}
          </select>
          {errMsg("division_id") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("division_id")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.pic} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="user_id"
            className={`${inputCls} ${markInvalid("user_id") ? inputErrorCls : ""}`}
            value={userId ?? ""}
            disabled={saving}
            aria-invalid={markInvalid("user_id")}
            onChange={(e) => {
              clearFieldError("user_id");
              setUserId(e.target.value ? Number(e.target.value) : null);
            }}
          >
            <option value="">{t.common.none}</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {localizedName(u, lang)}
              </option>
            ))}
          </select>
          {errMsg("user_id") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("user_id")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.category} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="category_id"
            className={`${inputCls} ${markInvalid("category_id") ? inputErrorCls : ""}`}
            value={categoryId ?? ""}
            onChange={(e) => {
              clearFieldError("category_id");
              handleCategory(e.target.value ? Number(e.target.value) : null);
            }}
            disabled={!divisionId || saving}
            aria-invalid={markInvalid("category_id")}
          >
            <option value="">{t.common.none}</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c, lang)}
              </option>
            ))}
          </select>
          {errMsg("category_id") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("category_id")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.subcategory} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="subcategory_id"
            className={`${inputCls} ${markInvalid("subcategory_id") ? inputErrorCls : ""}`}
            value={subcategoryId ?? ""}
            onChange={(e) => {
              clearFieldError("subcategory_id");
              setSubcategoryId(e.target.value ? Number(e.target.value) : null);
            }}
            disabled={!categoryId || saving}
            aria-invalid={markInvalid("subcategory_id")}
          >
            <option value="">{t.common.none}</option>
            {subcategoryOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {localizedName(s, lang)}
              </option>
            ))}
          </select>
          {errMsg("subcategory_id") ? (
            <p className="mt-1 text-[11px] text-danger">
              {errMsg("subcategory_id")}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.type} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="type_id"
            className={`${inputCls} ${markInvalid("type_id") ? inputErrorCls : ""}`}
            value={typeId ?? ""}
            disabled={saving}
            aria-invalid={markInvalid("type_id")}
            onChange={(e) => {
              clearFieldError("type_id");
              setTypeId(e.target.value ? Number(e.target.value) : null);
            }}
          >
            <option value="">{t.common.none}</option>
            {masters.types.map((v) => (
              <option key={v.id} value={v.id}>
                {localizedName(v, lang)}
              </option>
            ))}
          </select>
          {errMsg("type_id") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("type_id")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.status} <span className="text-danger">*</span>
          </label>
          <select
            data-mes-field="status_id"
            className={`${inputCls} ${markInvalid("status_id") ? inputErrorCls : ""}`}
            value={statusId ?? ""}
            disabled={saving}
            aria-invalid={markInvalid("status_id")}
            onChange={(e) => {
              clearFieldError("status_id");
              setStatusId(e.target.value ? Number(e.target.value) : null);
            }}
          >
            <option value="">{t.common.none}</option>
            {masters.statuses.map((v) => (
              <option key={v.id} value={v.id}>
                {localizedName(v, lang)}
              </option>
            ))}
          </select>
          {errMsg("status_id") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("status_id")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.startTime} <span className="text-danger">*</span>
          </label>
          <div data-mes-field="start_time">
            <DateTimePicker
              value={startTime}
              disabled={saving}
              aria-invalid={markInvalid("start_time")}
              onChange={(v) => {
                clearFieldError("start_time");
                setStartTime(v);
              }}
            />
          </div>
          {errMsg("start_time") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("start_time")}</p>
          ) : null}
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.endTime} <span className="text-danger">*</span>
          </label>
          <div data-mes-field="end_time">
            <DateTimePicker
              value={endTime}
              disabled={saving}
              aria-invalid={markInvalid("end_time")}
              onChange={(v) => {
                clearFieldError("end_time");
                setEndTime(v);
              }}
            />
          </div>
          {errMsg("end_time") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("end_time")}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            {t.fields.descriptionCn} <span className="text-danger">*</span>
          </label>
          <textarea
            data-mes-field="description_cn"
            className={`${inputCls} min-h-20 ${markInvalid("description_cn") ? inputErrorCls : ""}`}
            value={descriptionCn}
            disabled={saving}
            aria-invalid={markInvalid("description_cn")}
            onChange={(e) => {
              clearFieldError("description_cn");
              setDescriptionCn(e.target.value);
            }}
          />
          {errMsg("description_cn") ? (
            <p className="mt-1 text-[11px] text-danger">
              {errMsg("description_cn")}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            {t.fields.descriptionEn} <span className="text-danger">*</span>
          </label>
          <textarea
            data-mes-field="description_en"
            className={`${inputCls} min-h-20 ${markInvalid("description_en") ? inputErrorCls : ""}`}
            value={descriptionEn}
            disabled={saving}
            aria-invalid={markInvalid("description_en")}
            onChange={(e) => {
              clearFieldError("description_en");
              setDescriptionEn(e.target.value);
            }}
          />
          {errMsg("description_en") ? (
            <p className="mt-1 text-[11px] text-danger">
              {errMsg("description_en")}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            {t.fields.solutionCn} <span className="text-danger">*</span>
          </label>
          <textarea
            data-mes-field="solution_cn"
            className={`${inputCls} min-h-20 ${markInvalid("solution_cn") ? inputErrorCls : ""}`}
            value={solutionCn}
            disabled={saving}
            aria-invalid={markInvalid("solution_cn")}
            onChange={(e) => {
              clearFieldError("solution_cn");
              setSolutionCn(e.target.value);
            }}
          />
          {errMsg("solution_cn") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("solution_cn")}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            {t.fields.solutionEn} <span className="text-danger">*</span>
          </label>
          <textarea
            data-mes-field="solution_en"
            className={`${inputCls} min-h-20 ${markInvalid("solution_en") ? inputErrorCls : ""}`}
            value={solutionEn}
            disabled={saving}
            aria-invalid={markInvalid("solution_en")}
            onChange={(e) => {
              clearFieldError("solution_en");
              setSolutionEn(e.target.value);
            }}
          />
          {errMsg("solution_en") ? (
            <p className="mt-1 text-[11px] text-danger">{errMsg("solution_en")}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
