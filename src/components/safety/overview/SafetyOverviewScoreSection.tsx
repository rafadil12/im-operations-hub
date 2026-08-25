import type { SafetyLanguage } from "@/lib/safety";
import { safetyText } from "@/lib/safety";
import { SectionHeader } from "./SectionHeader";
import { ScoreCard } from "./ScoreCard";

type SafetyOverviewScoreSectionProps = {
  safetyLanguage: SafetyLanguage;
  overallCompletion: number;
  closureRate: number;
  trainingRate: number;
  safetyScore: number;
};

export function SafetyOverviewScoreSection({
  safetyLanguage,
  overallCompletion,
  closureRate,
  trainingRate,
  safetyScore,
}: SafetyOverviewScoreSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
      <SectionHeader
        title={safetyText("safetyPerformanceScore", safetyLanguage)}
        description={safetyText("overallMonthlySafetyPerformance", safetyLanguage)}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <ScoreCard
          title={safetyText("overallCompletion", safetyLanguage)}
          value={overallCompletion}
          icon="📋"
        />

        <ScoreCard
          title={safetyText("findingClosure", safetyLanguage)}
          value={closureRate}
          icon="🔒"
        />

        <ScoreCard title={safetyText("training", safetyLanguage)} value={trainingRate} icon="🎓" />

        <ScoreCard
          title={safetyText("safetyScore", safetyLanguage)}
          value={safetyScore}
          icon="🏆"
          highlight
        />
      </div>
    </section>
  );
}
