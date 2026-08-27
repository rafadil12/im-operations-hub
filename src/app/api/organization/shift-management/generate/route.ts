import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ShiftCode = "D/S" | "N/S";
type ScheduleType = "D" | "N" | "OFF";

type EmployeeRow = {
  employee_organization_id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  employment_status: string | null;
};

type AssignmentRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  shift_code: ShiftCode;
  is_excluded: number | boolean;
};

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

type OffDayRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  off_date: string;
  is_fixed: number | boolean;
};

type ShiftBalance = { dayCount: number; nightCount: number; totalCount: number; difference: number };

type MonthlyShiftCount = { dayCount: number; nightCount: number };

type ChangeEvent = {
  employee_no: string;
  change_date: string;
  from_shift: ShiftCode;
  to_shift: ShiftCode;
  off_date: string | null;
  rotation_rule_id: number | null;
};

type AuthMeResponse = {
  account: {
    employeeNo?: string | null;
  } | null;
};

async function getCurrentEmployee(request: NextRequest) {
  const authUrl = new URL("/api/auth/me", request.url);

  const authResponse = await fetch(authUrl, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!authResponse.ok) {
    return null;
  }

  const payload = (await authResponse.json()) as AuthMeResponse;
  const employeeNo = payload.account?.employeeNo ?? null;

  return employeeNo ? String(employeeNo) : null;
}

async function isCurrentUserSupervisor(employeeNo: string) {
  const rows = await query<{ employee_organization_id: number }[]>(
    `
      SELECT eo.id AS employee_organization_id
      FROM employee_organization eo
      INNER JOIN users u
        ON u.id = eo.user_id
      WHERE u.employee_no = ?
        AND eo.employment_status = 'Active'
      LIMIT 1
    `,
    [employeeNo],
  );

  if (rows.length === 0) {
    return false;
  }

  const managerId = rows[0].employee_organization_id;

  const subordinateRows = await query<{ count: number }[]>(
    `
      SELECT COUNT(*) AS count
      FROM employee_organization subordinate
      WHERE subordinate.manager_id = ?
        AND subordinate.employment_status = 'Active'
    `,
    [managerId],
  );

  return Number(subordinateRows[0]?.count ?? 0) > 0;
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  return makeDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate() + amount,
  );
}

function dateSerial(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
}

function parseSqlDate(value: string) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return makeDate(year, month, day);
}

function getPairState(
  members: RotationMemberRow[],
  state: Record<string, ShiftCode>,
) {
  if (members.length !== 2) return null;

  const first = members.find((member) => member.rotation_order === 1);
  const second = members.find((member) => member.rotation_order === 2);

  if (!first || !second) return null;

  const firstShift = state[first.employee_no];
  const secondShift = state[second.employee_no];

  if (!firstShift || !secondShift || firstShift === secondShift) return null;

  return {
    nightEmployee:
      firstShift === "N/S" ? first.employee_no : second.employee_no,
    dayEmployee:
      firstShift === "D/S" ? first.employee_no : second.employee_no,
  };
}

async function loadEmployees() {
  return query<EmployeeRow[]>(`
    SELECT
      eo.id AS employee_organization_id,
      u.employee_no,
      u.name_en,
      u.name_cn,
      eo.employment_status
    FROM employee_organization eo
    INNER JOIN users u
      ON u.id = eo.user_id
    WHERE eo.employment_status = 'Active'
      AND u.employee_no IS NOT NULL
      AND u.employee_no <> 'SUPERADMIN'
    ORDER BY u.employee_no ASC
  `);
}

async function loadAssignments() {
  return query<AssignmentRow[]>(`
    SELECT
      sa.id,
      sa.employee_organization_id,
      u.employee_no,
      u.name_en,
      u.name_cn,
      sa.shift_code,
      sa.is_excluded
    FROM shift_assignments sa
    INNER JOIN employee_organization eo
      ON eo.id = sa.employee_organization_id
    INNER JOIN users u
      ON u.id = eo.user_id
    ORDER BY u.employee_no ASC
  `);
}

async function loadRotationRule() {
  const rows = await query<RotationRuleRow[]>(`
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
  `);

  return rows[0] ?? null;
}

async function loadRotationMembers(ruleId: number) {
  return query<RotationMemberRow[]>(`
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
    ORDER BY srm.pair_group ASC, srm.rotation_order ASC, srm.id ASC
  `, [ruleId]);
}

async function loadFixedOffDays(startDate: string, nextMonthDate: string) {
  return query<OffDayRow[]>(`
    SELECT
      pod.id,
      pod.employee_organization_id,
      u.employee_no,
      pod.off_date,
      pod.is_fixed
    FROM personal_off_days pod
    INNER JOIN employee_organization eo
      ON eo.id = pod.employee_organization_id
    INNER JOIN users u
      ON u.id = eo.user_id
    WHERE pod.off_date >= ?
      AND pod.off_date < DATE_ADD(?, INTERVAL 1 MONTH)
    ORDER BY pod.off_date ASC
  `, [startDate, nextMonthDate]);
}

