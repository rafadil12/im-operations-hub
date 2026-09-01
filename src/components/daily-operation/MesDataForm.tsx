"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { categoriesForDivision, subcategoriesForCategory, usersForDivision } from "@/lib/cascade";
import { toDateTimeLocal } from "@/lib/datetime";
import { useLang } from "@/lib/i18n";
import {
  firstErrorField,
  validateMesRecord,
  type MesFieldKey,
  type MesValidationErrorKey,
} from "@/lib/daily-operation/mesRecordValidation";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";
import { fieldErrorMessage } from "./mesFormHelpers";
import { MesFormFields } from "./MesFormFields";

type Props = {
  masters: Masters;
  initial?: MesDataRow | null;
  onClose: () => void;
  onSubmit: (input: MesDataInput) => Promise<void>;
};

export function MesDataForm({ masters, initial, onClose, onSubmit }: Props) {
  const { lang, t } = useLang();
  const { account } = useAuth();
  const { error: toastError } = useToast();
  const savingRef = useRef(false);

  const me = !initial && account ? masters.users.find((u) => u.id === account.id) : undefined;
  const defaultDivisionId = initial?.division_id ?? me?.division_id ?? null;
  const defaultUserId = initial?.user_id ?? (me ? account!.id : null);
  /** Add mode: Division/PIC come from auth and must not be changed. */
  const lockIdentityFields = Boolean(me);

  const [divisionId, setDivisionId] = useState<number | null>(defaultDivisionId);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(
    initial?.subcategory_id ?? null
  );
  const [userId, setUserId] = useState<number | null>(defaultUserId);
  const [typeId, setTypeId] = useState<number | null>(
    initial?.type_id ?? masters.types[0]?.id ?? null
  );
  const [statusId, setStatusId] = useState<number | null>(
    initial?.status_id ?? masters.statuses[0]?.id ?? null
  );
  const [descriptionCn, setDescriptionCn] = useState(initial?.description_cn ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en ?? "");
  const [solutionCn, setSolutionCn] = useState(initial?.solution_cn ?? "");
  const [solutionEn, setSolutionEn] = useState(initial?.solution_en ?? "");
  const [startTime, setStartTime] = useState(toDateTimeLocal(initial?.start_time ?? null));
  const [endTime, setEndTime] = useState(toDateTimeLocal(initial?.end_time ?? null));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<MesFieldKey, MesValidationErrorKey>>
  >({});
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(
    () => categoriesForDivision(masters, divisionId),
    [masters, divisionId]
  );
  const subcategoryOptions = useMemo(
    () => subcategoriesForCategory(masters, categoryId),
    [masters, categoryId]
  );
  const userOptions = useMemo(() => {
    const list = usersForDivision(masters, divisionId);
    if (
      initial?.user_id &&
      !list.some((u) => u.id === initial.user_id) &&
      (divisionId == null || initial.division_id === divisionId)
    ) {
      return [
        ...list,
        {
          id: initial.user_id,
          name_en: initial.pic_en,
          name_cn: initial.pic_cn,
          division_id: initial.division_id,
        },
      ];
    }
    return list;
  }, [masters, divisionId, initial]);

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
    const root = document.querySelector(`[data-mes-field="${field}"]`) as HTMLElement | null;
    if (!root) return;
    const focusable = root.matches("select, textarea, input, button")
      ? root
      : (root.querySelector("select, textarea, input, button") as HTMLElement | null);
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
      const message = e instanceof Error ? e.message : t.toast.saveFailed;
      const isNetwork =
        e instanceof TypeError || /failed to fetch|network|load failed/i.test(message);
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

      <MesFormFields
        t={t}
        lang={lang}
        masters={masters}
        saving={saving}
        lockIdentityFields={lockIdentityFields}
        divisionId={divisionId}
        userId={userId}
        categoryId={categoryId}
        subcategoryId={subcategoryId}
        typeId={typeId}
        statusId={statusId}
        startTime={startTime}
        endTime={endTime}
        descriptionCn={descriptionCn}
        descriptionEn={descriptionEn}
        solutionCn={solutionCn}
        solutionEn={solutionEn}
        categoryOptions={categoryOptions}
        subcategoryOptions={subcategoryOptions}
        userOptions={userOptions}
        errMsg={errMsg}
        markInvalid={markInvalid}
        clearFieldError={clearFieldError}
        handleDivision={handleDivision}
        handleCategory={handleCategory}
        setUserId={setUserId}
        setSubcategoryId={setSubcategoryId}
        setTypeId={setTypeId}
        setStatusId={setStatusId}
        setStartTime={setStartTime}
        setEndTime={setEndTime}
        setDescriptionCn={setDescriptionCn}
        setDescriptionEn={setDescriptionEn}
        setSolutionCn={setSolutionCn}
        setSolutionEn={setSolutionEn}
      />
    </Modal>
  );
}
