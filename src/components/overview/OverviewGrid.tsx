"use client";

import { useEffect, useMemo, useState } from "react";
import {
  overviewModules,
  type ModuleCardData,
  type ModuleId,
} from "@/data/overview-mock";
import { apiGet } from "@/lib/apiClient";
import { getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { mapAnalysisToOverview } from "@/lib/mapAnalysisToOverview";
import { getDict, useLang } from "@/lib/i18n";
import type { AnalysisResult, ItsmAnalysisResponse } from "@/lib/types";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";
import { mapItsmToOverview } from "@/lib/mapItsmToOverview";

type AnalysisResponse = { result: AnalysisResult };

export function OverviewGrid() {
  const { lang } = useLang();
  const t = getDict(lang);
  const [modules, setModules] = useState<ModuleCardData[]>(overviewModules);
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);
  

  useEffect(() => {
    let cancelled = false;
    const month = getCurrentMonth();
    const start = toDateInput(month.start);
    const end = toDateInput(month.end);

    (async () => {
      try {
        const [dailyData, itsmData] = await Promise.all([
          apiGet<AnalysisResponse>(
            `/analysis?start=${start}&end=${end}`,
            "daily",
          ),
          apiGet<ItsmAnalysisResponse>(
            `/analysis?start=${start}&end=${end}`,
            "itsm",
          ),
        ]);

        if (cancelled) return;

        setModules((prev) =>
          prev.map((mod) => {
            switch (mod.id) {
              case "itsm":
                console.log("ITSM");
                return mapItsmToOverview(mod, itsmData.result, lang);

              case "daily-operation":
                return mapAnalysisToOverview(mod, dailyData.result, lang);

              default:
                return mod;
            }
          }),
        );
      } catch {
        // Keep mock fallback on failure.
      }
})();

    return () => {
      cancelled = true;
    };
  }, [lang]);
      const translatedModules = useMemo(() => {
      return modules.map((module): ModuleCardData => {
        if (module.id === "itsm") {
          return {
            ...module,

            title: t.overview.itsmOverview,

            stats: module.stats.map((stat, index) => ({
              ...stat,
              label:
                [
                  t.overview.totalTicket,
                  t.overview.openTicket,
                  t.overview.closedTicket,
                  t.overview.slaCompliance,
                ][index] ?? stat.label,
            })),

            bars: {
              ...module.bars,
              title: t.overview.ticketByDepartment,
            },

            pics: {
              ...module.pics,
              title: t.overview.topPicTicket,
            },

            chart: {
              ...module.chart,
              title: t.overview.ticketTrend,
              legend: module.chart.legend.map((item, index) => ({
                ...item,
                label:
                  [
                    t.overview.open,
                    t.overview.closed,
                    t.overview.pending,
                  ][index] ?? item.label,
              })),
            },
          };
        }

        if (module.id === "daily-operation") {
          return {
            ...module,

            title: t.overview.dailyOperationOverview,

            stats: module.stats.map((stat, index) => ({
              ...stat,
              label:
                [
                  t.overview.thisMonthTasks,
                  t.overview.completed,
                  t.overview.totalUsers,
                  t.overview.avgTasks,
                ][index] ?? stat.label,
            })),

            bars: {
              ...module.bars,
              title: t.overview.taskByDepartment,
            },

            pics: {
              ...module.pics,
              title: t.overview.topPicTask,
            },

            chart: {
              ...module.chart,
              title: t.overview.taskStatus,
              legend: module.chart.legend.map((item, index) => ({
                ...item,
                label:
                  [
                    t.overview.completed,
                    t.overview.inProgress,
                    t.overview.pending,
                  ][index] ?? item.label,
              })),

              centerLabel: t.overview.done,
            },
          };
        }

        return module;
      });
    }, [modules, t]);
    const expanded = translatedModules.find((module) => module.id === expandedId,
  );

  return (
    <>
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">
          {t.overview.title}
        </h1>

        <p className="text-sm text-text-muted">
          {t.overview.subtitle}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {translatedModules.map((module) => (
          <ModuleCard
            key={module.id}
            data={module}
            onOpen={() => setExpandedId(module.id)}
          />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">
        * {t.overview.clickDetails}
      </p>

      {expanded ? (
        <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} />
      ) : null}
    </>
  );
}
