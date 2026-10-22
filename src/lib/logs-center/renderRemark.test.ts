import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";

describe("renderRemark", () => {
  it("keeps legacy rows as stored", () => {
    expect(renderRemark({ action: "update", summary: "update daily_operation_record" }, "en")).toBe(
      "update daily_operation_record"
    );
  });

  it("combines activity field changes and a goods issue in one sentence", () => {
    const event = {
      action: "update",
      summary: "",
      objectType: "activity",
      objectRef: "1216",
      changes: [
        { field: "status", from: "Pending", to: "Completed", fromCn: "待处理", toCn: "已完成" },
        { field: "solution" },
      ],
      links: [
        {
          type: "goods_issue",
          ref: "MD202610080001",
          detailEn: "2 PCS IT00004 issued to MES 1216 from Server Room",
          detailCn: "2 PCS IT00004 发给 MES 1216，从 Server Room",
        },
      ],
    };
    expect(renderRemark(event, "en")).toBe(
      "Updated activity 1216: status from Pending to Completed, solution updated, and posted goods issue MD202610080001: 2 PCS IT00004 issued to MES 1216 from Server Room"
    );
    expect(renderRemark(event, "cn")).toBe(
      "已更新活动 1216：状态从待处理改为已完成，解决方案已更新，并过账发货 MD202610080001：2 PCS IT00004 发给 MES 1216，从 Server Room"
    );
  });

  it("names a category change", () => {
    expect(
      renderRemark(
        {
          action: "update",
          summary: "",
          objectType: "activity",
          objectRef: "1216",
          changes: [{ field: "category", from: "Assembly", to: "IT", fromCn: "流水线", toCn: "IT" }],
        },
        "en"
      )
    ).toBe("Updated activity 1216: category from Assembly to IT");
  });

  it("names the account on create, deactivate, password reset, and delete", () => {
    const identity = { field: "name", to: "GALUH", toCn: "加鲁" };
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "account",
          objectRef: "62000970",
          changes: [identity, { field: "role", to: "Supervisor" }],
        },
        "en"
      )
    ).toBe("Created account 62000970 GALUH: role Supervisor");
    expect(
      renderRemark(
        {
          action: "update",
          summary: "",
          objectType: "account",
          objectRef: "62000970",
          changes: [
            identity,
            { field: "status", from: "Active", to: "Inactive", fromCn: "启用", toCn: "停用" },
          ],
        },
        "cn"
      )
    ).toBe("已更新账号 62000970 加鲁：状态从启用改为停用");
    expect(
      renderRemark(
        {
          action: "update",
          summary: "",
          objectType: "account",
          objectRef: "62000970",
          changes: [identity, { field: "password" }],
        },
        "en"
      )
    ).toBe("Updated account 62000970 GALUH: password reset");
    expect(
      renderRemark(
        {
          action: "delete",
          summary: "",
          objectType: "account",
          objectRef: "62000970",
          changes: [identity],
        },
        "en"
      )
    ).toBe("Deleted account 62000970 GALUH");
  });

  it("names sparepart documents, materials, and imports", () => {
    expect(
      renderRemark(
        {
          action: "post",
          summary: "",
          objectType: "goods receipt",
          objectRef: "MD202610080002",
          changes: [{ field: "lines", to: "10 PCS IT00004 into Server Room / 1ST FLOOR" }],
        },
        "en"
      )
    ).toBe("Posted goods receipt MD202610080002: 10 PCS IT00004 into Server Room / 1ST FLOOR");
    expect(
      renderRemark(
        {
          action: "post",
          summary: "",
          objectType: "goods issue",
          objectRef: "MD202610080001",
          changes: [
            {
              field: "lines",
              to: "2 PCS IT00004 issued to AULIA, from Server Room / 1ST FLOOR",
              toCn: "2 PCS IT00004 发给 AULIA，从 服务器机房 / 一楼",
            },
          ],
        },
        "cn"
      )
    ).toBe("已过账发货 MD202610080001：2 PCS IT00004 发给 AULIA，从 服务器机房 / 一楼");
    expect(
      renderRemark(
        {
          action: "reverse",
          summary: "",
          objectType: "goods issue",
          objectRef: "MD202610080004",
          changes: [{ field: "lines", to: "2 PCS IT00004 issued to AULIA, from Server Room / 1ST FLOOR" }],
          links: [{ type: "reversal_of", ref: "MD202610080001" }],
        },
        "en"
      )
    ).toBe(
      "Reversed goods issue MD202610080004: 2 PCS IT00004 issued to AULIA, from Server Room / 1ST FLOOR, of MD202610080001"
    );
    expect(
      renderRemark(
        {
          action: "update",
          summary: "",
          objectType: "material",
          objectRef: "IT00004",
          changes: [
            { field: "name", to: "Network Cable", toCn: "网线" },
            { field: "min_stock", from: "5", to: "10" },
          ],
        },
        "en"
      )
    ).toBe("Updated material IT00004 Network Cable: minimum stock from 5 to 10");
    expect(
      renderRemark(
        {
          action: "import",
          summary: "",
          objectType: "materials",
          objectRef: "40",
        },
        "cn"
      )
    ).toBe("已导入 40 个物料");
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "storage location",
          objectRef: "LOC-01",
          changes: [{ field: "name", to: "Server Room", toCn: "服务器机房" }],
        },
        "cn"
      )
    ).toBe("已创建库位 LOC-01 服务器机房");
    expect(
      renderRemark(
        {
          action: "create",
          summary: "",
          objectType: "unit of measure",
          objectRef: "PACK",
          changes: [{ field: "name", to: "Pack", toCn: "包" }],
        },
        "en"
      )
    ).toBe("Created unit of measure PACK Pack");
  });

  it("renders sign-in results without the stored English sentence", () => {
    expect(
      renderRemark(
        { action: "login", summary: "Signed in", objectType: "session", changes: [{ field: "result", to: "signed_in" }] },
        "cn"
      )
    ).toBe("已登录");
    expect(
      renderRemark(
        { action: "login", summary: "Sign-in failed", objectType: "session", changes: [{ field: "result", to: "failed" }] },
        "en"
      )
    ).toBe("Sign-in failed");
  });
});
