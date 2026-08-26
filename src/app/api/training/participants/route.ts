import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { jsonError } from "@/lib/training/apiHelpers";
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
        SELECT id, name, is_active
        FROM training_participants
        WHERE is_active = 1
        ORDER BY name ASC
      `
    );

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
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
    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "")
      .trim()
      .toUpperCase();

    if (!name) return jsonError("Participant name is required.");

    await execute(
      `
        INSERT INTO training_participants (name, is_active)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE is_active = 1, updated_at = CURRENT_TIMESTAMP
      `,
      [name]
    );

    return NextResponse.json({ success: true, data: { name } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/training/participants ERROR:", error);
    return jsonError("Failed to save participant.", 500);
  }
}
