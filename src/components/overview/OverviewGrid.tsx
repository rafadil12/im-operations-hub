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
          bars: module.bars
            ? { ...module.bars, title: t.overview.ticketByGroup }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.overview.topPicTicket }
            : undefined,
          chart: {
            ...module.chart,
            title: t.overview.ticketTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.overview.currentPeriod, t.overview.previousPeriod][index] ??
                item.label,
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
          bars: module.bars
            ? { ...module.bars, title: t.overview.taskByDepartment }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.overview.topPicTask }
            : undefined,
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

      if (module.id === "safety") {
        return {
          ...module,
          title: t.overview.safetyOverview,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.overview.todaysFinding,
                t.overview.openFinding,
                t.overview.closedFinding,
                t.overview.overdueFinding,
              ][index] ?? stat.label,
          })),
          trendBars: module.trendBars
            ? { ...module.trendBars, title: t.overview.findingTrend }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.overview.topPicClosedFinding }
            : undefined,
          chart: {
            ...module.chart,
            title: t.overview.findingByCategory,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [
                  t.overview.unsafeAction,
                  t.overview.unsafeCondition,
                  t.overview.nearMiss,
                  t.overview.goodPractice,
                ][index] ?? item.label,
            })),
            centerLabel: t.overview.findings,
          },
        };
      }

      if (module.id === "sparepart") {
        return {
          ...module,
          title: t.overview.sparepartOverview,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.overview.totalItems,
                t.overview.lowStock,
                t.overview.criticalStock,
                t.overview.purchaseRequest,
              ][index] ?? stat.label,
          })),
          bars: module.bars
            ? { ...module.bars, title: t.overview.topUsedItems }
            : undefined,
          chart: {
            ...module.chart,
            title: t.overview.inventoryTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.overview.stockIn, t.overview.stockOut][index] ?? item.label,
            })),
          },
          stockFlows: module.stockFlows?.map((flow, index) => ({
            ...flow,
            label:
              [
                t.overview.incoming,
                t.overview.outgoing,
                t.overview.adjustment,
              ][index] ?? flow.label,
          })),
        };
      }

      if (module.id === "organization") {
        return {
          ...module,
          title: t.overview.organizationOverview,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.overview.totalHeadcount,
                t.overview.activeHeadcount,
                t.overview.onLeave,
                t.overview.newJoin,
              ][index] ?? stat.label,
          })),
          orgTree: module.orgTree
            ? {
                root: t.overview.itDepartment,
                children: [
                  t.overview.mes,
                  t.overview.itInfrastructure,
                  t.overview.intelligentLogistics,
                ],
              }
            : undefined,
        };
      }

      if (module.id === "report") {
        return {
          ...module,
          title: t.overview.reportOverview,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.overview.weeklyReports,
                t.overview.monthlyReports,
                t.overview.completed,
                t.overview.pending,
              ][index] ?? stat.label,
          })),
          trendBars: module.trendBars
            ? { ...module.trendBars, title: t.overview.reportTrend }
            : undefined,
          chart: {
            ...module.chart,
            title: t.overview.reportByCategory,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [
                  t.overview.operational,
                  t.overview.incident,
                  t.overview.audit,
                  t.overview.other,
                ][index] ?? item.label,
            })),
            centerLabel: t.overview.reports,
          },
          progressRings: module.progressRings?.map((ring, index) => ({
            ...ring,
            label:
              [
                t.overview.onTime,
                t.overview.late,
                t.overview.inProgress,
                t.overview.notStarted,
              ][index] ?? ring.label,
          })),
        };
      }

      if (module.id === "training") {
        return {
          ...module,
          title: t.overview.trainingOverview,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.overview.totalTraining,
                t.overview.participants,
                t.overview.completionRate,
                t.overview.averageScore,
              ][index] ?? stat.label,
          })),
          chart: {
            ...module.chart,
            title: t.overview.trainingTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.overview.sessions, t.overview.participants][index] ??
                item.label,
            })),
          },
          secondaryChart: module.secondaryChart
            ? {
                ...module.secondaryChart,
                title: t.overview.trainingByCategory,
                legend: module.secondaryChart.legend.map((item, index) => ({
                  ...item,
                  label:
                    [
                      t.overview.safetyCat,
                      t.overview.technical,
                      t.overview.softSkill,
                      t.overview.compliance,
                    ][index] ?? item.label,
                })),
                centerLabel: t.overview.sessions,
              }
            : undefined,
        };
      }

      return module;
    });
  }, [modules, t]);

  const expanded = translatedModules.find((module) => module.id === expandedId);

  return (
    <>
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">{t.overview.title}</h1>
        <p className="text-sm text-text-muted">{t.overview.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {translatedModules.map((module) => (
          <div
            key={module.id}
            className={module.colSpan === 2 ? "xl:col-span-2" : undefined}
          >
            <ModuleCard
              data={module}
              onOpen={() => setExpandedId(module.id)}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">* {t.overview.clickDetails}</p>

      {expanded ? (
        <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} />
      ) : null}
    </>
  );
}
