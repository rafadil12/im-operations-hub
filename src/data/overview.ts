/**
 * Dashboard module card types + shell definitions.
 *
 * Live modules (itsm, daily-operation, safety, sparepart) use empty skeletons
 * that are overwritten by API data in `useDashboardModules`.
 * Coming-soon modules (organization, report, training) keep placeholder UI until live.
 */

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
  /** Grid column span on xl screens (Training = 3 / full width). */
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
  /** Organization tree. */
  orgTree?: {
    root: string;
    children: string[];
  };
  genderStats?: {
    male: number;
    female: number;
  };
  /** Report circular status indicators. */
  progressRings?: ProgressRing[];
  /** Training recent table. */
  recentRows?: TrainingRow[];
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
    href: "/",
    layout: "organization",
    stats: [
      { label: "Total Headcount", value: "48", tone: "accent" },
      { label: "Active", value: "45", tone: "success" },
      { label: "On Leave", value: "2", tone: "warning" },
      { label: "New Join", value: "3", trend: "this month", tone: "success" },
    ],
    chart: {
      title: "Headcount",
      type: "donut",
      legend: [],
    },
    orgTree: {
      root: "IT Department",
      children: ["MES", "IT Infrastructure", "Intelligent Logistics"],
    },
    genderStats: {
      male: 62,
      female: 38,
    },
  },
  {
    id: "report",
    number: 6,
    title: "REPORT DASHBOARD",
    icon: "report",
    accentColor: "#eab308",
    href: "/",
    layout: "report",
    stats: [
      { label: "Weekly Reports", value: "24", tone: "accent" },
      { label: "Monthly Reports", value: "8", tone: "accent" },
      { label: "Completed", value: "19", trend: "79%", tone: "success" },
      { label: "Pending", value: "5", tone: "warning" },
    ],
    trendBars: {
      title: "Report Trend",
      items: [
        { label: "W1", value: 6, max: 12, color: "#eab308" },
        { label: "W2", value: 8, max: 12, color: "#eab308" },
        { label: "W3", value: 5, max: 12, color: "#eab308" },
        { label: "W4", value: 10, max: 12, color: "#eab308" },
        { label: "W5", value: 7, max: 12, color: "#eab308" },
        { label: "W6", value: 9, max: 12, color: "#eab308" },
      ],
    },
    chart: {
      title: "Report by Category",
      type: "donut",
      legend: [],
      segments: [40, 25, 20, 15],
      centerValue: "32",
      centerLabel: "Reports",
    },
    progressRings: [
      { label: "On Time", value: 72, color: "#22c55e" },
      { label: "Late", value: 18, color: "#ef4444" },
      { label: "In Progress", value: 45, color: "#3b82f6" },
      { label: "Not Started", value: 12, color: "#94a3b8" },
    ],
  },
  {
    id: "training",
    number: 7,
    title: "TRAINING DASHBOARD",
    icon: "training",
    accentColor: "#6366f1",
    href: "/",
    layout: "training",
    colSpan: 3,
    stats: [
      { label: "Total Training", value: "18", tone: "accent" },
      { label: "Participants", value: "246", tone: "accent" },
      { label: "Completion Rate", value: "86%", trend: "+4%", tone: "success" },
      { label: "Average Score", value: "88.2", tone: "success" },
    ],
    chart: {
      title: "Training Trend",
      type: "trend",
      legend: [
        { label: "Sessions", color: "#6366f1" },
        { label: "Participants", color: "#22c55e" },
      ],
      series: [
        { date: "2026-07-01", current: 3, previous: 42 },
        { date: "2026-07-08", current: 4, previous: 55 },
        { date: "2026-07-15", current: 2, previous: 38 },
        { date: "2026-07-22", current: 5, previous: 61 },
        { date: "2026-07-29", current: 3, previous: 48 },
        { date: "2026-08-05", current: 4, previous: 52 },
      ],
    },
    secondaryChart: {
      title: "Training by Category",
      type: "donut",
      legend: [
        { label: "Safety", color: "#ef4444" },
        { label: "Technical", color: "#6366f1" },
        { label: "Soft Skill", color: "#22c55e" },
        { label: "Compliance", color: "#eab308" },
      ],
      segments: [30, 35, 20, 15],
      centerValue: "18",
      centerLabel: "Sessions",
    },
    recentRows: [
      {
        name: "ISO 27001 Awareness",
        date: "2026-08-01",
        participants: 32,
        completion: "94%",
        avgScore: "91",
      },
      {
        name: "MES Operator Basic",
        date: "2026-07-28",
        participants: 28,
        completion: "88%",
        avgScore: "85",
      },
      {
        name: "Network Troubleshooting",
        date: "2026-07-22",
        participants: 18,
        completion: "100%",
        avgScore: "92",
      },
      {
        name: "Workplace Safety Refresh",
        date: "2026-07-15",
        participants: 40,
        completion: "82%",
        avgScore: "87",
      },
    ],
  },
];
