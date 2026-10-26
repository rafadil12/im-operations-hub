import type { ModuleCardData, ModuleId } from "@/data/overview";

/** Render order so CSS grid auto-placement matches the dashboard wireframe. */
export const DASHBOARD_GRID_ORDER: ModuleId[] = [
  "itsm",
  "daily-operation",
  "safety",
  "sparepart",
  "training",
  "report",
  "organization",
];

export function sortDashboardModules<T extends Pick<ModuleCardData, "id">>(modules: T[]): T[] {
  const rank = new Map(DASHBOARD_GRID_ORDER.map((id, index) => [id, index]));
  return [...modules].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

/** 30-track xl grid: 10+10+10 / 15+15 / 12+18 (report 40% / organization 60%). */
export function dashboardGridClass(id: ModuleId): string {
  switch (id) {
    case "sparepart":
    case "training":
      return "h-full min-h-0 xl:col-span-[15]";
    case "report":
      return "h-full min-h-0 xl:col-span-[12]";
    case "organization":
      return "h-full min-h-0 xl:col-span-[18]";
    default:
      return "h-full min-h-0 xl:col-span-[10]";
  }
}
