/**
 * Dashboard module card types + shell definitions.
 *
 * Live modules (itsm, daily-operation, safety, sparepart, training) use empty
 * skeletons that are overwritten by API data in `useDashboardModules`.
 * Coming-soon modules (organization) keep placeholder UI until live.
 */

import type { ReportTrendRow, ReportPeriodStatus } from "@/lib/report/types";
import type { TrainingOverviewMetrics } from "@/lib/training/types";

export type ModuleId =
  | "itsm"
  | "daily-operation"
  | "safety"
  | "sparepart"
  | "organization"
  | "report"
  | "training";

export type ModuleLayout =
  | "default"
  | "safety"
  | "sparepart"
  | "organization"
  | "report"
  | "training";

export type StatItem = {
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "success" | "warning" | "accent";
};

export type BarItem = {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  color: string;
};

export type PicItem = {
  name: string;
  role: string;
  count: number;
  initials: string;
};

export type ProgressRing = {
  label: string;
  value: number;
  color: string;
};

export type TrainingRow = {
  name: string;
  date: string;
  participants: number;
  completion: string;
  avgScore: string;
};

export type ModuleCardData = {
  id: ModuleId;
  number: number;
  title: string;
  icon: "headset" | "calendar" | "shield" | "sparepart" | "organization" | "report" | "training";
  accentColor: string;
  href: string;
  layout: ModuleLayout;
  /** Grid column span on xl screens (Report = 3 / full width). */
  colSpan?: 1 | 2 | 3;
  stats: StatItem[];
  bars?: {
    title: string;
    items: BarItem[];
  };
  pics?: {
    title: string;
    items: PicItem[];
  };
  /** Optional vertical bar trend (Safety / Report). */
  trendBars?: {
    title: string;
    items: BarItem[];
  };
  chart: {
    title: string;
    type: "trend" | "donut";
    legend: { label: string; color: string }[];
    segments?: number[];
    centerValue?: string;
    centerLabel?: string;
    series?: { date: string; current: number; previous: number }[];
  };
  /** Second chart (e.g. Training category donut beside trend). */
  secondaryChart?: {
    title: string;
    type: "donut";
    legend: { label: string; color: string }[];
    segments?: number[];
    centerValue?: string;
    centerLabel?: string;
  };
  /** Sparepart stock movement widgets. */
  stockFlows?: StatItem[];
  /** Organization hierarchy chart. */
  orgChart?: {
    company: string;
    leader: string;
    divisions: {
      name: string;
      personnelCount: number;
    }[];
  };
  /** Monthly department attendance breakdown. */
  departmentPerformance?: {
    department: string;
    employees: number;
    present: number;
    leave: number;
    mc: number;
    upl: number;
    absent: number;
    attendanceRate: number;
  }[];
  /** Report circular status indicators. */
  progressRings?: ProgressRing[];
  /** Report weekly trend for home dashboard line chart. */
  reportWeeklyTrend?: ReportTrendRow[];
  /** Report current month summary for home dashboard card. */
  reportCurrentMonth?: {
    monthLabel: string;
    status: ReportPeriodStatus;
    achievement: number;
    submittedCount: number;
    draftCount: number;
    areaCount: number;
    totalLines: number;
    byArea: ProgressRing[];
  };
  /** Training recent table. */
  recentRows?: TrainingRow[];
  /** Training division breakdown for expand-mode Recharts donut. */
  trainingByDivision?: TrainingOverviewMetrics["byDivision"];
};

const EMPTY = "â";

