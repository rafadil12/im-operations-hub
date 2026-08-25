import type { SafetyLanguage } from "@/lib/safety";
import { safetyText } from "@/lib/safety";
import type { WeeklyTrendItem } from "@/lib/safety/overviewMetrics";
import { SectionHeader } from "./SectionHeader";
import { LegendStat } from "./Legend";
import { LineChart } from "./charts/LineChart";
import { DonutChart } from "./charts/DonutChart";

type SafetyOverviewMainChartsProps = {
  safetyLanguage: SafetyLanguage;
  weeklyTrend: WeeklyTrendItem[];
  closed: number;
  inProgress: number;
  open: number;
  closureRate: number;
};

export function SafetyOverviewMainCharts({
  safetyLanguage,
  weeklyTrend,
  closed,
  inProgress,
  open,
  closureRate,
}: SafetyOverviewMainChartsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("safetyCompletionTrend", safetyLanguage)}
          description={safetyText("weeklyCompletionPerformance", safetyLanguage)}
        />

        <div className="mt-5">
          <LineChart
            data={weeklyTrend.map((item) => ({
              label: item.label,
              value: item.rate,
            }))}
            animationDuration={1800}
            animationEasing="ease-in-out"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
        <SectionHeader
          title={safetyText("findingStatus", safetyLanguage)}
          description={safetyText("currentSafetyCaseStatus", safetyLanguage)}
        />

        <div className="mt-5 flex items-center justify-center">
          <DonutChart
            language={safetyLanguage}
            values={[
              {
                label: "Closed",
                value: closed,
                className: "stroke-emerald-500",
              },
              {
                label: "In Progress",
                value: inProgress,
                className: "stroke-amber-500",
              },
              {
                label: "Open",
                value: open,
                className: "stroke-rose-500",
              },
            ]}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <LegendStat label={safetyText("closed", safetyLanguage)} value={closed} tone="success" />

          <LegendStat
            label={safetyText("progress", safetyLanguage)}
            value={inProgress}
            tone="warning"
          />

          <LegendStat label={safetyText("open", safetyLanguage)} value={open} tone="danger" />
        </div>

        <div className="mt-5 rounded-lg border border-border-subtle bg-bg/30 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wide text-text-dim">
            {safetyText("closureRate", safetyLanguage)}
          </p>

          <p className="mt-1 text-3xl font-semibold text-success">{closureRate}%</p>
        </div>
      </section>
    </div>
  );
}
