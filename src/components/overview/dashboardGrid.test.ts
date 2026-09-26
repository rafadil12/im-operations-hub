import { describe, expect, it } from "vitest";
import { dashboardGridClass, sortDashboardModules } from "./dashboardGrid";

describe("dashboardGrid", () => {
  it("places modules in the dashboard wireframe order", () => {
    const sorted = sortDashboardModules([
      { id: "report" },
      { id: "training" },
      { id: "itsm" },
      { id: "safety" },
      { id: "organization" },
      { id: "sparepart" },
      { id: "daily-operation" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      "itsm",
      "daily-operation",
      "sparepart",
      "safety",
      "training",
      "report",
      "organization",
    ]);
  });

  it("assigns wireframe spans on the 6-column grid", () => {
    expect(dashboardGridClass("itsm")).toContain("xl:col-span-2");
    expect(dashboardGridClass("sparepart")).toContain("xl:col-span-2");
    expect(dashboardGridClass("safety")).toContain("xl:col-span-3");
    expect(dashboardGridClass("training")).toContain("xl:col-span-3");
    expect(dashboardGridClass("report")).toContain("col-span-full");
    expect(dashboardGridClass("organization")).toContain("col-span-full");
  });
});
