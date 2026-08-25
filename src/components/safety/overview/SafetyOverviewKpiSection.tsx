import type { SafetyLanguage } from "@/lib/safety";
import { safetyText } from "@/lib/safety";
import type { MonthlyActivityMetric } from "@/lib/safety/overviewMetrics";
import { KpiTop } from "./KpiTop";
import { KpiCard } from "./KpiCard";

type SafetyOverviewKpiSectionProps = {
  safetyLanguage: SafetyLanguage;
  trainingCompleted: number;
  trainingTarget: number;
  hazardFinding: number;
  cleaningFinding: number;
  totalFinding: number;
  monthlyActivityData: MonthlyActivityMetric[];
  overallCompletion: number;
};

export function SafetyOverviewKpiSection({
  safetyLanguage,
  trainingCompleted,
  trainingTarget,
  hazardFinding,
  cleaningFinding,
  totalFinding,
  monthlyActivityData,
  overallCompletion,
}: SafetyOverviewKpiSectionProps) {
  return (
    <div className="safety-scroll-animate grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div className="safety-animate-card rounded-xl border border-border bg-surface p-4">
        <KpiTop title={safetyText("safetyTraining", safetyLanguage)} icon="🎓" tone="accent" />

        <div className="mt-3 flex items-center justify-between">
          <p className="text-2xl font-semibold text-text">
            {trainingCompleted} / {trainingTarget}
          </p>

          <span className="text-sm text-text-dim group-hover:text-cyan-300" />
        </div>

        <p className="mt-1 text-[11px] text-text-muted">
          {safetyText("trainingCompleted", safetyLanguage)}
        </p>
      </div>

      <KpiCard
        title={safetyText("hazardFinding", safetyLanguage)}
        value={`${hazardFinding} / 4`}
        subtitle={safetyText("thisMonth", safetyLanguage)}
        icon="鈿狅笍"
        tone="warning"
      />

      <KpiCard
        title={safetyText("cleaningFinding", safetyLanguage)}
        value={`${cleaningFinding} / 4`}
        subtitle={safetyText("thisMonth", safetyLanguage)}
        icon="🧹"
        tone="success"
      />

      <KpiCard
        title={safetyText("totalFindings", safetyLanguage)}
        value={`${totalFinding}`}
        subtitle={safetyText("currentMonth", safetyLanguage)}
        icon="🔎"
        tone="accent"
      />

      <KpiCard
        title={safetyText("safetyMeeting", safetyLanguage)}
        value={`${
          monthlyActivityData.find((item) => item.id === "monthly-meeting")?.completed ?? 0
        } / 1`}
        subtitle={safetyText("monthly", safetyLanguage)}
        icon="📅"
        tone="accent"
      />

      <KpiCard
        title={safetyText("completionRate", safetyLanguage)}
        value={`${overallCompletion}%`}
        subtitle={safetyText("overall", safetyLanguage)}
        icon="📊"
        tone={overallCompletion >= 90 ? "success" : "warning"}
      />
    </div>
  );
}
