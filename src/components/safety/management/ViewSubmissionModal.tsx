"use client";

import {
  STATUS_CONFIG,
  getSafetyStatusLabel,
  safetyText,
  type SafetyLanguage,
  type SubmissionDetail,
  type SubmissionStatus,
} from "@/lib/safety";
import { AttachmentPreview } from "./AttachmentPreview";
import { DetailItem } from "./FormBits";

export function ViewSubmissionModal({
  language,
  title,
  status,
  detail,
  onClose,
}: {
  language: SafetyLanguage;
  title: string;
  status: SubmissionStatus;
  detail: SubmissionDetail;
  onClose: () => void;
}) {
  const files = detail.filePreviews ?? [];

  const fileCountLabel =
    files.length === 1 ? safetyText("file", language) : safetyText("files", language);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border-subtle p-5">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>

            <span
              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-medium ${
                STATUS_CONFIG[status].className
              }`}
            >
              {status === "not_applicable"
                ? safetyText("noCaseGreen", language)
                : status === "case_found"
                  ? safetyText("caseFoundRed", language)
                  : getSafetyStatusLabel(status, language)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-2xl leading-none text-text-dim hover:text-text"
            aria-label={safetyText("close", language)}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Metadata */}
          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem label={safetyText("submissionDate", language)} value={detail.date} />

            <DetailItem
              label={safetyText("pic", language)}
              value={
                language === "cn"
                  ? detail.picCn || detail.picEn || detail.pic || "—"
                  : detail.picEn || detail.picCn || detail.pic || "—"
              }
            />

            <DetailItem label={safetyText("location", language)} value={detail.location ?? "—"} />

            <DetailItem
              label={safetyText("attachment", language)}
              value={
                detail.fileNames?.length
                  ? `${detail.fileNames.length} ${fileCountLabel}`
                  : safetyText("noAttachment", language)
              }
            />
          </div>

          {/* Description */}
          <div className="mt-4 rounded-xl border border-border-subtle bg-bg/30 p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">
              {safetyText("description", language)}
            </p>

            <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-text-muted">
              {language === "cn"
                ? detail.descriptionCn || detail.descriptionEn || detail.description
                : detail.descriptionEn || detail.descriptionCn || detail.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">
                  {safetyText("attachmentsTitle", language)}
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  {safetyText("attachmentsPreview", language)}
                </p>
              </div>

              <span className="rounded-md bg-accent/10 px-2 py-1 text-[9px] font-medium text-accent">
                {files.length} {fileCountLabel}
              </span>
            </div>

            {files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg/30 p-8 text-center">
                <div className="text-3xl">📎</div>

                <p className="mt-2 text-xs font-medium text-text">
                  {safetyText("noPreview", language)}
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  {safetyText("noStoredPreview", language)}
                </p>

                {detail.fileNames?.length ? (
                  <div className="mt-4 space-y-2 text-left">
                    {detail.fileNames.map((name) => (
                      <div
                        key={name}
                        className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {files.map((file, index) => (
                  <AttachmentPreview
                    language={language}
                    key={`${file.url}-${file.name}-${index}`}
                    file={file}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verified */}
          {status === "completed" && (
            <div className="mt-5 rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-success">
              {safetyText("submissionVerified", language)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-border-subtle p-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("close", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
