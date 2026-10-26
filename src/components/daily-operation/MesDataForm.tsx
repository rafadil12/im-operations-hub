"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Skeleton";
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
import {
  collectIssueErrors,
  issueErrorField,
  type IssueFieldError,
} from "@/lib/daily-operation/changeRequestIssueParse";
import { fieldErrorMessage, issueErrorMessage } from "./mesFormHelpers";
import { ChangeRequestMaterialFields } from "./ChangeRequestMaterialFields";
import { MesFormFields } from "./MesFormFields";

type Props = {
  masters: Masters;
  initial?: MesDataRow | null;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit?: (input: MesDataInput) => Promise<void>;
};

export function MesDataForm({ masters, initial, readOnly = false, onClose, onSubmit }: Props) {
  const { lang, t } = useLang();
  const { account } = useAuth();
  const { error: toastError } = useToast();
  const savingRef = useRef(false);

  const me = !initial && account ? masters.users.find((u) => u.id === account.id) : undefined;
  const defaultDivisionId = initial?.division_id ?? me?.division_id ?? null;
  const defaultUserId = initial?.user_id ?? (me ? account!.id : null);
  /** Division and PIC come from the saved row or the signed-in user. */
  const lockIdentityFields = Boolean(initial) || Boolean(me);

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
  const materialLocked = Boolean(initial?.sparepart_mat_doc_id);
  const [issueMaterial, setIssueMaterial] = useState(materialLocked);
  const [itemId, setItemId] = useState<number | null>(initial?.sparepart_item_id ?? null);
  const [issueQty, setIssueQty] = useState(
    initial?.sparepart_qty != null ? String(initial.sparepart_qty) : ""
  );
  const [locationId, setLocationId] = useState<number | null>(
    initial?.sparepart_storage_location_id ?? null
  );
  const [levelId, setLevelId] = useState<number | null>(initial?.sparepart_level_id ?? null);
  const [issuedTo, setIssuedTo] = useState("");
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [issueErrors, setIssueErrors] = useState<IssueFieldError[]>([]);

  const categoryOptions = useMemo(
    () => categoriesForDivision(masters, divisionId),
    [masters, divisionId]
  );
  const subcategoryOptions = useMemo(
    () => subcategoriesForCategory(masters, categoryId),
    [masters, categoryId]
  );
  const selectedType = masters.types.find((type) => type.id === typeId);
  const isChangeRequest = selectedType?.name_en === "Change Request";

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

  const fieldsLocked = saving || readOnly;

  const submit = async () => {
    if (readOnly || !onSubmit || savingRef.current) return;
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

    if (isChangeRequest && issueMaterial && !materialLocked) {
      const issueProblems = collectIssueErrors(
        {
          issue_material: true,
          sparepart_item_id: itemId,
          sparepart_qty: issueQty,
          sparepart_storage_location_id: locationId,
          sparepart_level_id: levelId,
          sparepart_recipient: issuedTo,
        },
        availableQty
      );
      if (issueProblems.length > 0) {
        setIssueErrors(issueProblems);
        const summary = issueProblems
          .map((error) => issueErrorMessage(error, t, availableQty))
          .join(" ");
        setError(summary);
        const field = issueErrorField(issueProblems[0]);
        document.querySelector(`[data-issue-field="${field}"]`)?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
        return;
      }
    }
    setIssueErrors([]);

    savingRef.current = true;
    setSaving(true);
    setFieldErrors({});

    try {
      await onSubmit({
        ...result.data,
        issue_material: isChangeRequest && issueMaterial && !materialLocked,
        sparepart_item_id: itemId,
        sparepart_qty: issueQty ? Number(issueQty) : null,
        sparepart_storage_location_id: locationId,
        sparepart_level_id: levelId,
        sparepart_recipient: issuedTo.trim(),
      });
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
      title={
        readOnly && initial
          ? `${t.common.view} ${initial.id}`
          : initial
            ? `${t.common.edit} ${initial.id}`
            : t.common.add
      }
      onClose={onClose}
      size="lg"
      closeDisabled={saving}
      footer={
        readOnly ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.common.close}
          </button>
        ) : (
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
                  <Spinner />
                  {t.common.loading}
                </>
              ) : (
                t.common.save
              )}
            </button>
          </>
        )
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
        saving={fieldsLocked}
        lockIdentityFields={lockIdentityFields}
        lockType={materialLocked}
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
        afterStatus={
          isChangeRequest ? (
            <ChangeRequestMaterialFields
              saving={fieldsLocked}
              locked={materialLocked}
              initial={initial}
              issueMaterial={issueMaterial}
              itemId={itemId}
              qty={issueQty}
              locationId={locationId}
              levelId={levelId}
              recipient={issuedTo}
              errors={issueErrors}
              availableQty={availableQty}
              onIssueMaterial={(value) => {
                setIssueMaterial(value);
                if (!value) setIssueErrors([]);
              }}
              onItemId={(value) => {
                setItemId(value);
                setIssueErrors((current) =>
                  current.filter((error) => issueErrorField(error) !== "item")
                );
              }}
              onQty={(value) => {
                setIssueQty(value);
                setIssueErrors((current) =>
                  current.filter((error) => issueErrorField(error) !== "qty")
                );
              }}
              onLocationId={(value) => {
                setLocationId(value);
                setIssueErrors((current) =>
                  current.filter(
                    (error) => issueErrorField(error) !== "location"
                  )
                );
              }}
              onLevelId={setLevelId}
              onRecipient={(value) => {
                setIssuedTo(value);
                setIssueErrors((current) =>
                  current.filter((error) => issueErrorField(error) !== "recipient")
                );
              }}
              onAvailableQty={setAvailableQty}
            />
          ) : null
        }
      />
    </Modal>
  );
}
