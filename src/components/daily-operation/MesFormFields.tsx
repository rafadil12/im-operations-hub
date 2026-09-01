"use client";

import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { localizedName, type Dict } from "@/lib/i18n";
import type { MesFieldKey } from "@/lib/daily-operation/mesRecordValidation";
import type { Masters } from "@/lib/types";
import {
  mesInputCls as inputCls,
  mesInputErrorCls as inputErrorCls,
  mesLabelCls as labelCls,
  mesLockedSelectCls as lockedSelectCls,
} from "./mesFormHelpers";

type NamedOption = { id: number; name_en: string | null; name_cn: string | null };

type Props = {
  t: Dict;
  lang: "en" | "cn";
  masters: Masters;
  saving: boolean;
  lockIdentityFields: boolean;
  divisionId: number | null;
  userId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  typeId: number | null;
  statusId: number | null;
  startTime: string;
  endTime: string;
  descriptionCn: string;
  descriptionEn: string;
  solutionCn: string;
  solutionEn: string;
  categoryOptions: NamedOption[];
  subcategoryOptions: NamedOption[];
  userOptions: NamedOption[];
  errMsg: (field: MesFieldKey) => string | null;
  markInvalid: (field: MesFieldKey) => boolean;
  clearFieldError: (field: MesFieldKey) => void;
  handleDivision: (value: number | null) => void;
  handleCategory: (value: number | null) => void;
  setUserId: (value: number | null) => void;
  setSubcategoryId: (value: number | null) => void;
  setTypeId: (value: number | null) => void;
  setStatusId: (value: number | null) => void;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setDescriptionCn: (value: string) => void;
  setDescriptionEn: (value: string) => void;
  setSolutionCn: (value: string) => void;
  setSolutionEn: (value: string) => void;
};

export function MesFormFields(props: Props) {
  const {
    t,
    lang,
    masters,
    saving,
    lockIdentityFields,
    divisionId,
    userId,
    categoryId,
    subcategoryId,
    typeId,
    statusId,
    startTime,
    endTime,
    descriptionCn,
    descriptionEn,
    solutionCn,
    solutionEn,
    categoryOptions,
    subcategoryOptions,
    userOptions,
    errMsg,
    markInvalid,
    clearFieldError,
    handleDivision,
    handleCategory,
    setUserId,
    setSubcategoryId,
    setTypeId,
    setStatusId,
    setStartTime,
    setEndTime,
    setDescriptionCn,
    setDescriptionEn,
    setSolutionCn,
    setSolutionEn,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <label className={labelCls}>
          {t.fields.division} <span className="text-danger">*</span>
        </label>
        <select
          data-mes-field="division_id"
          className={`${inputCls} ${markInvalid("division_id") ? inputErrorCls : ""} ${lockIdentityFields ? lockedSelectCls : ""}`}
          value={divisionId ?? ""}
          disabled={saving || lockIdentityFields}
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
          className={`${inputCls} ${markInvalid("user_id") ? inputErrorCls : ""} ${lockIdentityFields ? lockedSelectCls : ""}`}
          value={userId ?? ""}
          disabled={saving || lockIdentityFields}
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
          <p className="mt-1 text-[11px] text-danger">{errMsg("subcategory_id")}</p>
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
          <p className="mt-1 text-[11px] text-danger">{errMsg("description_cn")}</p>
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
          <p className="mt-1 text-[11px] text-danger">{errMsg("description_en")}</p>
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
  );
}
