"use client";

import type { ModuleCardData, ProgressRing } from "@/data/overview";
import { BarChartPlaceholder, DonutChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { useLang } from "@/lib/i18n";
import { TicketTrendChart } from "./TicketTrendChart";

/** Match BarChartPlaceholder min height (3 rows) for side-by-side panel alignment. */
const PANEL_LIST_MIN_HEIGHT_PX = 134;

export function ChartSection({
  data,
  expanded,
  align = "start",
  trendHeight,
}: {
  data: ModuleCardData;
  expanded: boolean;
  align?: "start" | "center";
  trendHeight?: { compact: number; expanded: number };
}) {
  return (
    <>
      <h4
        className={[
          "mb-3 text-xs font-medium text-text-muted",
          align === "center" ? "text-center" : "",
        ].join(" ")}
      >
        {data.chart.title}
      </h4>

      {data.chart.type === "trend" ? (
        <TicketTrendChart
          data={data.chart.series ?? []}
          height={expanded ? (trendHeight?.expanded ?? 260) : (trendHeight?.compact ?? 140)}
          compact={!expanded}
          legendLabels={data.chart.legend.map((item) => item.label)}
        />
      ) : (
        <DonutChartPlaceholder
          legend={data.chart.legend}
          segments={data.chart.segments}
          centerValue={data.chart.centerValue}
          centerLabel={data.chart.centerLabel}
          align={align}
        />
      )}
    </>
  );
}

export function PicsList({ data }: { data: ModuleCardData }) {
  const { t } = useLang();
  if (!data.pics) return null;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
      <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{data.pics.title}</h4>

      {data.pics.items.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center text-sm text-text-muted"
          style={{ minHeight: PANEL_LIST_MIN_HEIGHT_PX }}
        >
          {t.common.noData}
        </div>
      ) : (
        <ul
          className="flex min-h-0 flex-1 flex-col justify-between gap-2"
          style={
            data.pics.items.length < 3 ? { minHeight: PANEL_LIST_MIN_HEIGHT_PX } : undefined
          }
        >
          {data.pics.items.map((pic) => (
            <li key={pic.name} className="flex items-center gap-2.5">
              <span
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: data.accentColor }}
              >
                {pic.initials}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text">{pic.name}</p>
                <p className="truncate text-[10px] text-text-dim">{pic.role}</p>
              </div>

              <span className="text-xs font-semibold text-text-muted">{pic.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BarsAndPics({ data }: { data: ModuleCardData }) {
  if (!data.bars || !data.pics) return null;

  return (
    <>
      <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
        <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{data.bars.title}</h4>

        <div className="min-h-0 flex-1">
          <BarChartPlaceholder items={data.bars.items} />
        </div>
      </section>

      <PicsList data={data} />
    </>
  );
}

export function ProgressRingItem({ ring }: { ring: ProgressRing }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (ring.value / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />

        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={ring.color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 24 24)"
        />

        <text x="24" y="27" textAnchor="middle" className="fill-text text-[9px] font-semibold">
          {ring.value}%
        </text>
      </svg>

      <span className="text-[10px] text-text-muted">{ring.label}</span>
    </div>
  );
}
