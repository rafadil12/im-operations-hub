"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  categoriesForDivision,
  subcategoriesForCategory,
  usersForDivision,
} from "@/lib/cascade";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/datetime";
import { localizedName, useLang } from "@/lib/i18n";
import type { Masters, MesDataInput, MesDataRow } from "@/lib/types";

type Props = {
  masters: Masters;
  initial?: MesDataRow | null;
  onClose: () => void;
  onSubmit: (input: MesDataInput) => Promise<void>;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";

export function MesDataForm({ masters, initial, onClose, onSubmit }: Props) {
  const { lang, t } = useLang();

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

  const submit = async () => {
    setError(null);
    if (
      !userId ||
      !divisionId ||
      !categoryId ||
      !subcategoryId ||
      !typeId ||
      !statusId ||
      !descriptionCn.trim() ||
      !startTime
    ) {
      setError(
        "User, Division, Category, Subcategory, Type, Status, Description (CN) and Start Time are required.",
      );
      return;
    }
    setSaving(true);
    try {
      const start = fromDateTimeLocal(startTime);
      if (!start) {
        setError("Start Time is required.");
        setSaving(false);
        return;
      }
      await onSubmit({
        user_id: userId,
        division_id: divisionId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        description_cn: descriptionCn.trim(),
        description_en: descriptionEn.trim() || null,
        solution_cn: solutionCn.trim() || null,
        solution_en: solutionEn.trim() || null,
        type_id: typeId,
        status_id: statusId,
        start_time: start,
        end_time: fromDateTimeLocal(endTime),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? t.common.edit : t.common.add}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t.common.loading : t.common.save}
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
            className={inputCls}
            value={divisionId ?? ""}
            onChange={(e) =>
              handleDivision(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">{t.common.none}</option>
            {masters.divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {localizedName(d, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.pic} <span className="text-danger">*</span>
          </label>
          <select
            className={inputCls}
            value={userId ?? ""}
            onChange={(e) =>
              setUserId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">{t.common.none}</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {localizedName(u, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.category} <span className="text-danger">*</span>
          </label>
          <select
            className={inputCls}
            value={categoryId ?? ""}
            onChange={(e) =>
              handleCategory(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!divisionId}
          >
            <option value="">{t.common.none}</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.subcategory} <span className="text-danger">*</span>
          </label>
          <select
            className={inputCls}
            value={subcategoryId ?? ""}
            onChange={(e) =>
              setSubcategoryId(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!categoryId}
          >
            <option value="">{t.common.none}</option>
            {subcategoryOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {localizedName(s, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.type} <span className="text-danger">*</span>
          </label>
          <select
            className={inputCls}
            value={typeId ?? ""}
            onChange={(e) =>
              setTypeId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">{t.common.none}</option>
            {masters.types.map((v) => (
              <option key={v.id} value={v.id}>
                {localizedName(v, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.status} <span className="text-danger">*</span>
          </label>
          <select
            className={inputCls}
            value={statusId ?? ""}
            onChange={(e) =>
              setStatusId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">{t.common.none}</option>
            {masters.statuses.map((v) => (
              <option key={v.id} value={v.id}>
                {localizedName(v, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {t.fields.startTime} <span className="text-danger">*</span>
          </label>
          <input
            type="datetime-local"
            className={inputCls}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>{t.fields.endTime}</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>
            {t.fields.descriptionCn} <span className="text-danger">*</span>
          </label>
          <textarea
            className={`${inputCls} min-h-20`}
            value={descriptionCn}
            onChange={(e) => setDescriptionCn(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>{t.fields.descriptionEn}</label>
          <textarea
            className={`${inputCls} min-h-20`}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>{t.fields.solutionCn}</label>
          <textarea
            className={`${inputCls} min-h-20`}
            value={solutionCn}
            onChange={(e) => setSolutionCn(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>{t.fields.solutionEn}</label>
          <textarea
            className={`${inputCls} min-h-20`}
            value={solutionEn}
            onChange={(e) => setSolutionEn(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
