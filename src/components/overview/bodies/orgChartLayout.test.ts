import { describe, expect, it } from "vitest";

import { mapOrgChartToFlatNodes } from "./OrgChartView";

const labels = {
  departmentManager: "Department Manager",
  supervisor: "Supervisor",
  lead: "Lead",
  personel: "Personel",
};

describe("mapOrgChartToFlatNodes", () => {
  it("puts division leads under the supervisor", () => {
    const rows = mapOrgChartToFlatNodes(
      {
        company: "Intelligent Manufacturing Department",
        leader: { nameEn: "Wang Chunlai", nameCn: "王春来" },
        supervisor: { nameEn: "Antoni Lau", nameCn: "刘安东" },
        divisions: [
          {
            name: "IT",
            personnelCount: 2,
            people: [
              { nameEn: "Jonatan", nameCn: "Jonatan", isLead: true },
              { nameEn: "Iqbal Nugroho", nameCn: "Iqbal Nugroho" },
            ],
          },
        ],
      },
      labels,
      "en"
    );

    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get("supervisor")).toMatchObject({
      parentId: "manager",
      name: "Antoni Lau",
      role: "Supervisor",
    });
    expect(byId.get("division:IT")?.parentId).toBe("supervisor");
    expect(byId.get("person:IT:lead")).toMatchObject({
      parentId: "division:IT",
      name: "Jonatan",
      role: "Lead",
    });
    expect(byId.get("person:IT:0")).toMatchObject({
      parentId: "person:IT:lead",
      name: "Iqbal Nugroho",
      role: "Personel",
    });
  });

  it("uses the Chinese supervisor title", () => {
    const rows = mapOrgChartToFlatNodes(
      {
        company: "智能制造部",
        leader: { nameEn: "Wang Chunlai", nameCn: "王春来" },
        supervisor: { nameEn: "Antoni Lau", nameCn: "刘安东" },
        divisions: [],
      },
      { ...labels, supervisor: "导师" },
      "cn"
    );

    expect(rows.find((row) => row.id === "supervisor")).toMatchObject({
      name: "刘安东",
      role: "导师",
    });
  });
});
