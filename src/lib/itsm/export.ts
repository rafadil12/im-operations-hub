import ExcelJS from "exceljs";
import { getDict } from "@/lib/i18n";
import type { ItsmRequest, Lang } from "@/lib/types";

export async function buildItsmExport(
  rows: ItsmRequest[],
  lang: Lang = "en"
): Promise<Buffer> {
  const dict = getDict(lang);
  const t = dict.itsm;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ITSM");

  sheet.columns = [
    { header: t.requestId, key: "request_id", width: 16 },
    { header: t.subject, key: "subject", width: 50 },
    { header: t.requester, key: "requester", width: 25 },
    { header: t.technician, key: "technician", width: 25 },
    { header: t.dueDate, key: "due_by_date", width: 22 },
    { header: t.status, key: "status", width: 18 },
    { header: t.createdDate, key: "created_date", width: 22 },
    { header: t.site, key: "site", width: 20 },
    { header: t.priority, key: "priority", width: 18 },
    { header: t.group, key: "group_name", width: 30 },
    { header: t.serviceRequest, key: "is_service_request", width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    sheet.addRow({
      request_id: row.request_id,
      subject: row.subject,
      requester: row.requester,
      technician: row.technician,
      due_by_date: row.due_by_date ?? "",
      status: row.status,
      created_date: row.created_date,
      site: row.site ?? "",
      priority: row.priority ?? "",
      group_name: row.group_name ?? "",
      is_service_request: row.is_service_request ? dict.common.yes : dict.common.no,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
