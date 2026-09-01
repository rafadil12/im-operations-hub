"use client";

import {
  STATUS_CONFIG,
  getSafetyStatusLabel,
  safetyText,
  type ActivityConfig,
  type SafetyLanguage,
  type SubmissionStatus,
} from "@/lib/safety";

export function ActivitySubmissionCard({
  language,
  activity,
  status,
  hasDetail,
  onView,
  onUpload,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  status: SubmissionStatus;
  hasDetail: boolean;
  onView: () => void;
  onUpload: () => void;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        status === "completed" || status === "not_applicable"
          ? "border-success/20 bg-success/[0.025]"
          : "border-danger/20 bg-danger/[0.025]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-lg">
          {activity.icon}
        </div>

        <span className={`rounded-md border px-2 py-1 text-[9px] font-medium ${config.className}`}>
          {getSafetyStatusLabel(status, language)}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3>

      <p className="mt-1 min-h-[36px] text-xs leading-5 text-text-muted">{activity.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-[9px] text-text-dim">{activity.requirement}</span>

        <div className="flex items-center gap-2">
          {hasDetail && (
            <button
              type="button"
              onClick={onView}
              className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
            >
              {safetyText("view", language)}
            </button>
          )}

          <button
            type="button"
            onClick={onUpload}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-medium ${
              status === "not_submitted"
                ? "bg-accent text-white"
                : "border border-border text-text-muted hover:bg-surface-hover"
            }`}
          >
            {status === "not_submitted"
              ? `+ ${safetyText("upload", language)}`
              : safetyText("update", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
