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
          detailEn: "2 PCS IT00004 to MES 1216 from Server Room",
          detailCn: "2 PCS IT00004 发给 MES 1216，从 Server Room",
        },
      ],
    };
    expect(renderRemark(event, "en")).toBe(
      "Updated activity 1216: status from Pending to Completed, solution updated, and posted goods issue MD202610080001: 2 PCS IT00004 to MES 1216 from Server Room"
    );
    expect(renderRemark(event, "cn")).toBe(
      "已更新活动 1216：状态从待处理改为已完成，解决方案已更新，并过账发货 MD202610080001：2 PCS IT00004 发给 MES 1216，从 Server Room"
    );
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
