import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({
      account: {
        id: session.sub,
        email: session.email,
        employeeId: null as string | null,
        displayName: session.displayName,
        roleLabel: session.roleLabel,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ account: null });
  }
}