export const dashboardModules: ModuleCardData[] = [
  {
    id: "itsm",
    number: 1,
    title: "ITSM DASHBOARD",
    icon: "headset",
    accentColor: "#3b82f6",
    href: "/itsm",
    layout: "default",
    stats: [
      { label: "Total Ticket", value: EMPTY, tone: "success" },
      { label: "Open Ticket", value: EMPTY, tone: "warning" },
      { label: "Closed Ticket", value: EMPTY, tone: "success" },
      { label: "SLA Compliance", value: EMPTY, tone: "success" },
    ],
    bars: {
      title: "Ticket by Group",
      items: [],
    },
    pics: {
      title: "Top PIC (by Most Ticket)",
      items: [],
    },
    chart: {
      title: "Ticket Trend",
      type: "trend",
      legend: [
        { label: "Current Period", color: "#25ebb3" },
        { label: "Previous Period", color: "#C9D1DB" },
      ],
      series: [],
    },
  },
  {
    id: "daily-operation",
    number: 2,
    title: "DAILY OPERATION DASHBOARD",
    icon: "calendar",
    accentColor: "#22c55e",
    href: "/daily-operation/insights",
    layout: "default",
    stats: [
      { label: "Total Task", value: EMPTY, tone: "accent" },
      { label: "Completed", value: EMPTY, tone: "success" },
      { label: "Total Users", value: EMPTY, tone: "accent" },
      { label: "Avg. Tasks", value: EMPTY, tone: "warning" },
    ],
    bars: {
      title: "Task by Department (This Month)",
      items: [],
    },
    pics: {
      title: "Top PIC (by Most Task)",
      items: [],
    },
    chart: {
      title: "Task Status (This Month)",
      type: "donut",
      legend: [
        { label: "Completed", color: "#22c55e" },
        { label: "In Progress", color: "#3b82f6" },
        { label: "Pending", color: "#f59e0b" },
      ],
    },
  },
  {
    id: "safety",
    number: 3,
    title: "SECURITY (SAFETY) DASHBOARD",
    icon: "shield",
    accentColor: "#ef4444",
    href: "/safety",
    layout: "safety",
    stats: [
      { label: "Today's Finding", value: EMPTY, tone: "warning" },
      { label: "Open Finding", value: EMPTY, tone: "warning" },
      { label: "Closed Finding", value: EMPTY, tone: "success" },
      { label: "Avg. Finding", value: EMPTY, tone: "warning" },
    ],
    trendBars: {
      title: "Finding Trend (Last 7 Days)",
      items: [],
    },
    pics: {
      title: "Top PIC (by Closed Finding)",
      items: [],
    },
    chart: {
      title: "Finding by Category (This Month)",
      type: "donut",
      legend: [
        { label: "Unsafe Action", color: "#22c55e" },
        { label: "Unsafe Condition", color: "#3b82f6" },
        { label: "Near Miss", color: "#f97316" },
        { label: "Good Practice", color: "#eab308" },
      ],
      segments: [],
      centerValue: EMPTY,
      centerLabel: "Findings",
    },
  },
  {
    id: "sparepart",
    number: 4,
    title: "SPAREPART DASHBOARD",
    icon: "sparepart",
    accentColor: "#a855f7",
    href: "/sparepart",
    layout: "sparepart",
    stats: [
      { label: "Total Items", value: EMPTY, tone: "accent" },
      { label: "Zero Stock", value: EMPTY, tone: "warning" },
      { label: "Usage This Month", value: EMPTY, tone: "accent" },
      { label: "Usage This Year", value: EMPTY, tone: "accent" },
    ],
    bars: {
      title: "Most Used Items (This Month)",
      items: [],
    },
    chart: {
      title: "Used Trend",
      type: "trend",
      legend: [
        { label: "This Year", color: "#25ebb3" },
        { label: "Last Year", color: "#C9D1DB" },
      ],
      series: [],
    },
  },
  {
    id: "organization",
    number: 5,
    title: "ORGANIZATION DASHBOARD",
    icon: "organization",
    accentColor: "#38bdf8",
    href: "/organization/employees",
    layout: "organization",
    stats: [
      { label: "Total Personel", value: EMPTY, tone: "accent" },
      { label: "Attendance Rate", value: EMPTY, tone: "success" },
      { label: "Total Absen", value: EMPTY, tone: "warning" },
      { label: "Total On leave", value: EMPTY, tone: "warning" },
    ],
    chart: {
      title: "Headcount",
      type: "donut",
      legend: [],
    },
    orgChart: {
      company: "Intelligent Manufacturing Department",
      leader: "WANG CHUNLAI",
      divisions: [
        { name: "MES", personnelCount: 0 },
        { name: "IT", personnelCount: 0 },
        { name: "Intelligent Logistics", personnelCount: 0 },
      ],
    },
  },
  {
    id: "training",
    number: 6,
    title: "TRAINING DASHBOARD",
    icon: "training",
    accentColor: "#6366f1",
    href: "/training",
    layout: "training",
    stats: [
      { label: "Total Training", value: "—", tone: "accent" },
      { label: "Participants", value: "—", tone: "accent" },
      { label: "Unique Participants", value: "—", tone: "success" },
      { label: "Total Topics", value: "—", tone: "accent" },
    ],
    chart: {
      title: "Training Trend",
      type: "trend",
      legend: [
        { label: "Sessions", color: "#6366f1" },
        { label: "Participants", color: "#22c55e" },
      ],
      series: [],
    },
    secondaryChart: {
      title: "Training by Divisions",
      type: "donut",
      legend: [
        { label: "MES", color: "#6366f1" },
        { label: "Intelligent", color: "#22c55e" },
        { label: "IT", color: "#38bdf8" },
      ],
      segments: [0, 0, 0],
      centerValue: "0",
      centerLabel: "Sessions",
    },
    recentRows: [],
  },
  {
    id: "report",
    number: 7,
    title: "REPORT DASHBOARD",
    icon: "report",
    accentColor: "#eab308",
    href: "/report",
    layout: "report",
    colSpan: 3,
    stats: [
      { label: "Achievement", value: EMPTY, tone: "success" },
      { label: "Work Completion", value: EMPTY, tone: "accent" },
      { label: "Project Progress", value: EMPTY, tone: "warning" },
      { label: "Report Completion", value: EMPTY, tone: "success" },
    ],
    trendBars: {
      title: "Work Completion Trend",
      items: [],
    },
    chart: {
      title: "By category",
      type: "donut",
      legend: [],
      segments: [],
      centerValue: EMPTY,
      centerLabel: "Lines",
    },
    progressRings: [],
    reportWeeklyTrend: [],
  },
];
