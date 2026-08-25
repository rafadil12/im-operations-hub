import type { SafetyLanguage } from "@/lib/safety";
import { safetyText } from "@/lib/safety";
import type { WeeklyTrendItem } from "@/lib/safety/overviewMetrics";
import { SectionHeader } from "./SectionHeader";
import { GroupedBarChart } from "./charts/GroupedBarChart";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";

type SafetyOverviewTrendSectionProps = {
  safetyLanguage: SafetyLanguage;
  weeklyTrend: WeeklyTrendItem[];
};

export function SafetyOverviewTrendSection({
  safetyLanguage,
  weeklyTrend,
}: SafetyOverviewTrendSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("weeklyFindingTrend", safetyLanguage)}
          description={safetyText("hazardAndCleaningFindings", safetyLanguage)}
        />

        <div className="mt-5">
          <GroupedBarChart
            data={weeklyTrend.map((item) => ({
              label: item.label,
              first: item.hazard,
              second: item.cleaning,
            }))}
            firstLabel={safetyText("hazard", safetyLanguage)}
            secondLabel={safetyText("cleaning", safetyLanguage)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("weeklyRequirementCompletion", safetyLanguage)}
          description={safetyText("completedRequirementsByWeek", safetyLanguage)}
        />

        <div className="mt-5">
          <HorizontalBarChart
            data={weeklyTrend.map((item) => ({
              label: item.label,
              value: item.rate,
            }))}
            suffix="%"
          />
        </div>
      </section>
    </div>
  );
}
