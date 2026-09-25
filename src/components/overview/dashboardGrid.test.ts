import { describe, expect, it } from "vitest";
import { dashboardGridClass, sortDashboardModules } from "./dashboardGrid";

describe("dashboardGrid", () => {
  it("places organization before report so row-span packs beside ITSM+Daily", () => {
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
      "organization",
      "report",
      "safety",
      "sparepart",
      "training",
    ]);
  });

  it("assigns wireframe spans on the 6-column grid", () => {
    expect(dashboardGridClass("itsm")).toContain("xl:col-span-2");
    expect(dashboardGridClass("report")).toContain("xl:col-span-4");
    expect(dashboardGridClass("organization")).toContain("xl:row-span-2");
    expect(dashboardGridClass("safety")).toContain("xl:col-span-3");
    expect(dashboardGridClass("training")).toContain("col-span-full");
  });
});
