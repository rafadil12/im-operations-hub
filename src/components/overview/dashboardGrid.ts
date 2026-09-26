import type { ModuleCardData, ModuleId } from "@/data/overview";

/** Render order so CSS grid auto-placement matches the dashboard wireframe. */
export const DASHBOARD_GRID_ORDER: ModuleId[] = [
  "itsm",
  "daily-operation",
  "sparepart",
  "safety",
  "training",
  "report",
  "organization",
];

export function sortDashboardModules<T extends Pick<ModuleCardData, "id">>(modules: T[]): T[] {
  const rank = new Map(DASHBOARD_GRID_ORDER.map((id, index) => [id, index]));
  return [...modules].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

/** 6-column xl grid: 1+2+3 / 4+5 / 6 full / 7 full. */
export function dashboardGridClass(id: ModuleId): string {
  switch (id) {
    case "safety":
    case "training":
      return "h-full min-h-0 xl:col-span-3";
    case "report":
    case "organization":
      return "col-span-full";
    default:
      return "h-full min-h-0 xl:col-span-2";
  }
}
