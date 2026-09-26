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

function TreeLineHorizontal({ inset = "16.666%" }: { inset?: string }) {
  return (
    <div
      className="absolute top-0"
      style={{
        left: inset,
        right: inset,
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

function divisionRolePrefix(name: string): string {
  if (/logistics/i.test(name)) return "Logistics";
  return name;
}

function PersonNode({
  name,
  role,
  accent,
  compact = false,
}: {
  name: string;
  role: string;
  accent?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center rounded-lg border border-border-subtle bg-bg/60 px-1.5 py-2 text-center">
        <span
          className="mb-1 inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: accent ?? "#64748b" }}
          aria-hidden
        >
          {name.trim().charAt(0) || "?"}
        </span>
        <p className="w-full truncate text-[8px] font-semibold uppercase leading-tight text-text">
          {name}
        </p>
        <p className="w-full truncate text-[8px] text-text-muted">{role}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border-subtle bg-bg/60 px-2.5 py-2">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ backgroundColor: accent ?? "#64748b" }}
        aria-hidden
      >
        {name.trim().charAt(0) || "?"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-text">
          {name}
        </p>
        <p className="truncate text-[9px] text-text-muted">{role}</p>
      </div>
    </div>
  );
}

function OrgTreeSection({
  chart,
  orgTreeTitle,
  departmentManager,
  leadLabel,
  personelRole,
  lang,
}: {
  chart: NonNullable<ModuleCardData["orgChart"]>;
  orgTreeTitle: string;
  departmentManager: string;
  leadLabel: string;
  personelRole: string;
  lang: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border-subtle bg-bg/30 p-4">
      <h4 className="mb-4 shrink-0 text-xs font-medium text-text-muted">{orgTreeTitle}</h4>

      <div className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col">
        <div className="flex shrink-0 justify-center">
          <div className="max-w-xl rounded-lg border border-border-subtle bg-bg/60 px-4 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text">
              {chart.company}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={16} />
        </div>

        <div className="flex shrink-0 justify-center">
          <div className="w-full max-w-xs">
            <PersonNode name={chart.leader} role={departmentManager} accent="#0ea5e9" />
          </div>
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={20} />
        </div>

        <div className="relative min-h-0 flex-1 px-1">
          <TreeLineHorizontal />

          <div className="grid h-full min-h-0 grid-cols-3 gap-3">
            {chart.divisions.map((division, index) => {
              const style = DIVISION_STYLES[index] ?? DIVISION_STYLES[0];
              const people = division.people ?? [];
              const [lead, ...reports] = people;
              const prefix = divisionRolePrefix(division.name);
              const count = division.personnelCount || people.length;

              return (
                <div key={division.name} className="flex min-h-0 flex-col items-center">
                  <TreeLineVertical height={16} />

                  <div
                    className="flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-white shadow-md"
                    style={{ backgroundColor: style.bg }}
                  >
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide">
                      {division.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold">
                      {count}
                    </span>
                  </div>

                  <TreeLineVertical height={12} />

                  {lead ? (
                    <PersonNode
                      name={personLabel(lead, lang)}
                      role={`${prefix} ${leadLabel}`}
                      accent={style.bg}
                    />
                  ) : (
                    <PersonNode name="—" role={personelRole} />
                  )}

                  {reports.length > 0 ? (
                    <>
                      <TreeLineVertical height={12} />
                      {reports.length === 1 ? (
                        <PersonNode
                          name={personLabel(reports[0], lang)}
                          role={`${prefix} ${personelRole}`}
                          accent="#64748b"
                        />
                      ) : (
                        <div className="relative w-full pt-0">
                          <TreeLineHorizontal inset="12.5%" />
                          <div
                            className="grid gap-1.5"
                            style={{
                              gridTemplateColumns: `repeat(${Math.min(reports.length, 4)}, minmax(0, 1fr))`,
                            }}
                          >
                            {reports.map((person) => (
                              <div
                                key={`${division.name}-${person.nameEn}-${person.nameCn}`}
                                className="flex min-w-0 flex-col items-center"
                              >
                                <TreeLineVertical height={12} />
                                <PersonNode
                                  compact
                                  name={personLabel(person, lang)}
                                  role={`${prefix} ${personelRole}`}
                                  accent={style.bg}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
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
        <OrgTreeSection
          chart={chart}
          orgTreeTitle={t.dashboard.orgTree}
          departmentManager={t.dashboard.orgDepartmentManager}
          leadLabel={t.dashboard.orgLead}
          personelRole={t.dashboard.orgPersonelRole}
          lang={lang}
        />
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
