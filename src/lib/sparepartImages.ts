import { mkdir, readdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

export const SPAREPART_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const SPAREPART_IMAGE_EXTS = ["jpg", "jpeg", "png"] as const;
export type SparepartImageExt = (typeof SPAREPART_IMAGE_EXTS)[number];

const MIME_TO_EXT: Record<string, SparepartImageExt> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

const FILENAME_RE = /^[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/i;
const CODE_SAFE_RE = /^[A-Za-z0-9._-]+$/;

export class SparepartImageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SparepartImageError";
    this.status = status;
  }
}

export function getSparepartUploadDir(): string {
  const dir = process.env.SPAREPART_UPLOAD_DIR?.trim();
  if (!dir) {
    throw new SparepartImageError(
      "SPAREPART_UPLOAD_DIR is not configured.",
      500,
    );
  }
  return dir;
}

export function imageApiUrl(code: string, ext: string): string {
  return `/api/sparepart/images/${code}.${ext.toLowerCase()}`;
}

export function assertSafeMaterialCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed || !CODE_SAFE_RE.test(trimmed)) {
    throw new SparepartImageError("Invalid material code for image filename.");
  }
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new SparepartImageError("Invalid material code for image filename.");
  }
  return trimmed;
}

export function assertSafeImageFilename(filename: string): {
  code: string;
  ext: SparepartImageExt;
} {
  const base = path.basename(filename);
  if (base !== filename || !FILENAME_RE.test(base)) {
    throw new SparepartImageError("Invalid image filename.", 400);
  }
  const dot = base.lastIndexOf(".");
  const code = base.slice(0, dot);
  const ext = base.slice(dot + 1).toLowerCase() as SparepartImageExt;
  assertSafeMaterialCode(code);
  if (!SPAREPART_IMAGE_EXTS.includes(ext)) {
    throw new SparepartImageError("Only JPG and PNG images are allowed.");
  }
  return { code, ext };
}

export async function ensureUploadDir(): Promise<string> {
  const dir = getSparepartUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

function resolveExtFromFile(file: File): SparepartImageExt {
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") {
    const nameExt = path.extname(file.name).toLowerCase().replace(".", "");
    if (nameExt === "jpeg") return "jpeg";
    return "jpg";
  }
  if (mime === "image/png") return "png";

  const nameExt = path.extname(file.name).toLowerCase().replace(".", "");
  if (nameExt === "jpg" || nameExt === "jpeg" || nameExt === "png") {
    return nameExt;
  }
  throw new SparepartImageError("Only JPG and PNG images are allowed.");
}

export function validateSparepartImageFile(file: File): SparepartImageExt {
  if (!file || file.size <= 0) {
    throw new SparepartImageError("Image file is required.");
  }
  if (file.size > SPAREPART_IMAGE_MAX_BYTES) {
    throw new SparepartImageError("Image must be at most 1 MB.");
  }
  const mime = (file.type || "").toLowerCase();
  const nameExt = path.extname(file.name).toLowerCase().replace(".", "");
  const extOk =
    nameExt === "jpg" || nameExt === "jpeg" || nameExt === "png";
  if (!extOk) {
    throw new SparepartImageError("Only JPG and PNG images are allowed.");
  }
  if (mime && !(mime in MIME_TO_EXT)) {
    throw new SparepartImageError("Only JPG and PNG images are allowed.");
  }
  return resolveExtFromFile(file);
}

async function listFilesForCode(dir: string, code: string): Promise<string[]> {
  const entries = await readdir(dir);
  const prefix = `${code}.`;
  return entries.filter((name) => {
    if (!name.startsWith(prefix)) return false;
    const ext = name.slice(prefix.length).toLowerCase();
    return (SPAREPART_IMAGE_EXTS as readonly string[]).includes(ext);
  });
}

export async function deleteMaterialImages(code: string): Promise<void> {
  const safeCode = assertSafeMaterialCode(code);
  const dir = await ensureUploadDir();
  const files = await listFilesForCode(dir, safeCode);
  await Promise.all(files.map((name) => unlink(path.join(dir, name))));
}

/** Write `{code}.{ext}`, remove other extensions for the same code, return API URL. */
export async function saveMaterialImage(
  code: string,
  file: File,
): Promise<{ imageUrl: string; filename: string }> {
  const safeCode = assertSafeMaterialCode(code);
  const ext = validateSparepartImageFile(file);
  const dir = await ensureUploadDir();
  const filename = `${safeCode}.${ext}`;
  const target = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > SPAREPART_IMAGE_MAX_BYTES) {
    throw new SparepartImageError("Image must be at most 1 MB.");
  }

  const existing = await listFilesForCode(dir, safeCode);
  for (const name of existing) {
    if (name.toLowerCase() === filename.toLowerCase()) continue;
    await unlink(path.join(dir, name));
  }

  await writeFile(target, buffer);
  return { imageUrl: imageApiUrl(safeCode, ext), filename };
}

/** When material code changes, rename on-disk image and return new image_url (or null). */
export async function renameMaterialImage(
  oldCode: string,
  newCode: string,
  currentImageUrl: string | null,
): Promise<string | null> {
  if (!currentImageUrl) return null;
  if (oldCode === newCode) return currentImageUrl;

  const safeOld = assertSafeMaterialCode(oldCode);
  const safeNew = assertSafeMaterialCode(newCode);
  const dir = await ensureUploadDir();

  const oldFiles = await listFilesForCode(dir, safeOld);
  if (oldFiles.length === 0) {
    // URL may still point at old name; clear if file missing
    return null;
  }

  // Prefer matching current URL ext; else first file
  let sourceName = oldFiles[0];
  try {
    const base = path.basename(currentImageUrl);
    if (oldFiles.some((n) => n.toLowerCase() === base.toLowerCase())) {
      sourceName = oldFiles.find((n) => n.toLowerCase() === base.toLowerCase())!;
    }
  } catch {
    /* keep first */
  }

  const ext = sourceName.slice(sourceName.lastIndexOf(".") + 1).toLowerCase();
  const destName = `${safeNew}.${ext}`;
  const srcPath = path.join(dir, sourceName);
  const destPath = path.join(dir, destName);

  // Remove any existing new-code images first
  const newExisting = await listFilesForCode(dir, safeNew);
  for (const name of newExisting) {
    await unlink(path.join(dir, name));
  }

  await rename(srcPath, destPath);

  // Clean leftover old-code files
  for (const name of oldFiles) {
    if (name === sourceName) continue;
    try {
      await unlink(path.join(dir, name));
    } catch {
      /* ignore */
    }
  }

  return imageApiUrl(safeNew, ext);
}

export async function readMaterialImageFile(
  filename: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const { ext } = assertSafeImageFilename(filename);
  const dir = await ensureUploadDir();
  const base = path.basename(filename);
  const full = path.join(dir, base);
  const resolved = path.resolve(full);
  const dirResolved = path.resolve(dir);
  const relative = path.relative(dirResolved, resolved);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes("\0")
  ) {
    throw new SparepartImageError("Invalid image path.", 400);
  }

  try {
    const buffer = await readFile(resolved);
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    return { buffer, contentType };
  } catch (err) {
    if (err instanceof SparepartImageError) throw err;
    throw new SparepartImageError("Image not found.", 404);
  }
}
