import {
  activityMatches,
  getActivityTitle,
  isCompleted,
  type SafetyLanguage,
  type SafetyRow,
  safetyText,
  WEEKLY_ACTIVITY_NAMES,
} from "@/lib/safety";
import { SectionHeader } from "./SectionHeader";

type SafetyOverviewWeeklySectionProps = {
  safetyLanguage: SafetyLanguage;
  weeklyRows: SafetyRow[];
  weeklyCompleted: number;
  weeklyTarget: number;
  weeklyCompletion: number;
};

export function SafetyOverviewWeeklySection({
  safetyLanguage,
  weeklyRows,
  weeklyCompleted,
  weeklyTarget,
  weeklyCompletion,
}: SafetyOverviewWeeklySectionProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
      <SectionHeader
        title={safetyText("weeklySafetyRequirement", safetyLanguage)}
        description={safetyText("currentWeeklySafetyActivities", safetyLanguage)}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {WEEKLY_ACTIVITY_NAMES.map((activity) => {
          const total = weeklyRows.filter((row) => activityMatches(row, activity.names)).length;

          const completed = weeklyRows.filter(
            (row) => activityMatches(row, activity.names) && isCompleted(row)
          ).length;

          const percentage = total > 0 ? 100 : 0;

          return (
            <div key={activity.id} className="rounded-lg border border-border-subtle bg-bg/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg">{activity.icon}</span>

                <span className={completed > 0 ? "text-success" : "text-danger"}>
                  {completed > 0 ? "✓" : "!"}
                </span>
              </div>

              <p className="mt-3 text-xs font-medium text-text">
                {getActivityTitle(activity.id, safetyLanguage)}
              </p>

              <p className="mt-1 text-[10px] text-text-muted">
                {completed}
                {" / "}
                {Math.max(total, 1)}
              </p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
                <div
                  className={
                    completed > 0
                      ? "h-full rounded-full bg-emerald-500"
                      : "h-full rounded-full bg-rose-500"
                  }
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-lg border border-border-subtle bg-bg/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-dim">
              {safetyText("weeklyCompletion", safetyLanguage)}
            </p>

            <p className="mt-1 text-2xl font-semibold text-text">
              {weeklyCompleted} / {weeklyTarget}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold text-accent">{weeklyCompletion}%</p>

            <p className="text-[10px] text-text-muted">
              {safetyText("currentMonth", safetyLanguage)}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-cyan-500"
            style={{
              width: `${weeklyCompletion}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
