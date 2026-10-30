import ExcelJS from "exceljs";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import {
  displayLogAction,
  formatLogDevice,
  formatLogEventId,
  formatLogIp,
  formatLogTarget,
} from "./logDetail";
import type { LogsCenterEventRow } from "./listQuery";
import { parseRemarkList, renderRemark, type RemarkChange, type RemarkLink } from "./renderRemark";

function actorLabel(row: LogsCenterEventRow, lang: Lang): string {
  const en = row.name_en?.trim() || "";
  const cn = row.name_cn?.trim() || "";
  const name = lang === "cn" ? cn || en : en || cn;
  const person = name || row.actor_label?.trim() || "";
  const employeeNo = row.employee_no?.trim() || "";
  if (person && employeeNo) return `${person} / ${employeeNo}`;
  return person || employeeNo || "-";
}

function formatTime(value: string): string {
  return value.trim().replace("T", " ").slice(0, 19);
}

export async function buildLogsCenterExport(
  rows: LogsCenterEventRow[],
  lang: Lang
): Promise<ExcelJS.Buffer> {
  const t = getDict(lang).logsCenter;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t.title);

  sheet.columns = [
    { header: t.time, key: "time", width: 20 },
    { header: t.userEmployeeId, key: "user", width: 28 },
    { header: t.module, key: "module", width: 16 },
    { header: t.action, key: "action", width: 12 },
    { header: t.target, key: "target", width: 24 },
    { header: t.remarks, key: "remarks", width: 48 },
    { header: t.eventId, key: "event_id", width: 22 },
    { header: t.ipAddress, key: "ip", width: 16 },
    { header: t.device, key: "device", width: 22 },
  ];

  for (const row of rows) {
    const changes = parseRemarkList<RemarkChange>(row.changes_json);
    const links = parseRemarkList<RemarkLink>(row.links_json);
    sheet.addRow({
      time: formatTime(row.created_at),
      user: actorLabel(row, lang),
      module: row.module.toUpperCase(),
      action: displayLogAction(row.action).toUpperCase(),
      target: formatLogTarget(row.object_type, row.object_ref, lang),
      remarks: renderRemark(
        {
          action: row.action,
          summary: lang === "cn" ? row.summary_cn || row.summary : row.summary,
          objectType: row.object_type,
          objectRef: row.object_ref,
          changes,
          links,
        },
        lang
      ),
      event_id: formatLogEventId(row.id, row.created_at),
      ip: formatLogIp(row.ip_address),
      device: formatLogDevice(row.user_agent),
    });
  }

  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}
