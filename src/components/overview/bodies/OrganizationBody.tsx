"use client";

import type { ModuleCardData } from "@/data/overview";
import { getDict, useLang } from "@/lib/i18n";

export function OrganizationBody({ data }: { data: ModuleCardData }) {
  const { lang } = useLang();
  const t = getDict(lang);

  const male = data.genderStats?.male ?? 0;
  const female = data.genderStats?.female ?? 0;
  const newJoinStat = data.stats[3];

  return (
    <>
      {data.orgTree ? (
        <section className="mb-4 rounded-lg border border-border-subtle bg-bg/30 p-3">
          <h4 className="mb-3 text-xs font-medium text-text-muted">{t.dashboard.orgTree}</h4>

          <div className="flex flex-col items-center gap-3">
            <span
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{
                backgroundColor: data.accentColor,
              }}
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
                  style={{
                    height: `${male}%`,
                    marginTop: `${100 - male}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-semibold text-[#f472b6]">{female}%</span>

              <span className="text-[10px] text-text-muted">{t.dashboard.female}</span>

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
          <p className="text-[10px] uppercase tracking-wide text-text-dim">{t.dashboard.newJoin}</p>

          <p className="mt-1 text-3xl font-semibold text-success">{newJoinStat?.value ?? "—"}</p>

          <p className="mt-1 text-xs text-text-muted">{t.dashboard.thisMonth}</p>
        </section>
      </div>
    </>
  );
}
