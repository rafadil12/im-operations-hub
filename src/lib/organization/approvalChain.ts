import { query } from "@/lib/db";
import {
  requiredManagerLabel,
  resolveManagerUserId,
  type OrganizationMember,
} from "./approvalRules";

export type { OrganizationMember } from "./approvalRules";
export { isSupervisorPosition, resolveManagerUserId } from "./approvalRules";

export async function loadOrganizationMembers(): Promise<OrganizationMember[]> {
  const rows = await query<
    {
      user_id: number;
      employee_no: string;
      name_en: string | null;
      name_cn: string | null;
      position_name_en: string | null;
      division_id: number | null;
      employment_status: string | null;
    }[]
  >(
    `
      SELECT
        u.id AS user_id,
        u.employee_no,
        u.name_en,
        u.name_cn,
        p.name_en AS position_name_en,
        p.division_id,
        eo.employment_status
      FROM users u
      INNER JOIN employee_organization eo
        ON eo.user_id = u.id
      LEFT JOIN positions p
        ON p.id = eo.position_id
      WHERE u.employee_no <> 'SUPERADMIN'
    `,
  );

  return rows.map((row) => ({
    userId: Number(row.user_id),
    employeeNo: row.employee_no,
    nameEn: row.name_en,
    nameCn: row.name_cn,
    positionNameEn: row.position_name_en,
    divisionId: row.division_id == null ? null : Number(row.division_id),
    employmentStatus: row.employment_status,
  }));
}

export async function loadApprovalManagersByEmployeeNo(): Promise<
  Map<string, OrganizationMember | null>
> {
  const members = await loadOrganizationMembers();
  const byId = new Map(members.map((member) => [member.userId, member]));
  const managers = new Map<string, OrganizationMember | null>();

  for (const member of members) {
    const managerId = resolveManagerUserId(member, members);
    managers.set(member.employeeNo, managerId == null ? null : (byId.get(managerId) ?? null));
  }

  return managers;
}

export async function resolveAutomaticManagerId(
  userId: number,
  positionId: number | null,
): Promise<number | null> {
  if (positionId == null) return null;

  const positionRows = await query<{ name_en: string; division_id: number | null }[]>(
    `
      SELECT name_en, division_id
      FROM positions
      WHERE id = ?
      LIMIT 1
    `,
    [positionId],
  );

  if (!positionRows.length) {
    throw new Error("Selected position was not found.");
  }

  const position = positionRows[0];
  const members = await loadOrganizationMembers();
  const managerId = resolveManagerUserId(
    {
      userId,
      employeeNo: members.find((member) => member.userId === userId)?.employeeNo ?? "",
      nameEn: null,
      nameCn: null,
      positionNameEn: position.name_en,
      divisionId: position.division_id == null ? null : Number(position.division_id),
      employmentStatus: "Active",
    },
    members,
  );

  const requiredLabel = requiredManagerLabel(position.name_en);
  if (requiredLabel && managerId == null) {
    throw new Error(
      requiredLabel === "Supervisor"
        ? "Supervisor was not found."
        : `Manager "${requiredLabel}" was not found.`,
    );
  }

  return managerId;
}
