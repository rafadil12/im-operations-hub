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
  const sideBySide = expanded && showTrend && Boolean(currentMonth);

  const trendSection = showTrend ? (
    <section
      className={[
        "flex min-h-0 min-w-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3",
        sideBySide ? "h-full" : "flex-1",
      ].join(" ")}
    >
      {trendTitle ? (
        <h4 className="mb-2 shrink-0 text-xs font-medium text-text-muted">{trendTitle}</h4>
      ) : null}

      <div className={sideBySide ? "min-h-0 flex-1" : undefined}>
        {hasWeeklyTrend ? (
          <ReportWeeklyTrendChart
            data={data.reportWeeklyTrend!}
            height={expanded ? 260 : 120}
            workLabel={reportText("workCompletion", language)}
            projectLabel={reportText("projectTrend", language)}
          />
        ) : data.trendBars ? (
          <VerticalBarChartPlaceholder items={data.trendBars.items} />
        ) : null}
      </div>
    </section>
  ) : null;

  const monthSection = currentMonth ? (
    <section className={sideBySide ? "flex h-full min-h-0 min-w-0 flex-col" : "shrink-0"}>
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
        fillHeight={sideBySide}
      />
    </section>
  ) : null;

  if (sideBySide) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {trendSection}
        {monthSection}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {trendSection}
      {monthSection}
    </div>
  );
}
