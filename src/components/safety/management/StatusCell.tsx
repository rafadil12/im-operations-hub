"use client";

import {
  STATUS_CONFIG,
  getSafetyStatusLabel,
  safetyText,
  type SafetyLanguage,
  type SubmissionStatus,
} from "@/lib/safety";

export function StatusMonitorCell({
  language,
  status,
}: {
  language: SafetyLanguage;
  status: SubmissionStatus;
}) {
  const completed = status === "completed" || status === "not_applicable";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${
          completed
            ? "border-success/20 bg-success/10 text-success"
            : "border-danger/20 bg-danger/10 text-danger"
        }`}
      >
        {completed ? "✓" : "!"}
      </span>

      <span className={`text-[10px] font-semibold ${completed ? "text-success" : "text-danger"}`}>
        {getSafetyStatusLabel(status, language)}
      </span>
    </div>
  );
}

export function StatusCell({
  language,
  status,
  hasDetail,
  onView,
  onAction,
  checklist = false,
}: {
  language: SafetyLanguage;
  status: SubmissionStatus;
  hasDetail: boolean;
  onView: () => void;
  onAction: () => void;
  checklist?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const completed = status === "completed" || status === "not_applicable";

  const actionLabel = checklist
    ? status === "completed"
      ? safetyText("uncheck", language)
      : safetyText("check", language)
    : status === "not_submitted"
      ? safetyText("upload", language)
      : safetyText("update", language);

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${config.className}`}
        >
          {completed ? "✓" : "!"}
        </span>

        <div className="min-w-0">
          <p className={`text-xs font-semibold ${completed ? "text-success" : "text-danger"}`}>
            {checklist && status === "completed"
              ? safetyText("completedParticipated", language)
              : getSafetyStatusLabel(status, language)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-9">
        {hasDetail && (
          <button
            type="button"
            onClick={onView}
            className="cursor-pointer text-[10px] font-medium text-accent hover:underline"
          >
            {safetyText("view", language)}
          </button>
        )}

        <button
          type="button"
          onClick={onAction}
          className={`cursor-pointer text-[10px] font-medium ${
            checklist
              ? "text-accent hover:underline"
              : status === "not_submitted"
                ? "text-accent hover:underline"
                : "text-text-muted hover:text-text"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
