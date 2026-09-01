import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { getReportFileExtension, isAllowedReportFile } from "./attachmentAccept";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function getReportUploadDir(): string {
  const dir = process.env.REPORT_UPLOAD_DIR;

  if (!dir) {
    throw new Error("REPORT_UPLOAD_DIR environment variable is not configured.");
  }

  return dir;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\s\u4e00-\u9fff]+/g, "_").slice(0, 180);
}

export function resolveReportStoredFilePath(fileUrl: string): string | null {
  const cleanUrl = fileUrl.replace(/^\/+/, "").replace(/\\/g, "/");
  const parts = cleanUrl.split("/").filter(Boolean);

  const filesIndex = parts.findIndex((part) => part === "files");
  if (filesIndex < 0 || filesIndex >= parts.length - 1) {
    return null;
  }

  const relativeParts = parts.slice(filesIndex + 1).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  if (relativeParts.some((part) => part === ".." || part.includes("\0"))) {
    return null;
  }

  const absolute = path.resolve(getReportUploadDir(), ...relativeParts);
  const root = path.resolve(getReportUploadDir());

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    return null;
  }

  return absolute;
}

export async function saveReportUploadedFile(file: File, year: number, weekNumber: number) {
  const originalName = sanitizeFileName(file.name || "attachment.pdf");
  const ext = getReportFileExtension(originalName) || path.extname(originalName).toLowerCase();

  if (!isAllowedReportFile(originalName)) {
    throw new Error("Unsupported file type. Allowed: PPT, Excel, PDF, PNG, JPEG.");
  }

  const uploadRoot = getReportUploadDir();
  const dir = path.join(uploadRoot, String(year), `w${String(weekNumber).padStart(2, "0")}`);
  await mkdir(dir, { recursive: true });

  const storedName = `${randomUUID()}${ext || ".bin"}`;
  const absolute = path.join(dir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("File too large (max 100MB).");
  }

  await writeFile(absolute, buffer);

  return {
    originalName,
    storedName,
    url: `/api/report/files/${year}/w${String(weekNumber).padStart(2, "0")}/${encodeURIComponent(storedName)}`,
    mimeType: file.type || null,
    size: buffer.byteLength,
  };
}

export function contentTypeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(jpg|jpeg)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}
