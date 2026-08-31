import type { ModuleCardData } from "@/data/overview";
import type { OrganizationOverviewMetrics } from "./types";

export function mapOrganizationToOverview(
  module: ModuleCardData,
  metrics: OrganizationOverviewMetrics
): ModuleCardData {
  return {
    ...module,
    href: "/organization/employees",
    stats: [
      { label: "Total Personel", value: String(metrics.totalPersonel), tone: "accent" },
      {
        label: "Attendance Rate",
        value: `${metrics.attendanceRate}%`,
        tone: "success",
      },
      { label: "Total Absen", value: String(metrics.absentCount), tone: "warning" },
      {
        label: "Total On leave",
        value: String(metrics.onLeaveCount),
        tone: "warning",
      },
    ],
    orgChart: metrics.orgChart,
    departmentPerformance: metrics.departmentPerformance,
  };
}
