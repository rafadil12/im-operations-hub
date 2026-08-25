"use client";

import { ProgressStatus, StatusPill } from "@/components/safety/management";
import { type SafetyLanguage, safetyText } from "@/lib/safety";

type SafetyProgressOverviewProps = {
  language: SafetyLanguage;
  monthLabel: string;
  overallDone: number;
  overallTarget: number;
  overallRate: number;
  weeklyCompleted: number;
  weeklyTotal: number;
  weeklyPending: number;
  monthlyDone: number;
  monthlyTargets: number;
  hazardCaseActive: boolean;
};

export function SafetyProgressOverview({
  language,
  monthLabel,
  overallDone,
  overallTarget,
  overallRate,
  weeklyCompleted,
  weeklyTotal,
  weeklyPending,
  monthlyDone,
  monthlyTargets,
  hazardCaseActive,
}: SafetyProgressOverviewProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-accent/5 blur-3xl" />
      <div className="relative grid lg:grid-cols-[1fr_330px]">
        <div className="p-6 md:p-7">
          <span className="rounded-md bg-accent/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-accent">
            {monthLabel.toUpperCase()}
          </span>
          <div className="mt-5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">
              {safetyText("monthlyOverview", language)}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">
            {safetyText("safetyProgress", language)}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">
            {safetyText("progressDescription", language)}
          </p>
          <div className="mt-8 flex items-end gap-4">
            <div className="flex items-end">
              <span className="text-5xl font-semibold leading-none text-text md:text-6xl">
                {overallDone}
              </span>
              <span className="mb-1.5 ml-2 text-lg font-medium text-text-dim">
                / {overallTarget}
              </span>
            </div>
            <div className="pb-1.5">
              <p className="text-[10px] font-medium text-text-muted">
                {safetyText("completedRequirements", language)}
              </p>
              <p className="mt-1 text-[9px] text-text-dim">
                {safetyText("weeklyControlsSummary", language)}
              </p>
            </div>
          </div>
          <div className="mt-8 max-w-3xl">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-medium text-text-muted">
                  {safetyText("overallCompletion", language)}
                </p>
                <p className="mt-1 text-[9px] text-text-dim">
                  {weeklyCompleted}/{weeklyTotal} weekly · {monthlyDone}/{monthlyTargets} monthly
                </p>
              </div>
              <span className="text-xl font-semibold text-accent">{overallRate}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${overallRate}%` }}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill
              label={safetyText("completed", language)}
              value={weeklyCompleted + monthlyDone}
              tone="success"
            />
            <StatusPill
              label={safetyText("pending", language)}
              value={weeklyPending + (monthlyTargets - monthlyDone)}
              tone="danger"
            />
          </div>
        </div>
        <div className="border-t border-border-subtle bg-bg/20 lg:border-l lg:border-t-0">
          <div className="grid h-full grid-rows-3">
            <ProgressStatus
              label={safetyText("weekly", language)}
              description={safetyText("weeklyControlsSummary", language)}
              value={weeklyCompleted}
              total={weeklyTotal}
              tone="success"
            />
            <ProgressStatus
              label={safetyText("monthly", language)}
              description={safetyText("monthlyControls", language)}
              value={monthlyDone}
              total={monthlyTargets}
              tone="warning"
            />
            <ProgressStatus
              label={safetyText("hazardCase", language)}
              description={
                hazardCaseActive
                  ? safetyText("hazardAttention", language)
                  : safetyText("noHazardThisMonth", language)
              }
              value={hazardCaseActive ? 1 : 0}
              total={1}
              tone={hazardCaseActive ? "danger" : "success"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
