import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  PERMISSIONS,
  requireAnyPermission,
} from "@/lib/auth";
import { getSafetyUploadDir, resolveStoredFilePath } from "@/lib/safety/upload";

export const runtime = "nodejs";

function contentTypeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/\.(jpg|jpeg)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (/\.(mp4|m4v)$/.test(lower)) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(ppt|pptx)$/.test(lower)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (/\.(xls|xlsx|csv)$/.test(lower)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetyOverviewView,
    PERMISSIONS.safetySubmissionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { path: parts } = await context.params;
    if (!parts?.length) {
      return NextResponse.json({ error: "File path is required." }, { status: 400 });
    }

    // Ensure upload dir is configured before resolving.
    getSafetyUploadDir();

    const fileUrl = `/api/safety/files/${parts.map(encodeURIComponent).join("/")}`;
    const absolutePath = resolveStoredFilePath(fileUrl);

    if (!absolutePath) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const buffer = await readFile(absolutePath);
    const fileName = path.basename(absolutePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromName(fileName),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/safety/files ERROR:", error);
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
