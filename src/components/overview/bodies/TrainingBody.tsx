"use client";

import type { ModuleCardData, TrainingRow } from "@/data/overview";
import { DonutChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { TrainingCategoryDonut } from "@/components/training/overview/TrainingCharts";
import { getDict, useLang } from "@/lib/i18n";
import type { TrainingLanguage } from "@/lib/training";
import { ChartSection } from "../ModuleCardShared";

function RecentTrainingTable({
  rows,
  expanded,
  labels,
}: {
  rows: TrainingRow[];
  expanded: boolean;
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
            {expanded ? (
              <th className="pb-2 pr-2 font-medium">{labels.trainingName}</th>
            ) : null}
            <th className="pb-2 pr-2 font-medium">{labels.date}</th>
            {expanded ? (
              <th className="pb-2 pr-2 font-medium">{labels.participant}</th>
            ) : null}
            <th className={expanded ? "pb-2 font-medium" : "pb-2 pr-2 font-medium"}>
              {labels.division}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.name}-${row.date}`}
              className="border-b border-border-subtle/60 text-text"
            >
              {expanded ? <td className="py-2 pr-2 font-medium">{row.name}</td> : null}
              <td className="py-2 pr-2 text-text-muted">{row.date}</td>
              {expanded ? <td className="py-2 pr-2">{row.participants}</td> : null}
              <td className={expanded ? "py-2" : "py-2 pr-2"}>{row.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrainingBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const language = lang as TrainingLanguage;
  const t = getDict(lang);
  const recentRows = data.recentRows ?? [];
  const showOverviewDonut = expanded && (data.trainingByDivision?.length ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-10">
        <section
          className={[
            "rounded-lg border border-border-subtle bg-bg/30 p-3",
            data.secondaryChart ? "lg:col-span-5" : "lg:col-span-10",
          ].join(" ")}
        >
          <h4 className="mb-3 text-xs font-medium text-text-muted">{t.dashboard.recentTraining}</h4>

          {recentRows.length > 0 ? (
            <RecentTrainingTable
              rows={recentRows}
              expanded={expanded}
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

        {data.secondaryChart ? (
          <section className="rounded-lg border border-border-subtle bg-bg/30 p-3 lg:col-span-5">
            <h4 className="mb-3 text-xs font-medium text-text-muted">
              {data.secondaryChart.title}
            </h4>

            {showOverviewDonut ? (
              <TrainingCategoryDonut data={data.trainingByDivision!} language={language} />
            ) : (
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
            )}
          </section>
        ) : null}
      </div>

      <section className="w-full rounded-lg border border-border-subtle bg-bg/30 p-3">
        <ChartSection
          data={data}
          expanded={expanded}
          trendHeight={{ compact: 160, expanded: 280 }}
        />
      </section>
    </div>
  );
}
