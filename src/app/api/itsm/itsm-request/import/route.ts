import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const workbook = XLSX.read(bytes, {
      type: "array",
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    let success = 0;

    for (const row of rows) {
      await query(
        `
        INSERT INTO itsm_requests (
          request_id,
          subject,
          requester,
          technician,
          due_by_date,
          status,
          created_date,
          site,
          priority,
          group_name,
          is_service_request
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          row["Request ID"],
          row["Subject"],
          row["Requester"],
          row["Technician"],
          row["Due By Date"],
          row["Status"],
          row["Created Date"],
          row["Site"],
          row["Priority"],
          row["Group"],
          row["Service Request"],
        ]
      );

      success++;
    }

    return NextResponse.json({
      success: true,
      imported: success,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Import failed.",
      },
      {
        status: 500,
      }
    );
  }
}