"use client";

import { useMemo, useState } from "react";
import { dashboardModules, type ModuleId } from "@/data/overview";
import { getDict, useLang } from "@/lib/i18n";
import { translateDashboardModule, useDashboardModules } from "@/lib/overview";
import { SkeletonCard } from "@/components/ui/skeletons";
import { dashboardGridClass, sortDashboardModules } from "./dashboardGrid";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";

export function OverviewGrid() {
  const { lang } = useLang();
  const t = getDict(lang);
  const { modules, isLoading } = useDashboardModules();
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);

  const translatedModules = useMemo(
    () => sortDashboardModules(modules.map((module) => translateDashboardModule(module, t))),
    [modules, t]
  );
  const skeletonModules = useMemo(() => sortDashboardModules(dashboardModules), []);

  const expanded = translatedModules.find((module) => module.id === expandedId);

  return (
    <>
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">{t.dashboard.title}</h1>

        <p className="text-sm text-text-muted">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-6">
        {isLoading
          ? skeletonModules.map((module) => (
              <div key={module.id} className={dashboardGridClass(module.id)}>
                <SkeletonCard />
              </div>
            ))
          : translatedModules.map((module) => (
              <div key={module.id} className={dashboardGridClass(module.id)}>
                <ModuleCard data={module} onOpen={() => setExpandedId(module.id)} />
              </div>
            ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">* {t.dashboard.clickDetails}</p>

      {expanded ? <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} /> : null}
    </>
  );
}
