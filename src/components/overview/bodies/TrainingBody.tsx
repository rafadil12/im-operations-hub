"use client";

import type { ModuleCardData, TrainingRow } from "@/data/overview";
import { DonutChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { TrainingCategoryDonut } from "@/components/training/overview/TrainingCharts";
import { getDict, useLang } from "@/lib/i18n";
import type { TrainingLanguage } from "@/lib/training";
import { ChartSection } from "../ModuleCardShared";

const RECENT_TRAINING_LIMIT = 5;

function RecentTrainingTable({
  rows,
  labels,
}: {
  rows: TrainingRow[];
  labels: {
    trainingName: string;
    date: string;
    participant: string;
    division: string;
  };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 text-left text-[11px]">
        <thead>
          <tr className="border-b border-border-subtle text-text-dim">
            <th className="pb-2 pr-2 font-medium">{labels.trainingName}</th>
            <th className="pb-2 pr-2 font-medium">{labels.date}</th>
            <th className="pb-2 pr-2 font-medium">{labels.participant}</th>
            <th className="pb-2 font-medium">{labels.division}</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.name}-${row.date}`}
              className="border-b border-border-subtle/60 text-text"
            >
              <td className="py-2 pr-2 font-medium">{row.name}</td>
              <td className="py-2 pr-2 text-text-muted">{row.date}</td>
              <td className="py-2 pr-2">{row.participants}</td>
              <td className="py-2">{row.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrainingBody({ data }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const language = lang as TrainingLanguage;
  const t = getDict(lang);
  const recentRows = (data.recentRows ?? []).slice(0, RECENT_TRAINING_LIMIT);
  const showOverviewDonut = (data.trainingByDivision?.length ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid items-stretch gap-4 lg:grid-cols-10">
        <section
          className={[
            "rounded-lg border border-border-subtle bg-bg/30 p-3",
            data.secondaryChart ? "lg:col-span-5" : "lg:col-span-10",
          ].join(" ")}
        >
          <ChartSection data={data} expanded trendHeight={{ compact: 160, expanded: 200 }} />
        </section>

        {data.secondaryChart ? (
          <section className="flex min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3 lg:col-span-5">
            <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
              {data.secondaryChart.title}
            </h4>

            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0">
                {showOverviewDonut ? (
                  <TrainingCategoryDonut fill data={data.trainingByDivision!} language={language} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <DonutChartPlaceholder
                      legend={data.secondaryChart.legend}
                      segments={data.secondaryChart.segments}
                      centerValue={data.secondaryChart.centerValue}
                      centerLabel={data.secondaryChart.centerLabel}
                      layout="column"
                      legendVariant="split"
                      size="md"
                      align="center"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="w-full rounded-lg border border-border-subtle bg-bg/30 p-3">
        <h4 className="mb-3 text-xs font-medium text-text-muted">{t.dashboard.recentTraining}</h4>

        {recentRows.length > 0 ? (
          <RecentTrainingTable
            rows={recentRows}
            labels={{
              trainingName: t.dashboard.trainingName,
              date: t.dashboard.date,
              participant: t.dashboard.participant,
              division: t.fields.division,
            }}
          />
        ) : (
          <p className="py-6 text-center text-[11px] text-text-muted">{t.common.noData}</p>
        )}
      </section>
    </div>
  );
}
