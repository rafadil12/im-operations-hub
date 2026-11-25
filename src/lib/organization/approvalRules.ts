export type OrganizationMember = {
  userId: number;
  employeeNo: string;
  nameEn: string | null;
  nameCn: string | null;
  positionNameEn: string | null;
  divisionId: number | null;
  employmentStatus: string | null;
};

export function isSupervisorPosition(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === "supervisor";
}

function isStaffPosition(name: string): boolean {
  return name.trim().toLowerCase().endsWith("staff");
}

function isTechnicianPosition(name: string): boolean {
  return name.trim().toLowerCase().endsWith("technician");
}

function staffPositionName(technicianName: string): string {
  return technicianName.replace(/technician$/i, "Staff");
}

function preferActive(members: OrganizationMember[]): OrganizationMember | null {
  if (!members.length) return null;
  return [...members].sort((left, right) => {
    const rank = (status: string | null) => (status === "Active" ? 0 : 1);
    const byStatus = rank(left.employmentStatus) - rank(right.employmentStatus);
    if (byStatus !== 0) return byStatus;
    return left.userId - right.userId;
  })[0];
}

/**
 * Leave approval stops at Supervisor.
 * Technician -> Staff in the same division.
 * Staff -> the person holding Supervisor.
 * Supervisor and General Manager have no approver above them.
 */
export function resolveManagerUserId(
  member: OrganizationMember,
  members: OrganizationMember[],
): number | null {
  const positionName = member.positionNameEn?.trim() ?? "";
  if (!positionName) return null;

  const normalized = positionName.toLowerCase();
  if (normalized === "general manager" || normalized === "supervisor") {
    return null;
  }

  if (isStaffPosition(positionName)) {
    const supervisors = members.filter(
      (candidate) =>
        candidate.userId !== member.userId && isSupervisorPosition(candidate.positionNameEn),
    );
    return preferActive(supervisors)?.userId ?? null;
  }

  if (isTechnicianPosition(positionName)) {
    const expectedStaff = staffPositionName(positionName).toLowerCase();
    const staff = members.filter((candidate) => {
      if (candidate.userId === member.userId) return false;
      if (candidate.positionNameEn?.trim().toLowerCase() !== expectedStaff) return false;
      if (member.divisionId == null || candidate.divisionId == null) return true;
      return candidate.divisionId === member.divisionId;
    });
    return preferActive(staff)?.userId ?? null;
  }

  return null;
}

export function requiredManagerLabel(positionName: string): string | null {
  if (isStaffPosition(positionName)) return "Supervisor";
  if (isTechnicianPosition(positionName)) return staffPositionName(positionName);
  return null;
}
