import { localizedField, localizedName } from "@/lib/i18n";
import { reportText } from "./copy";
import type { WeekLineGroup } from "./summaryGrouping";
import { formatRatePercent } from "./weekCalendar";
import type { ReportArea, ReportLanguage } from "./types";

export async function exportSummaryToExcel(input: {
  year: number;
  weekGroups: WeekLineGroup[];
  areaById: Map<number, ReportArea>;
  language: ReportLanguage;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportText("summaryTab", input.language));

  const headers = [
    reportText("week", input.language),
    reportText("area", input.language),
    reportText("subItem", input.language),
    reportText("target", input.language),
    reportText("rate", input.language),
    reportText("summary", input.language),
    reportText("plan", input.language),
  ];

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };

  for (const group of input.weekGroups) {
    for (const areaGroup of group.areaGroups) {
      const area = input.areaById.get(areaGroup.areaId);
      const areaName = area
        ? localizedName({ name_en: area.nameEn, name_cn: area.nameCn }, input.language)
        : "—";

      for (const row of areaGroup.lines) {
        sheet.addRow([
          `Week ${group.weekNumber} (${group.year})`,
          areaName,
          localizedField(row.subItemNameEn, row.subItemNameCn, input.language) || "—",
          localizedField(row.workTargetEn, row.workTargetCn, input.language),
          formatRatePercent(row.weeklyCompletionRate),
          localizedField(row.summaryEn, row.summaryCn, input.language),
          localizedField(row.planEn, row.planCn, input.language) || "—",
        ]);
      }
    }
  }

  sheet.columns = [
    { width: 16 },
    { width: 14 },
    { width: 18 },
    { width: 36 },
    { width: 12 },
    { width: 48 },
    { width: 36 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-summary-${input.year}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
