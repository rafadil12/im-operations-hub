import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ShiftCode = "D/S" | "N/S";

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

type RotationRuleRow = {
  id: number;
  rule_name: string;
  rotation_type: string;
  effective_date: string;
  first_rotation_day: number;
  second_rotation_day: number;
  transition_off_days: number;
  is_active: number | boolean;
};

type RotationMemberRow = {
  id: number;
  rotation_rule_id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  pair_group: string;
  rotation_day: number | null;
  initial_shift: ShiftCode;
  rotation_order: number;
  is_active: number | boolean;
};

type SavePairMember = {
  employeeOrganizationId: number;
  employeeNo: string;
  initialShift: ShiftCode;
  rotationOrder: number;
};

type SavePair = {
  pairGroup: "PAIR_A" | "PAIR_B";
  rotationDay: number;
  members: SavePairMember[];
};

type SavePayload = {
  ruleId?: number;
  pairs?: SavePair[];
};

async function getRotationMembers(
  ruleId: number,
): Promise<RotationMemberRow[]> {
  return query<RotationMemberRow[]>(
    `
      SELECT
        srm.id,
        srm.rotation_rule_id,
        srm.employee_organization_id,
        u.employee_no,
        u.name_en,
        u.name_cn,
        srm.pair_group,
        srm.rotation_day,
        srm.initial_shift,
        srm.rotation_order,
        srm.is_active
      FROM shift_rotation_members srm
      INNER JOIN employee_organization eo
        ON eo.id = srm.employee_organization_id
      INNER JOIN users u
        ON u.id = eo.user_id
      WHERE srm.rotation_rule_id = ?
        AND srm.is_active = 1
      ORDER BY
        srm.pair_group ASC,
        srm.rotation_order ASC,
        srm.id ASC
    `,
    [ruleId],
  );
}

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  try {
    const rules = await query<RotationRuleRow[]>(
      `
        SELECT
          id,
          rule_name,
          rotation_type,
          effective_date,
          first_rotation_day,
          second_rotation_day,
          transition_off_days,
          is_active
        FROM shift_rotation_rules
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
      `,
    );

    const rule = rules[0] ?? null;

    if (!rule) {
      return NextResponse.json({
        success: true,
        data: {
          rules: [],
          members: [],
        },
      });
    }

    const members = await getRotationMembers(rule.id);

    return NextResponse.json({
      success: true,
      data: {
        rules: [
          {
            ...rule,
            first_rotation_day: 16,
            second_rotation_day: 15,
          },
        ],
        members,
      },
    });
  } catch (error) {
    console.error("GET rotation failed", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load rotation data.",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(request: NextRequest) {
  let transactionStarted = false;

  try {
    const body = (await request.json()) as SavePayload;

    const ruleId = Number(body?.ruleId);
    const pairs = Array.isArray(body?.pairs) ? body.pairs : [];

    /* =====================================================
       1. VALIDATE RULE ID
       ===================================================== */

    if (!Number.isInteger(ruleId) || ruleId < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid rotation rule is required.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       2. MUST HAVE PAIR A + PAIR B
       ===================================================== */

    if (pairs.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: "PAIR_A and PAIR_B are both required.",
        },
        { status: 400 },
      );
    }

    const pairA = pairs.find(
      (pair) => pair.pairGroup === "PAIR_A",
    );

    const pairB = pairs.find(
      (pair) => pair.pairGroup === "PAIR_B",
    );

    if (!pairA || !pairB) {
      return NextResponse.json(
        {
          success: false,
          error: "PAIR_A and PAIR_B are both required.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       3. EACH PAIR MUST HAVE EXACTLY 2 EMPLOYEES
       ===================================================== */

    if (
      !Array.isArray(pairA.members) ||
      !Array.isArray(pairB.members) ||
      pairA.members.length !== 2 ||
      pairB.members.length !== 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Each pair must contain exactly two employees.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       4. TOTAL MUST BE 4 DIFFERENT EMPLOYEES
       ===================================================== */

    const allMembers = [
      ...pairA.members,
      ...pairB.members,
    ];

    const employeeNumbers = allMembers.map((member) =>
      String(member.employeeNo ?? "").trim(),
    );

    if (employeeNumbers.some((employeeNo) => !employeeNo)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "All four rotation employees must be selected.",
        },
        { status: 400 },
      );
    }

    const uniqueEmployeeNos = new Set(employeeNumbers);

    if (uniqueEmployeeNos.size !== 4) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An employee cannot be used in more than one rotation pair.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       5. CHECK ROTATION RULE EXISTS
       ===================================================== */

    const ruleRows = await query<RotationRuleRow[]>(
      `
        SELECT
          id,
          rule_name,
          rotation_type,
          effective_date,
          first_rotation_day,
          second_rotation_day,
          transition_off_days,
          is_active
        FROM shift_rotation_rules
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [ruleId],
    );

    const rule = ruleRows[0] ?? null;

    if (!rule) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected rotation rule does not exist or is inactive.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       6. SMART LOGISTIC FIXED ROTATION DAY
       ===================================================== */

    const PAIR_A_ROTATION_DAY = 16;
    const PAIR_B_ROTATION_DAY = 15;

    /* =====================================================
       7. NORMALIZE ORDER
       
       PAIR_A:
         employee 1 -> order 1
         employee 2 -> order 2

       PAIR_B:
         employee 1 -> order 1
         employee 2 -> order 2
       ===================================================== */

    const selectedEmployeeNos = [
  String(pairA.members[0].employeeNo).trim(),
  String(pairA.members[1].employeeNo).trim(),
  String(pairB.members[0].employeeNo).trim(),
  String(pairB.members[1].employeeNo).trim(),
];

const employeeOrganizationRows =
  await query<{
    employee_organization_id: number;
    employee_no: string;
  }[]>(
    `
      SELECT
        eo.id AS employee_organization_id,
        u.employee_no
      FROM employee_organization eo
      INNER JOIN users u
        ON u.id = eo.user_id
      WHERE u.employee_no IN (?, ?, ?, ?)
    `,
    selectedEmployeeNos,
  );

const employeeOrganizationMap = new Map(
  employeeOrganizationRows.map((row) => [
    row.employee_no,
    row.employee_organization_id,
  ]),
);

for (const employeeNo of selectedEmployeeNos) {
  if (!employeeOrganizationMap.has(employeeNo)) {
    return NextResponse.json(
      {
        success: false,
        error:
          `Employee organization was not found for ${employeeNo}.`,
      },
      { status: 400 },
    );
  }
}

const normalizedPairA: SavePairMember[] = [
  {
    employeeOrganizationId:
      employeeOrganizationMap.get(
        String(pairA.members[0].employeeNo).trim(),
      )!,
    employeeNo:
      String(pairA.members[0].employeeNo).trim(),
    initialShift: pairA.members[0].initialShift,
    rotationOrder: 1,
  },
  {
    employeeOrganizationId:
      employeeOrganizationMap.get(
        String(pairA.members[1].employeeNo).trim(),
      )!,
    employeeNo:
      String(pairA.members[1].employeeNo).trim(),
    initialShift: pairA.members[1].initialShift,
    rotationOrder: 2,
  },
];

const normalizedPairB: SavePairMember[] = [
  {
    employeeOrganizationId:
      employeeOrganizationMap.get(
        String(pairB.members[0].employeeNo).trim(),
      )!,
    employeeNo:
      String(pairB.members[0].employeeNo).trim(),
    initialShift: pairB.members[0].initialShift,
    rotationOrder: 1,
  },
  {
    employeeOrganizationId:
      employeeOrganizationMap.get(
        String(pairB.members[1].employeeNo).trim(),
      )!,
    employeeNo:
      String(pairB.members[1].employeeNo).trim(),
    initialShift: pairB.members[1].initialShift,
    rotationOrder: 2,
  },
];

    const normalizedMembers = [
      ...normalizedPairA.map((member) => ({
        ...member,
        pairGroup: "PAIR_A" as const,
        rotationDay: PAIR_A_ROTATION_DAY,
      })),

      ...normalizedPairB.map((member) => ({
        ...member,
        pairGroup: "PAIR_B" as const,
        rotationDay: PAIR_B_ROTATION_DAY,
      })),
    ];

    /* =====================================================
       7A. VALIDATE CURRENT SHIFT ASSIGNMENTS

       Fixed employees (is_excluded = 1) are never allowed in a
       rotation pair. Each pair must contain exactly one D/S and
       one N/S employee. The database assignment is authoritative.
       ===================================================== */

    const assignmentRows = await query<{
  employee_no: string;
  shift_code: ShiftCode;
  is_excluded: number | boolean;
}[]>(
  `
    SELECT
      u.employee_no,
      sa.shift_code,
      sa.is_excluded
    FROM shift_assignments sa
    INNER JOIN employee_organization eo
      ON eo.id = sa.employee_organization_id
    INNER JOIN users u
      ON u.id = eo.user_id
    WHERE u.employee_no IN (?, ?, ?, ?)
  `,
  employeeNumbers,
);

    const assignmentMap = new Map(
      assignmentRows.map((row) => [row.employee_no, row]),
    );

    for (const member of normalizedMembers) {
      const assignment = assignmentMap.get(member.employeeNo);

      if (!assignment) {
        return NextResponse.json(
          {
            success: false,
            error: `No shift assignment was found for ${member.employeeNo}.`,
          },
          { status: 400 },
        );
      }

      if (toBoolean(assignment.is_excluded)) {
        return NextResponse.json(
          {
            success: false,
            error: `${member.employeeNo} is Fixed and cannot be used in a rotation pair.`,
          },
          { status: 400 },
        );
      }

      if (assignment.shift_code !== member.initialShift) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Shift mismatch for ${member.employeeNo}: database=${assignment.shift_code}, selected=${member.initialShift}.`,
          },
          { status: 400 },
        );
      }
    }

    const pairAShifts = normalizedPairA
      .map((member) => assignmentMap.get(member.employeeNo)?.shift_code)
      .filter((shift): shift is ShiftCode => Boolean(shift));
    const pairBShifts = normalizedPairB
      .map((member) => assignmentMap.get(member.employeeNo)?.shift_code)
      .filter((shift): shift is ShiftCode => Boolean(shift));

    const isOneDayOneNight = (shifts: ShiftCode[]) =>
      shifts.length === 2 &&
      shifts.includes("D/S") &&
      shifts.includes("N/S");

    if (!isOneDayOneNight(pairAShifts) || !isOneDayOneNight(pairBShifts)) {
      return NextResponse.json(
        {
          success: false,
          error: "Each rotation pair must contain exactly one D/S employee and one N/S employee.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       8. VALIDATE EMPLOYEE ORGANIZATION ID
       ===================================================== */

    for (const member of normalizedMembers) {
      if (
        !Number.isInteger(member.employeeOrganizationId) ||
        member.employeeOrganizationId < 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Invalid organization employee ID for ${member.employeeNo}.`,
          },
          { status: 400 },
        );
      }

      if (
        member.initialShift !== "D/S" &&
        member.initialShift !== "N/S"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Employee ${member.employeeNo} must have D/S or N/S assigned.`,
          },
          { status: 400 },
        );
      }

      if (
        member.rotationOrder !== 1 &&
        member.rotationOrder !== 2
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Each pair member must have rotation order 1 or 2.",
          },
          { status: 400 },
        );
      }
    }

    /* =====================================================
       9. CHECK ORGANIZATION IDs ARE UNIQUE
       ===================================================== */

    const organizationIds = normalizedMembers.map(
      (member) => member.employeeOrganizationId,
    );

    if (new Set(organizationIds).size !== 4) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The four selected employees must have different organization IDs.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       10. START TRANSACTION
       ===================================================== */

    await execute("START TRANSACTION");
    transactionStarted = true;

    /* =====================================================
       11. UPDATE RULE DAYS
       ===================================================== */

    await execute(
      `
        UPDATE shift_rotation_rules
        SET
          first_rotation_day = ?,
          second_rotation_day = ?
        WHERE id = ?
      `,
      [
        PAIR_A_ROTATION_DAY,
        PAIR_B_ROTATION_DAY,
        ruleId,
      ],
    );

    /* =====================================================
       12. DELETE OLD ROTATION MEMBERS
       
       IMPORTANT:
       Jangan hanya is_active = 0.
       Kita bersihkan seluruh member lama dari rule ini.
       ===================================================== */

    await execute(
      `
        DELETE FROM shift_rotation_members
        WHERE rotation_rule_id = ?
      `,
      [ruleId],
    );

    /* =====================================================
       13. INSERT PAIR A + PAIR B
       
       TOTAL = EXACTLY 4 ROWS
       ===================================================== */

    for (const member of normalizedMembers) {
      await execute(
        `
          INSERT INTO shift_rotation_members (
            rotation_rule_id,
            employee_organization_id,
            pair_group,
            rotation_day,
            initial_shift,
            rotation_order,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [
          ruleId,
          member.employeeOrganizationId,
          member.pairGroup,
          member.rotationDay,
          member.initialShift,
          member.rotationOrder,
        ],
      );
    }

    /* =====================================================
       14. VERIFY RESULT
       ===================================================== */

    const savedMembers = await getRotationMembers(ruleId);

    /* -----------------------------------------------------
       MUST HAVE EXACTLY 4 ACTIVE MEMBERS
       ----------------------------------------------------- */

    if (savedMembers.length !== 4) {
      throw new Error(
        `Rotation save verification failed. Expected 4 active members but found ${savedMembers.length}.`,
      );
    }

    /* -----------------------------------------------------
       CHECK PAIR A
       ----------------------------------------------------- */

    const savedPairA = savedMembers
      .filter(
        (member) => member.pair_group === "PAIR_A",
      )
      .sort(
        (a, b) =>
          a.rotation_order - b.rotation_order,
      );

    /* -----------------------------------------------------
       CHECK PAIR B
       ----------------------------------------------------- */

    const savedPairB = savedMembers
      .filter(
        (member) => member.pair_group === "PAIR_B",
      )
      .sort(
        (a, b) =>
          a.rotation_order - b.rotation_order,
      );

    if (savedPairA.length !== 2) {
      throw new Error(
        `Rotation save verification failed. PAIR_A has ${savedPairA.length} members instead of 2.`,
      );
    }

    if (savedPairB.length !== 2) {
      throw new Error(
        `Rotation save verification failed. PAIR_B has ${savedPairB.length} members instead of 2.`,
      );
    }

    /* -----------------------------------------------------
       CHECK ORDER
       ----------------------------------------------------- */

    if (
      savedPairA[0].rotation_order !== 1 ||
      savedPairA[1].rotation_order !== 2
    ) {
      throw new Error(
        "PAIR_A rotation order is invalid.",
      );
    }

    if (
      savedPairB[0].rotation_order !== 1 ||
      savedPairB[1].rotation_order !== 2
    ) {
      throw new Error(
        "PAIR_B rotation order is invalid.",
      );
    }

    /* =====================================================
       15. COMMIT
       ===================================================== */

    await execute("COMMIT");
    transactionStarted = false;

    /* =====================================================
       16. RETURN SAVED DATA
       ===================================================== */

    return NextResponse.json({
      success: true,
      message: "Rotation pairs saved successfully.",
      data: {
        rules: [
          {
            ...rule,
            first_rotation_day:
              PAIR_A_ROTATION_DAY,
            second_rotation_day:
              PAIR_B_ROTATION_DAY,
          },
        ],
        members: savedMembers,
      },
    });
  } catch (error) {
    /* =====================================================
       ROLLBACK
       ===================================================== */

    if (transactionStarted) {
      try {
        await execute("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "ROLLBACK rotation transaction failed",
          rollbackError,
        );
      }
    }

    console.error(
      "POST rotation failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save rotation pairs.",
      },
      { status: 500 },
    );
  }
}