import { safetyText } from "./copy";
import type { SafetyLanguage } from "./types";

export function getPreviewKind(
  name: string,
  mimeType?: string
): "image" | "video" | "pdf" | "ppt" | "excel" | "other" {
  const lowerName = name.toLowerCase();
  const type = (mimeType ?? "").toLowerCase();

  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)) {
    return "image";
  }

  if (type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)) {
    return "video";
  }

  if (type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (type.includes("presentation") || /\.(ppt|pptx)$/i.test(lowerName)) {
    return "ppt";
  }

  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    /\.(xls|xlsx|csv)$/i.test(lowerName)
  ) {
    return "excel";
  }

  return "other";
}

export function getFileMimeType(name: string): string {
  const lowerName = name.toLowerCase();

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)) {
    return "image/*";
  }

  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)) {
    return "video/*";
  }

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (/\.(ppt|pptx)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (/\.(xls|xlsx|csv)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/octet-stream";
}

export function getFileIcon(kind: ReturnType<typeof getPreviewKind>): string {
  switch (kind) {
    case "image":
      return "🖼️";
    case "video":
      return "🎬";
    case "pdf":
      return "📄";
    case "ppt":
      return "📊";
    case "excel":
      return "📗";
    default:
      return "📎";
  }
}

export function getFileTypeLabel(
  kind: ReturnType<typeof getPreviewKind>,
  language: SafetyLanguage = "en"
): string {
  switch (kind) {
    case "image":
      return safetyText("image", language);
    case "video":
      return safetyText("video", language);
    case "pdf":
      return safetyText("pdf", language);
    case "ppt":
      return safetyText("powerpoint", language);
    case "excel":
      return safetyText("excel", language);
    default:
      return language === "cn" ? "文件" : "File";
  }
}

export function getReadableFileKind(
  kind: ReturnType<typeof getPreviewKind>,
  language: SafetyLanguage = "en"
): string {
  switch (kind) {
    case "image":
      return safetyText("image", language);
    case "video":
      return safetyText("video", language);
    case "excel":
      return safetyText("excel", language);
    case "ppt":
      return safetyText("powerpoint", language);
    case "pdf":
      return safetyText("pdf", language);
    default:
      return language === "cn" ? "文件" : "File";
  }
}

export function formatFileSize(size: number): string {
  if (!size) return "—";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
