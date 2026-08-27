import type { NavIconId } from "@/components/layout/NavIcons";
import type { Dict } from "@/lib/i18n";

export type NavLabelKey = keyof Dict["nav"];

export type NavChild = {
  id: string;
  labelKey: NavLabelKey;
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
        id: "management",
        labelKey: "moduleManagement",
        href: "/organization/employees",
      },
    ],
  },
  {
    id: "report",
    labelKey: "report",
    icon: "report",
    disabled: true,
    children: comingSoonChildren,
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
