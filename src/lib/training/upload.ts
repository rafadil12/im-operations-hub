import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

export function getTrainingUploadDir(): string {
  const dir = process.env.TRAINING_UPLOAD_DIR;

  if (!dir) {
    throw new Error("TRAINING_UPLOAD_DIR environment variable is not configured.");
  }

  return dir;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\s\u4e00-\u9fff]+/g, "_").slice(0, 180);
}

export function getExtension(fileName: string): string {
  const ext = path.extname(fileName);
  return ext && ext.length <= 12 ? ext.toLowerCase() : "";
}

/**
 * Resolves a stored file URL to an absolute path under TRAINING_UPLOAD_DIR.
 * Supports: /api/training/files/2026/08/...
 */
export function resolveTrainingStoredFilePath(fileUrl: string): string | null {
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

  const absolute = path.resolve(getTrainingUploadDir(), ...relativeParts);
  const root = path.resolve(getTrainingUploadDir());

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    return null;
  }

  return absolute;
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export async function saveTrainingUploadedFile(file: File, sessionDate: string) {
  const year = sessionDate.slice(0, 4);
  const month = sessionDate.slice(5, 7);
  const uploadRoot = getTrainingUploadDir();
  const dir = path.join(uploadRoot, year, month);
  await mkdir(dir, { recursive: true });

  const originalName = sanitizeFileName(file.name || "attachment.pdf");
  const storedName = `${randomUUID()}${getExtension(originalName) || ".pdf"}`;
  const absolute = path.join(dir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("File too large (max 100MB).");
  }

  await writeFile(absolute, buffer);

  return {
    originalName,
    storedName,
    url: `/api/training/files/${year}/${month}/${encodeURIComponent(storedName)}`,
    mimeType: file.type || null,
    size: buffer.byteLength,
  };
}
