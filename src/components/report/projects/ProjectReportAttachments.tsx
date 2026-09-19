"use client";

import { useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiClient";
import {
  isAllowedReportFile,
  MAX_REPORT_WEEK_ATTACHMENTS,
  REPORT_FILE_ACCEPT,
} from "@/lib/report/attachmentAccept";
import type { ReportProjectAttachment } from "@/lib/report/projectAttachmentStore";
import { projectText } from "@/lib/report";
import type { Lang } from "@/lib/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const section = "rounded-lg border border-border-subtle bg-bg/30 p-3 space-y-3";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type ProjectReportAttachmentsProps = {
  lang: Lang;
  readOnly: boolean;
  reportId: number | null;
  savedAttachments: ReportProjectAttachment[];
  pendingFiles: File[];
  uploading: boolean;
  onSavedAttachmentsChange: (attachments: ReportProjectAttachment[]) => void;
  onPendingFilesChange: (files: File[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string) => void;
};

export function ProjectReportAttachments({
  lang,
  readOnly,
  reportId,
  savedAttachments,
  pendingFiles,
  uploading,
  onSavedAttachmentsChange,
  onPendingFilesChange,
  onUploadingChange,
  onError,
}: ProjectReportAttachmentsProps) {
  const copy = projectText(lang);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const attachmentCount = savedAttachments.length + pendingFiles.length;
  const atMax = attachmentCount >= MAX_REPORT_WEEK_ATTACHMENTS;
  const canUpload = !readOnly && !atMax;
  const uploadImmediately = reportId != null;

  const uploadFile = async (file: File, id: number) => {
    const form = new FormData();
    form.append("reportId", String(id));
    form.append("file", file);

    const res = await fetch("/api/report/project-attachments", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Upload failed");
    }
    return json.data as ReportProjectAttachment;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length || !canUpload) return;

    for (const file of list) {
      if (!isAllowedReportFile(file.name)) {
        onError(copy.attachmentInvalidType);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        onError(copy.attachmentTooLarge);
        return;
      }
    }

    const remaining = MAX_REPORT_WEEK_ATTACHMENTS - attachmentCount;
    if (list.length > remaining) {
      onError(copy.attachmentMaxReached);
      return;
    }

    if (!uploadImmediately) {
      onPendingFilesChange([...pendingFiles, ...list]);
      return;
    }

    onUploadingChange(true);
    try {
      const uploaded: ReportProjectAttachment[] = [];
      for (const file of list) {
        uploaded.push(await uploadFile(file, reportId!));
      }
      onSavedAttachmentsChange([...savedAttachments, ...uploaded]);
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      onUploadingChange(false);
    }
  };

  const removeSaved = async (attachment: ReportProjectAttachment) => {
    if (readOnly) return;
    onUploadingChange(true);
    try {
      const res = await fetch(`/api/report/project-attachments/${attachment.id}`, {
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
      <h3 className="text-sm font-semibold text-text">{copy.attachments}</h3>

      {canUpload ? (
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
          <span className="text-xs font-medium text-text">{copy.uploadAttachment}</span>
          <span className="mt-1 text-[10px] text-text-dim">{copy.uploadHint}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={REPORT_FILE_ACCEPT}
            className="sr-only"
            disabled={uploading}
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
                  {copy.removeAttachment}
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
                  {copy.removeAttachment}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : readOnly ? (
        <p className="text-xs text-text-dim">{copy.noAttachments}</p>
      ) : null}
    </div>
  );
}

export async function uploadPendingProjectAttachments(
  reportId: number,
  files: File[]
): Promise<{ succeeded: ReportProjectAttachment[]; failed: File[] }> {
  const succeeded: ReportProjectAttachment[] = [];
  const failed: File[] = [];

  for (const file of files) {
    try {
      const form = new FormData();
      form.append("reportId", String(reportId));
      form.append("file", file);

      const res = await fetch("/api/report/project-attachments", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        failed.push(file);
        continue;
      }
      succeeded.push(json.data as ReportProjectAttachment);
    } catch {
      failed.push(file);
    }
  }

  return { succeeded, failed };
}
