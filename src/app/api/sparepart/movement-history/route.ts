import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/auth/access";
import { query } from "@/lib/db";
import {
  MOVEMENT_HISTORY_FROM,
  MOVEMENT_HISTORY_ORDER,
  MOVEMENT_HISTORY_SELECT,
  buildMovementHistoryFilters,
} from "@/lib/sparepart/movementHistoryFilters";
import type { SparepartMovementHistoryRow } from "@/lib/types";

export async function GET(request: NextRequest) {
  const gate = await requirePermission(PERMISSIONS.sparepartHistoryRead);
  if (gate instanceof NextResponse) return gate;

  try {
    const { where, params, itemIdError } = buildMovementHistoryFilters(request.nextUrl.searchParams);
    if (itemIdError) {
      return NextResponse.json({ error: "item_id is invalid." }, { status: 400 });
    }

    const rows = await query<SparepartMovementHistoryRow[]>(
      `${MOVEMENT_HISTORY_SELECT}
       ${MOVEMENT_HISTORY_FROM}
       ${where}
       ${MOVEMENT_HISTORY_ORDER}`,
      params
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /sparepart/movement-history failed", error);
    return NextResponse.json({ error: "Failed to load movement history." }, { status: 500 });
  }
}
