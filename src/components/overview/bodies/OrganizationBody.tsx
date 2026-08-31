"use client";

import type { ModuleCardData } from "@/data/overview";
import { getDict, useLang } from "@/lib/i18n";

const DIVISION_STYLES = [
  { bg: "#a855f7fc", text: "#ffffff" },
  { bg: "#3b82f6fc", text: "#ffffff" },
  { bg: "#f97316fc", text: "#ffffff" },
] as const;

const TREE_LINE = "rgba(100, 116, 139, 0.5)";

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

function TreeLineVertical({ height = 20 }: { height?: number }) {
  return (
    <div
      className="shrink-0"
      style={{ width: 2, height, backgroundColor: TREE_LINE, borderRadius: 1 }}
    />
  );
}

function TreeLineHorizontal() {
  return (
    <div
      className="absolute top-0"
      style={{
        left: "16.666%",
        right: "16.666%",
        height: 2,
        backgroundColor: TREE_LINE,
        borderRadius: 1,
      }}
    />
  );
}

function OrgTreeSection({
  chart,
  personelLabel,
  orgTreeTitle,
}: {
  chart: NonNullable<ModuleCardData["orgChart"]>;
  personelLabel: string;
  orgTreeTitle: string;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
      <h4 className="mb-4 text-xs font-medium text-text-muted">{orgTreeTitle}</h4>

      <div className="mx-auto max-w-full">
        {/* Root */}
        <div className="flex justify-center">
          <span className="max-w-full rounded-md border-1 border-slate-400 bg-bg/50 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text shadow-sm">
            {chart.company}
          </span>
        </div>

        <div className="flex justify-center">
          <TreeLineVertical height={25} />
        </div>

        <div className="relative px-1 pt-0">
          <TreeLineHorizontal />

          <div className="grid grid-cols-3 gap-2">
            {chart.divisions.map((division, index) => {
              const style = DIVISION_STYLES[index] ?? DIVISION_STYLES[0];

              return (
                <div key={division.name} className="flex flex-col items-center">
                  <TreeLineVertical height={25} />

                  <span
                    className="w-full truncate rounded-md border-2 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide shadow-md"
                    style={{
                      backgroundColor: style.bg,
                      borderColor: style.bg,
                      color: style.text,
                    }}
                  >
                    {division.name}
                  </span>

                  <TreeLineVertical height={12} />

                  <span className="w-full rounded-md border-1 border-slate-400 bg-bg/60 px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wide text-text">
                    {personelLabel} : {division.personnelCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OrganizationBody({ data }: { data: ModuleCardData }) {
  const { lang } = useLang();
  const t = getDict(lang);
  const chart = data.orgChart;
  const departments = data.departmentPerformance ?? [];

  if (!chart && !departments.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {chart ? (
        <OrgTreeSection
          chart={chart}
          personelLabel={t.dashboard.personelLabel}
          orgTreeTitle={t.dashboard.orgTree}
        />
      ) : null}

      {departments.length ? (
        <section className="rounded-lg border border-border-subtle bg-bg/30 p-3">
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-text">
              {t.dashboard.monthlyDepartmentPerformance}
            </h4>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {t.dashboard.monthlyDepartmentPerformanceDesc}
            </p>
          </div>

          <div className="space-y-3">
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
  );
}
