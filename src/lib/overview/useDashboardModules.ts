"use client";

import { useEffect, useState } from "react";
import { dashboardModules, type ModuleCardData } from "@/data/overview";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiGet } from "@/lib/apiClient";
import { formatDateOnly, getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { mapAnalysisToOverview } from "@/lib/daily-operation/mapToOverview";
import { useLang } from "@/lib/i18n";
import type { ItsmAnalysisResponse, SparepartAnalysisResponse } from "@/lib/types";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { mapItsmToOverview } from "@/lib/itsm/mapToOverview";
import { mapSparepartToOverview } from "@/lib/sparepart/mapToOverview";
import { mapSafetyToOverview, type SafetyRow } from "@/lib/safety/mapToOverview";
import { mapTrainingToOverview } from "@/lib/training/mapToOverview";
import { mapReportToOverview } from "@/lib/report/mapToOverview";
import { getWeekNumberForDate } from "@/lib/report/weekCalendar";
import { mapOrganizationToOverview } from "@/lib/organization/mapToOverview";
import type { OrganizationOverviewMetrics } from "@/lib/organization/types";
import type { TrainingOverviewMetrics } from "@/lib/training/types";
import type { ReportOverviewMetrics } from "@/lib/report/types";
import type { AnalysisResponse, SafetyApiResponse } from "@/lib/overview/types";

type ModuleLoadResult<T> =
  | { status: "skipped" }
  | { status: "ok"; data: T }
  | { status: "failed"; error: string };

async function loadModuleData<T>(
  enabled: boolean,
  loader: () => Promise<T>,
): Promise<ModuleLoadResult<T>> {
  if (!enabled) {
    return { status: "skipped" };
  }

  try {
    return { status: "ok", data: await loader() };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Failed to load module data.",
    };
  }
}

