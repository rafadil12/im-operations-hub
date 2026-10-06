"use client";

import type { ModuleCardData } from "@/data/overview";
import { StatPill } from "@/components/ui/StatPill";
import { getDict, useLang } from "@/lib/i18n";
import { OrgChartView } from "./OrgChartView";

function DepartmentRateBar({
  label,
  value,
  index,
}: {
  label: string;
  value: number;
  index: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-text">{label}</span>
        <span className="shrink-0 text-[10px] font-semibold text-text">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className={[
            "h-full rounded-full",
            value >= 90 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-rose-500",
          ].join(" ")}
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            animationDelay: `${index * 0.08}s`,
          }}
        />
      </div>
    </div>
  );
}

export function OrganizationBody({ data }: { data: ModuleCardData }) {
  const { lang } = useLang();
  const t = getDict(lang);
  const chart = data.orgChart;
  const departments = data.departmentPerformance ?? [];
  const stats = data.stats ?? [];

  if (!chart && !departments.length && !stats.length) {
    return null;
  }

  const showRightColumn = stats.length > 0 || departments.length > 0;

  return (
    <div
      className={[
        "grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4",
        showRightColumn ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "",
      ].join(" ")}
    >
      {chart ? (
        <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border-subtle bg-bg/30 p-4">
          <h4 className="mb-3 shrink-0 text-xs font-medium text-text-muted">{t.dashboard.orgTree}</h4>
          <div className="mb-3 flex shrink-0 justify-center">
            <div className="rounded-lg border border-border-subtle bg-bg/60 px-4 py-2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">
                {chart.company}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <OrgChartView
              chart={chart}
              lang={lang}
              labels={{
                departmentManager: t.dashboard.orgDepartmentManager,
                lead: t.dashboard.orgLead,
                personel: t.dashboard.orgPersonelRole,
              }}
            />
          </div>
        </section>
      ) : (
        <div className="min-h-0" />
      )}

      {showRightColumn ? (
        <div className="flex h-full min-h-0 flex-col gap-4">
          {stats.length ? (
            <div className="flex shrink-0 flex-col gap-2">
              {stats.map((stat) => (
                <StatPill key={stat.label} stat={stat} />
              ))}
            </div>
          ) : null}

          {departments.length ? (
            <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border-subtle bg-bg/30 p-4">
              <div className="mb-4 shrink-0">
                <h4 className="text-xs font-semibold text-text">
                  {t.dashboard.monthlyDepartmentPerformance}
                </h4>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {t.dashboard.monthlyDepartmentPerformanceDesc}
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {departments.map((item, index) => (
                  <DepartmentRateBar
                    key={item.department}
                    label={item.department}
                    value={item.attendanceRate}
                    index={index}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
