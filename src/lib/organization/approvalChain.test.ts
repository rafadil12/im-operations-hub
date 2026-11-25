import { describe, expect, it } from "vitest";
import {
  isSupervisorPosition,
  resolveManagerUserId,
  type OrganizationMember,
} from "./approvalRules";

function member(
  overrides: Partial<OrganizationMember> & Pick<OrganizationMember, "userId" | "positionNameEn">,
): OrganizationMember {
  return {
    employeeNo: String(overrides.userId),
    nameEn: null,
    nameCn: null,
    divisionId: overrides.divisionId ?? 1,
    employmentStatus: "Active",
    ...overrides,
  };
}

const directory: OrganizationMember[] = [
  member({ userId: 1, positionNameEn: "General Manager", divisionId: null }),
  member({ userId: 2, positionNameEn: "Supervisor", divisionId: null, nameEn: "Antoni Lau" }),
  member({ userId: 3, positionNameEn: "IT Staff", divisionId: 10 }),
  member({ userId: 4, positionNameEn: "IT Technician", divisionId: 10 }),
  member({ userId: 5, positionNameEn: "MES Staff", divisionId: 20 }),
  member({ userId: 6, positionNameEn: "MES Technician", divisionId: 20 }),
];

describe("resolveManagerUserId", () => {
  it("stops the approval chain at Supervisor", () => {
    expect(resolveManagerUserId(directory[1], directory)).toBeNull();
    expect(resolveManagerUserId(directory[0], directory)).toBeNull();
    expect(isSupervisorPosition("Supervisor")).toBe(true);
  });

  it("sends staff leave to the Supervisor holder", () => {
    expect(resolveManagerUserId(directory[2], directory)).toBe(2);
    expect(resolveManagerUserId(directory[4], directory)).toBe(2);
  });

  it("sends a technician to the staff member in the same division", () => {
    expect(resolveManagerUserId(directory[3], directory)).toBe(3);
    expect(resolveManagerUserId(directory[5], directory)).toBe(5);
  });

  it("does not use a staff member from another division", () => {
    const technician = member({
      userId: 7,
      positionNameEn: "IT Technician",
      divisionId: 10,
    });
    const otherDivision = directory.filter((person) => person.userId !== 3);
    expect(resolveManagerUserId(technician, otherDivision)).toBeNull();
  });

  it("prefers the active Supervisor when more than one exists", () => {
    const inactive = member({
      userId: 8,
      positionNameEn: "Supervisor",
      employmentStatus: "Inactive",
    });
    const staff = member({ userId: 9, positionNameEn: "IT Staff", divisionId: 10 });
    expect(resolveManagerUserId(staff, [inactive, directory[1], staff])).toBe(2);
  });
});
