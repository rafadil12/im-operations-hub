import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import {
  contentTypeFromName,
  getReportUploadDir,
  resolveReportStoredFilePath,
} from "@/lib/report/upload";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.reportOverviewView,
    PERMISSIONS.reportLineRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { path: parts } = await context.params;
    if (!parts?.length) {
      return NextResponse.json({ error: "File path is required." }, { status: 400 });
    }

    getReportUploadDir();

    const fileUrl = `/api/report/files/${parts.map(encodeURIComponent).join("/")}`;
    const absolutePath = resolveReportStoredFilePath(fileUrl);

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
    console.error("GET /api/report/files ERROR:", error);
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
