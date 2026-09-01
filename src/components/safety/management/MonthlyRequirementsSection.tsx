"use client";

import { MonthlyRequirementCard, MonthlyRewardFindingCard } from "@/components/safety/management";
import {
  type ActivityType,
  type MonthlyEvidenceItem,
  type MonthlyRecord,
  type SafetyLanguage,
  type SubmissionDetail,
  type SubmissionStatus,
  MONTHLY_ACTIVITIES,
  getFileIcon,
  getMonthlyEvidenceCount,
  getMonthlyEvidencePreviewItems,
  getPreviewKind,
  getReadableFileKind,
  localizeActivity,
  safetyText,
} from "@/lib/safety";

type MonthlyRequirementsSectionProps = {
  language: SafetyLanguage;
  monthly: MonthlyRecord;
  monthlyEvidenceForGallery: MonthlyEvidenceItem[];
  canCreateSafetySubmission: boolean;
  canUpdateSafetySubmission: boolean;
  canMutateSafety: boolean;
  onOpenView: (title: string, detail: SubmissionDetail, status: SubmissionStatus) => void;
  onOpenMonthlyUpload: (activity: ActivityType, submissionId?: number) => void;
  onOpenMonthlyEvidenceGallery: (index: number) => void;
};

export function MonthlyRequirementsSection({
  language,
  monthly,
  monthlyEvidenceForGallery,
  canCreateSafetySubmission,
  canUpdateSafetySubmission,
  canMutateSafety,
  onOpenView,
  onOpenMonthlyUpload,
  onOpenMonthlyEvidenceGallery,
}: MonthlyRequirementsSectionProps) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text">
          {safetyText("monthlyRequirements", language)}
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          {safetyText("monthlyRequirementsDescription", language)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MONTHLY_ACTIVITIES.map((rawActivity) => {
          const activity = localizeActivity(rawActivity, language);
          const status =
            activity.id === "fire-drill"
              ? monthly.fireDrill
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeeting
                : activity.id === "hazard-case"
                  ? monthly.hazardCase
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPpt
                    : monthly.rewardFinding;

          const detail =
            activity.id === "fire-drill"
              ? monthly.fireDrillData
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeetingData
                : activity.id === "hazard-case"
                  ? monthly.hazardCaseData
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPptData
                    : monthly.rewardFindingData;
          const rewardLabel =
            activity.id === "reward-finding"
              ? `${monthly.rewardCount}/2 ${safetyText("submitted", language)}`
              : activity.requirement;
          if (activity.id === "reward-finding") {
            return (
              <MonthlyRewardFindingCard
                key={activity.id}
                language={language}
                activity={activity}
                submissions={monthly.rewardSubmissions}
                rewardLabel={rewardLabel}
                onView={(submission) =>
                  onOpenView(
                    `${activity.title} #${submission.id}`,
                    submission.detail,
                    submission.status
                  )
                }
                onUploadNew={
                  canCreateSafetySubmission ? () => onOpenMonthlyUpload(activity.id) : undefined
                }
                onUpdate={
                  canUpdateSafetySubmission
                    ? (submissionId) => onOpenMonthlyUpload(activity.id, submissionId)
                    : undefined
                }
              />
            );
          }

          return (
            <MonthlyRequirementCard
              key={activity.id}
              language={language}
              activity={activity}
              status={status}
              rewardLabel={rewardLabel}
              hasDetail={Boolean(detail)}
              hazardCase={activity.id === "hazard-case"}
              onView={() => detail && onOpenView(activity.title, detail, status)}
              onUpload={canMutateSafety ? () => onOpenMonthlyUpload(activity.id) : undefined}
            />
          );
        })}

        <div className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">
              📚
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-[9px] font-medium text-text-muted">
              {getMonthlyEvidenceCount(monthly)} {safetyText("attachments", language)}
            </span>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-text">
            {safetyText("evidenceLibrary", language)}
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {language === "cn"
              ? "查看本月所有已上传的图片和PPT文件。"
              : "View all images and PPT files uploaded this month."}
          </p>

          {monthlyEvidenceForGallery.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {getMonthlyEvidencePreviewItems(monthlyEvidenceForGallery).map((item) => {
                const kind = getPreviewKind(item.file.name, item.file.type);
                const fullIndex = monthlyEvidenceForGallery.findIndex(
                  (entry) =>
                    entry === item ||
                    (entry.file.url === item.file.url &&
                      entry.file.name === item.file.name &&
                      entry.submissionId === item.submissionId)
                );

                return (
                  <button
                    key={`monthly-evidence-${item.activity.id}-${item.file.name}-${item.submissionId ?? "single"}`}
                    type="button"
                    onClick={() => {
                      onOpenMonthlyEvidenceGallery(fullIndex >= 0 ? fullIndex : 0);
                    }}
                    className="group relative h-20 cursor-pointer overflow-hidden rounded-lg border border-border bg-bg/40 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
                    title={item.file.name}
                  >
                    {kind === "image" ? (
                      <img
                        src={item.file.url}
                        alt={item.file.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-bg/50 text-lg">
                        <span>{getFileIcon(kind)}</span>
                        <span className="max-w-full truncate px-1 text-[7px] font-medium text-text-muted">
                          {getReadableFileKind(kind, language)}
                        </span>
                      </div>
                    )}
                    <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/55 px-1.5 py-0.5 text-[7px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {item.sourceLabel
                        ? `${item.sourceLabel} • ${item.file.name}`
                        : item.file.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <div className="text-xl">📂</div>
              <p className="mt-2 text-[10px] font-medium text-text">
                {safetyText("noEvidenceTitle", language)}
              </p>
              <p className="mt-1 text-[9px] text-text-muted">
                {safetyText("evidenceWillAppear", language)}
              </p>
            </div>
          )}

          {monthlyEvidenceForGallery.length > 6 && (
            <button
              type="button"
              onClick={() => {
                onOpenMonthlyEvidenceGallery(0);
              }}
              className="mt-3 w-full cursor-pointer rounded-lg border border-border px-3 py-2 text-[9px] font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              {language === "cn"
                ? `查看全部 ${monthlyEvidenceForGallery.length} 个附件`
                : `View all ${monthlyEvidenceForGallery.length} attachments`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
