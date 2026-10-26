const WECOM_TIMEOUT_MS = 8_000;
const WECOM_MARKDOWN_MAX_BYTES = 3_800;

export function splitWeComMarkdown(content: string): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of content.split("\n")) {
    const candidate = current ? `${current}\n${line}` : line;
    if (Buffer.byteLength(candidate, "utf8") <= WECOM_MARKDOWN_MAX_BYTES) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    current = line;
  }

  if (current) chunks.push(current);
  return chunks;
}

export async function sendAttendanceWeComNotification(content: string): Promise<void> {
  const webhookUrl = process.env.WECOM_ATTENDANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("WECOM_ATTENDANCE_WEBHOOK_URL is not configured.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WECOM_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`WeCom HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as { errcode?: number; errmsg?: string };
    if (result.errcode !== 0) {
      throw new Error(`WeCom error: ${result.errmsg ?? result.errcode}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function sendAttendanceWeComReport(content: string): Promise<void> {
  const chunks = splitWeComMarkdown(content);
  for (let index = 0; index < chunks.length; index += 1) {
    const heading = chunks.length > 1 ? `**Part ${index + 1}/${chunks.length}**\n` : "";
    await sendAttendanceWeComNotification(`${heading}${chunks[index]}`);
  }
}
import { createHash } from "node:crypto";

export async function sendAttendanceWeComImage(image: Buffer): Promise<void> {
  const webhookUrl = process.env.WECOM_ATTENDANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("WECOM_ATTENDANCE_WEBHOOK_URL is not configured.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WECOM_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "image",
        image: {
          base64: image.toString("base64"),
          md5: createHash("md5").update(image).digest("hex"),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`WeCom HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as { errcode?: number; errmsg?: string };
    if (result.errcode !== 0) {
      throw new Error(`WeCom error: ${result.errmsg ?? result.errcode}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
