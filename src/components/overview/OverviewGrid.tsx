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
import type {
  AnalysisResult,
  ItsmAnalysisResponse,
  SparepartAnalysisResponse,
} from "@/lib/types";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";
import { mapItsmToOverview } from "@/lib/mapItsmToOverview";
import { mapSparepartToOverview } from "@/lib/mapSparepartToOverview";
import {
  mapSafetyToOverview,
  type SafetyRow,
} from "@/lib/mapSafetyToOverview";

type AnalysisResponse = {
  result: AnalysisResult;
};

type SafetyApiResponse = {
  success?: boolean;
  data?: SafetyRow[];
  message?: string;
};

export function OverviewGrid() {
  const { lang } = useLang();
  const t = getDict(lang);

  const { loading: authLoading } = useAuth();

  const {
    canViewDailyAnalysis,
    canViewItsmAnalysis,
    canViewSparepartStock,
    canViewSafetyOverview,
    canViewSafetySubmissions,
  } = useRoleAccess();

  const [modules, setModules] =
    useState<ModuleCardData[]>(dashboardModules);

  const [expandedId, setExpandedId] =
    useState<ModuleId | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const month = getCurrentMonth();
    const start = toDateInput(month.start);
    const end = toDateInput(month.end);

    (async () => {
      try {
        const [
          dailyData,
          itsmData,
          sparepartData,
          safetyWeeklyData,
          safetyMonthlyData,
        ] = await Promise.all([
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

          canViewSparepartStock
            ? apiGet<SparepartAnalysisResponse>(
                `/analysis?start=${start}&end=${end}`,
                "sparepart",
              )
            : Promise.resolve(null),

          canViewSafetyOverview || canViewSafetySubmissions
            ? fetch(
            `/api/safety/weekly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
            {
              method: "GET",
              cache: "no-store",
            },
          )
            .then(async (response) => {
              const result =
                (await response.json()) as SafetyApiResponse;

              if (!response.ok || !result.success) {
                throw new Error(
                  result.message ||
                    "Failed to load weekly safety data.",
                );
              }

              return result;
            })
            .catch(() => null)
            : Promise.resolve(null),

          canViewSafetyOverview || canViewSafetySubmissions
            ? fetch(
            `/api/safety/monthly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
            {
              method: "GET",
              cache: "no-store",
            },
          )
            .then(async (response) => {
              const result =
                (await response.json()) as SafetyApiResponse;

              if (!response.ok || !result.success) {
                throw new Error(
                  result.message ||
                    "Failed to load monthly safety data.",
                );
              }

              return result;
            })
            .catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setModules((prev) =>
          prev.map((mod) => {
            switch (mod.id) {
              case "itsm":
                return itsmData
                  ? mapItsmToOverview(
                      mod,
                      itsmData.result,
                      lang,
                    )
                  : mod;

              case "daily-operation":
                return dailyData
                  ? mapAnalysisToOverview(
                      mod,
                      dailyData.result,
                      lang,
                    )
                  : mod;

              case "sparepart":
                return sparepartData
                  ? mapSparepartToOverview(
                      mod,
                      sparepartData.result,
                      lang,
                    )
                  : mod;

              /*
               * =====================================================
               * SAFETY
               * =====================================================
               *
               * Safety tidak lagi menggunakan:
               *
               *   mod.stats
               *   mod.trendBars
               *   mod.chart
               *   calculateSafetyOverview()
               *
               * Semua data Safety dibuat oleh:
               *
               *   mapSafetyToOverview()
               *
               * sehingga Safety tidak lagi bergantung pada
               * Safety mock di overview-mock.ts.
               */
              case "safety": {
                const weeklyRows: SafetyRow[] =
                  Array.isArray(
                    safetyWeeklyData?.data,
                  )
                    ? safetyWeeklyData.data
                    : [];

                const monthlyRows: SafetyRow[] =
                  Array.isArray(
                    safetyMonthlyData?.data,
                  )
                    ? safetyMonthlyData.data
                    : [];

                /*
                 * Jika kedua API gagal, pertahankan module
                 * sebelumnya agar dashboard tidak rusak.
                 */
                if (
                  !safetyWeeklyData &&
                  !safetyMonthlyData
                ) {
                  return mod;
                }

                return mapSafetyToOverview(
                  weeklyRows,
                  monthlyRows,
                  lang === "cn" ? "cn" : "en",
                );
              }

              default:
                return mod;
            }
          }),
        );
      } catch {
        /*
         * Jangan mengganggu modul lain apabila salah satu
         * request mengalami error.
         */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canViewDailyAnalysis,
    canViewItsmAnalysis,
    canViewSafetyOverview,
    canViewSafetySubmissions,
    canViewSparepartStock,
    lang,
  ]);

  const translatedModules = useMemo(() => {
    return modules.map(
      (module): ModuleCardData => {
        /*
         * =====================================================
         * ITSM
         * =====================================================
         */
        if (module.id === "itsm") {
          return {
            ...module,

            title:
              t.dashboard.itsmDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.totalTicket,
                    t.dashboard.openTicket,
                    t.dashboard.closedTicket,
                    t.itsmAnalysis.activeUsers,
                  ][index] ??
                  stat.label,
              }),
            ),

            bars: module.bars
              ? {
                  ...module.bars,
                  title:
                    t.dashboard.ticketByGroup,
                }
              : undefined,

            pics: module.pics
              ? {
                  ...module.pics,
                  title:
                    t.dashboard.topPicTicket,
                }
              : undefined,

            chart: {
              ...module.chart,

              title:
                t.dashboard.ticketTrend,

              legend:
                module.chart.legend.map(
                  (item, index) => ({
                    ...item,

                    label:
                      [
                        t.dashboard.currentPeriod,
                        t.dashboard.previousPeriod,
                      ][index] ??
                      item.label,
                  }),
                ),
            },
          };
        }

        /*
         * =====================================================
         * DAILY OPERATION
         * =====================================================
         */
        if (
          module.id ===
          "daily-operation"
        ) {
          return {
            ...module,

            title:
              t.dashboard
                .dailyOperationDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.thisMonthTasks,
                    t.dashboard.completed,
                    t.dashboard.totalUsers,
                    t.dashboard.avgTasks,
                  ][index] ??
                  stat.label,
              }),
            ),

            bars: module.bars
              ? {
                  ...module.bars,
                  title:
                    t.dashboard.taskByDepartment,
                }
              : undefined,

            pics: module.pics
              ? {
                  ...module.pics,
                  title:
                    t.dashboard.topPicTask,
                }
              : undefined,

            chart: {
              ...module.chart,

              title:
                t.dashboard.taskStatus,

              legend:
                module.chart.legend.map(
                  (item, index) => ({
                    ...item,

                    label:
                      [
                        t.dashboard.completed,
                        t.dashboard.inProgress,
                        t.dashboard.pending,
                      ][index] ??
                      item.label,
                  }),
                ),

              centerLabel:
                t.dashboard.done,
            },
          };
        }

        /*
         * =====================================================
         * SAFETY
         * =====================================================
         *
         * Data sudah dibuat sepenuhnya oleh
         * mapSafetyToOverview().
         *
         * Di sini hanya menerjemahkan judul utama.
         *
         * Tidak mengambil PIC mock.
         */
        if (module.id === "safety") {
          return {
            ...module,

            href: "/safety",

            title:
              t.dashboard.safetyDashboard,

            stats: module.stats,

            trendBars:
              module.trendBars,

            bars: module.bars,

            pics: undefined,

            chart: module.chart,
          };
        }

        /*
         * =====================================================
         * SPAREPART
         * =====================================================
         */
        if (
          module.id === "sparepart"
        ) {
          return {
            ...module,

            title:
              t.dashboard
                .sparepartDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.totalItems,
                    t.dashboard.zeroStock,
                    t.dashboard.usageThisMonth,
                    t.dashboard.usageThisYear,
                  ][index] ??
                  stat.label,
              }),
            ),

            bars: module.bars
              ? {
                  ...module.bars,
                  title:
                    t.dashboard
                      .mostUsedItems,
                }
              : undefined,

            chart: {
              ...module.chart,

              title:
                t.dashboard.usedTrend,

              legend:
                module.chart.legend.map(
                  (item, index) => ({
                    ...item,

                    label:
                      [
                        t.dashboard.thisYear,
                        t.dashboard.lastYear,
                      ][index] ??
                      item.label,
                  }),
                ),
            },
          };
        }

        /*
         * =====================================================
         * ORGANIZATION
         * =====================================================
         */
        if (
          module.id ===
          "organization"
        ) {
          return {
            ...module,

            title:
              t.dashboard
                .organizationDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.totalHeadcount,
                    t.dashboard.activeHeadcount,
                    t.dashboard.onLeave,
                    t.dashboard.newJoin,
                  ][index] ??
                  stat.label,
              }),
            ),

            orgTree: module.orgTree
              ? {
                  root:
                    t.dashboard.itDepartment,

                  children: [
                    t.dashboard.mes,
                    t.dashboard
                      .itInfrastructure,
                    t.dashboard
                      .intelligentLogistics,
                  ],
                }
              : undefined,
          };
        }

        /*
         * =====================================================
         * REPORT
         * =====================================================
         */
        if (
          module.id === "report"
        ) {
          return {
            ...module,

            title:
              t.dashboard
                .reportDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.weeklyReports,
                    t.dashboard.monthlyReports,
                    t.dashboard.completed,
                    t.dashboard.pending,
                  ][index] ??
                  stat.label,
              }),
            ),

            trendBars:
              module.trendBars
                ? {
                    ...module.trendBars,
                    title:
                      t.dashboard
                        .reportTrend,
                  }
                : undefined,

            chart: {
              ...module.chart,

              title:
                t.dashboard
                  .reportByCategory,

              legend:
                module.chart.legend.map(
                  (item, index) => ({
                    ...item,

                    label:
                      [
                        t.dashboard.operational,
                        t.dashboard.incident,
                        t.dashboard.audit,
                        t.dashboard.other,
                      ][index] ??
                      item.label,
                  }),
                ),

              centerLabel:
                t.dashboard.reports,
            },

            progressRings:
              module.progressRings?.map(
                (ring, index) => ({
                  ...ring,

                  label:
                    [
                      t.dashboard.onTime,
                      t.dashboard.late,
                      t.dashboard.inProgress,
                      t.dashboard.notStarted,
                    ][index] ??
                    ring.label,
                }),
              ),
          };
        }

        /*
         * =====================================================
         * TRAINING
         * =====================================================
         */
        if (
          module.id === "training"
        ) {
          return {
            ...module,

            title:
              t.dashboard
                .trainingDashboard,

            stats: module.stats.map(
              (stat, index) => ({
                ...stat,

                label:
                  [
                    t.dashboard.totalTraining,
                    t.dashboard.participants,
                    t.dashboard.completionRate,
                    t.dashboard.averageScore,
                  ][index] ??
                  stat.label,
              }),
            ),

            chart: {
              ...module.chart,

              title:
                t.dashboard.trainingTrend,

              legend:
                module.chart.legend.map(
                  (item, index) => ({
                    ...item,

                    label:
                      [
                        t.dashboard.sessions,
                        t.dashboard.participants,
                      ][index] ??
                      item.label,
                  }),
                ),
            },

            secondaryChart:
              module.secondaryChart
                ? {
                    ...module.secondaryChart,

                    title:
                      t.dashboard
                        .trainingByCategory,

                    legend:
                      module.secondaryChart.legend.map(
                        (item, index) => ({
                          ...item,

                          label:
                            [
                              t.dashboard.safetyCat,
                              t.dashboard.technical,
                              t.dashboard.softSkill,
                              t.dashboard.compliance,
                            ][index] ??
                            item.label,
                        }),
                      ),

                    centerLabel:
                      t.dashboard.sessions,
                  }
                : undefined,
          };
        }

        /*
         * =====================================================
         * DEFAULT
         * =====================================================
         */
        return module;
      },
    );
  }, [modules, t]);

  const expanded =
    translatedModules.find(
      (module) =>
        module.id === expandedId,
    );

  return (
    <>
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">
          {t.dashboard.title}
        </h1>

        <p className="text-sm text-text-muted">
          {t.dashboard.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {translatedModules.map(
          (module) => (
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
                onOpen={() =>
                  setExpandedId(
                    module.id,
                  )
                }
              />
            </div>
          ),
        )}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">
        * {t.dashboard.clickDetails}
      </p>

      {expanded ? (
        <CardExpandModal
          data={expanded}
          onClose={() =>
            setExpandedId(null)
          }
        />
      ) : null}
    </>
  );
}