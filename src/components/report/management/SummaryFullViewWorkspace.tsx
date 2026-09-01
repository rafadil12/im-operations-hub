"use client";

import { type ReactNode } from "react";
import { reportText, type ReportLanguage } from "@/lib/report";
import { FullViewWorkspace } from "./FullViewWorkspace";

type SummaryFullViewWorkspaceProps = {
  language: ReportLanguage;
  subtitle: string;
  onExit: () => void;
  filters: ReactNode;
  children: ReactNode;
};

export function SummaryFullViewWorkspace({
  language,
  subtitle,
  onExit,
  filters,
  children,
}: SummaryFullViewWorkspaceProps) {
  return (
    <FullViewWorkspace
      language={language}
      title={reportText("summaryFullViewContext", language)}
      subtitle={subtitle}
      ariaLabel={reportText("summaryTab", language)}
      onExit={onExit}
      showExitButton={false}
      toolbar={filters}
    >
      <div className="min-h-0 h-full overflow-hidden">{children}</div>
    </FullViewWorkspace>
  );
}
