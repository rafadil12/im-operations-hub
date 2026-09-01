"use client";

import { type SafetyLanguage, safetyText } from "@/lib/safety";

type SafetyManagementHeaderProps = {
  language: SafetyLanguage;
  monthLabel: string;
  onChangeMonth: (offset: number) => void;
};

export function SafetyManagementHeader({
  language,
  monthLabel,
  onChangeMonth,
}: SafetyManagementHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">
            {safetyText("management", language)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {safetyText("submissionCenter", language)}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-muted">
          {safetyText("managementOverviewDescription", language)}
        </p>
      </div>
      <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-xl text-text-muted transition hover:bg-surface-hover hover:text-text"
          aria-label={safetyText("previousMonth", language)}
        >
          ‹
        </button>
        <div className="min-w-[150px] px-3 text-center">
          <p className="text-[9px] font-medium uppercase tracking-wide text-text-dim">
            {safetyText("month", language)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-xl text-text-muted transition hover:bg-surface-hover hover:text-text"
          aria-label={safetyText("nextMonth", language)}
        >
          ›
        </button>
      </div>
    </header>
  );
}
