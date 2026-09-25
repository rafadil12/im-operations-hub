export type OrganizationEmployeeRow = {
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  position_id: number | null;
  position_name_en: string | null;
  employment_status: string | null;
};

export type OrganizationAttendanceRow = {
  employee_no: string;
  attendance_date: string;
  attendance_value: string;
};

export type OrganizationDepartmentSummary = {
  department: string;
  employees: number;
  present: number;
  leave: number;
  mc: number;
  upl: number;
  absent: number;
  attendanceRate: number;
};

export type OrganizationChartPerson = {
  nameEn: string;
  nameCn: string;
};

export type OrganizationChartDivision = {
  name: string;
  personnelCount: number;
  people: OrganizationChartPerson[];
};

export type OrganizationChart = {
  company: string;
  leader: string;
  divisions: OrganizationChartDivision[];
};

export type OrganizationOverviewMetrics = {
  totalPersonel: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  attendanceRate: number;
  orgChart: OrganizationChart;
  departmentPerformance: OrganizationDepartmentSummary[];
};
