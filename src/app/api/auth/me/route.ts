import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import {
  clearSessionCookie,
  getAccountPublic,
  readSession,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type UserRow = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
};

export async function GET() {
  try {
    const session = await readSession();

    if (!session) {
      return NextResponse.json({ account: null });
    }

    const account = await getAccountPublic(session.systemUserId);

    if (!account || session.sessionVersion !== account.sessionVersion) {
      await clearSessionCookie();
      return NextResponse.json({ account: null });
    }

    /**
     * session.userId is the user id from the login session.
     * Resolve the employee number from the real users table.
     */
    const userRows = await query<UserRow[]>(
      `
        SELECT
          id,
          employee_no,
          name_en,
          name_cn
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [session.userId],
    );

    const user = userRows[0];

    if (!user) {
      console.error(
        "GET /api/auth/me: session user was not found in users table",
        {
          sessionUserId: session.userId,
          systemUserId: session.systemUserId,
        },
      );

      return NextResponse.json(
        {
          error: "Logged-in user was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      account: {
        ...account,

        // Canonical employee identity for the frontend.
        employeeNo: user.employee_no,

        // Keep both naming styles available for compatibility.
        employee_no: user.employee_no,

        name_en: user.name_en,
        name_cn: user.name_cn,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);

    return NextResponse.json(
      {
        error: "Failed to load session.",
      },
      { status: 500 },
    );
  }
}
