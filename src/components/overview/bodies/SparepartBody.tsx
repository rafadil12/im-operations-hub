"use client";

import type { ModuleCardData, SparepartRecentUsedRow } from "@/data/overview";
import { BarChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { getDict, useLang } from "@/lib/i18n";
import { formatUomDisplay } from "@/lib/sparepart/uoms";
import { ChartSection } from "../ModuleCardShared";
import { ROW2_TREND_HEIGHT, TwoZoneCardBody } from "./TwoZoneCardBody";

const RECENT_USED_LIMIT = 4;

function RecentUsedTable({
  rows,
  showDetails,
  labels,
  lang,
}: {
  rows: SparepartRecentUsedRow[];
  showDetails: boolean;
  labels: {
    date: string;
    code: string;
    description: string;
    qty: string;
    uom: string;
  };
  lang: "en" | "cn";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 text-left text-[11px]">
        <thead>
          <tr className="border-b border-border-subtle text-text-dim">
            <th className="pb-2 pr-2 font-medium">{labels.date}</th>
            {showDetails ? <th className="pb-2 pr-2 font-medium">{labels.code}</th> : null}
            <th className="pb-2 pr-2 font-medium">{labels.description}</th>
            {showDetails ? (
              <>
                <th className="pb-2 pr-2 font-medium">{labels.qty}</th>
                <th className="pb-2 font-medium">{labels.uom}</th>
              </>
            ) : (
              <th className="pb-2 font-medium">{labels.qty}</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const desc = lang === "cn" ? row.nameCn || row.nameEn : row.nameEn || row.nameCn;
            return (
              <tr
                key={`${row.docId}-${row.lineNo}-${row.code}`}
                className="border-b border-border-subtle/60 text-text"
              >
                <td className="py-2 pr-2 text-text-muted">{row.date}</td>
                {showDetails ? (
                  <td className="py-2 pr-2 font-medium tabular-nums">{row.code}</td>
                ) : null}
                <td className="max-w-[10rem] truncate py-2 pr-2" title={desc}>
                  {desc}
                </td>
                {showDetails ? (
                  <>
                    <td className="py-2 pr-2 tabular-nums">{row.qty.toLocaleString()}</td>
                    <td className="py-2">
                      {formatUomDisplay({ code: row.uomCode, name_cn: row.uomNameCn }, lang) ||
                        labels.uom}
                    </td>
                  </>
                ) : (
                  <td className="py-2 tabular-nums whitespace-nowrap">
                    {row.qty.toLocaleString()}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SparepartBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const { lang } = useLang();
  const t = getDict(lang);
  const recentRows = (data.recentUsedRows ?? []).slice(0, RECENT_USED_LIMIT);

  return (
    <TwoZoneCardBody
      bottomFit
      mid={
        <>
          {data.bars ? (
            <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
              <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{data.bars.title}</h4>
              <div className="min-h-0 flex-1">
                <BarChartPlaceholder items={data.bars.items} />
              </div>
            </section>
          ) : null}

          <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
              {t.dashboard.recentUsed}
            </h4>

            {recentRows.length > 0 ? (
              <RecentUsedTable
                rows={recentRows}
                showDetails={expanded}
                lang={lang}
                labels={{
                  date: t.dashboard.date,
                  code: t.sparepart.code,
                  description: t.fields.description,
                  qty: t.sparepart.qty,
                  uom: t.sparepart.uom,
                }}
              />
            ) : (
              <p className="flex flex-1 items-center justify-center py-6 text-center text-[11px] text-text-muted">
                {t.common.noData}
              </p>
            )}
          </section>
        </>
      }
      bottom={
        <ChartSection
          data={data}
          expanded={expanded}
          trendHeight={ROW2_TREND_HEIGHT}
        />
      }
    />
  );
}
