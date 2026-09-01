"use client";

import { Modal } from "@/components/ui/Modal";
import { reportText, type ReportLanguage, type ReportWeekAttachment } from "@/lib/report";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type ReportAttachmentsModalProps = {
  open: boolean;
  onClose: () => void;
  attachments: ReportWeekAttachment[];
  language: ReportLanguage;
  title?: string;
};

export function ReportAttachmentsModal({
  open,
  onClose,
  attachments,
  language,
  title,
}: ReportAttachmentsModalProps) {
  if (!open) return null;

  return (
    <Modal
      title={title ?? reportText("attachments", language)}
      onClose={onClose}
      size="md"
    >
      {attachments.length === 0 ? (
        <p className="text-sm text-text-dim">{reportText("noAttachments", language)}</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg/40 px-3 py-2"
            >
              <div className="min-w-0">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-accent hover:underline"
                >
                  {attachment.originalName}
                </a>
                {attachment.size != null ? (
                  <p className="mt-0.5 text-[10px] text-text-dim">{formatSize(attachment.size)}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
