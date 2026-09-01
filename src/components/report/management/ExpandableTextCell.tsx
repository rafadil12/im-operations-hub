"use client";

import { useState } from "react";
import { reportText, type ReportLanguage } from "@/lib/report";

const COLLAPSED_LINE_LIMIT = 3;

type ExpandableTextCellProps = {
  text: string;
  language: ReportLanguage;
  muted?: boolean;
};

export function ExpandableTextCell({ text, language, muted = false }: ExpandableTextCellProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text === "—") {
    return <span className="text-text-dim">—</span>;
  }

  const lines = text.split("\n");
  const isLong = lines.length > COLLAPSED_LINE_LIMIT;
  const visibleText = expanded || !isLong ? text : lines.slice(0, COLLAPSED_LINE_LIMIT).join("\n");
  const hiddenCount = lines.length - COLLAPSED_LINE_LIMIT;

  return (
    <div className="space-y-1">
      <span
        className={[
          "block whitespace-pre-line text-[13px] leading-snug",
          muted ? "text-text-muted" : "text-text",
        ].join(" ")}
      >
        {visibleText}
      </span>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="cursor-pointer text-[11px] font-medium text-accent hover:underline"
        >
          {expanded
            ? reportText("showLess", language)
            : reportText("showMore", language).replace("{n}", String(hiddenCount))}
        </button>
      ) : null}
    </div>
  );
}
