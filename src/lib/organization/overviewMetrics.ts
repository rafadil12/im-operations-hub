import type {
  OrganizationAttendanceRow,
  OrganizationChart,
  OrganizationDepartmentSummary,
  OrganizationEmployeeRow,
  OrganizationOverviewMetrics,
} from "./types";
import { GM_EMPLOYEE_NO, isDirectoryStaffRow } from "./staffFilters";

const DIVISION_ORDER = ["MES", "IT", "Intelligent Logistics"] as const;
const PRESENT_VALUES = new Set(["10.5", "8", "4"]);
const LEAVE_VALUES = new Set(["AL", "MC", "UPL"]);

function displayName(row: OrganizationEmployeeRow): string {
  const name = row.name_en?.trim() || row.name_cn?.trim() || row.employee_no;
  return name.toUpperCase();
}

function normalizeDivisionName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed === "IT Infrastructure") return "IT";
  return trimmed;
}

function buildOrgChart(employees: OrganizationEmployeeRow[]): OrganizationChart {
  const leaderRow = employees.find((row) => row.employee_no === GM_EMPLOYEE_NO);
  const leader = leaderRow ? displayName(leaderRow) : "WANG CHUNLAI";

  const countsByDivision = new Map<string, number>();

  for (const row of employees) {
    if (!isDirectoryStaffRow(row)) continue;

    const division = normalizeDivisionName(row.division_name_en);
    if (!division) continue;

    countsByDivision.set(division, (countsByDivision.get(division) ?? 0) + 1);
  }

  const divisions = DIVISION_ORDER.map((name) => ({
    name,
    personnelCount: countsByDivision.get(name) ?? 0,
  }));

  return {
    company: "Intelligent Manufacturing Department",
    leader,
    divisions,
  };
}

function staffEmployeeNos(employees: OrganizationEmployeeRow[]): Set<string> {
  return new Set(
    employees.filter(isDirectoryStaffRow).map((row) => row.employee_no)
  );
}

function countMonthlyAttendance(
  employees: OrganizationEmployeeRow[],
  attendanceRows: OrganizationAttendanceRow[]
): {
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  attendanceRate: number;
} {
  const eligible = staffEmployeeNos(employees);
  let presentCount = 0;
  let absentCount = 0;
  let onLeaveCount = 0;
  let scoredDays = 0;

  for (const row of attendanceRows) {
    if (!eligible.has(row.employee_no)) continue;

    const value = row.attendance_value;
    if (PRESENT_VALUES.has(value)) {
      presentCount += 1;
      scoredDays += 1;
    } else if (value === "A") {
      absentCount += 1;
      scoredDays += 1;
    } else if (LEAVE_VALUES.has(value)) {
      onLeaveCount += 1;
      scoredDays += 1;
    }
  }

  const attendanceRate =
    scoredDays > 0 ? Math.round((presentCount / scoredDays) * 1000) / 10 : 0;

  return { presentCount, absentCount, onLeaveCount, attendanceRate };
}

function monthContext(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  const totalDays = new Date(year, month, 0).getDate();
  const dayKeys = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  return { totalDays, dayKeys };
}

function buildDepartmentPerformance(
  employees: OrganizationEmployeeRow[],
  attendanceRows: OrganizationAttendanceRow[],
  totalDays: number,
  dayKeys: string[]
): OrganizationDepartmentSummary[] {
  const attendanceMap = new Map<string, string>();
  for (const row of attendanceRows) {
    attendanceMap.set(`${row.employee_no}|${row.attendance_date}`, row.attendance_value);
  }

  const map = new Map<
    string,
    Omit<OrganizationDepartmentSummary, "attendanceRate">
  >();

  for (const employee of employees) {
    if (!isDirectoryStaffRow(employee)) continue;

    const department = normalizeDivisionName(employee.division_name_en);
    if (!department) continue;

    const current = map.get(department) ?? {
      department,
      employees: 0,
      present: 0,
      leave: 0,
      mc: 0,
      upl: 0,
      absent: 0,
    };

    current.employees += 1;

    for (const dayKey of dayKeys) {
      const value = attendanceMap.get(`${employee.employee_no}|${dayKey}`);
      if (!value) continue;

      if (PRESENT_VALUES.has(value)) {
        current.present += 1;
      } else if (value === "AL") {
        current.leave += 1;
      } else if (value === "MC") {
        current.mc += 1;
      } else if (value === "UPL") {
        current.upl += 1;
      } else if (value === "A") {
        current.absent += 1;
      }
    }

    map.set(department, current);
  }

  const orderIndex = (name: string) => {
    const index = DIVISION_ORDER.indexOf(name as (typeof DIVISION_ORDER)[number]);
    return index === -1 ? DIVISION_ORDER.length : index;
  };

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      attendanceRate:
        item.employees * totalDays > 0
          ? Math.round((item.present / (item.employees * totalDays)) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => orderIndex(a.department) - orderIndex(b.department));
}

export function computeOrganizationOverviewMetrics(input: {
  employees: OrganizationEmployeeRow[];
  attendanceRows: OrganizationAttendanceRow[];
  referenceDate?: Date;
}): OrganizationOverviewMetrics {
  const directoryStaff = input.employees.filter(isDirectoryStaffRow);
  const monthly = countMonthlyAttendance(input.employees, input.attendanceRows);
  const { totalDays, dayKeys } = monthContext(input.referenceDate);

  return {
    totalPersonel: directoryStaff.length,
    presentCount: monthly.presentCount,
    absentCount: monthly.absentCount,
    onLeaveCount: monthly.onLeaveCount,
    attendanceRate: monthly.attendanceRate,
    orgChart: buildOrgChart(input.employees),
    departmentPerformance: buildDepartmentPerformance(
      input.employees,
      input.attendanceRows,
      totalDays,
      dayKeys
    ),
  };
}
