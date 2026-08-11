"use client";

import type { ReactNode } from "react";
import type { ModuleCardData, ProgressRing } from "@/data/overview-mock";
import { StatPill } from "@/components/ui/StatPill";
import {
  BarChartPlaceholder,
  DonutChartPlaceholder,
  VerticalBarChartPlaceholder,
} from "@/components/ui/ChartPlaceholder";
import { getDict, useLang } from "@/lib/i18n";
import { TicketTrendChart } from "./TicketTrendChart";

type ModuleCardProps = {
  data: ModuleCardData;
  expanded?: boolean;
  onOpen?: () => void;
};

function CardIcon({ type, color }: { type: ModuleCardData["icon"]; color: string }) {
  const wrap = (child: ReactNode) => (
    <span
      className="inline-flex size-7 items-center justify-center rounded-md text-sm"
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden
    >
      {child}
    </span>
  );

  if (type === "calendar") return wrap("▣");
  if (type === "sparepart") return wrap("◈");
  if (type === "organization") return wrap("☰");
  if (type === "report") return wrap("▤");
  if (type === "training") return wrap("◎");

  if (type === "shield") {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}22`, color }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M12 2 4 5v6c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V5l-8-3Zm-1.1 13.2-3.3-3.3 1.4-1.4 1.9 1.9 4.1-4.1 1.4 1.4-5.5 5.5Z" />
        </svg>
      </span>
    );
  }

  return wrap("⌕");
}

function ChartSection({
  data,
  expanded,
  align = "start",
}: {
  data: ModuleCardData;
  expanded: boolean;
  align?: "start" | "center";
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
          height={expanded ? 260 : 140}
          compact={!expanded}
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

function PicsList({ data }: { data: ModuleCardData }) {
  if (!data.pics) return null;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
      <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
        {data.pics.title}
      </h4>
      <ul className="flex min-h-0 flex-1 flex-col justify-between gap-2">
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
    </section>
  );
}

function BarsAndPics({ data }: { data: ModuleCardData }) {
  if (!data.bars || !data.pics) return null;

  return (
    <>
      <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
        <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
          {data.bars.title}
        </h4>
        <div className="min-h-0 flex-1">
          <BarChartPlaceholder items={data.bars.items} />
        </div>
      </section>

      <PicsList data={data} />
    </>
  );
}

function ProgressRingItem({ ring }: { ring: ProgressRing }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (ring.value / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
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
        <text
          x="24"
          y="27"
          textAnchor="middle"
          className="fill-text text-[9px] font-semibold"
        >
          {ring.value}%
        </text>
      </svg>
      <span className="text-[10px] text-text-muted">{ring.label}</span>
    </div>
  );
}

function DefaultBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  const isDonut = data.chart.type === "donut";

  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        <BarsAndPics data={data} />
      </div>
      <section
        className={[
          "rounded-lg border border-border-subtle bg-bg/30 p-3",
          isDonut ? "flex min-h-[188px] flex-col justify-center" : "",
        ].join(" ")}
      >
        <ChartSection data={data} expanded={expanded} align="start" />
      </section>
    </>
  );
}

function SafetyBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  if (!data.trendBars) return <DefaultBody data={data} expanded={expanded} />;

  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
            {data.trendBars.title}
          </h4>
          <div className="min-h-0 flex-1">
            <VerticalBarChartPlaceholder items={data.trendBars.items} />
          </div>
        </section>
        <PicsList data={data} />
      </div>
      <section className="flex min-h-[188px] flex-col justify-center rounded-lg border border-border-subtle bg-bg/30 p-3">
        <ChartSection data={data} expanded={expanded} align="start" />
      </section>
    </>
  );
}

function SparepartBody({
  data,
  expanded,
}: {
  data: ModuleCardData;
  expanded: boolean;
}) {
  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <ChartSection data={data} expanded={expanded} />
        </section>
        {data.bars ? (
          <section className="flex h-full min-h-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">
              {data.bars.title}
            </h4>
            <div className="min-h-0 flex-1">
              <BarChartPlaceholder items={data.bars.items} />
            </div>
          </section>
        ) : null}
      </div>
      {data.stockFlows ? (
        <div className="grid grid-cols-3 gap-2">
          {data.stockFlows.map((flow) => (
            <div key={flow.label} className="min-w-0">
              <StatPill stat={flow} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function OrganizationBody({ data }: { data: ModuleCardData }) {
  const { lang } = useLang();
  const t = getDict(lang);
  const male = data.genderStats?.male ?? 0;
  const female = data.genderStats?.female ?? 0;
  const newJoinStat = data.stats[3];

  return (
    <>
      {data.orgTree ? (
        <section className="mb-4 rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 text-xs font-medium text-text-muted">
            {t.dashboard.orgTree}
          </h4>
          <div className="flex flex-col items-center gap-3">
            <span
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: data.accentColor }}
            >
              {data.orgTree.root}
            </span>
            <div className="h-4 w-px bg-border" />
            <div className="grid w-full grid-cols-3 gap-2">
              {data.orgTree.children.map((child) => (
                <span
                  key={child}
                  className="truncate rounded-md border border-border-subtle bg-bg/50 px-2 py-2 text-center text-[10px] font-medium text-text"
                >
                  {child}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 text-xs font-medium text-text-muted">
            {t.dashboard.genderBreakdown}
          </h4>
          <div className="flex items-end justify-around gap-4 pt-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-semibold text-accent">{male}%</span>
              <span className="text-[10px] text-text-muted">{t.dashboard.male}</span>
              <div className="mt-1 h-16 w-8 overflow-hidden rounded-t-md bg-border-subtle">
                <div
                  className="w-full bg-accent"
                  style={{ height: `${male}%`, marginTop: `${100 - male}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-semibold text-[#f472b6]">
                {female}%
              </span>
              <span className="text-[10px] text-text-muted">
                {t.dashboard.female}
              </span>
              <div className="mt-1 h-16 w-8 overflow-hidden rounded-t-md bg-border-subtle">
                <div
                  className="w-full bg-[#f472b6]"
                  style={{
                    height: `${female}%`,
                    marginTop: `${100 - female}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center rounded-lg border border-border-subtle bg-bg/30 p-3">
          <p className="text-[10px] uppercase tracking-wide text-text-dim">
            {t.dashboard.newJoin}
          </p>
          <p className="mt-1 text-3xl font-semibold text-success">
            {newJoinStat?.value ?? "—"}
          </p>
          <p className="mt-1 text-xs text-text-muted">{t.dashboard.thisMonth}</p>
        </section>
      </div>
    </>
  );
}

function ReportBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  return (
    <>
      <div className="mb-4 grid flex-1 gap-4 md:grid-cols-2">
        {data.trendBars ? (
          <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
            <h4 className="mb-3 text-xs font-medium text-text-muted">
              {data.trendBars.title}
            </h4>
            <VerticalBarChartPlaceholder items={data.trendBars.items} />
          </section>
        ) : null}
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <ChartSection data={data} expanded={expanded} />
        </section>
      </div>
      {data.progressRings ? (
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <div className="flex flex-wrap items-center justify-around gap-3">
            {data.progressRings.map((ring) => (
              <ProgressRingItem key={ring.label} ring={ring} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function TrainingBody({
  data,
  expanded,
}: {
  data: ModuleCardData;
  expanded: boolean;
}) {
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
        <h4 className="mb-3 text-xs font-medium text-text-muted">
          {t.dashboard.recentTraining}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-border-subtle text-text-dim">
                <th className="pb-2 pr-2 font-medium">
                  {t.dashboard.trainingName}
                </th>
                <th className="pb-2 pr-2 font-medium">{t.dashboard.date}</th>
                <th className="pb-2 pr-2 font-medium">
                  {t.dashboard.participant}
                </th>
                <th className="pb-2 pr-2 font-medium">
                  {t.dashboard.completion}
                </th>
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

function CardBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  switch (data.layout) {
    case "safety":
      return <SafetyBody data={data} expanded={expanded} />;
    case "sparepart":
      return <SparepartBody data={data} expanded={expanded} />;
    case "organization":
      return <OrganizationBody data={data} />;
    case "report":
      return <ReportBody data={data} expanded={expanded} />;
    case "training":
      return <TrainingBody data={data} expanded={expanded} />;
    default:
      return <DefaultBody data={data} expanded={expanded} />;
  }
}

export function ModuleCard({ data, expanded = false, onOpen }: ModuleCardProps) {
  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={[
        "flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors",
        onOpen
          ? "cursor-pointer hover:border-accent/50 hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          : "",
        expanded ? "shadow-[0_20px_48px_var(--shadow-color-soft)]" : "",
      ].join(" ")}
      style={{
        borderTopWidth: 3,
        borderTopColor: data.accentColor,
      }}
    >
      <header className="mb-4 flex items-center gap-2.5">
        <CardIcon type={data.icon} color={data.accentColor} />
        <h3 className="text-sm font-semibold tracking-wide text-text">
          {data.number}. {data.title}
        </h3>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <StatPill stat={stat} />
          </div>
        ))}
      </div>

      <CardBody data={data} expanded={expanded} />
    </article>
  );
}
