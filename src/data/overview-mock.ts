export type ModuleId = "itsm" | "daily-operation";

export type StatItem = {
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "success" | "warning" | "accent";
};

export type BarItem = {
  label: string;
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

export type ModuleCardData = {
  id: ModuleId;
  number: number;
  title: string;
  icon: "headset" | "calendar";
  accentColor: string;
  href: string;
  stats: StatItem[];
  bars: {
    title: string;
    items: BarItem[];
  };
  pics: {
    title: string;
    items: PicItem[];
  };
  chart: {
    title: string;
    type: "trend" | "donut";
    legend: { label: string; color: string }[];
  };
};

export const overviewModules: ModuleCardData[] = [
  {
    id: "itsm",
    number: 1,
    title: "ITSM OVERVIEW",
    icon: "headset",
    accentColor: "#3b82f6",
    href: "/itsm",
    stats: [
      { label: "Total Ticket", value: "291", trend: "+12%", tone: "success" },
      { label: "Open Ticket", value: "78", trend: "+5%", tone: "warning" },
      { label: "Closed Ticket", value: "213", trend: "+8%", tone: "success" },
      { label: "SLA Compliance", value: "98.6%", trend: "+0.4%", tone: "success" },
    ],
    bars: {
      title: "Ticket by Department (This Month)",
      items: [
        { label: "MES", value: 112, max: 120, color: "#3b82f6" },
        { label: "IT", value: 86, max: 120, color: "#60a5fa" },
        { label: "Intelligent Logistic", value: 93, max: 120, color: "#93c5fd" },
      ],
    },
    pics: {
      title: "Top PIC (by Most Ticket)",
      items: [
        { name: "Andi Pratama", role: "MES Support", count: 42, initials: "AP" },
        { name: "Siti Rahma", role: "IT Helpdesk", count: 38, initials: "SR" },
        { name: "Budi Santoso", role: "Logistics IT", count: 31, initials: "BS" },
        { name: "Dewi Lestari", role: "Network Ops", count: 27, initials: "DL" },
      ],
    },
    chart: {
      title: "Ticket Trend (Last 7 Days)",
      type: "trend",
      legend: [
        { label: "Open", color: "#3b82f6" },
        { label: "Closed", color: "#22c55e" },
        { label: "Pending", color: "#f59e0b" },
      ],
    },
  },
  {
    id: "daily-operation",
    number: 2,
    title: "DAILY OPERATION OVERVIEW",
    icon: "calendar",
    accentColor: "#22c55e",
    href: "/daily-operation",
    stats: [
      { label: "Today's Tasks", value: "125", tone: "accent" },
      { label: "Completed", value: "98", trend: "78.4%", tone: "success" },
      { label: "In Progress", value: "21", trend: "16.8%", tone: "accent" },
      { label: "Pending", value: "6", trend: "4.8%", tone: "warning" },
    ],
    bars: {
      title: "Task by Department (Today)",
      items: [
        { label: "MES", value: 48, max: 50, color: "#22c55e" },
        { label: "IT", value: 41, max: 50, color: "#4ade80" },
        { label: "Intelligent Logistic", value: 36, max: 50, color: "#86efac" },
      ],
    },
    pics: {
      title: "Top PIC (by Most Task)",
      items: [
        { name: "Rina Wijaya", role: "Shift Lead", count: 18, initials: "RW" },
        { name: "Agus Firmansyah", role: "MES Ops", count: 15, initials: "AF" },
        { name: "Maya Putri", role: "IT Ops", count: 14, initials: "MP" },
        { name: "Hendra Gunawan", role: "Logistics", count: 12, initials: "HG" },
      ],
    },
    chart: {
      title: "Task Status (Today)",
      type: "donut",
      legend: [
        { label: "Completed", color: "#22c55e" },
        { label: "In Progress", color: "#3b82f6" },
        { label: "Pending", color: "#f59e0b" },
      ],
    },
  },
];
