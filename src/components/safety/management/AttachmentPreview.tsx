"use client";

import {
  formatFileSize,
  getFileIcon,
  getFileTypeLabel,
  getPreviewKind,
  safetyText,
  type FilePreview,
  type SafetyLanguage,
} from "@/lib/safety";

export function AttachmentPreview({
  language,
  file,
}: {
  language: SafetyLanguage;
  file: FilePreview;
}) {
  const kind = getPreviewKind(file.name, file.type);
  const canOfficePreview = (kind === "ppt" || kind === "excel") && /^https?:\/\//i.test(file.url);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg/20">
      {/* Preview */}
      <div className="min-h-[220px] bg-bg/40">
        {kind === "image" ? (
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[420px] min-h-[220px] w-full object-contain"
          />
        ) : kind === "video" ? (
          <video
            src={file.url}
            controls
            playsInline
            className="max-h-[420px] min-h-[220px] w-full bg-black object-contain"
          />
        ) : kind === "pdf" ? (
          <iframe src={file.url} title={file.name} className="h-[420px] w-full bg-white" />
        ) : canOfficePreview ? (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              file.url
            )}`}
            title={file.name}
            className="h-[420px] w-full bg-white"
          />
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
              {getFileIcon(kind)}
            </div>

            <p className="mt-4 text-sm font-semibold text-text">
              {getFileTypeLabel(kind, language)}
            </p>

            <p className="mt-1 max-w-sm text-[10px] leading-5 text-text-dim">
              {kind === "ppt"
                ? safetyText("powerpointPreviewHelp", language)
                : kind === "excel"
                  ? safetyText("excelPreviewHelp", language)
                  : safetyText("noBrowserPreview", language)}
            </p>
          </div>
        )}
      </div>

      {/* File information */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">{file.name}</p>

            <p className="mt-1 text-[9px] text-text-dim">
              {getFileTypeLabel(kind, language)} · {formatFileSize(file.size)}
            </p>
          </div>

          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("open", language)}
          </a>
        </div>
      </div>
    </div>
  );
}
