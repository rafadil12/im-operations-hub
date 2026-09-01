import { isValidCnText, isValidEnText } from "@/lib/daily-operation/mesRecordValidation";
import { reportText, type ReportTextKey } from "./copy";
import type { ReportLanguage } from "./types";
import type { ReportWeekLineDraft } from "./weekFormDraft";

export type WeekBilingualField =
  | "targetEn"
  | "targetCn"
  | "summaryEn"
  | "summaryCn"
  | "planEn"
  | "planCn";

export type WeekLineValidationErrorKey = "required" | "enHasChinese" | "cnNeedsChinese";

type FieldRule = {
  keyEn: WeekBilingualField;
  keyCn: WeekBilingualField;
  labelEn: ReportTextKey;
  labelCn: ReportTextKey;
  en: string;
  cn: string;
  required: boolean;
};

function fieldRules(line: ReportWeekLineDraft): FieldRule[] {
  return [
    {
      keyEn: "targetEn",
      keyCn: "targetCn",
      labelEn: "targetEn",
      labelCn: "targetCn",
      en: line.targetEn,
      cn: line.targetCn,
      required: true,
    },
    {
      keyEn: "summaryEn",
      keyCn: "summaryCn",
      labelEn: "summaryEn",
      labelCn: "summaryCn",
      en: line.summaryEn,
      cn: line.summaryCn,
      required: true,
    },
    {
      keyEn: "planEn",
      keyCn: "planCn",
      labelEn: "planEn",
      labelCn: "planCn",
      en: line.planEn,
      cn: line.planCn,
      required: false,
    },
  ];
}

function formatLineError(
  lineIndex: number,
  fieldLabelKey: ReportTextKey,
  errorKey: WeekLineValidationErrorKey,
  lang: ReportLanguage
): string {
  const lineNo = lineIndex + 1;
  const field = reportText(fieldLabelKey, lang);
  const message = reportText(errorKey, lang);
  return `Line ${lineNo}: ${field} — ${message}`;
}

export function validateWeekLineDraft(
  line: ReportWeekLineDraft,
  lineIndex: number,
  lang: ReportLanguage
): string | null {
  for (const rule of fieldRules(line)) {
    const en = rule.en.trim();
    const cn = rule.cn.trim();

    if (rule.required && !en) {
      return formatLineError(lineIndex, rule.labelEn, "required", lang);
    }
    if (rule.required && !cn) {
      return formatLineError(lineIndex, rule.labelCn, "required", lang);
    }
    if (en && !isValidEnText(en)) {
      return formatLineError(lineIndex, rule.labelEn, "enHasChinese", lang);
    }
    if (cn && !isValidCnText(cn)) {
      return formatLineError(lineIndex, rule.labelCn, "cnNeedsChinese", lang);
    }
  }
  return null;
}

export type WeekLinePayloadFields = {
  workTargetEn: string;
  workTargetCn: string;
  summaryEn: string;
  summaryCn: string;
  planEn?: string | null;
  planCn?: string | null;
};

export function validateWeekLinePayload(
  line: WeekLinePayloadFields,
  lineIndex: number,
  lang: ReportLanguage = "en"
): string | null {
  const draft: ReportWeekLineDraft = {
    key: "validate",
    subItemId: 1,
    targetEn: line.workTargetEn,
    targetCn: line.workTargetCn,
    summaryEn: line.summaryEn,
    summaryCn: line.summaryCn,
    planEn: line.planEn ?? "",
    planCn: line.planCn ?? "",
    completionPct: 100,
  };
  return validateWeekLineDraft(draft, lineIndex, lang);
}
