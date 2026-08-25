"use client";

import { useMemo, useState } from "react";
import type { ModuleId } from "@/data/overview";
import { getDict, useLang } from "@/lib/i18n";
import { translateDashboardModule, useDashboardModules } from "@/lib/overview";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";

export function OverviewGrid() {
  const { lang } = useLang();
  const t = getDict(lang);
  const modules = useDashboardModules();
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);

  const translatedModules = useMemo(
    () => modules.map((module) => translateDashboardModule(module, t)),
    [modules, t]
  );

  const expanded = translatedModules.find((module) => module.id === expandedId);

  return (
    <>
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">{t.dashboard.title}</h1>

        <p className="text-sm text-text-muted">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {translatedModules.map((module) => (
          <div
            key={module.id}
            className={
              module.id === "training"
                ? "col-span-full"
                : module.colSpan === 2
                  ? "xl:col-span-2"
                  : undefined
            }
          >
            <ModuleCard data={module} onOpen={() => setExpandedId(module.id)} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">* {t.dashboard.clickDetails}</p>

      {expanded ? <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} /> : null}
    </>
  );
}
