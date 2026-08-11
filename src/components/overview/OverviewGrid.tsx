"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dashboardModules,
  type ModuleCardData,
  type ModuleId,
} from "@/data/overview-mock";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiGet } from "@/lib/apiClient";
import { getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { mapAnalysisToOverview } from "@/lib/mapAnalysisToOverview";
import { getDict, useLang } from "@/lib/i18n";
import type { AnalysisResult, ItsmAnalysisResponse } from "@/lib/types";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";
import { mapItsmToOverview } from "@/lib/mapItsmToOverview";

type AnalysisResponse = { result: AnalysisResult };

export function OverviewGrid() {
  const { lang } = useLang();
  const t = getDict(lang);
  const { loading: authLoading } = useAuth();
  const { canViewDailyAnalysis, canViewItsmAnalysis } = useRoleAccess();
  const [modules, setModules] = useState<ModuleCardData[]>(dashboardModules);
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!canViewDailyAnalysis && !canViewItsmAnalysis) return;

    let cancelled = false;
    const month = getCurrentMonth();
    const start = toDateInput(month.start);
    const end = toDateInput(month.end);

    (async () => {
      try {
        const [dailyData, itsmData] = await Promise.all([
          canViewDailyAnalysis
            ? apiGet<AnalysisResponse>(
                `/analysis?start=${start}&end=${end}`,
                "daily",
              )
            : Promise.resolve(null),
          canViewItsmAnalysis
            ? apiGet<ItsmAnalysisResponse>(
                `/analysis?start=${start}&end=${end}`,
                "itsm",
              )
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setModules((prev) =>
          prev.map((mod) => {
            switch (mod.id) {
              case "itsm":
                return itsmData
                  ? mapItsmToOverview(mod, itsmData.result, lang)
                  : mod;

              case "daily-operation":
                return dailyData
                  ? mapAnalysisToOverview(mod, dailyData.result, lang)
                  : mod;

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
  }, [
    authLoading,
    canViewDailyAnalysis,
    canViewItsmAnalysis,
    lang,
  ]);

  const translatedModules = useMemo(() => {
    return modules.map((module): ModuleCardData => {
      if (module.id === "itsm") {
        return {
          ...module,
          title: t.dashboard.itsmDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.totalTicket,
                t.dashboard.openTicket,
                t.dashboard.closedTicket,
                t.itsmAnalysis.activeUsers,
              ][index] ?? stat.label,
          })),
          bars: module.bars
            ? { ...module.bars, title: t.dashboard.ticketByGroup }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.dashboard.topPicTicket }
            : undefined,
          chart: {
            ...module.chart,
            title: t.dashboard.ticketTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.dashboard.currentPeriod, t.dashboard.previousPeriod][index] ??
                item.label,
            })),
          },
        };
      }

      if (module.id === "daily-operation") {
        return {
          ...module,
          title: t.dashboard.dailyOperationDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.thisMonthTasks,
                t.dashboard.completed,
                t.dashboard.totalUsers,
                t.dashboard.avgTasks,
              ][index] ?? stat.label,
          })),
          bars: module.bars
            ? { ...module.bars, title: t.dashboard.taskByDepartment }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.dashboard.topPicTask }
            : undefined,
          chart: {
            ...module.chart,
            title: t.dashboard.taskStatus,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [
                  t.dashboard.completed,
                  t.dashboard.inProgress,
                  t.dashboard.pending,
                ][index] ?? item.label,
            })),
            centerLabel: t.dashboard.done,
          },
        };
      }

      if (module.id === "safety") {
        return {
          ...module,
          title: t.dashboard.safetyDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.todaysFinding,
                t.dashboard.openFinding,
                t.dashboard.closedFinding,
                t.dashboard.overdueFinding,
              ][index] ?? stat.label,
          })),
          trendBars: module.trendBars
            ? { ...module.trendBars, title: t.dashboard.findingTrend }
            : undefined,
          pics: module.pics
            ? { ...module.pics, title: t.dashboard.topPicClosedFinding }
            : undefined,
          chart: {
            ...module.chart,
            title: t.dashboard.findingByCategory,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [
                  t.dashboard.unsafeAction,
                  t.dashboard.unsafeCondition,
                  t.dashboard.nearMiss,
                  t.dashboard.goodPractice,
                ][index] ?? item.label,
            })),
            centerLabel: t.dashboard.findings,
          },
        };
      }

      if (module.id === "sparepart") {
        return {
          ...module,
          title: t.dashboard.sparepartDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.totalItems,
                t.dashboard.lowStock,
                t.dashboard.criticalStock,
                t.dashboard.purchaseRequest,
              ][index] ?? stat.label,
          })),
          bars: module.bars
            ? { ...module.bars, title: t.dashboard.topUsedItems }
            : undefined,
          chart: {
            ...module.chart,
            title: t.dashboard.inventoryTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.dashboard.stockIn, t.dashboard.stockOut][index] ?? item.label,
            })),
          },
          stockFlows: module.stockFlows?.map((flow, index) => ({
            ...flow,
            label:
              [
                t.dashboard.incoming,
                t.dashboard.outgoing,
                t.dashboard.adjustment,
              ][index] ?? flow.label,
          })),
        };
      }

      if (module.id === "organization") {
        return {
          ...module,
          title: t.dashboard.organizationDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.totalHeadcount,
                t.dashboard.activeHeadcount,
                t.dashboard.onLeave,
                t.dashboard.newJoin,
              ][index] ?? stat.label,
          })),
          orgTree: module.orgTree
            ? {
                root: t.dashboard.itDepartment,
                children: [
                  t.dashboard.mes,
                  t.dashboard.itInfrastructure,
                  t.dashboard.intelligentLogistics,
                ],
              }
            : undefined,
        };
      }

      if (module.id === "report") {
        return {
          ...module,
          title: t.dashboard.reportDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.weeklyReports,
                t.dashboard.monthlyReports,
                t.dashboard.completed,
                t.dashboard.pending,
              ][index] ?? stat.label,
          })),
          trendBars: module.trendBars
            ? { ...module.trendBars, title: t.dashboard.reportTrend }
            : undefined,
          chart: {
            ...module.chart,
            title: t.dashboard.reportByCategory,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [
                  t.dashboard.operational,
                  t.dashboard.incident,
                  t.dashboard.audit,
                  t.dashboard.other,
                ][index] ?? item.label,
            })),
            centerLabel: t.dashboard.reports,
          },
          progressRings: module.progressRings?.map((ring, index) => ({
            ...ring,
            label:
              [
                t.dashboard.onTime,
                t.dashboard.late,
                t.dashboard.inProgress,
                t.dashboard.notStarted,
              ][index] ?? ring.label,
          })),
        };
      }

      if (module.id === "training") {
        return {
          ...module,
          title: t.dashboard.trainingDashboard,
          stats: module.stats.map((stat, index) => ({
            ...stat,
            label:
              [
                t.dashboard.totalTraining,
                t.dashboard.participants,
                t.dashboard.completionRate,
                t.dashboard.averageScore,
              ][index] ?? stat.label,
          })),
          chart: {
            ...module.chart,
            title: t.dashboard.trainingTrend,
            legend: module.chart.legend.map((item, index) => ({
              ...item,
              label:
                [t.dashboard.sessions, t.dashboard.participants][index] ??
                item.label,
            })),
          },
          secondaryChart: module.secondaryChart
            ? {
                ...module.secondaryChart,
                title: t.dashboard.trainingByCategory,
                legend: module.secondaryChart.legend.map((item, index) => ({
                  ...item,
                  label:
                    [
                      t.dashboard.safetyCat,
                      t.dashboard.technical,
                      t.dashboard.softSkill,
                      t.dashboard.compliance,
                    ][index] ?? item.label,
                })),
                centerLabel: t.dashboard.sessions,
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
            <ModuleCard
              data={module}
              onOpen={() => setExpandedId(module.id)}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">* {t.dashboard.clickDetails}</p>

      {expanded ? (
        <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} />
      ) : null}
    </>
  );
}
