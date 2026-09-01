import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { jsonError, normalizeParticipantName } from "@/lib/training/apiHelpers";
import type { TrainingParticipantMasterRow } from "@/lib/training/types";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingOverviewView,
    PERMISSIONS.trainingSessionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const rows = await query<TrainingParticipantMasterRow[]>(
      `
        SELECT id, name_en, name_cn, is_active
        FROM training_participants
        WHERE is_active = 1
        ORDER BY name_en ASC
      `
    );

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: Number(row.id),
        nameEn: row.name_en,
        nameCn: row.name_cn,
        isActive: Boolean(row.is_active),
      })),
    });
  } catch (error) {
    console.error("GET /api/training/participants ERROR:", error);
    return jsonError("Failed to load participants.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingSessionCreate,
    PERMISSIONS.trainingSessionUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as { nameEn?: string; nameCn?: string; name?: string };
    const nameEn = normalizeParticipantName(body.nameEn ?? body.name);
    const nameCn = String(body.nameCn ?? body.nameEn ?? body.name ?? "").trim() || nameEn;

    if (!nameEn || !nameCn) {
      return jsonError("Participant name EN and CN are required.");
    }

    await execute(
      `
        INSERT INTO training_participants (name_en, name_cn, is_active)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE
          name_cn = VALUES(name_cn),
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      [nameEn, nameCn]
    );

    return NextResponse.json(
      { success: true, data: { nameEn, nameCn } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/training/participants ERROR:", error);
    return jsonError("Failed to save participant.", 500);
  }
}
