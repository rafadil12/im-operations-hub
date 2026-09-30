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
      "safety",
      "sparepart",
      "training",
      "report",
      "organization",
    ]);
  });

  it("assigns wireframe spans on the 30-track grid", () => {
    expect(dashboardGridClass("itsm")).toContain("xl:col-span-[10]");
    expect(dashboardGridClass("safety")).toContain("xl:col-span-[10]");
    expect(dashboardGridClass("sparepart")).toContain("xl:col-span-[15]");
    expect(dashboardGridClass("training")).toContain("xl:col-span-[15]");
    expect(dashboardGridClass("report")).toContain("xl:col-span-[12]");
    expect(dashboardGridClass("organization")).toContain("xl:col-span-[18]");
  });
});
