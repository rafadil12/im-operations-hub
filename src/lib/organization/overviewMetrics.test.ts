import { describe, expect, it } from "vitest";

import { computeOrganizationOverviewMetrics } from "./overviewMetrics";

describe("computeOrganizationOverviewMetrics", () => {
  it("uses monthly present / absent / AL+MC+UPL totals", () => {
    const metrics = computeOrganizationOverviewMetrics({
      employees: [
        {
          employee_no: "620000125",
          name_en: "Wang Chunlai",
          name_cn: null,
          division_name_en: null,
          position_id: 1,
          position_name_en: "General Manager",
          employment_status: "Active",
        },
        {
          employee_no: "E001",
          name_en: "Ari Wira Saputra",
          name_cn: null,
          division_name_en: "MES",
          position_id: 2,
          position_name_en: "MES Staff",
          employment_status: "Active",
        },
        {
          employee_no: "E002",
          name_en: "Antoni Lau",
          name_cn: null,
          division_name_en: "IT",
          position_id: 3,
          position_name_en: "IT Staff",
          employment_status: "Active",
        },
        {
          employee_no: "E003",
          name_en: "Galuh",
          name_cn: null,
          division_name_en: "Intelligent Logistics",
          position_id: 4,
          position_name_en: "Intelligent Logistics Staff",
          employment_status: "Active",
        },
      ],
      attendanceRows: [
        { employee_no: "E001", attendance_date: "2026-08-01", attendance_value: "8" },
        { employee_no: "E001", attendance_date: "2026-08-02", attendance_value: "AL" },
        { employee_no: "E002", attendance_date: "2026-08-01", attendance_value: "A" },
        { employee_no: "E002", attendance_date: "2026-08-02", attendance_value: "MC" },
        { employee_no: "E003", attendance_date: "2026-08-01", attendance_value: "UPL" },
        { employee_no: "E003", attendance_date: "2026-08-02", attendance_value: "10.5" },
      ],
      referenceDate: new Date("2026-08-15"),
    });

    expect(metrics.totalPersonel).toBe(3);
    expect(metrics.presentCount).toBe(2);
    expect(metrics.absentCount).toBe(1);
    expect(metrics.onLeaveCount).toBe(3);
    expect(metrics.attendanceRate).toBe(33.3);
    expect(metrics.orgChart.leader).toBe("WANG CHUNLAI");
    expect(metrics.orgChart.divisions[2]?.personnelCount).toBe(1);
    expect(metrics.departmentPerformance).toHaveLength(3);
    expect(metrics.departmentPerformance[2]?.employees).toBe(1);
  });

  it("excludes on-leave and unassigned-position staff from division counts", () => {
    const metrics = computeOrganizationOverviewMetrics({
      employees: [
        {
          employee_no: "IL01",
          name_en: "Active Staff",
          name_cn: null,
          division_name_en: "Intelligent Logistics",
          position_id: 10,
          position_name_en: "Intelligent Logistics Staff",
          employment_status: "Active",
        },
        {
          employee_no: "IL02",
          name_en: "On Leave Staff",
          name_cn: null,
          division_name_en: "Intelligent Logistics",
          position_id: 11,
          position_name_en: "Intelligent Logistics Staff",
          employment_status: "On Leave",
        },
        {
          employee_no: "IL03",
          name_en: "No Position",
          name_cn: null,
          division_name_en: "Intelligent Logistics",
          position_id: null,
          position_name_en: null,
          employment_status: "Active",
        },
      ],
      attendanceRows: [],
    });

    expect(metrics.orgChart.divisions[2]?.personnelCount).toBe(1);
    expect(metrics.departmentPerformance[0]?.employees).toBe(1);
  });
});
