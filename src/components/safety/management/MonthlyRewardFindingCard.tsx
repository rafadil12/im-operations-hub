"use client";

import { useState } from "react";
import {
  getFileIcon,
  getPreviewKind,
  safetyText,
  type ActivityConfig,
  type MonthlyRewardSubmission,
  type SafetyLanguage,
} from "@/lib/safety";

export function MonthlyRewardFindingCard({
  language,
  activity,
  submissions,
  rewardLabel,
  onView,
  onUploadNew,
  onUpdate,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  submissions: MonthlyRewardSubmission[];
  rewardLabel: string;
  onView: (submission: MonthlyRewardSubmission) => void;
  onUploadNew?: () => void;
  onUpdate?: (submissionId: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const isFull = submissions.length >= 2;
  const safeIndex = submissions.length > 0 ? Math.min(currentIndex, submissions.length - 1) : 0;
  const currentSubmission = submissions[safeIndex];

  function goTo(index: number) {
    if (submissions.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, submissions.length - 1));
    setCurrentIndex(nextIndex);
  }

  function goPrevious() {
    goTo(safeIndex - 1);
  }

  function goNext() {
    goTo(safeIndex + 1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = endX - touchStartX;

    if (Math.abs(distance) >= 40) {
      if (distance < 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    setTouchStartX(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">
          {activity.icon}
        </div>
        <span className="rounded-md border border-border px-2 py-1 text-[9px] font-medium text-text-muted">
          {rewardLabel}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3>
      <p className="mt-1 text-xs leading-5 text-text-muted">{activity.description}</p>

      {currentSubmission ? (
        <div className="mt-3">
          <div
            className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg/30 p-3 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-text">
                  {language === "cn" ? `提交 ${safeIndex + 1}` : `Submission ${safeIndex + 1}`}
                </p>
                <p className="mt-0.5 text-[9px] text-text-dim">
                  {currentSubmission.detail.filePreviews?.length ?? 0}{" "}
                  {(currentSubmission.detail.filePreviews?.length ?? 0) === 1
                    ? safetyText("file", language)
                    : safetyText("files", language)}
                </p>
              </div>

              {submissions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goPrevious}
                    disabled={safeIndex === 0}
                    aria-label={language === "cn" ? "上一个提交" : "Previous submission"}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border text-sm text-text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="min-w-10 text-center text-[9px] font-semibold text-text-muted">
                    {safeIndex + 1} / {submissions.length}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safeIndex === submissions.length - 1}
                    aria-label={language === "cn" ? "下一个提交" : "Next submission"}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border text-sm text-text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(currentSubmission.detail.filePreviews ?? []).slice(0, 2).map((file, fileIndex) => {
                const kind = getPreviewKind(file.name, file.type);
                return (
                  <div
                    key={`${currentSubmission.id}-${file.name}-${fileIndex}`}
                    className="relative h-24 overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    {kind === "image" ? (
                      <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-muted">
                        <span className="text-2xl">{getFileIcon(kind)}</span>
                        <span className="max-w-full truncate px-2 text-[8px]">{file.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[8px] text-text-dim">
              {language === "cn" ? "左右滑动切换提交" : "Swipe left or right to switch submissions"}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onView(currentSubmission)}
                className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
              >
                {safetyText("view", language)}
              </button>
              {onUpdate && (
                <button
                  type="button"
                  onClick={() => onUpdate(currentSubmission.id)}
                  className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-semibold text-text hover:bg-surface-hover"
                >
                  {safetyText("update", language)}
                </button>
              )}
            </div>
          </div>

          {submissions.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {submissions.map((submission, index) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={
                    language === "cn" ? `选择提交 ${index + 1}` : `Select submission ${index + 1}`
                  }
                  className={`size-2 cursor-pointer rounded-full transition-all ${
                    index === safeIndex ? "w-5 bg-accent" : "bg-border hover:bg-accent/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-[10px] text-text-dim">
          {language === "cn"
            ? "本月还没有奖励发现提交。"
            : "No reward finding submission yet this month."}
        </div>
      )}

      {!isFull && onUploadNew && (
        <button
          type="button"
          onClick={onUploadNew}
          className="mt-3 w-full cursor-pointer rounded-md bg-accent px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90"
        >
          + {safetyText("upload", language)}
        </button>
      )}
    </div>
  );
}
