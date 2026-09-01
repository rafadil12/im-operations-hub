import type { ModuleCardData } from "@/data/overview";
import type { Dict } from "@/lib/i18n";

function translateOrganizationDivisionName(name: string, t: Dict): string {
  switch (name) {
    case "MES":
      return t.dashboard.mes;
    case "IT":
      return t.dashboard.itDivision;
    case "Intelligent Logistics":
      return t.dashboard.intelligentLogistics;
    default:
      return name;
  }
}

/** Apply dashboard i18n labels onto a module card without changing numeric data. */
export function translateDashboardModule(module: ModuleCardData, t: Dict): ModuleCardData {
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
        ? {
            ...module.bars,
            title: t.dashboard.ticketByGroup,
          }
        : undefined,
      pics: module.pics
        ? {
            ...module.pics,
            title: t.dashboard.topPicTicket,
          }
        : undefined,
      chart: {
        ...module.chart,
        title: t.dashboard.ticketTrend,
        legend: module.chart.legend.map((item, index) => ({
          ...item,
          label: [t.dashboard.currentPeriod, t.dashboard.previousPeriod][index] ?? item.label,
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
        ? {
            ...module.bars,
            title: t.dashboard.taskByDepartment,
          }
        : undefined,
      pics: module.pics
        ? {
            ...module.pics,
            title: t.dashboard.topPicTask,
          }
        : undefined,
      chart: {
        ...module.chart,
        title: t.dashboard.taskStatus,
        legend: module.chart.legend.map((item, index) => ({
          ...item,
          label:
            [t.dashboard.completed, t.dashboard.inProgress, t.dashboard.pending][index] ??
            item.label,
        })),
        centerLabel: t.dashboard.done,
      },
    };
  }

  if (module.id === "safety") {
    return {
      ...module,
      href: "/safety",
      title: t.dashboard.safetyDashboard,
      stats: module.stats,
      trendBars: module.trendBars,
      bars: module.bars,
      pics: undefined,
      chart: module.chart,
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
            t.dashboard.zeroStock,
            t.dashboard.usageThisMonth,
            t.dashboard.usageThisYear,
          ][index] ?? stat.label,
      })),
      bars: module.bars
        ? {
            ...module.bars,
            title: t.dashboard.mostUsedItems,
          }
        : undefined,
      chart: {
        ...module.chart,
        title: t.dashboard.usedTrend,
        legend: module.chart.legend.map((item, index) => ({
          ...item,
          label: [t.dashboard.thisYear, t.dashboard.lastYear][index] ?? item.label,
        })),
      },
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
            t.dashboard.totalPersonel,
            t.dashboard.attendanceRate,
            t.dashboard.totalAbsen,
            t.dashboard.totalOnLeave,
          ][index] ?? stat.label,
      })),
      orgChart: module.orgChart
        ? {
            company: t.dashboard.intelligentManufacturingDepartment,
            leader: module.orgChart.leader,
            divisions: module.orgChart.divisions.map((division) => ({
              ...division,
              name: translateOrganizationDivisionName(division.name, t),
            })),
          }
        : undefined,
      departmentPerformance: module.departmentPerformance?.map((row) => ({
        ...row,
        department: translateOrganizationDivisionName(row.department, t),
      })),
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
            t.dashboard.achievement,
            t.dashboard.workCompletion,
            t.dashboard.projectProgress,
            t.dashboard.reportCompletion,
          ][index] ?? stat.label,
      })),
      trendBars: module.trendBars
        ? {
            ...module.trendBars,
            title: t.dashboard.workCompletionTrend,
          }
        : undefined,
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
            t.dashboard.uniqueParticipants,
            t.dashboard.totalTopics,
          ][index] ?? stat.label,
      })),
      chart: {
        ...module.chart,
        title: t.dashboard.trainingTrend,
        legend: module.chart.legend.map((item, index) => ({
          ...item,
          label: [t.dashboard.sessions, t.dashboard.participants][index] ?? item.label,
        })),
      },
      secondaryChart: module.secondaryChart
        ? {
            ...module.secondaryChart,
            title: t.dashboard.trainingByCategory,
            legend: module.secondaryChart.legend.map((item, index) => ({
              ...item,
              label:
                [t.dashboard.mesCat, t.dashboard.intelligentCat, t.dashboard.itCat][index] ??
                item.label,
            })),
            centerLabel: t.dashboard.sessions,
          }
        : undefined,
    };
  }

  return module;
}