function withLoadFailure(
  mod: ModuleCardData,
  result: ModuleLoadResult<unknown>,
): ModuleCardData {
  if (result.status === "failed") {
    return {
      ...mod,
      loadFailed: true,
      loadError: result.error,
    };
  }

  return mod;
}

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
    canViewReportOverview,
    canViewReportLines,
    canViewOrganizationOverview,
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
          dailyResult,
          itsmResult,
          sparepartResult,
          safetyWeeklyResult,
          safetyMonthlyResult,
          trainingResult,
          reportResult,
          organizationResult,
        ] = await Promise.all([
          loadModuleData(canViewDailyAnalysis, () =>
            apiGet<AnalysisResponse>(`/analysis?start=${start}&end=${end}`, "daily"),
          ),

          loadModuleData(canViewItsmAnalysis, () =>
            apiGet<ItsmAnalysisResponse>(`/analysis?start=${start}&end=${end}`, "itsm"),
          ),

          loadModuleData(canViewSparepartStock, () =>
            apiGet<SparepartAnalysisResponse>(
              `/analysis?start=${start}&end=${end}`,
              "sparepart",
            ),
          ),

          loadModuleData(canViewSafetyOverview || canViewSafetySubmissions, async () => {
            const response = await fetch(
              `/api/safety/weekly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );
            const result = (await response.json()) as SafetyApiResponse;

            if (!response.ok) {
              throw new Error(
                result.error ?? result.message ?? "Failed to load weekly safety data.",
              );
            }

            return result;
          }),

          loadModuleData(canViewSafetyOverview || canViewSafetySubmissions, async () => {
            const response = await fetch(
              `/api/safety/monthly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );
            const result = (await response.json()) as SafetyApiResponse;

            if (!response.ok) {
              throw new Error(
                result.error ?? result.message ?? "Failed to load monthly safety data.",
              );
            }

            return result;
          }),

          loadModuleData(canViewTrainingOverview || canViewTrainingSessions, async () => {
            const now = new Date();
            const trainingStart = formatDateOnly(new Date(now.getFullYear(), 0, 1));
            const trainingEnd = formatDateOnly(now);
            const response = await fetch(
              `/api/training/overview?start=${trainingStart}&end=${trainingEnd}`,
              { method: "GET", cache: "no-store" },
            );
            const result = (await response.json()) as {
              success?: boolean;
              data?: TrainingOverviewMetrics;
              error?: string;
            };
            if (!response.ok || !result.data) {
              throw new Error(result.error ?? "Failed to load training overview.");
            }
            return result.data;
          }),

          loadModuleData(canViewReportOverview || canViewReportLines, async () => {
            const response = await fetch(
              `/api/report/overview?year=${new Date().getFullYear()}&week=${getWeekNumberForDate()}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );
            const result = (await response.json()) as {
              success?: boolean;
              data?: ReportOverviewMetrics;
              error?: string;
            };
            if (!response.ok || !result.data) {
              throw new Error(result.error ?? "Failed to load report overview.");
            }
            return result.data;
          }),

          loadModuleData(canViewOrganizationOverview, async () => {
            const response = await fetch("/api/organization/overview", {
              method: "GET",
              cache: "no-store",
            });
            const result = (await response.json()) as {
              success?: boolean;
              data?: OrganizationOverviewMetrics;
              error?: string;
            };
            if (!response.ok || !result.data) {
              throw new Error(result.error ?? "Failed to load organization overview.");
            }
            return result.data;
          }),
        ]);

        if (cancelled) return;

        setModules((prev) =>
          prev.map((mod) => {
            switch (mod.id) {
              case "itsm":
                if (itsmResult.status === "ok") {
                  return mapItsmToOverview(mod, itsmResult.data.result, lang);
                }
                return withLoadFailure(mod, itsmResult);

              case "daily-operation":
                if (dailyResult.status === "ok") {
                  return mapAnalysisToOverview(mod, dailyResult.data.result, lang);
                }
                return withLoadFailure(mod, dailyResult);

              case "sparepart":
                if (sparepartResult.status === "ok") {
                  return mapSparepartToOverview(mod, sparepartResult.data.result, lang);
                }
                return withLoadFailure(mod, sparepartResult);

              case "safety": {
                const weeklyFailed = safetyWeeklyResult.status === "failed";
                const monthlyFailed = safetyMonthlyResult.status === "failed";

                if (weeklyFailed || monthlyFailed) {
                  return withLoadFailure(mod, {
                    status: "failed",
                    error:
                      (weeklyFailed ? safetyWeeklyResult.error : undefined) ??
                      (monthlyFailed ? safetyMonthlyResult.error : undefined) ??
                      "Failed to load safety overview.",
                  });
                }

                if (
                  safetyWeeklyResult.status === "skipped" &&
                  safetyMonthlyResult.status === "skipped"
                ) {
                  return mod;
                }

                const weeklyRows: SafetyRow[] =
                  safetyWeeklyResult.status === "ok" &&
                  Array.isArray(safetyWeeklyResult.data.data)
                    ? safetyWeeklyResult.data.data
                    : [];

                const monthlyRows: SafetyRow[] =
                  safetyMonthlyResult.status === "ok" &&
                  Array.isArray(safetyMonthlyResult.data.data)
                    ? safetyMonthlyResult.data.data
                    : [];

                if (!weeklyRows.length && !monthlyRows.length) {
                  return mod;
                }

                return mapSafetyToOverview(weeklyRows, monthlyRows, lang === "cn" ? "cn" : "en");
              }

              case "training":
                if (trainingResult.status === "ok") {
                  return mapTrainingToOverview(mod, trainingResult.data);
                }
                return withLoadFailure(mod, trainingResult);

              case "report":
                if (reportResult.status === "ok") {
                  return mapReportToOverview(mod, reportResult.data, lang);
                }
                return withLoadFailure(mod, reportResult);

              case "organization":
                if (organizationResult.status === "ok") {
                  return mapOrganizationToOverview(mod, organizationResult.data);
                }
                return withLoadFailure(mod, organizationResult);

              default:
                return mod;
            }
          }),
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
    canViewReportOverview,
    canViewReportLines,
    canViewOrganizationOverview,
    lang,
  ]);

  return modules;
}
