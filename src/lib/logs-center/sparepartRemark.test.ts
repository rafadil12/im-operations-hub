import { describe, expect, it } from "vitest";
import { renderRemark } from "./renderRemark";
import {
  goodsDocumentInput,
  materialUpdateChanges,
  movementLineText,
  type MovementRemarkLine,
} from "./sparepartRemark";

const receipt: MovementRemarkLine = {
  qty: 10,
  itemCode: "IT00004",
  uomCode: "PCS",
  recipient: null,
  fromEn: "Server Room",
  fromCn: "服务器机房",
  fromCode: "LOC-01",
  toEn: null,
  toCn: null,
  toCode: null,
  fromLevelEn: "1ST FLOOR",
  fromLevelCn: "一楼",
  fromLevelCode: "L01",
  toLevelEn: null,
  toLevelCn: null,
  toLevelCode: null,
};

describe("sparepart remarks", () => {
  it("describes a receipt with the location and floor", () => {
    expect(movementLineText(receipt, "101", "en")).toBe("10 PCS IT00004 into Server Room / 1ST FLOOR");
    expect(movementLineText(receipt, "101", "cn")).toBe("10 PCS IT00004 入 服务器机房 / 一楼");
  });

  it("keeps several lines in one goods document sentence", () => {
    const input = goodsDocumentInput([
      {
        doc_number: "MD202610080003",
        movement_type: "311",
        recipient: null,
        original_doc: null,
        qty: 5,
        item_code: "IT00004",
        uom_code: "PCS",
        from_en: "Server Room",
        from_cn: "服务器机房",
        from_code: "LOC-01",
        to_en: "Gudang Internal",
        to_cn: "内部仓库",
        to_code: "LOC-02",
        from_level_en: "1ST FLOOR",
        from_level_cn: "一楼",
        from_level_code: "L01",
        to_level_en: "2ND FLOOR",
        to_level_cn: "二楼",
        to_level_code: "L02",
      },
      {
        doc_number: "MD202610080003",
        movement_type: "311",
        recipient: null,
        original_doc: null,
        qty: 1,
        item_code: "IT00005",
        uom_code: "PCS",
        from_en: "Server Room",
        from_cn: "服务器机房",
        from_code: "LOC-01",
        to_en: "Gudang Internal",
        to_cn: "内部仓库",
        to_code: "LOC-02",
        from_level_en: "1ST FLOOR",
        from_level_cn: "一楼",
        from_level_code: "L01",
        to_level_en: "2ND FLOOR",
        to_level_cn: "二楼",
        to_level_code: "L02",
      },
    ]);
    expect(input).not.toBeNull();
    expect(renderRemark({ ...input!, summary: "" }, "en")).toBe(
      "Posted transfer MD202610080003: 5 PCS IT00004 from Server Room / 1ST FLOOR to Gudang Internal / 2ND FLOOR; 1 PCS IT00005 from Server Room / 1ST FLOOR to Gudang Internal / 2ND FLOOR"
    );
  });

  it("names only the material fields that changed", () => {
    const before = {
      name_en: "Network Cable",
      name_cn: "网线",
      brand_en: null,
      brand_cn: null,
      model: null,
      notes: null,
      erp_item_code: null,
      min_stock: 5,
      is_active: 1,
      category_name_en: "IT",
      category_name_cn: "IT",
      uom_code: "PCS",
    };
    const changes = materialUpdateChanges(before, { ...before, min_stock: 10 });
    expect(renderRemark({ action: "update", summary: "", objectType: "material", objectRef: "IT00004", changes }, "cn")).toBe(
      "已更新物料 IT00004 网线：最小库存从5改为10"
    );
  });
});
