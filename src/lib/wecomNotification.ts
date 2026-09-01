import type { MesDataRow } from "@/lib/types";

const WECOM_TIMEOUT_MS = 8_000;

function formatDuration(startTime: string, endTime: string | null): string {
  if (!endTime) return "-";

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "-";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function typeColor(typeEn: string | null | undefined): string {
  if (typeEn === "Problem") return "warning";
  if (typeEn === "Task") return "info";
  if (typeEn === "Maintenance") return "comment";
  return "info";
}

/** Build the WeCom markdown message for one activity record. */
export function formatMesRecordWeComMessage(record: MesDataRow): string {
  const duration = formatDuration(record.start_time, record.end_time);
  const color = typeColor(record.type_en);

  return [
    `<font color="${color}">【${record.type_cn ?? "-"} ${record.type_en ? `(${record.type_en})` : ""}】</font>`,
    "-----------------------------",
    `用户 User          : ${record.pic_cn ?? "-"} ${record.pic_en ? `(${record.pic_en})` : ""}`,
    `部门 Division      : ${record.division_cn ?? "-"} ${record.division_en ? `(${record.division_en})` : ""}`,
    `时长 Duration      : ${duration}`,
    `状态 Status        : ${record.status_cn ?? "-"} ${record.status_en ? `(${record.status_en})` : ""}`,
    `类别 Category      : ${record.category_cn ?? "-"} ${record.category_en ? `(${record.category_en})` : ""}`,
    `子类别 SubCategory : ${record.subcategory_cn ?? "-"} ${record.subcategory_en ? `(${record.subcategory_en})` : ""}`,
    `问题 Problem       : ${record.description_cn ?? "-"} ${record.description_en ?? "-"}`,
    `解决方案 Solution  : ${record.solution_cn ?? "-"} ${record.solution_en ?? "-"}`,
  ].join("\n");
}

/** Send a markdown message to the WeCom webhook. Throws on HTTP / API errors. */
export async function sendWeComNotification(content: string): Promise<void> {
  const webhookUrl = process.env.WECOM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("WECOM_WEBHOOK_URL is not configured.");
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WECOM_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`WeCom HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
    };

    if (result.errcode !== 0) {
      throw new Error(`WeCom error: ${result.errmsg ?? result.errcode}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort: format + send WeCom for one record.
 * Never throws — failures are logged only so DB writes stay successful.
 */
export async function notifyMesRecordCreated(record: MesDataRow): Promise<void> {
  try {
    const message = formatMesRecordWeComMessage(record);
    await sendWeComNotification(message);
  } catch (error) {
    console.error(`Failed to send WeCom notification for record ${record.id}:`, error);
  }
}

/**
 * Best-effort: send one WeCom notification per record, sequentially.
 * Never throws — failures are logged only.
 */
export async function notifyMesRecordsCreated(records: MesDataRow[]): Promise<void> {
  for (const record of records) {
    await notifyMesRecordCreated(record);
  }
}
