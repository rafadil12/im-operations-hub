import type { Dict } from "@/lib/i18n";
import type { MesValidationErrorKey } from "@/lib/daily-operation/mesRecordValidation";

export const mesInputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
export const mesInputErrorCls = "border-danger focus:border-danger";
export const mesLockedSelectCls =
  "appearance-none text-text-muted disabled:cursor-default disabled:opacity-100";
export const mesLabelCls = "mb-1 block text-xs font-medium text-text-muted";

export function fieldErrorMessage(key: MesValidationErrorKey, t: Dict): string {
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