async function loadPreviousRotationState(
  year: number,
  month: number,
  rotationMembers: RotationMemberRow[],
): Promise<Record<string, ShiftCode>> {
  const targetStart = makeDate(year, month, 1);
  const previousMonthEnd = addDays(targetStart, -1);

  const employeeNos = rotationMembers.map((member) => member.employee_no);

  if (employeeNos.length === 0) {
    return {};
  }

  const placeholders = employeeNos.map(() => "?").join(", ");

  const rows = await query<{
    employee_no: string;
    schedule_date: string;
    shift_code: ShiftCode;
  }[]>(
    `
      SELECT
        ss.employee_no,
        ss.schedule_date,
        ss.shift_code
      FROM shift_schedules ss
      INNER JOIN (
        SELECT
          employee_no,
          MAX(schedule_date) AS max_schedule_date
        FROM shift_schedules
        WHERE schedule_date <= ?
          AND employee_no IN (${placeholders})
          AND shift_code IN ('D/S', 'N/S')
        GROUP BY employee_no
      ) latest
        ON latest.employee_no = ss.employee_no
       AND latest.max_schedule_date = ss.schedule_date
      WHERE ss.employee_no IN (${placeholders})
        AND ss.shift_code IN ('D/S', 'N/S')
      ORDER BY ss.employee_no ASC
    `,
    [
      dateKey(
        previousMonthEnd.getFullYear(),
        previousMonthEnd.getMonth() + 1,
        previousMonthEnd.getDate(),
      ),
      ...employeeNos,
      ...employeeNos,
    ],
  );

  const state: Record<string, ShiftCode> = {};

  for (const row of rows) {
    state[row.employee_no] = row.shift_code;
  }

  return state;
}

async function loadPreviousShiftBalance(
  year: number,
  month: number,
  employees: EmployeeRow[],
  effectiveDate: Date,
): Promise<Record<string, ShiftBalance>> {
  const targetStart = makeDate(year, month, 1);
  const previousEnd = addDays(targetStart, -1);
  const employeeNos = employees.map((employee) => employee.employee_no);

  if (employeeNos.length === 0) return {};

  const placeholders = employeeNos.map(() => '?').join(', ');

  const rows = await query<{
    employee_no: string;
    shift_code: ShiftCode | null;
    schedule_type: ScheduleType;
  }[]>(
    `
      SELECT
        employee_no,
        shift_code,
        schedule_type
      FROM shift_schedules
      WHERE schedule_date >= ?
        AND schedule_date <= ?
        AND employee_no IN (${placeholders})
        AND schedule_type IN ('D', 'N', 'OFF')
    `,
    [
      dateKey(
        effectiveDate.getFullYear(),
        effectiveDate.getMonth() + 1,
        effectiveDate.getDate(),
      ),
      dateKey(
        previousEnd.getFullYear(),
        previousEnd.getMonth() + 1,
        previousEnd.getDate(),
      ),
      ...employeeNos,
    ],
  );

  const result: Record<string, ShiftBalance> = {};
  for (const employeeNo of employeeNos) {
    result[employeeNo] = {
      dayCount: 0,
      nightCount: 0,
      totalCount: 0,
      difference: 0,
    };
  }

  for (const row of rows) {
    const entry = result[row.employee_no];
    if (!entry) continue;

    // Fairness rule:
    // D and OFF both count as DAY.
    // N counts as NIGHT.
    if (row.schedule_type === 'D' || row.schedule_type === 'OFF') {
      entry.dayCount += 1;
      entry.totalCount += 1;
    } else if (row.schedule_type === 'N') {
      entry.nightCount += 1;
      entry.totalCount += 1;
    }
  }

  for (const employeeNo of employeeNos) {
    const entry = result[employeeNo];
    entry.difference = entry.dayCount - entry.nightCount;
  }

  return result;
}

async function loadPreviousDayRotationChanges(
  year: number,
  month: number,
  rotationMembers: RotationMemberRow[],
) {
  const targetStart = makeDate(year, month, 1);
  const previousDay = addDays(targetStart, -1);
  const employeeNos = rotationMembers.map((member) => member.employee_no);

  if (employeeNos.length === 0) return [];

  const placeholders = employeeNos.map(() => "?").join(", ");

  return query<{
    employee_no: string;
    change_date: string;
    from_shift: ShiftCode;
    to_shift: ShiftCode;
    off_date: string | null;
  }[]>(
    `
      SELECT
        employee_no,
        change_date,
        from_shift,
        to_shift,
        off_date
      FROM shift_schedule_changes
      WHERE change_date = ?
        AND employee_no IN (${placeholders})
        AND from_shift = 'D/S'
        AND to_shift = 'N/S'
        AND off_date IS NULL
      ORDER BY id ASC
    `,
    [
      dateKey(
        previousDay.getFullYear(),
        previousDay.getMonth() + 1,
        previousDay.getDate(),
      ),
      ...employeeNos,
    ],
  );
}

