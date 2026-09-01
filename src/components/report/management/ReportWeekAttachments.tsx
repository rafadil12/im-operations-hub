"use client";

import { useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiClient";
import { reportText, type ReportLanguage, type ReportWeekAttachment } from "@/lib/report";
import { isAllowedReportFile, REPORT_FILE_ACCEPT } from "@/lib/report/attachmentAccept";

const section =
  "rounded-lg border border-border-subtle bg-bg/30 p-3 space-y-3";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type ReportWeekAttachmentsProps = {
  language: ReportLanguage;
  readOnly: boolean;
  year: number;
  weekNumber: number;
  areaId: number;
  savedAttachments: ReportWeekAttachment[];
  pendingFiles: File[];
  uploading: boolean;
  onSavedAttachmentsChange: (attachments: ReportWeekAttachment[]) => void;
  onPendingFilesChange: (files: File[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string) => void;
  /** When true, selected files upload immediately instead of queuing. */
  uploadImmediately: boolean;
};

export function ReportWeekAttachments({
  language,
  readOnly,
  year,
  weekNumber,
  areaId,
  savedAttachments,
  pendingFiles,
  uploading,
  onSavedAttachmentsChange,
  onPendingFilesChange,
  onUploadingChange,
  onError,
  uploadImmediately,
}: ReportWeekAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("year", String(year));
    form.append("weekNumber", String(weekNumber));
    form.append("areaId", String(areaId));
    form.append("file", file);

    const res = await fetch("/api/report/week-attachments", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Upload failed");
    }
    return json.data as ReportWeekAttachment;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length || readOnly) return;

    for (const file of list) {
      if (!isAllowedReportFile(file.name)) {
        onError(reportText("attachmentInvalidType", language));
        return;
      }
    }

    if (!uploadImmediately) {
      onPendingFilesChange([...pendingFiles, ...list]);
      return;
    }

    onUploadingChange(true);
    try {
      const uploaded: ReportWeekAttachment[] = [];
      for (const file of list) {
        uploaded.push(await uploadFile(file));
      }
      onSavedAttachmentsChange([...savedAttachments, ...uploaded]);
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      onUploadingChange(false);
    }
  };

  const removeSaved = async (attachment: ReportWeekAttachment) => {
    if (readOnly) return;
    onUploadingChange(true);
    try {
      const res = await fetch(`/api/report/week-attachments/${attachment.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Delete failed");
      onSavedAttachmentsChange(savedAttachments.filter((a) => a.id !== attachment.id));
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      onUploadingChange(false);
    }
  };

  const hasItems = savedAttachments.length > 0 || pendingFiles.length > 0;

  return (
    <div className={section}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{reportText("attachments", language)}</h3>
        {!readOnly ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            + {reportText("uploadAttachment", language)}
          </button>
        ) : null}
      </div>

      {!readOnly ? (
        <label
          className={[
            "group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border bg-bg/20 hover:border-accent/60 hover:bg-accent/5",
            uploading ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <span className="text-xs font-medium text-text">
            {reportText("uploadAttachment", language)}
          </span>
          <span className="mt-1 text-[10px] text-text-dim">
            {reportText("uploadAttachmentHint", language)}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={REPORT_FILE_ACCEPT}
            className="sr-only"
            disabled={uploading || readOnly}
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void handleFiles(files);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {hasItems ? (
        <ul className="space-y-2">
          {savedAttachments.map((attachment) => (
            <li
              key={`saved-${attachment.id}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg/40 px-3 py-2"
            >
              <div className="min-w-0">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs font-medium text-accent hover:underline"
                >
                  {attachment.originalName}
                </a>
                {attachment.size != null ? (
                  <p className="mt-0.5 text-[10px] text-text-dim">{formatSize(attachment.size)}</p>
                ) : null}
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void removeSaved(attachment)}
                  className="shrink-0 cursor-pointer text-xs text-danger hover:underline disabled:opacity-50"
                >
                  {reportText("removeAttachment", language)}
                </button>
              ) : null}
            </li>
          ))}

          {pendingFiles.map((file, index) => (
            <li
              key={`pending-${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-text">{file.name}</p>
                <p className="mt-0.5 text-[10px] text-text-dim">{formatSize(file.size)}</p>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() =>
                    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))
                  }
                  className="shrink-0 cursor-pointer text-xs text-danger hover:underline disabled:opacity-50"
                >
                  {reportText("removeAttachment", language)}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : readOnly ? (
        <p className="text-xs text-text-dim">{reportText("noAttachments", language)}</p>
      ) : null}
    </div>
  );
}

export async function uploadPendingReportAttachments(
  year: number,
  weekNumber: number,
  areaId: number,
  files: File[]
): Promise<void> {
  for (const file of files) {
    const form = new FormData();
    form.append("year", String(year));
    form.append("weekNumber", String(weekNumber));
    form.append("areaId", String(areaId));
    form.append("file", file);

    const res = await fetch("/api/report/week-attachments", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Failed to upload ${file.name}`);
    }
  }
}
