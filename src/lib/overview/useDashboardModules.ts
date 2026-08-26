"use client";

import { useEffect, useState } from "react";
import { dashboardModules, type ModuleCardData } from "@/data/overview";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiGet } from "@/lib/apiClient";
import { getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { mapAnalysisToOverview } from "@/lib/daily-operation/mapToOverview";
import { useLang } from "@/lib/i18n";
import type { ItsmAnalysisResponse, SparepartAnalysisResponse } from "@/lib/types";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { mapItsmToOverview } from "@/lib/itsm/mapToOverview";
import { mapSparepartToOverview } from "@/lib/sparepart/mapToOverview";
import { mapSafetyToOverview, type SafetyRow } from "@/lib/safety/mapToOverview";
import { mapTrainingToOverview } from "@/lib/training/mapToOverview";
import type { TrainingOverviewMetrics } from "@/lib/training/types";
import type { AnalysisResponse, SafetyApiResponse } from "@/lib/overview/types";

export function useDashboardModules() {
  const { lang } = useLang();
  const { loading: authLoading } = useAuth();
  const {
    canViewDailyAnalysis,
    canViewItsmAnalysis,
    canViewSparepartStock,
    canViewSafetyOverview,
    canViewSafetySubmissions,
    canViewTrainingOverview,
    canViewTrainingSessions,
  } = useRoleAccess();

  const [modules, setModules] = useState<ModuleCardData[]>(dashboardModules);

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
          trainingData,
        ] =
          await Promise.all([
            canViewDailyAnalysis
              ? apiGet<AnalysisResponse>(`/analysis?start=${start}&end=${end}`, "daily")
              : Promise.resolve(null),

            canViewItsmAnalysis
              ? apiGet<ItsmAnalysisResponse>(`/analysis?start=${start}&end=${end}`, "itsm")
              : Promise.resolve(null),

            canViewSparepartStock
              ? apiGet<SparepartAnalysisResponse>(
                  `/analysis?start=${start}&end=${end}`,
                  "sparepart"
                )
              : Promise.resolve(null),

            canViewSafetyOverview || canViewSafetySubmissions
              ? fetch(
                  `/api/safety/weekly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
                  {
                    method: "GET",
                    cache: "no-store",
                  }
                )
                  .then(async (response) => {
                    const result = (await response.json()) as SafetyApiResponse;

                    if (!response.ok) {
                      throw new Error(
                        result.error ?? result.message ?? "Failed to load weekly safety data."
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
                  }
                )
                  .then(async (response) => {
                    const result = (await response.json()) as SafetyApiResponse;

                    if (!response.ok) {
                      throw new Error(
                        result.error ?? result.message ?? "Failed to load monthly safety data."
                      );
                    }

                    return result;
                  })
                  .catch(() => null)
              : Promise.resolve(null),

            canViewTrainingOverview || canViewTrainingSessions
              ? fetch(
                  `/api/training/overview?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
                  { method: "GET", cache: "no-store" }
                )
                  .then(async (response) => {
                    const result = (await response.json()) as {
                      success?: boolean;
                      data?: TrainingOverviewMetrics;
                      error?: string;
                    };
                    if (!response.ok || !result.data) {
                      throw new Error(result.error ?? "Failed to load training overview.");
                    }
                    return result.data;
                  })
                  .catch(() => null)
              : Promise.resolve(null),
          ]);

        if (cancelled) return;

        setModules((prev) =>
          prev.map((mod) => {
            switch (mod.id) {
              case "itsm":
                return itsmData ? mapItsmToOverview(mod, itsmData.result, lang) : mod;

              case "daily-operation":
                return dailyData ? mapAnalysisToOverview(mod, dailyData.result, lang) : mod;

              case "sparepart":
                return sparepartData
                  ? mapSparepartToOverview(mod, sparepartData.result, lang)
                  : mod;

              case "safety": {
                const weeklyRows: SafetyRow[] = Array.isArray(safetyWeeklyData?.data)
                  ? safetyWeeklyData.data
                  : [];

                const monthlyRows: SafetyRow[] = Array.isArray(safetyMonthlyData?.data)
                  ? safetyMonthlyData.data
                  : [];

                if (!safetyWeeklyData && !safetyMonthlyData) {
                  return mod;
                }

                return mapSafetyToOverview(weeklyRows, monthlyRows, lang === "cn" ? "cn" : "en");
              }

              case "training":
                return trainingData ? mapTrainingToOverview(mod, trainingData) : mod;

              default:
                return mod;
            }
          })
        );
      } catch {
        /* keep existing modules if a request fails */
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
    canViewTrainingOverview,
    canViewTrainingSessions,
    lang,
  ]);

  return modules;
}
