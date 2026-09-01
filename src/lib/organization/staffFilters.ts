import type { OrganizationEmployeeRow } from "./types";

export const GM_EMPLOYEE_NO = "620000125";

/** Same rules as Employee Directory (`isDirectoryEmployee` on employees page). */
export function isDirectoryStaffRow(row: OrganizationEmployeeRow): boolean {
  return (
    row.employee_no !== GM_EMPLOYEE_NO &&
    row.employee_no !== "SUPERADMIN" &&
    row.position_id != null &&
    row.employment_status === "Active"
  );
}
