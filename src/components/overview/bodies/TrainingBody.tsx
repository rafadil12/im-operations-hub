"use client";

import type { ModuleCardData, TrainingRow } from "@/data/overview";
import { DonutChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { getDict, useLang } from "@/lib/i18n";
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
      <table className="w-full min-w-0 text-left text-xs">
        <thead>
          <tr className="text-text-dim">
            {expanded ? (
              <th className="pb-3 pr-3 font-medium">{labels.trainingName}</th>
            ) : null}
            <th className="pb-3 pr-3 font-medium">{labels.date}</th>
            {expanded ? (
              <th className="pb-3 pr-3 font-medium">{labels.participant}</th>
            ) : null}
            <th className="pb-3 font-medium">{labels.division}</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={`${row.name}-${row.date}`} className="text-text">
              {expanded ? <td className="py-2.5 pr-3 font-medium">{row.name}</td> : null}
              <td className="py-2.5 pr-3 text-text-muted">{row.date}</td>
              {expanded ? <td className="py-2.5 pr-3">{row.participants}</td> : null}
              <td className="py-2.5">{row.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrainingBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const t = getDict(lang);
  const recentRows = data.recentRows ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid min-h-0 flex-1 gap-6 sm:grid-cols-2">
        <section className="min-w-0">
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
            <p className="py-10 text-center text-xs text-text-muted">{t.common.noData}</p>
          )}
        </section>

        {data.secondaryChart ? (
          <section className="min-w-0">
            <h4 className="mb-3 text-xs font-medium text-text-muted">
              {data.secondaryChart.title}
            </h4>

            <DonutChartPlaceholder
              legend={data.secondaryChart.legend}
              segments={data.secondaryChart.segments}
              centerValue={data.secondaryChart.centerValue}
              centerLabel={data.secondaryChart.centerLabel}
              layout="column"
              legendVariant="split"
              size="lg"
              align="center"
            />
          </section>
        ) : null}
      </div>

      <section className="w-full min-w-0">
        <ChartSection
          data={data}
          expanded={expanded}
          trendHeight={{ compact: 200, expanded: 280 }}
          palette="training"
        />
      </section>
    </div>
  );
}
