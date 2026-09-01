"use client";

import {
  type ActivityType,
  type SafetyLanguage,
  type SubmissionDetail,
  type SubmissionStatus,
  type WeeklyRecord,
  WEEKLY_ACTIVITIES,
  formatSafetyText,
  getActivityFileTypes,
  getCompletedCount,
  getFileIcon,
  getLastSubmissionDate,
  getPreviewKind,
  getReadableFileKind,
  getSafetyStatusLabel,
  getWeekEvidence,
  getWeekFileCount,
  localizeActivity,
  safetyText,
} from "@/lib/safety";

type WeekActivityPanelProps = {
  language: SafetyLanguage;
  selectedWeekRecord: WeeklyRecord;
  canCreateSafetySubmission: boolean;
  canUpdateSafetySubmission: boolean;
  onOpenView: (title: string, detail: SubmissionDetail, status: SubmissionStatus) => void;
  onOpenUpload: (week: number, activity: ActivityType) => void;
  onOpenEvidenceGallery: (index: number) => void;
};

export function WeekActivityPanel({
  language,
  selectedWeekRecord,
  canCreateSafetySubmission,
  canUpdateSafetySubmission,
  onOpenView,
  onOpenUpload,
  onOpenEvidenceGallery,
}: WeekActivityPanelProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent px-2 py-1 text-[9px] font-semibold text-white">
              WEEK {selectedWeekRecord.week}
            </span>
            <span className="text-[10px] text-text-dim">
              {selectedWeekRecord.startDate} – {selectedWeekRecord.endDate}
            </span>
          </div>

          <h2 className="mt-2 text-base font-semibold text-text">
            {formatSafetyText(safetyText("weekActivity", language), {
              week: String(selectedWeekRecord.week),
            })}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {safetyText("actionDescription", language)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[9px] font-semibold text-success">
            {getCompletedCount(selectedWeekRecord)} / 6 {safetyText("completedShort", language)}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="divide-y divide-border-subtle">
          {WEEKLY_ACTIVITIES.map((rawActivity) => {
            const activity = localizeActivity(rawActivity, language);
            const status = selectedWeekRecord[activity.recordKey!] as SubmissionStatus;

            const detail = selectedWeekRecord[activity.dataKey!] as SubmissionDetail | undefined;

            const fileCount = detail?.filePreviews?.length ?? detail?.fileNames?.length ?? 0;

            const isCompleted = status === "completed" || status === "not_applicable";

            const isHse = activity.id === "hse-tuesday";

            return (
              <div
                key={activity.id}
                className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(280px,1.5fr)_170px_150px_190px] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-base">
                    {activity.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text">{activity.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-[9px] text-text-dim">{activity.frequency}</p>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                      isCompleted ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    }`}
                  >
                    <span>{isCompleted ? "✓" : "!"}</span>
                    {isHse && isCompleted
                      ? safetyText("completedParticipated", language)
                      : getSafetyStatusLabel(status, language)}
                  </span>

                  <p className="mt-1 text-[9px] text-text-dim">
                    {detail?.date ?? safetyText("notSubmitted", language)}
                  </p>
                </div>

                <div>
                  {fileCount > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-text">
                        {fileCount}{" "}
                        {fileCount === 1
                          ? safetyText("file", language)
                          : safetyText("files", language)}
                      </p>
                      <p className="mt-1 text-[9px] text-text-dim">
                        {getActivityFileTypes(detail)}
                      </p>
                    </div>
                  ) : isHse && isCompleted ? (
                    <div>
                      <p className="text-xs font-semibold text-text">
                        {safetyText("checklist", language)}
                      </p>
                      <p className="mt-1 text-[9px] text-text-dim">
                        {safetyText("attendanceRecorded", language)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-dim">
                      {safetyText("noEvidenceShort", language)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  {detail && (
                    <button
                      type="button"
                      onClick={() => onOpenView(activity.title, detail, status)}
                      className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[9px] font-medium text-text transition hover:bg-bg/40"
                    >
                      {safetyText("view", language)}
                    </button>
                  )}

                  {((isCompleted && canUpdateSafetySubmission) ||
                    (!isCompleted && canCreateSafetySubmission)) &&
                    (isHse ? (
                      <button
                        type="button"
                        onClick={() => onOpenUpload(selectedWeekRecord.week, "hse-tuesday")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-[9px] font-semibold ${
                          isCompleted
                            ? "border border-border text-text hover:bg-bg/40"
                            : "bg-accent text-white hover:opacity-90"
                        }`}
                      >
                        {isCompleted
                          ? safetyText("update", language)
                          : `+ ${safetyText("upload", language)}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenUpload(selectedWeekRecord.week, activity.id)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-[9px] font-semibold ${
                          isCompleted
                            ? "border border-border text-text hover:bg-bg/40"
                            : "bg-accent text-white hover:opacity-90"
                        }`}
                      >
                        {isCompleted
                          ? safetyText("update", language)
                          : `+ ${safetyText("upload", language)}`}
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">
                {safetyText("evidenceLibrary", language)}
              </h3>
              <p className="mt-1 text-[10px] text-text-muted">
                {formatSafetyText(safetyText("evidenceDescription", language), {
                  week: String(selectedWeekRecord.week),
                })}
              </p>
            </div>

            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[9px] font-medium text-accent">
              {getWeekFileCount(selectedWeekRecord)} {safetyText("attachments", language)}
            </span>
          </div>

          <div className="mt-4">
            {(() => {
              const evidence = getWeekEvidence(selectedWeekRecord);

              if (evidence.length === 0) {
                return (
                  <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                    <div className="text-xl">📂</div>
                    <p className="mt-2 text-xs font-medium text-text">
                      {safetyText("noEvidenceTitle", language)}
                    </p>
                    <p className="mt-1 text-[10px] text-text-muted">
                      {safetyText("evidenceWillAppear", language)}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {evidence.slice(0, 6).map((item, index) => {
                    const kind = getPreviewKind(item.file.name, item.file.type);

                    return (
                      <button
                        type="button"
                        key={`${item.activity.id}-${item.file.name}-${index}`}
                        onClick={() => {
                          onOpenEvidenceGallery(index);
                        }}
                        className="group block w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-bg/20 text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <div className="relative flex h-24 items-center justify-center overflow-hidden bg-bg/40">
                          {kind === "image" ? (
                            <img
                              src={item.file.url}
                              alt={item.file.name}
                              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-125"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-xl transition-transform duration-300 group-hover:scale-110">
                              <span>{getFileIcon(kind)}</span>
                              <span className="text-[8px] font-medium uppercase text-text-muted">
                                {getReadableFileKind(kind, language)}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
                            <span className="rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-semibold text-slate-800 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                              {language === "cn" ? "放大查看" : "View larger"}
                            </span>
                          </div>

                          <span className="absolute left-2 top-2 rounded-md bg-surface/90 px-2 py-1 text-[8px] font-medium text-text shadow-sm">
                            {item.activity.shortTitle}
                          </span>
                        </div>

                        <div className="p-2.5">
                          <p
                            className="truncate text-[9px] font-semibold text-text"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="mt-1 text-[8px] text-text-dim">
                            {item.detail.date} • {getReadableFileKind(kind, language)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text">
            {safetyText("weekSnapshot", language)}
          </h3>
          <p className="mt-1 text-[10px] text-text-muted">
            {safetyText("snapshotDescription", language)}
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
              <span className="text-[10px] text-text-muted">
                {safetyText("completed", language)}
              </span>
              <span className="text-sm font-semibold text-success">
                {getCompletedCount(selectedWeekRecord)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
              <span className="text-[10px] text-text-muted">{safetyText("pending", language)}</span>
              <span className="text-sm font-semibold text-danger">
                {6 - getCompletedCount(selectedWeekRecord)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
              <span className="text-[10px] text-text-muted">
                {safetyText("attachments", language)}
              </span>
              <span className="text-sm font-semibold text-text">
                {getWeekFileCount(selectedWeekRecord)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
              <span className="text-[10px] text-text-muted">
                {safetyText("lastUpload", language)}
              </span>
              <span className="max-w-[130px] truncate text-[10px] font-semibold text-text">
                {getLastSubmissionDate(selectedWeekRecord)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
