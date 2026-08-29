import type { NavIconId } from "@/components/layout/NavIcons";
import type { Dict } from "@/lib/i18n";

export type NavLabelKey = keyof Dict["nav"];

export type NavChild = {
  id: string;
  labelKey: NavLabelKey;
  label?: [string, string];
  href?: string;
  disabled?: boolean;
  children?: NavChild[];
};

export type NavItem = {
  id: string;
  labelKey: NavLabelKey;
  href?: string;
  icon: NavIconId;
  disabled?: boolean;
  children?: NavChild[];
};

const comingSoonChildren: NavChild[] = [
  { id: "management", labelKey: "moduleManagement", disabled: true },
  { id: "analysis", labelKey: "moduleAnalysis", disabled: true },
  { id: "master-data", labelKey: "masterData", disabled: true },
];

export const navItems: NavItem[] = [
  { id: "dashboard", labelKey: "dashboard", href: "/", icon: "dashboard" },
  {
    id: "itsm",
    labelKey: "itsm",
    icon: "itsm",
    children: [
      { id: "overview", labelKey: "overview", href: "/itsm" },
      { id: "management", labelKey: "moduleManagement", href: "/itsm/management" },
      { id: "analysis", labelKey: "moduleAnalysis", href: "/itsm/analysis" },
    ],
  },
  {
    id: "daily-operation",
    labelKey: "dailyOperation",
    icon: "daily-operation",
    children: [
      {
        id: "activities",
        labelKey: "management",
        href: "/daily-operation/activities",
      },
      {
        id: "insights",
        labelKey: "analysis",
        href: "/daily-operation/insights",
      },
      {
        id: "configuration",
        labelKey: "master",
        href: "/daily-operation/configuration/users",
      },
    ],
  },
  {
    id: "safety",
    labelKey: "safety",
    icon: "safety",
    children: [
      {
        id: "overview",
        labelKey: "overview",
        href: "/safety",
      },
      {
        id: "management",
        labelKey: "moduleManagement",
        href: "/safety/management",
      },
    ],
  },
  {
    id: "sparepart",
    labelKey: "sparepart",
    icon: "sparepart",
    children: [
      { id: "overview", labelKey: "overview", href: "/sparepart" },
      {
        id: "management",
        labelKey: "sparepartManagement",
        children: [
          {
            id: "stock",
            labelKey: "sparepartStock",
            href: "/sparepart/stock",
          },
          {
            id: "post",
            labelKey: "sparepartPost",
            href: "/sparepart/post",
          },
          {
            id: "documents",
            labelKey: "sparepartDocuments",
            href: "/sparepart/documents",
          },
          {
            id: "materials",
            labelKey: "sparepartMaterials",
            href: "/sparepart/materials",
          },
          {
            id: "locations",
            labelKey: "sparepartLocations",
            href: "/sparepart/locations",
          },
        ],
      },
    ],
  },
  {
    id: "organization",
    labelKey: "organization",
    icon: "organization",
    children: [
      {
        id: "overview",
        labelKey: "overview",
        label: ["Summary", "汇总"],
        href: "/organization/overview",
      },
      {
        id: "employees",
        labelKey: "moduleManagement",
        href: "/organization/employees",
      },
      {
        id: "shift",
        labelKey: "shift",
        href: "/organization/shift",
      },
      {
        id: "attendance",
        labelKey: "moduleManagement",
        label: ["Attendance", "考勤管理"],
        children: [
          {
            id: "overview",
            labelKey: "overview",
            href: "/organization/attendance/overview",
          },
          {
            id: "daily",
            labelKey: "moduleManagement",
            label: ["Daily Attendance", "每日考勤"],
            href: "/organization/attendance/daily-attendance",
          },
          {
            id: "leave-permission",
            labelKey: "moduleManagement",
            label: ["Leave / Permission", "请假 / 外出"],
            href: "/organization/attendance/leave",
          },
        ],
      },
    ],
  },
  {
    id: "report",
    labelKey: "report",
    icon: "report",
    children: [
      { id: "overview", labelKey: "overview", href: "/report" },
      { id: "management", labelKey: "moduleManagement", href: "/report/management" },
    ],
  },
  {
    id: "training",
    labelKey: "training",
    icon: "training",
    children: [
      { id: "overview", labelKey: "overview", href: "/training" },
      { id: "session", labelKey: "session", href: "/training/session" },
    ],
  },
  {
    id: "settings",
    labelKey: "settings",
    icon: "settings",
    children: [
      { id: "roles", labelKey: "settingsRoles", href: "/settings/roles" },
      {
        id: "accounts",
        labelKey: "settingsAccounts",
        href: "/settings/accounts",
      },
    ],
  },
];

export const settingsAdminOnly = true;
