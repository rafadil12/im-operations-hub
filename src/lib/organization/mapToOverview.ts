import type { ModuleCardData } from "@/data/overview";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import type { OrganizationOverviewMetrics } from "./types";

export function mapOrganizationToOverview(
  module: ModuleCardData,
  metrics: OrganizationOverviewMetrics,
  lang: Lang = "en"
): ModuleCardData {
  const t = getDict(lang);
  return {
    ...module,
    href: "/organization/employees",
    stats: [
      { label: t.dashboard.totalPersonel, value: String(metrics.totalPersonel), tone: "accent" },
      {
        label: t.dashboard.attendanceRate,
        value: `${metrics.attendanceRate}%`,
        tone: "success",
      },
      { label: t.dashboard.totalAbsen, value: String(metrics.absentCount), tone: "warning" },
      {
        label: t.dashboard.totalOnLeave,
        value: String(metrics.onLeaveCount),
        tone: "warning",
      },
    ],
    orgChart: metrics.orgChart,
    departmentPerformance: metrics.departmentPerformance,
  };
}
