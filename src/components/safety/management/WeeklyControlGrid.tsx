"use client";

import { StatusMonitorCell } from "@/components/safety/management";
import {
  type SafetyLanguage,
  type SubmissionStatus,
  type WeeklyRecord,
  WEEKLY_ACTIVITIES,
  formatSafetyText,
  getCompletedCount,
  localizeActivity,
  safetyText,
} from "@/lib/safety";

type WeeklyControlGridProps = {
  language: SafetyLanguage;
  records: WeeklyRecord[];
  selectedWeek: number;
  weeklyCompleted: number;
  weeklyPending: number;
  onSelectWeek: (week: number) => void;
};

export function WeeklyControlGrid({
  language,
  records,
  selectedWeek,
  weeklyCompleted,
  weeklyPending,
  onSelectWeek,
}: WeeklyControlGridProps) {
  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">
            {safetyText("weeklyControl", language)}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {safetyText("weeklyControlDescription", language)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
            {weeklyCompleted} {safetyText("completed", language)}
          </span>
          <span className="rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
            {weeklyPending} {safetyText("pending", language)}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle bg-bg/30">
              <div className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                {safetyText("weekLabel", language)}
              </div>

              {WEEKLY_ACTIVITIES.map((rawActivity) => {
                const activity = localizeActivity(rawActivity, language);
                return (
                  <div key={activity.id} className="border-l border-border-subtle px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>{activity.icon}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                        {activity.shortTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-[8px] text-text-dim">{activity.frequency}</p>
                  </div>
                );
              })}

              <div className="border-l border-border-subtle px-3 py-3 text-center text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                {safetyText("progress", language)}
              </div>
            </div>

            {records.map((record) => {
              const done = getCompletedCount(record);
              const rate = Math.round((done / WEEKLY_ACTIVITIES.length) * 100);
              const isSelected = selectedWeek === record.week;

              return (
                <button
                  key={record.week}
                  type="button"
                  onClick={() => onSelectWeek(record.week)}
                  className={`grid w-full cursor-pointer grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle text-left last:border-b-0 transition-colors ${
                    isSelected ? "bg-accent/[0.055]" : "hover:bg-bg/30"
                  }`}
                >
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-7 items-center justify-center rounded-md text-[10px] font-semibold ${
                          isSelected ? "bg-accent text-white" : "bg-bg text-text-muted"
                        }`}
                      >
                        W{record.week}
                      </span>

                      <div>
                        <p className="text-xs font-semibold text-text">
                          {formatSafetyText(safetyText("week", language), {
                            week: String(record.week),
                          })}
                        </p>
                        <p className="mt-0.5 text-[9px] text-text-dim">
                          {record.startDate} – {record.endDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {WEEKLY_ACTIVITIES.map((rawActivity) => {
                    const activity = localizeActivity(rawActivity, language);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center border-l border-border-subtle px-3 py-3"
                      >
                        <StatusMonitorCell
                          language={language}
                          status={record[activity.recordKey!] as SubmissionStatus}
                        />
                      </div>
                    );
                  })}

                  <div className="flex flex-col items-center justify-center border-l border-border-subtle px-3 py-4">
                    <span className="text-xs font-semibold text-text">{done}/6</span>
                    <div className="mt-2 h-1 w-12 overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${rate}%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[9px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success" />
          {safetyText("completedParticipated", language)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger" />
          {safetyText("notSubmitted", language)}
        </span>
        <span className="ml-auto">
          {formatSafetyText(safetyText("weekSelected", language), { week: String(selectedWeek) })}
        </span>
      </div>
    </section>
  );
}
