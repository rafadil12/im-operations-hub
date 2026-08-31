import type { ReportArea, ReportLine } from "./types";

export type SummaryAreaLineGroup = {
  areaId: number;
  lines: ReportLine[];
};

export type WeekLineGroup = {
  year: number;
  weekNumber: number;
  areaGroups: SummaryAreaLineGroup[];
  totalLines: number;
};

export function groupLinesByWeek(lines: ReportLine[], areas: ReportArea[]): WeekLineGroup[] {
  const areaOrder = new Map(areas.map((area, index) => [area.id, index]));
  const map = new Map<string, Map<number, ReportLine[]>>();

  for (const line of lines) {
    if (line.weekNumber == null || line.year == null) continue;
    const weekKey = `${line.year}-${line.weekNumber}`;
    if (!map.has(weekKey)) map.set(weekKey, new Map());
    const areaMap = map.get(weekKey)!;
    if (!areaMap.has(line.areaId)) areaMap.set(line.areaId, []);
    areaMap.get(line.areaId)!.push(line);
  }

  return Array.from(map.entries())
    .map(([key, areaMap]) => {
      const [yearStr, weekStr] = key.split("-");
      const areaGroups: SummaryAreaLineGroup[] = Array.from(areaMap.entries())
        .map(([areaId, areaLines]) => ({
          areaId,
          lines: [...areaLines].sort((a, b) => a.sortOrder - b.sortOrder),
        }))
        .sort(
          (a, b) => (areaOrder.get(a.areaId) ?? 0) - (areaOrder.get(b.areaId) ?? 0)
        );

      const totalLines = areaGroups.reduce((sum, group) => sum + group.lines.length, 0);
      return {
        year: Number(yearStr),
        weekNumber: Number(weekStr),
        areaGroups,
        totalLines,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });
}