async function loadLastPair0RotationDate(
  beforeDate: string,
  pair0EmployeeNos: string[],
) {
  if (pair0EmployeeNos.length === 0) return null;

  const placeholders = pair0EmployeeNos.map(() => '?').join(', ');

  const rows = await query<{ change_date: string }[]>(
    `
      SELECT MAX(change_date) AS change_date
      FROM shift_schedule_changes
      WHERE change_date < ?
        AND employee_no IN (${placeholders})
        AND from_shift = 'D/S'
        AND to_shift = 'N/S'
    `,
    [beforeDate, ...pair0EmployeeNos],
  );

  return rows[0]?.change_date ? String(rows[0].change_date).slice(0, 10) : null;
}

async function buildSchedule(
  year: number,
  month: number,
  employees: EmployeeRow[],
  assignments: AssignmentRow[],
  rotationMembers: RotationMemberRow[],
  fixedOffDays: OffDayRow[],
  rule: RotationRuleRow,
) {
  const daysInMonth = getDaysInMonth(year, month);
  const targetStart = makeDate(year, month, 1);
  const targetEnd = makeDate(year, month, daysInMonth);
  const effectiveDate = parseSqlDate(rule.effective_date);

  const baseLedger = await loadPreviousShiftBalance(
    year,
    month,
    employees,
    effectiveDate,
  );

  const isBaselineMonth =
    year === effectiveDate.getFullYear() &&
    month === effectiveDate.getMonth() + 1;

  const assignmentByEmployee = new Map(
    assignments.map((row) => [row.employee_no, row]),
  );

  const initialState: Record<string, ShiftCode> = {};
  const excluded = new Set<string>();

  for (const employee of employees) {
    const assignment = assignmentByEmployee.get(employee.employee_no);

    if (assignment) {
      initialState[employee.employee_no] = assignment.shift_code;
      if (toBoolean(assignment.is_excluded)) {
        excluded.add(employee.employee_no);
      }
    }
  }

  if (isBaselineMonth) {
    for (const member of rotationMembers) {
      if (excluded.has(member.employee_no)) continue;
      initialState[member.employee_no] = member.initial_shift;
    }
  } else {
    const previousState = await loadPreviousRotationState(
      year,
      month,
      rotationMembers,
    );

    for (const member of rotationMembers) {
      if (excluded.has(member.employee_no)) continue;
      initialState[member.employee_no] =
        previousState[member.employee_no] ?? member.initial_shift;
    }
  }

  /*
   * ROTATION PAIR NORMALIZATION
   *
   * Every active rotation pair must start in opposite shifts.
   * If both members accidentally have the same initial / previous shift,
   * Change Shift can never fire because getPairState() rejects same-shift pairs.
   *
   * We preserve rotation_order as the deterministic source of truth:
   *   rotation_order 1 -> D/S
   *   rotation_order 2 -> N/S
   *
   * This fixes the case where a pair such as Aulia/Jose is configured with
   * identical shifts and therefore never rotates, while other pairs happen to
   * work correctly.
   */
  const rotationPairGroups = new Map<string, RotationMemberRow[]>();

  for (const member of rotationMembers) {
    if (excluded.has(member.employee_no)) continue;

    const rows = rotationPairGroups.get(member.pair_group) ?? [];
    rows.push(member);
    rotationPairGroups.set(member.pair_group, rows);
  }

  for (const members of rotationPairGroups.values()) {
    if (members.length !== 2) continue;

    const first = members.find((member) => member.rotation_order === 1);
    const second = members.find((member) => member.rotation_order === 2);

    if (!first || !second) continue;

    const firstShift = initialState[first.employee_no];
    const secondShift = initialState[second.employee_no];

    if (!firstShift || !secondShift || firstShift !== secondShift) continue;

    initialState[first.employee_no] = 'D/S';
    initialState[second.employee_no] = 'N/S';
  }

  const fixedOff = new Set(
    fixedOffDays
      .filter((row) => toBoolean(row.is_fixed))
      .map(
        (row) =>
          `${row.employee_no}|${String(row.off_date).slice(0, 10)}`,
      ),
  );

  const pairGroups = new Map<string, RotationMemberRow[]>();

  for (const member of rotationMembers) {
    if (excluded.has(member.employee_no)) continue;

    const rows = pairGroups.get(member.pair_group) ?? [];
    rows.push(member);
    pairGroups.set(member.pair_group, rows);
  }

  const pairs = Array.from(pairGroups.values())
    .filter((rows) => rows.length === 2)
    .sort(
      (a, b) =>
        Math.min(...a.map((row) => row.id)) -
        Math.min(...b.map((row) => row.id)),
    );

  const pairEvents = pairs.map((members) => ({ members }));

  if (pairEvents.length === 0) {
    throw new Error(
      'At least one valid rotation pair is required in shift_rotation_members.',
    );
  }

  const monthStartSerial = dateSerial(targetStart);
  const monthEndSerial = dateSerial(targetEnd);

  const cloneLedger = (): Record<string, ShiftBalance> => {
    const result: Record<string, ShiftBalance> = {};

    for (const employee of employees) {
      const source = baseLedger[employee.employee_no];
      result[employee.employee_no] = source
        ? { ...source }
        : {
            dayCount: 0,
            nightCount: 0,
            totalCount: 0,
            difference: 0,
          };
    }

    return result;
  };

  const cloneState = () => ({ ...initialState });

  const dateFromSerial = (serial: number) =>
    addDays(targetStart, serial - monthStartSerial);

  type Wave = {
    anchorSerial: number;
  };

  type SimulationResult = {
    ledger: Record<string, ShiftBalance>;
    state: Record<string, ShiftCode>;
    values: Record<string, ScheduleType[]>;
    changes: ChangeEvent[];
    monthlyShiftCounts: Record<string, MonthlyShiftCount>;
  };

  /*
   * A wave is always one complete chain:
   *
   * Pair A = X
   * Pair B = X + 1
   * Pair C = X + 2
   * ...
   *
   * The chain may cross the month boundary. This is intentional.
   * Example: Pair A on 31 -> Pair B on 01 -> Pair C on 02.
   */
  const buildWaveEvents = (anchorSerial: number) => {
    const events = new Map<number, number[]>();

    for (let pairIndex = 0; pairIndex < pairEvents.length; pairIndex += 1) {
      const serial = anchorSerial + pairIndex;
      const current = events.get(serial) ?? [];
      current.push(pairIndex);
      events.set(serial, current);
    }

    return events;
  };

  const simulatePlan = (waves: Wave[]): SimulationResult => {
    const ledger = cloneLedger();
    const state = cloneState();
    const values: Record<string, ScheduleType[]> = {};
    const changes: ChangeEvent[] = [];
    const monthlyShiftCounts: Record<string, MonthlyShiftCount> = {};

    for (const employee of employees) {
      values[employee.employee_no] = Array.from(
        { length: daysInMonth },
        () => 'OFF' as ScheduleType,
      );
      monthlyShiftCounts[employee.employee_no] = {
        dayCount: 0,
        nightCount: 0,
      };
    }

    const pending = new Map<
      string,
      Array<{ employee_no: string; shift: ShiftCode }>
    >();

    const queueShift = (
      date: Date,
      employeeNo: string,
      shift: ShiftCode,
    ) => {
      const key = dateKey(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
      const rows = pending.get(key) ?? [];
      rows.push({ employee_no: employeeNo, shift });
      pending.set(key, rows);
    };

    const applyPending = (date: Date) => {
      const key = dateKey(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );

      const rows = pending.get(key) ?? [];
      for (const row of rows) {
        state[row.employee_no] = row.shift;
      }

      pending.delete(key);
    };

    const plannedEvents = new Map<number, number[]>();

    for (const wave of waves) {
      const waveEvents = buildWaveEvents(wave.anchorSerial);

      for (const [serial, pairIndexes] of waveEvents.entries()) {
        const current = plannedEvents.get(serial) ?? [];
        current.push(...pairIndexes);
        plannedEvents.set(serial, current);
      }
    }

    for (const [serial, pairIndexes] of plannedEvents.entries()) {
      plannedEvents.set(serial, Array.from(new Set(pairIndexes)).sort((a, b) => a - b));
    }

    for (let serial = monthStartSerial; serial <= monthEndSerial; serial += 1) {
      const currentDate = dateFromSerial(serial);
      const currentDay = currentDate.getDate();

      applyPending(currentDate);

      const offToday = new Set<string>();
      const pairIndexes = plannedEvents.get(serial) ?? [];

      for (const pairIndex of pairIndexes) {
        const pair = pairEvents[pairIndex];
        if (!pair) continue;

        const pairState = getPairState(pair.members, state);
        if (!pairState) continue;

        const nightEmployee = pairState.nightEmployee;
        const dayEmployee = pairState.dayEmployee;

        /*
         * Mandatory transition:
         *
         * N/S -> OFF -> D/S
         * D/S -> N/S
         *
         * Never allow N/S -> D/S on the same day.
         */
        if (
          state[nightEmployee] !== 'N/S' ||
          state[dayEmployee] !== 'D/S'
        ) {
          continue;
        }

        offToday.add(nightEmployee);
        state[dayEmployee] = 'N/S';

        const nextDate = addDays(currentDate, 1);
        queueShift(nextDate, nightEmployee, 'D/S');

        changes.push({
          employee_no: dayEmployee,
          change_date: dateKey(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            currentDate.getDate(),
          ),
          from_shift: 'D/S',
          to_shift: 'N/S',
          off_date: null,
          rotation_rule_id: rule.id,
        });

        changes.push({
          employee_no: nightEmployee,
          change_date: dateKey(
            nextDate.getFullYear(),
            nextDate.getMonth() + 1,
            nextDate.getDate(),
          ),
          from_shift: 'N/S',
          to_shift: 'D/S',
          off_date: dateKey(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            currentDate.getDate(),
          ),
          rotation_rule_id: rule.id,
        });
      }

      const index = currentDay - 1;

      for (const employee of employees) {
        const employeeNo = employee.employee_no;

        if (excluded.has(employeeNo)) {
          values[employeeNo][index] =
            state[employeeNo] === 'N/S' ? 'N' : 'D';
          continue;
        }

        const scheduled = offToday.has(employeeNo)
          ? 'OFF'
          : state[employeeNo] === 'N/S'
            ? 'N'
            : 'D';

        values[employeeNo][index] = scheduled;

        const monthlyCount = monthlyShiftCounts[employeeNo];
        if (monthlyCount) {
          if (scheduled === 'D') {
            monthlyCount.dayCount += 1;
          } else if (scheduled === 'N') {
            monthlyCount.nightCount += 1;
          }
        }

        const balance = ledger[employeeNo];
        if (!balance) continue;

        if (scheduled === 'D' || scheduled === 'OFF') {
          balance.dayCount += 1;
          balance.totalCount += 1;
        } else if (scheduled === 'N') {
          balance.nightCount += 1;
          balance.totalCount += 1;
        }

        balance.difference = balance.dayCount - balance.nightCount;
      }
    }

    /*
     * Fixed OFF days override generated values.
     * The fairness ledger is corrected so an overridden N becomes DAY/OFF.
     */
    for (const employee of employees) {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${employee.employee_no}|${dateKey(year, month, day)}`;
        if (!fixedOff.has(key)) continue;

        const index = day - 1;
        const previous = values[employee.employee_no][index];
        const monthlyCount = monthlyShiftCounts[employee.employee_no];

        if (previous === 'D') {
          if (monthlyCount) monthlyCount.dayCount -= 1;
        } else if (previous === 'N') {
          if (monthlyCount) monthlyCount.nightCount -= 1;

          const balance = ledger[employee.employee_no];
          if (balance) {
            balance.nightCount -= 1;
            balance.dayCount += 1;
            balance.difference = balance.dayCount - balance.nightCount;
          }
        }

        values[employee.employee_no][index] = 'OFF';
      }
    }

    return { ledger, state, values, changes, monthlyShiftCounts };
  };

  const scoreSimulation = (simulation: SimulationResult) => {
    const balances = employees
      .map((employee) => simulation.ledger[employee.employee_no])
      .filter(Boolean);

    const absolute = balances.map((item) => Math.abs(item.difference));

    const maxAbsoluteDifference = absolute.length > 0
      ? Math.max(...absolute)
      : 0;

    const totalAbsoluteDifference = absolute.reduce(
      (sum, value) => sum + value,
      0,
    );

    const squaredDifference = balances.reduce(
      (sum, item) => sum + item.difference * item.difference,
      0,
    );

    /*
     * MONTHLY SHIFT RULE
     *
     * A person must NOT be allowed to spend an entire month on only one
     * shift. For normal 30/31-day months, the intended result is roughly
     * 15/15 or 15/16 between D and N. Therefore 16 is the hard maximum for
     * either shift in a generated month.
     *
     * This is evaluated separately from cumulative fairness. Cumulative
     * balance still matters, but it can never override this monthly limit.
     */
    let monthlyOverLimit = 0;
    let monthlyImbalance = 0;
    let monthlyOneShiftOnly = 0;

    for (const employee of employees) {
      const count = simulation.monthlyShiftCounts[employee.employee_no];
      if (!count) continue;

      monthlyOverLimit += Math.max(0, count.dayCount - 16);
      monthlyOverLimit += Math.max(0, count.nightCount - 16);
      monthlyImbalance += Math.abs(count.dayCount - count.nightCount);

      /*
       * Hard fairness signal: a rotating employee should not spend the
       * generated month on only one shift.  This catches the exact 30/0
       * and 0/30 failure mode before cumulative fairness is considered.
       */
      if (count.dayCount === 0 || count.nightCount === 0) {
        monthlyOneShiftOnly += 1;
      }
    }

    return {
      monthlyOverLimit,
      monthlyOneShiftOnly,
      monthlyImbalance,
      maxAbsoluteDifference,
      totalAbsoluteDifference,
      squaredDifference,
    };
  };

  const scoreWaveBenefit = (
    before: SimulationResult,
    after: SimulationResult,
  ) => {
    const beforeScore = scoreSimulation(before);
    const afterScore = scoreSimulation(after);

    return {
      before: beforeScore,
      after: afterScore,
    };
  };

  const compareScores = (
    a: ReturnType<typeof scoreSimulation>,
    b: ReturnType<typeof scoreSimulation>,
  ) => {
    /* Hard rule first: never accept >16 days on the same shift in a month. */
    if (a.monthlyOverLimit !== b.monthlyOverLimit) {
      return a.monthlyOverLimit - b.monthlyOverLimit;
    }

    /* Never prefer a plan that leaves more employees on only one shift. */
    if (a.monthlyOneShiftOnly !== b.monthlyOneShiftOnly) {
      return a.monthlyOneShiftOnly - b.monthlyOneShiftOnly;
    }

    /* Prefer the closest monthly D/N split before cumulative fairness. */
    if (a.monthlyImbalance !== b.monthlyImbalance) {
      return a.monthlyImbalance - b.monthlyImbalance;
    }

    if (a.maxAbsoluteDifference !== b.maxAbsoluteDifference) {
      return a.maxAbsoluteDifference - b.maxAbsoluteDifference;
    }

    if (a.totalAbsoluteDifference !== b.totalAbsoluteDifference) {
      return a.totalAbsoluteDifference - b.totalAbsoluteDifference;
    }

    return a.squaredDifference - b.squaredDifference;
  };

  /*
   * FIXED CALENDAR ROTATION WINDOWS
   *
   * Change Shift must stay around the same dates every month. We therefore
   * always select exactly TWO wave anchors from two fixed calendar windows:
   *
   *   Wave 1: last 2 days of previous month + day 1 + day 2 of this month
   *   Wave 2: day 14 + day 15 + day 16 + day 17 of this month
   *
   * The exact date inside each window is still selected by the balance score,
   * but the window itself never drifts forward from month to month.
   */

  /*
   * FIRST WAVE CONTINUITY
   *
   * A generated month is allowed to inherit a Change Shift wave that actually
   * started in the previous month. This is important because the previous
   * month's response only persists change rows that belong to that month; the
   * future part of a cross-month chain is intentionally generated when the next
   * month is created. The persisted D/S -> N/S change for pair 0 is therefore
   * the reliable hand-off marker between months.
   *
   * If a real pair-0 rotation occurred on the last 2 days of the previous month,
   * we MUST continue that exact wave instead of inventing a new wave on day 1/2.
   * If no such persisted marker exists, the new month starts its own first wave
   * inside the normal day-1/day-2 window.
   */
  const firstPair = pairEvents[0]?.members ?? [];
  const firstPairEmployeeNos = firstPair.map((member) => member.employee_no);
  const lastPair0RotationDate = await loadLastPair0RotationDate(
    dateKey(year, month, 1),
    firstPairEmployeeNos,
  );

  const previousMonthFirstWaveStart = lastPair0RotationDate
    ? parseSqlDate(lastPair0RotationDate)
    : null;

  const continuationAnchorSerial =
    previousMonthFirstWaveStart &&
    dateSerial(previousMonthFirstWaveStart) >=
      dateSerial(addDays(targetStart, -2)) &&
    dateSerial(previousMonthFirstWaveStart) < monthStartSerial
      ? dateSerial(previousMonthFirstWaveStart)
      : null;

  const firstWaveCandidateSerials = continuationAnchorSerial !== null
    ? [continuationAnchorSerial]
    : [monthStartSerial, monthStartSerial + 1];

  const secondWaveCandidateSerials = [
    monthStartSerial + 13, // day 14
    monthStartSerial + 14, // day 15
    monthStartSerial + 15, // day 16
    monthStartSerial + 16, // day 17
  ].filter((serial) => serial <= monthEndSerial);

  const preferredFirstWaveSerial =
    continuationAnchorSerial ?? monthStartSerial;
  const preferredSecondWaveSerial = monthStartSerial + 14;

  let bestFixedPlan: {
    waves: Wave[];
    simulation: SimulationResult;
    score: ReturnType<typeof scoreSimulation>;
    tieDistance: number;
  } | null = null;

  for (const firstAnchorSerial of firstWaveCandidateSerials) {
    for (const secondAnchorSerial of secondWaveCandidateSerials) {
      /* Keep a sensible gap between the two wave starts. */
      if (secondAnchorSerial - firstAnchorSerial < 10) continue;

      const candidateWaves: Wave[] = [
        { anchorSerial: firstAnchorSerial },
        { anchorSerial: secondAnchorSerial },
      ];

      const simulation = simulatePlan(candidateWaves);
      const score = scoreSimulation(simulation);

      const tieDistance =
        Math.abs(firstAnchorSerial - preferredFirstWaveSerial) +
        Math.abs(secondAnchorSerial - preferredSecondWaveSerial);

      if (!bestFixedPlan) {
        bestFixedPlan = {
          waves: candidateWaves,
          simulation,
          score,
          tieDistance,
        };
        continue;
      }

      const scoreComparison = compareScores(score, bestFixedPlan.score);

      if (
        scoreComparison < 0 ||
        (scoreComparison === 0 && tieDistance < bestFixedPlan.tieDistance)
      ) {
        bestFixedPlan = {
          waves: candidateWaves,
          simulation,
          score,
          tieDistance,
        };
      }
    }
  }

  if (!bestFixedPlan) {
    throw new Error(
      'Unable to select the two fixed calendar rotation waves. Check the rotation configuration.',
    );
  }

  const waves = bestFixedPlan.waves;

  /*
   * A cross-month first wave is inherited from the actual previous-month
   * pair-0 Change Shift marker. In that case, keep the inherited anchor even
   * though it is outside the generated month; pair events that fall inside this
   * month are then reproduced deterministically from the persisted month-end
   * state.
   */
  if (continuationAnchorSerial !== null && waves[0]?.anchorSerial !== continuationAnchorSerial) {
    throw new Error(
      'Cross-month Change Shift continuity was not preserved. The first wave must continue from the previous month.',
    );
  }

  /*
   * Exactly two waves are required by the rotation rule.
   */
  if (waves.length !== 2) {
    throw new Error('Exactly two Change Shift waves are required.');
  }

  /*
   * Validate that every selected wave is actually a valid complete chain at
   * the state level. We do not allow Pair A to rotate while Pair B is skipped.
   * The simulator places all pair events one day apart, so a failed pair is a
   * configuration issue rather than an excuse to compress the chain.
   */
  const finalSimulation = simulatePlan(waves);

  /*
   * HARD MONTHLY LIMIT
   * Never return a schedule where one employee has more than 16 D shifts or
   * more than 16 N shifts in the generated month. This prevents the old
   * failure mode where someone stayed on D or N for the whole month.
   */
  const invalidMonthlyShiftEmployees = employees.filter((employee) => {
    const count = finalSimulation.monthlyShiftCounts[employee.employee_no];
    if (!count) return false;

    /*
     * A rotation employee must have both D and N in the generated month.
     * Excluded employees are intentionally not part of the rotation and keep
     * their assigned shift, so they are exempt from this check.
     */
    if (excluded.has(employee.employee_no)) return false;

    return (
      count.dayCount > 16 ||
      count.nightCount > 16 ||
      count.dayCount === 0 ||
      count.nightCount === 0
    );
  });

  if (invalidMonthlyShiftEmployees.length > 0) {
    throw new Error(
      `Monthly rotation balance could not be satisfied for: ${invalidMonthlyShiftEmployees
        .map((employee) => {
          const count = finalSimulation.monthlyShiftCounts[employee.employee_no];
          return `${employee.employee_no} (${count?.dayCount ?? 0}D/${count?.nightCount ?? 0}N)`;
        })
        .join(', ')}. Each rotating employee must have both D and N shifts and at most 16 days on either shift.`,
    );
  }

  const invalidWaveCount = waves.filter((wave) => {
    const waveEvents = buildWaveEvents(wave.anchorSerial);

    for (const [serial, pairIndexes] of waveEvents.entries()) {
      if (serial < monthStartSerial || serial > monthEndSerial) continue;

      for (const pairIndex of pairIndexes) {
        const pair = pairEvents[pairIndex];
        if (!pair) return true;
        if (pair.members.length !== 2) return true;
      }
    }

    return false;
  }).length;

  if (invalidWaveCount > 0) {
    throw new Error('One or more rotation chains are invalid. Check pair configuration.');
  }

  /*
   * The score below is the real fairness result used by the POST response.
   * It is no longer merely an informational value.
   */
  const finalScore = scoreSimulation(finalSimulation);

  const valuesByEmployee = finalSimulation.values;

  const targetStartSerial = monthStartSerial;
  const targetEndSerial = monthEndSerial;

  const filteredChanges = finalSimulation.changes.filter((change) => {
    const changeSerial = dateSerial(parseSqlDate(change.change_date));
    const offSerial = change.off_date
      ? dateSerial(parseSqlDate(change.off_date))
      : null;

    return (
      (changeSerial >= targetStartSerial &&
        changeSerial <= targetEndSerial) ||
      (offSerial !== null &&
        offSerial >= targetStartSerial &&
        offSerial <= targetEndSerial)
    );
  });

  const fairnessByEmployee: Record<string, ShiftBalance> = {};

  for (const employee of employees) {
    const entry = finalSimulation.ledger[employee.employee_no];
    if (!entry) continue;
    fairnessByEmployee[employee.employee_no] = { ...entry };
  }

  return {
    valuesByEmployee,
    changes: filteredChanges,
    fairnessByEmployee,
    monthlyShiftCounts: finalSimulation.monthlyShiftCounts,
    rotationSummary: {
      waveAnchors: waves.map((wave) =>
        dateKey(
          dateFromSerial(wave.anchorSerial).getFullYear(),
          dateFromSerial(wave.anchorSerial).getMonth() + 1,
          dateFromSerial(wave.anchorSerial).getDate(),
        ),
      ),
      maxAbsoluteDifference: finalScore.maxAbsoluteDifference,
      totalAbsoluteDifference: finalScore.totalAbsoluteDifference,
      squaredDifference: finalScore.squaredDifference,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const year = Number(body?.year);
    const month = Number(body?.month);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { success: false, error: "year and month are required." },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------
    // AUTHORIZATION: only a Manager / Supervisor may generate.
    // A Supervisor is determined by Organization Management: other
    // active employees point to this employee through manager_id.
    // ------------------------------------------------------------

    const currentEmployeeNo = await getCurrentEmployee(request);

    if (!currentEmployeeNo) {
      return NextResponse.json(
        { success: false, error: "Current login account could not be detected." },
        { status: 401 },
      );
    }

    const supervisor = await isCurrentUserSupervisor(currentEmployeeNo);

    if (!supervisor) {
      return NextResponse.json(
        { success: false, error: "Only a Supervisor can generate schedules." },
        { status: 403 },
      );
    }

    // ------------------------------------------------------------
    // MONTH LOCK: only future months may be generated.
    // Once the 1st day of a month arrives, that month is locked.
    // ------------------------------------------------------------

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const isFutureMonth =
      year > currentYear ||
      (year === currentYear && month > currentMonth);

    if (!isFutureMonth) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This month is already in progress or has passed and can no longer be generated.",
        },
        { status: 409 },
      );
    }

    const rule = await loadRotationRule();
    if (!rule) {
      return NextResponse.json(
        {
          success: false,
          error: "No active rotation rule was found in shift_rotation_rules.",
        },
        { status: 400 },
      );
    }

    const [employees, assignments, rotationMembers] = await Promise.all([
      loadEmployees(),
      loadAssignments(),
      loadRotationMembers(rule.id),
    ]);

    const monthStart = `${year}-${pad(month)}-01`;
    const offDays = await loadFixedOffDays(monthStart, monthStart);

    const {
      valuesByEmployee,
      changes,
      fairnessByEmployee,
      monthlyShiftCounts,
      rotationSummary,
    } = await buildSchedule(
      year,
      month,
      employees,
      assignments,
      rotationMembers,
      offDays,
      rule,
    );

    // Fairness is cumulative from the baseline forward.
    // Rotation timing is now calendar-based (month midpoint), not a fixed
    // 15/16 date. OFF counts as DAY for fairness.
    const fairnessValues = Object.values(fairnessByEmployee);
    const maxAbsoluteDifference = fairnessValues.length > 0
      ? Math.max(...fairnessValues.map((item) => Math.abs(item.difference)))
      : 0;
    const isCumulativelyBalanced = maxAbsoluteDifference <= 1;

      // Do NOT delete shift_schedules. Existing rows must be overwritten
      // so their primary key/id remains stable across repeated generation.

      await execute(
        `
          DELETE FROM shift_schedule_changes
          WHERE
            (
              change_date >= ?
              AND change_date < DATE_ADD(?, INTERVAL 1 MONTH)
            )
            OR
            (
              off_date >= ?
              AND off_date < DATE_ADD(?, INTERVAL 1 MONTH)
            )
        `,
        [monthStart, monthStart, monthStart, monthStart],
      );

      const daysInMonth = getDaysInMonth(year, month);

      for (const employee of employees) {
        const values = valuesByEmployee[employee.employee_no] ?? [];

        for (let day = 1; day <= daysInMonth; day += 1) {
          const scheduleType = values[day - 1] ?? "OFF";
          const shiftCode: ShiftCode | null =
            scheduleType === "D"
              ? "D/S"
              : scheduleType === "N"
                ? "N/S"
                : null;

          await execute(
            `
              INSERT INTO shift_schedules (
                employee_no,
                schedule_date,
                shift_code,
                schedule_type,
                rotation_rule_id
              )
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                shift_code = VALUES(shift_code),
                schedule_type = VALUES(schedule_type),
                rotation_rule_id = VALUES(rotation_rule_id),
                updated_at = CURRENT_TIMESTAMP
            `,
            [
              employee.employee_no,
              dateKey(year, month, day),
              shiftCode,
              scheduleType,
              rule.id,
            ],
          );
        }
      }

      for (const change of changes) {
        await execute(
          `
            INSERT INTO shift_schedule_changes (
              employee_no,
              change_date,
              from_shift,
              to_shift,
              off_date,
              rotation_rule_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            change.employee_no,
            change.change_date,
            change.from_shift,
            change.to_shift,
            change.off_date,
            change.rotation_rule_id,
          ],
        );
      }

    return NextResponse.json({
      success: true,
      year,
      month,
      scheduleCount: employees.length * getDaysInMonth(year, month),
      changeCount: changes.length,
      fairness: fairnessByEmployee,
      fairnessSummary: {
        rule: "D and OFF count as DAY; N counts as NIGHT",
        maxAbsoluteDifference,
        isCumulativelyBalanced,
        selectedRotationDates: rotationSummary.waveAnchors,
        monthlyShiftCounts,
        monthlyShiftRule: 'Each employee may have at most 16 D shifts and 16 N shifts in one generated month.',
        totalAbsoluteDifference: rotationSummary.totalAbsoluteDifference,
      },
      message: `Schedule generated successfully. Change Shift uses fixed calendar windows and each employee is limited to at most 16 D shifts and 16 N shifts per generated month. Existing schedule rows were updated without creating duplicate records.`,
    });
  } catch (error) {
    console.error("POST shift schedule generate failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate schedule.",
      },
      { status: 500 },
    );
  }
}
