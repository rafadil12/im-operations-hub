import { describe, expect, it } from "vitest";
import { identityChange, linkChange, nameChanges } from "./dailyRemark";
import { renderRemark } from "./renderRemark";

describe("daily operation remarks", () => {
  it("counts an activity import in one sentence", () => {
    expect(
      renderRemark({ action: "import", summary: "", objectType: "activities", objectRef: "24" }, "en")
    ).toBe("Imported 24 activities");
    expect(
      renderRemark({ action: "import", summary: "", objectType: "activities", objectRef: "24" }, "cn")
    ).toBe("已导入 24 个活动");
  });

  it("names the PIC and the division that was assigned", () => {
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "user",
          objectRef: "62000970",
          changes: [
            identityChange({ name_en: "GALUH", name_cn: "加鲁" }),
            { field: "division", to: "MES", toCn: "制造" },
          ],
        },
        "en"
      )
    ).toBe("Created user 62000970 GALUH: division MES");
    expect(
      renderRemark(
        {
          action: "update",
          summary: "",
          objectType: "user",
          objectRef: "62000970",
          changes: [
            identityChange({ name_en: "GALUH", name_cn: "加鲁" }),
            { field: "pic" },
          ],
        },
        "cn"
      )
    ).toBe("已更新用户 62000970 加鲁：已取消 PIC 分配");
  });

  it("names a category language change and a subcategory parent", () => {
    const changes = nameChanges(
      { name_en: "Assembly", name_cn: "组装" },
      { name_en: "Assembly", name_cn: "流水线" }
    );
    expect(
      renderRemark({ action: "update", summary: "", objectType: "category", changes }, "en")
    ).toBe("Updated category Assembly: Chinese name from 组装 to 流水线");
    expect(
      renderRemark({ action: "update", summary: "", objectType: "category", changes }, "cn")
    ).toBe("已更新类别 流水线：中文名称从组装改为流水线");
    const parent = linkChange("category", null, { name_en: "Assembly", name_cn: "流水线" });
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "subcategory",
          changes: [identityChange({ name_en: "Bearing", name_cn: "轴承" }), parent!],
        },
        "cn"
      )
    ).toBe("已创建子类别 轴承：类别 流水线");
  });
});
