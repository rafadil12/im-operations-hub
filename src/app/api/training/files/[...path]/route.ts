import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import {
  getTrainingUploadDir,
  resolveTrainingStoredFilePath,
} from "@/lib/training/upload";

export const runtime = "nodejs";

function contentTypeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(jpg|jpeg)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (/\.(ppt|pptx)$/.test(lower)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.trainingOverviewView,
    PERMISSIONS.trainingSessionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { path: parts } = await context.params;
    if (!parts?.length) {
      return NextResponse.json({ error: "File path is required." }, { status: 400 });
    }

    getTrainingUploadDir();

    const fileUrl = `/api/training/files/${parts.map(encodeURIComponent).join("/")}`;
    const absolutePath = resolveTrainingStoredFilePath(fileUrl);

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
    console.error("GET /api/training/files ERROR:", error);
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
