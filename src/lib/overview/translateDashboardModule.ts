import type { ModuleCardData } from "@/data/overview";
import type { Dict } from "@/lib/i18n";

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
        ? {
            ...module.trendBars,
            title: t.dashboard.reportTrend,
          }
        : undefined,
      chart: {
        ...module.chart,
        title: t.dashboard.reportByCategory,
        legend: module.chart.legend.map((item, index) => ({
          ...item,
          label:
            [t.dashboard.operational, t.dashboard.incident, t.dashboard.audit, t.dashboard.other][
              index
            ] ?? item.label,
        })),
        centerLabel: t.dashboard.reports,
      },
      progressRings: module.progressRings?.map((ring, index) => ({
        ...ring,
        label:
          [t.dashboard.onTime, t.dashboard.late, t.dashboard.inProgress, t.dashboard.notStarted][
            index
          ] ?? ring.label,
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
