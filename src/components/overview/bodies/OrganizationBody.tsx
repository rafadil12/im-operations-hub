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

function personLabel(person: { nameEn: string; nameCn: string }, lang: string): string {
  return lang === "cn" ? person.nameCn || person.nameEn : person.nameEn || person.nameCn;
}

function OrgTreeSection({
  chart,
  orgTreeTitle,
  lang,
}: {
  chart: NonNullable<ModuleCardData["orgChart"]>;
  orgTreeTitle: string;
  lang: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border-subtle bg-bg/30 p-4">
      <h4 className="mb-4 shrink-0 text-xs font-medium text-text-muted">{orgTreeTitle}</h4>

      <div className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col">
        <div className="flex shrink-0 justify-center">
          <span className="max-w-full rounded-md border-1 border-slate-400 bg-bg/50 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text shadow-sm">
            {chart.company}
          </span>
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={16} />
        </div>

        <div className="flex shrink-0 justify-center">
          <span className="max-w-full rounded-md border-1 border-slate-400 bg-bg/60 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text shadow-sm">
            {chart.leader}
          </span>
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={24} />
        </div>

        <div className="relative min-h-0 flex-1 px-1">
          <TreeLineHorizontal />

          <div className="grid h-full min-h-0 grid-cols-3 gap-2">
            {chart.divisions.map((division, index) => {
              const style = DIVISION_STYLES[index] ?? DIVISION_STYLES[0];
              const people = division.people ?? [];

              return (
                <div key={division.name} className="flex min-h-0 flex-col items-center">
                  <TreeLineVertical height={24} />

                  <span
                    className="w-full shrink-0 truncate rounded-md border-2 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide shadow-md"
                    style={{
                      backgroundColor: style.bg,
                      borderColor: style.bg,
                      color: style.text,
                    }}
                  >
                    {division.name}
                  </span>

                  <TreeLineVertical height={10} />

                  <div className="flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-y-auto">
                    {people.length > 0 ? (
                      people.map((person) => (
                        <span
                          key={`${division.name}-${person.nameEn}-${person.nameCn}`}
                          className="w-full truncate rounded-md border-1 border-slate-400 bg-bg/60 px-2 py-1.5 text-center text-[9px] font-semibold text-text"
                          title={personLabel(person, lang)}
                        >
                          {personLabel(person, lang)}
                        </span>
                      ))
                    ) : (
                      <span className="w-full rounded-md border-1 border-slate-400 bg-bg/60 px-2 py-1.5 text-center text-[9px] font-semibold text-text-muted">
                        —
                      </span>
                    )}
                  </div>
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {chart ? (
        <OrgTreeSection chart={chart} orgTreeTitle={t.dashboard.orgTree} lang={lang} />
      ) : null}

      {departments.length ? (
        <section className="shrink-0 rounded-lg border border-border-subtle bg-bg/30 p-4">
          <div className="mb-4">
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
