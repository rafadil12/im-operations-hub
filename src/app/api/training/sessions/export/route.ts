import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { localizedField, localizedName } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { jsonError, parseDivisionId } from "@/lib/training/apiHelpers";
import { trainingText, type TrainingLanguage } from "@/lib/training";
import { loadTrainingSessions } from "@/lib/training/sessionStore";

export const runtime = "nodejs";

function parseLang(raw: string | null): TrainingLanguage {
  return raw === "cn" ? "cn" : "en";
}

export async function GET(request: Request) {
  const gate = await requirePermission(PERMISSIONS.trainingSessionRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const language = parseLang(searchParams.get("lang"));
    const lang = language as Lang;
    const q = searchParams.get("q")?.trim() || undefined;
    const divisionIdRaw = searchParams.get("divisionId");

    let divisionId: number | undefined;
    if (divisionIdRaw) {
      const parsed = parseDivisionId(divisionIdRaw);
      if (!parsed) return jsonError("Invalid division.");
      divisionId = parsed;
    }

    const sessions = await loadTrainingSessions({ divisionId, q });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      language === "cn" ? "培训活动" : "Training Sessions"
    );

    sheet.columns = [
      { header: trainingText("date", language), key: "date", width: 14 },
      { header: trainingText("topic", language), key: "topic", width: 36 },
      { header: trainingText("division", language), key: "division", width: 22 },
      {
        header: trainingText("participants", language),
        key: "participants",
        width: 40,
      },
      { header: trainingText("count", language), key: "count", width: 10 },
      {
        header: trainingText("attachment", language),
        key: "attachment",
        width: 28,
      },
    ];

    for (const row of sessions) {
      const participants = row.participants
        .map((person) =>
          localizedName({ name_en: person.nameEn, name_cn: person.nameCn }, lang)
        )
        .filter((name) => name && name !== "-")
        .join(", ");

      sheet.addRow({
        date: row.sessionDate,
        topic: localizedField(row.topicEn, row.topicCn, lang),
        division: localizedName(
          { name_en: row.divisionNameEn, name_cn: row.divisionNameCn },
          lang
        ),
        participants: participants || "—",
        count: row.participantCount,
        attachment: row.attachment?.originalName || trainingText("noFile", language),
      });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="training-sessions.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /training/sessions/export failed", error);
    return NextResponse.json(
      { error: "Failed to export training sessions." },
      { status: 500 }
    );
  }
}
