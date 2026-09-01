import type { ReportWeekAttachment } from "./types";

export function attachmentKey(weekId: number, areaId: number): string {
  return `${weekId}-${areaId}`;
}

export function buildAttachmentMap(
  attachments: ReportWeekAttachment[]
): Map<string, ReportWeekAttachment[]> {
  const map = new Map<string, ReportWeekAttachment[]>();
  for (const attachment of attachments) {
    const key = attachmentKey(attachment.weekId, attachment.areaId);
    const list = map.get(key);
    if (list) {
      list.push(attachment);
    } else {
      map.set(key, [attachment]);
    }
  }
  return map;
}

export function getAttachmentsForWeekArea(
  map: Map<string, ReportWeekAttachment[]>,
  weekId: number,
  areaId: number
): ReportWeekAttachment[] {
  return map.get(attachmentKey(weekId, areaId)) ?? [];
}
