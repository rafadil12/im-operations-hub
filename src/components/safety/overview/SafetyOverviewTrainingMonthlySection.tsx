import { getActivityTitle, type SafetyLanguage, safetyText } from "@/lib/safety";
import type { MonthlyActivityMetric, TrainingWeeklyItem } from "@/lib/safety/overviewMetrics";
import { SectionHeader } from "./SectionHeader";
import { LineChart } from "./charts/LineChart";

type SafetyOverviewTrainingMonthlySectionProps = {
  safetyLanguage: SafetyLanguage;
  trainingWeekly: TrainingWeeklyItem[];
  trainingCompleted: number;
  trainingTarget: number;
  trainingRate: number;
  monthlyActivityData: MonthlyActivityMetric[];
};

export function SafetyOverviewTrainingMonthlySection({
  safetyLanguage,
  trainingWeekly,
  trainingCompleted,
  trainingTarget,
  trainingRate,
  monthlyActivityData,
}: SafetyOverviewTrainingMonthlySectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("safetyTrainingPerformance", safetyLanguage)}
          description={safetyText("trainingCompletionByWeek", safetyLanguage)}
        />

        <div className="mt-5">
          <LineChart
            data={trainingWeekly.map((item) => ({
              label: item.label,
              value: item.rate,
            }))}
            max={100}
            animationDuration={1800}
            animationEasing="ease-in-out"
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-border-subtle bg-bg/30 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-text-dim">
              {safetyText("trainingCompletion", safetyLanguage)}
            </p>

            <p className="mt-1 text-2xl font-semibold text-text">
              {trainingCompleted} / {trainingTarget}
            </p>
          </div>

          <span className="text-2xl font-semibold text-accent">{trainingRate}%</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("monthlySafetyActivity", safetyLanguage)}
          description={safetyText("monthlyRequirementCompletion", safetyLanguage)}
        />

        <div className="mt-5 space-y-4">
          {monthlyActivityData.map((item) => (
            <div key={item.id}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>

                  <span className="text-xs font-medium text-text">
                    {getActivityTitle(item.id, safetyLanguage)}
                  </span>
                </div>

                <span className="text-xs font-semibold text-text">
                  {item.completed} / {item.target}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    item.rate >= 100
                      ? "bg-emerald-500"
                      : item.rate >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500",
                  ].join(" ")}
                  style={{
                    width: `${Math.min(item.rate, 100)}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-right text-[9px] text-text-dim">{item.rate}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
