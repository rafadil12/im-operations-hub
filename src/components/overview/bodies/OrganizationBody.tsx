"use client";

import type { ModuleCardData } from "@/data/overview";
import { getDict, useLang } from "@/lib/i18n";
import { divisionColor } from "@/lib/training/copy";

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

const DIVISION_COLUMN_GAP = "2rem";
const PERSON_COLUMN_GAP = "0.375rem";

function TreeLineVertical({ height = 20 }: { height?: number }) {
  return (
    <div
      className="shrink-0"
      style={{ width: 2, height, backgroundColor: TREE_LINE, borderRadius: 1 }}
    />
  );
}

/** Horizontal bar + a drop line at each column center, spanning the grid gap. */
function TreeFork({
  count,
  columnGap,
  height = 16,
}: {
  count: number;
  columnGap: string;
  height?: number;
}) {
  if (count <= 0) return null;

  if (count === 1) {
    return (
      <div className="flex shrink-0 justify-center">
        <TreeLineVertical height={height} />
      </div>
    );
  }

  return (
    <div
      className="grid w-full shrink-0"
      style={{
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        columnGap,
        height,
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const isFirst = index === 0;
        const isLast = index === count - 1;
        return (
          <div key={index} className="relative">
            <div
              className="absolute top-0"
              style={{
                height: 2,
                backgroundColor: TREE_LINE,
                left: isFirst ? "50%" : `calc(-1 * ${columnGap} / 2)`,
                right: isLast ? "50%" : `calc(-1 * ${columnGap} / 2)`,
                borderRadius: 1,
              }}
            />
            <div
              className="absolute top-0 left-1/2 w-[2px] -translate-x-1/2"
              style={{ height: "100%", backgroundColor: TREE_LINE, borderRadius: 1 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function firstGivenName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return name;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function personLabel(person: { nameEn: string; nameCn: string }, lang: string): string {
  const full = lang === "cn" ? person.nameCn || person.nameEn : person.nameEn || person.nameCn;
  return firstGivenName(full);
}

function orgDivisionColor(name: string): string {
  if (/logistics/i.test(name)) return divisionColor("Intelligent Logistics");
  return divisionColor(name);
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
      <div className="inline-flex w-fit max-w-full flex-col items-center rounded-lg border border-border-subtle bg-bg/60 p-2 text-center">
        <span
          className="mb-1 inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: accent ?? "#64748b" }}
          aria-hidden
        >
          {name.trim().charAt(0) || "?"}
        </span>
        <p className="max-w-full truncate text-[8px] font-semibold uppercase leading-tight text-text">
          {name}
        </p>
        <p className="max-w-full truncate text-[8px] text-text-muted">{role}</p>
      </div>
    );
  }

  return (
    <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-border-subtle bg-bg/60 py-2.5 px-5">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ backgroundColor: accent ?? "#64748b" }}
        aria-hidden
      >
        {name.trim().charAt(0) || "?"}
      </span>
      <div className="flex min-w-0 flex-col items-start justify-center">
        <p className="max-w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide text-text">
          {name}
        </p>
        <p className="max-w-full truncate text-center text-[9px] text-text-muted">{role}</p>
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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border-subtle bg-bg/30 p-4">
      <h4 className="mb-4 shrink-0 text-xs font-medium text-text-muted">{orgTreeTitle}</h4>

      <div className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col">
        <div className="flex shrink-0 justify-center">
          <div className="max-w-xl rounded-lg border border-border-subtle bg-bg/60 px-4 py-2 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-text">
              {chart.company}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={16} />
        </div>

        <div className="flex shrink-0 items-center justify-center">
          <PersonNode name={firstGivenName(chart.leader)} role={departmentManager} accent="#f97316" />
        </div>

        <div className="flex shrink-0 justify-center">
          <TreeLineVertical height={20} />
        </div>

        <div className="min-h-0 flex-1 px-1">
          <TreeFork count={chart.divisions.length} columnGap={DIVISION_COLUMN_GAP} height={16} />

          <div
            className="grid h-full min-h-0 grid-cols-3"
            style={{ columnGap: DIVISION_COLUMN_GAP }}
          >
            {chart.divisions.map((division) => {
              const accent = orgDivisionColor(division.name);
              const people = division.people ?? [];
              const [lead, ...reports] = people;
              const count = division.personnelCount || people.length;

              return (
                <div key={division.name} className="flex min-h-0 flex-col items-center">
                  <div
                    className="inline-flex w-fit max-w-full shrink-0 items-center gap-2 rounded-lg p-2 px-5 text-white shadow-md"
                    style={{ backgroundColor: accent }}
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
                      role={leadLabel}
                      accent={accent}
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
                          role={personelRole}
                          accent={accent}
                        />
                      ) : (
                        <div className="w-full">
                          <TreeFork
                            count={reports.length}
                            columnGap={PERSON_COLUMN_GAP}
                            height={12}
                          />
                          <div
                            className="grid"
                            style={{
                              gridTemplateColumns: `repeat(${Math.min(reports.length, 4)}, minmax(0, 1fr))`,
                              columnGap: PERSON_COLUMN_GAP,
                            }}
                          >
                            {reports.map((person) => (
                              <div
                                key={`${division.name}-${person.nameEn}-${person.nameCn}`}
                                className="flex min-w-0 flex-col items-center"
                              >
                                <PersonNode
                                  compact
                                  name={personLabel(person, lang)}
                                  role={personelRole}
                                  accent={accent}
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
        <section className="w-full shrink-0 rounded-lg border border-border-subtle bg-bg/30 p-4">
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
