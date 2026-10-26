import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";
import { permissionListChange, roleUpdateChanges } from "./roleRemark";

describe("role remarks", () => {
  it("names a new role and the permissions that were added", () => {
    const permissions = permissionListChange([], ["View sparepart stock overview", "Reopen a submitted weekly report for editing"]);
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "role",
          objectRef: "supervisor",
          changes: permissions ? [permissions] : [],
        },
        "en"
      )
    ).toBe(
      "Created role supervisor: added Reopen a submitted weekly report for editing, View sparepart stock overview"
    );
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "role",
          objectRef: "supervisor",
          changes: permissions ? [permissions] : [],
        },
        "cn"
      )
    ).toBe(
      "已创建角色 supervisor：新增 Reopen a submitted weekly report for editing、View sparepart stock overview"
    );
  });

  it("names added and removed permissions on one role update", () => {
    const changes = roleUpdateChanges({
      beforeName: "supervisor",
      afterName: "supervisor",
      beforeDescription: null,
      afterDescription: null,
      beforePermissions: ["Reopen a submitted weekly report for editing"],
      afterPermissions: ["View sparepart stock overview"],
    });
    expect(
      renderRemark({ action: "update", summary: "", objectType: "role", objectRef: "supervisor", changes }, "en")
    ).toBe(
      "Updated role supervisor: added View sparepart stock overview, removed Reopen a submitted weekly report for editing"
    );
    expect(
      renderRemark({ action: "update", summary: "", objectType: "role", objectRef: "supervisor", changes }, "cn")
    ).toBe("已更新角色 supervisor：新增 View sparepart stock overview，移除 Reopen a submitted weekly report for editing");
  });

  it("names a role rename and skips an unchanged permission set", () => {
    const changes = roleUpdateChanges({
      beforeName: "operator",
      afterName: "leader",
      beforeDescription: "Floor",
      afterDescription: "Line",
      beforePermissions: ["View sparepart stock overview"],
      afterPermissions: ["View sparepart stock overview"],
    });
    expect(
      renderRemark({ action: "delete", summary: "", objectType: "role", objectRef: "operator" }, "cn")
    ).toBe("已删除角色 operator");
    expect(
      renderRemark({ action: "update", summary: "", objectType: "role", objectRef: "leader", changes }, "en")
    ).toBe("Updated role leader: name from operator to leader, description from Floor to Line");
  });
});
