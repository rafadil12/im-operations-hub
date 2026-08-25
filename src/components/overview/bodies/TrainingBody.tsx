"use client";

import type { ModuleCardData } from "@/data/overview";
import { DonutChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { getDict, useLang } from "@/lib/i18n";
import { ChartSection } from "../ModuleCardShared";

export function TrainingBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const t = getDict(lang);

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-1">
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <ChartSection data={data} expanded={expanded} />
        </section>

        {data.secondaryChart ? (
          <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-3 text-xs font-medium text-text-muted">
              {data.secondaryChart.title}
            </h4>

            <DonutChartPlaceholder
              legend={data.secondaryChart.legend}
              segments={data.secondaryChart.segments}
              centerValue={data.secondaryChart.centerValue}
              centerLabel={data.secondaryChart.centerLabel}
            />
          </section>
        ) : null}
      </div>

      <section className="rounded-lg border border-border-subtle bg-bg/30 p-3 lg:col-span-2">
        <h4 className="mb-3 text-xs font-medium text-text-muted">{t.dashboard.recentTraining}</h4>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-border-subtle text-text-dim">
                <th className="pb-2 pr-2 font-medium">{t.dashboard.trainingName}</th>
                <th className="pb-2 pr-2 font-medium">{t.dashboard.date}</th>
                <th className="pb-2 pr-2 font-medium">{t.dashboard.participant}</th>
                <th className="pb-2 pr-2 font-medium">{t.dashboard.completion}</th>
                <th className="pb-2 font-medium">{t.dashboard.avgScore}</th>
              </tr>
            </thead>

            <tbody>
              {(data.recentRows ?? []).map((row) => (
                <tr
                  key={`${row.name}-${row.date}`}
                  className="border-b border-border-subtle/60 text-text"
                >
                  <td className="py-2 pr-2 font-medium">{row.name}</td>
                  <td className="py-2 pr-2 text-text-muted">{row.date}</td>
                  <td className="py-2 pr-2">{row.participants}</td>
                  <td className="py-2 pr-2 text-success">{row.completion}</td>
                  <td className="py-2">{row.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
