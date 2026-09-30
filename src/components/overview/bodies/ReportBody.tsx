"use client";

import type { ModuleCardData } from "@/data/overview";
import { VerticalBarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { ReportPeriodSummaryCard } from "@/components/report/overview/ReportPeriodSummaryCard";
import { ReportWeeklyTrendChart } from "@/components/report/overview/ReportWeeklyTrendChart";
import { useLang } from "@/lib/i18n";
import { reportText, type ReportLanguage } from "@/lib/report";

export function ReportBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const language = lang as ReportLanguage;
  const hasWeeklyTrend = data.reportWeeklyTrend != null && data.reportWeeklyTrend.length > 0;
  const trendTitle = data.trendBars?.title;
  const showTrend = hasWeeklyTrend || (data.trendBars?.items.length ?? 0) > 0;
  const currentMonth = data.reportCurrentMonth;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {showTrend ? (
        <section className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg/30 p-3">
          {trendTitle ? (
            <h4 className="mb-3 text-xs font-medium text-text-muted">{trendTitle}</h4>
          ) : null}

          {hasWeeklyTrend ? (
            <ReportWeeklyTrendChart
              data={data.reportWeeklyTrend!}
              height={expanded ? 220 : 180}
              workLabel={reportText("workCompletion", language)}
              projectLabel={reportText("projectTrend", language)}
            />
          ) : data.trendBars ? (
            <VerticalBarChartPlaceholder items={data.trendBars.items} />
          ) : null}
        </section>
      ) : null}

      {currentMonth ? (
        <section className="shrink-0">
          <ReportPeriodSummaryCard
            title={reportText("currentMonth", language)}
            subtitle={currentMonth.monthLabel}
            status={currentMonth.status}
            achievement={currentMonth.achievement}
            submittedCount={currentMonth.submittedCount}
            draftCount={currentMonth.draftCount}
            areaCount={currentMonth.areaCount}
            totalLines={currentMonth.totalLines}
            byArea={currentMonth.byArea}
            language={language}
            compact
            className="h-full"
          />
        </section>
      ) : null}
    </div>
  );
}
