import ExcelJS from "exceljs";
import type { ItsmRequest } from "@/lib/types";

export async function buildItsmExport(rows: ItsmRequest[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("ITSM");

  sheet.columns = [
    { header: "Request ID", key: "request_id", width: 16 },
    { header: "Subject", key: "subject", width: 50 },
    { header: "Requester", key: "requester", width: 25 },
    { header: "Technician", key: "technician", width: 25 },
    { header: "Due Date", key: "due_by_date", width: 22 },
    { header: "Status", key: "status", width: 18 },
    { header: "Created Date", key: "created_date", width: 22 },
    { header: "Site", key: "site", width: 20 },
    { header: "Priority", key: "priority", width: 18 },
    { header: "Group", key: "group_name", width: 30 },
    { header: "Service Request", key: "is_service_request", width: 18 },
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
      is_service_request: row.is_service_request ? "Yes" : "No",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
