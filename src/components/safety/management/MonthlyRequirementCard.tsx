"use client";

import {
  STATUS_CONFIG,
  getSafetyStatusLabel,
  safetyText,
  type ActivityConfig,
  type SafetyLanguage,
  type SubmissionStatus,
} from "@/lib/safety";

export function MonthlyRequirementCard({
  language,
  activity,
  status,
  rewardLabel,
  hasDetail,
  hazardCase,
  onView,
  onUpload,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  status: SubmissionStatus;
  rewardLabel: string;
  hasDetail: boolean;
  hazardCase?: boolean;
  onView: () => void;
  onUpload?: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const isGreen = status === "completed" || status === "not_applicable";
  const isSafetyCase = hazardCase === true;
  const isCaseFound = isSafetyCase && status === "case_found";

  const safetyCasePoint = isCaseFound ? -1 : status === "not_applicable" ? 1 : 0;

  const actionLabel = isSafetyCase
    ? language === "cn"
      ? "报告 / 清除案件"
      : "Report / Clear Case"
    : isGreen && hasDetail
      ? safetyText("update", language)
      : `+ ${safetyText("upload", language)}`;

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isSafetyCase
          ? isCaseFound
            ? "border-danger/30 bg-danger/[0.035]"
            : "border-success/20 bg-success/[0.025]"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex size-11 items-center justify-center rounded-xl text-xl ${
            isSafetyCase ? (isCaseFound ? "bg-danger/10" : "bg-success/10") : "bg-accent/10"
          }`}
        >
          {activity.icon}
        </div>

        <span
          className={`rounded-md border px-2 py-1 text-[9px] font-medium ${
            isSafetyCase
              ? isCaseFound
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-success/20 bg-success/10 text-success"
              : config.className
          }`}
        >
          {isSafetyCase
            ? isCaseFound
              ? safetyText("caseFoundRed", language)
              : safetyText("noCaseGreen", language)
            : getSafetyStatusLabel(status, language)}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3>

      <p className="mt-1 text-xs leading-5 text-text-muted">{activity.description}</p>

      <div
        className={`mt-3 rounded-lg border px-3 py-2 ${
          isSafetyCase
            ? isCaseFound
              ? "border-danger/20 bg-danger/5"
              : "border-success/20 bg-success/5"
            : "border-border-subtle bg-bg/30"
        }`}
      >
        <p className="text-[9px] uppercase tracking-wide text-text-dim">
          {isSafetyCase
            ? language === "cn"
              ? "本月积分"
              : "Monthly Point"
            : safetyText("target", language)}
        </p>

        {isSafetyCase ? (
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-lg font-bold ${isCaseFound ? "text-danger" : "text-success"}`}>
              {safetyCasePoint > 0 ? `+${safetyCasePoint}` : safetyCasePoint}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                isCaseFound ? "text-danger" : "text-success"
              }`}
            >
              {isCaseFound
                ? safetyText("caseFoundRed", language)
                : safetyText("noCaseGreen", language)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs font-medium text-text">{rewardLabel}</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {hasDetail && (
          <button
            type="button"
            onClick={onView}
            className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("view", language)}
          </button>
        )}

        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-[10px] font-medium ${
              isSafetyCase
                ? isCaseFound
                  ? "bg-danger text-white hover:opacity-90"
                  : "bg-success text-white hover:opacity-90"
                : isGreen && hasDetail
                  ? "border border-border text-text-muted hover:bg-surface-hover"
                  : "bg-accent text-white hover:opacity-90"
            }`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
