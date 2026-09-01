"use client";

import { reportText, type ReportLanguage, type ReportWeekAttachment } from "@/lib/report";

type ReportAttachmentsCellProps = {
  attachments: ReportWeekAttachment[];
  language: ReportLanguage;
  onView: () => void;
};

export function ReportAttachmentsCell({
  attachments,
  language,
  onView,
}: ReportAttachmentsCellProps) {
  if (attachments.length === 0) {
    return <span className="text-text-dim">—</span>;
  }

  const label = reportText("viewFilesCount", language).replace(
    "{n}",
    String(attachments.length)
  );

  return (
    <button
      type="button"
      onClick={onView}
      className="inline-flex cursor-pointer rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
    >
      {label}
    </button>
  );
}
