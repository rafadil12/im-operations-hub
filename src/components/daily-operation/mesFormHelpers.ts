import type { IssueFieldError } from "@/lib/daily-operation/changeRequestIssueParse";
import type { MesValidationErrorKey } from "@/lib/daily-operation/mesRecordValidation";
import type { Dict } from "@/lib/i18n";

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

export function issueErrorMessage(
  error: IssueFieldError,
  t: Dict,
  availableQty: number | null
): string {
  switch (error) {
    case "recipient_required":
      return t.validation.issueRecipientRequired;
    case "item_required":
      return t.validation.issueItemRequired;
    case "qty_required":
      return t.validation.issueQtyRequired;
    case "qty_invalid":
      return t.validation.issueQtyInvalid;
    case "location_required":
      return t.validation.issueLocationRequired;
    case "qty_exceeds":
      return t.validation.issueQtyExceeds.replace("{n}", String(availableQty ?? 0));
  }
}
