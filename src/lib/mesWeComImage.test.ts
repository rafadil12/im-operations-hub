import { describe, expect, it } from "vitest";

import { renderMesRecordWeComImage } from "@/lib/mesWeComImage";
import type { MesDataRow } from "@/lib/types";

describe("renderMesRecordWeComImage", () => {
  it("renders a valid WeCom-sized PNG card", async () => {
    const record: MesDataRow = {
      id: 1,
      user_id: 1,
      division_id: 1,
      category_id: 1,
      subcategory_id: 1,
      type_id: 1,
      status_id: 1,
      pic_cn: "林石令",
      pic_en: "JONATAN",
      division_cn: "IT",
      division_en: "IT",
      category_cn: "安防监控",
      category_en: "Security Monitoring",
      subcategory_cn: "监控故障",
      subcategory_en: "Surveillance Failure",
      type_cn: "问题",
      type_en: "Problem",
      status_cn: "已完成",
      status_en: "Completed",
      description_cn: "成品仓前方的 JK520 监控摄像头朝向公司外围，未能有效覆盖停车区域。",
      description_en:
        "The CCTV camera JK520 in front of the Finished Goods Warehouse was facing outside the company premises and did not adequately cover the parking area.",
      solution_cn: "重新调整监控摄像头的拍摄角度，确保停车区域得到有效覆盖。",
      solution_en:
        "Repositioned the CCTV camera to the correct viewing angle to ensure proper coverage of the parking area.",
      start_time: "2026-10-28T08:00:00.000Z",
      end_time: "2026-10-28T08:15:00.000Z",
      created_at: "2026-10-28T08:15:00.000Z",
      updated_at: "2026-10-28T08:15:00.000Z",
    };

    const image = await renderMesRecordWeComImage(record);

    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1600);
    expect(image.readUInt32BE(20)).toBe(754);
    expect(image.byteLength).toBeLessThan(2 * 1024 * 1024);
  }, 20_000);

  it("grows the canvas when problem and solution text are long", async () => {
    const longText =
      "This is a deliberately long activity description that must wrap onto multiple lines without being clipped by the PNG canvas. ".repeat(12);
    const record = {
      id: 2,
      user_id: 1,
      division_id: 1,
      category_id: 1,
      subcategory_id: 1,
      type_id: 1,
      status_id: 1,
      pic_cn: "测试用户",
      pic_en: "TEST USER",
      division_cn: "信息技术",
      division_en: "IT",
      category_cn: "安防监控",
      category_en: "Security Monitoring",
      subcategory_cn: "监控故障",
      subcategory_en: "Surveillance Failure",
      type_cn: "问题",
      type_en: "Problem",
      status_cn: "已完成",
      status_en: "Completed",
      description_cn: longText,
      description_en: longText,
      solution_cn: longText,
      solution_en: longText,
      start_time: "2026-10-28T08:00:00.000Z",
      end_time: "2026-10-28T08:15:00.000Z",
      created_at: null,
      updated_at: null,
    } satisfies MesDataRow;

    const image = await renderMesRecordWeComImage(record);

    expect(image.readUInt32BE(20)).toBeGreaterThan(754);
    expect(image.byteLength).toBeLessThan(2 * 1024 * 1024);
  }, 20_000);
});
