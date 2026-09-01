import path from "path";

export function getSafetyUploadDir(): string {
  const dir = process.env.SAFETY_UPLOAD_DIR;

  if (!dir) {
    throw new Error("SAFETY_UPLOAD_DIR environment variable is not configured.");
  }

  return dir;
}

export function parseStoredFiles(fileName: string | null, fileUrl: string | null) {
  if (!fileName && !fileUrl) {
    return [];
  }

  let names: string[] = [];
  let urls: string[] = [];

  try {
    if (fileName) {
      const parsed = JSON.parse(fileName);

      if (Array.isArray(parsed)) {
        names = parsed.map(String);
      } else {
        names = [fileName];
      }
    }
  } catch {
    if (fileName) {
      names = [fileName];
    }
  }

  try {
    if (fileUrl) {
      const parsed = JSON.parse(fileUrl);

      if (Array.isArray(parsed)) {
        urls = parsed.map(String);
      } else {
        urls = [fileUrl];
      }
    }
  } catch {
    if (fileUrl) {
      urls = [fileUrl];
    }
  }

  return names.map((name, index) => ({
    name,
    url: urls[index] ?? "",
  }));
}

/**
 * Resolves a stored file URL to an absolute path under SAFETY_UPLOAD_DIR.
 *
 * Supports:
 * - /api/safety/files/2026/08/monthly/file.jpg
 * - /uploads/safety/2026/08/monthly/file.jpg (legacy)
 */
export function resolveStoredFilePath(fileUrl: string): string | null {
  const cleanUrl = fileUrl.replace(/^\/+/, "").replace(/\\/g, "/");

  const parts = cleanUrl.split("/").filter(Boolean);

  let relativeParts: string[] | null = null;

  const filesIndex = parts.findIndex((part) => part === "files");

  if (filesIndex >= 0 && filesIndex < parts.length - 1) {
    relativeParts = parts.slice(filesIndex + 1);
  }

  if (!relativeParts) {
    const safetyIndex = parts.findIndex((part) => part === "safety");

    if (safetyIndex >= 0 && safetyIndex < parts.length - 1) {
      relativeParts = parts.slice(safetyIndex + 1);
    }
  }

  if (!relativeParts || relativeParts.length === 0) {
    return null;
  }

  const uploadDir = path.resolve(getSafetyUploadDir());

  const filePath = path.resolve(uploadDir, ...relativeParts);

  const uploadDirWithSeparator = uploadDir.endsWith(path.sep)
    ? uploadDir
    : `${uploadDir}${path.sep}`;

  if (filePath !== uploadDir && !filePath.startsWith(uploadDirWithSeparator)) {
    return null;
  }

  return filePath;
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export function getExtension(name: string) {
  return path.extname(name).toLowerCase();
}
