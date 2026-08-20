import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import {
  PERMISSIONS,
  requireAnyPermission,
} from "@/lib/auth";

function getSafetyUploadDir(): string {
  const dir = process.env.SAFETY_UPLOAD_DIR;

  if (!dir) {
    throw new Error(
      "SAFETY_UPLOAD_DIR environment variable is not configured.",
    );
  }

  return dir;
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
};

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetyOverviewView,
    PERMISSIONS.safetySubmissionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { path: fileSegments } = await params;

    if (!fileSegments || fileSegments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "File path is required.",
        },
        { status: 400 },
      );
    }

    const uploadDirectory = getSafetyUploadDir();

    const requestedPath = path.join(
      uploadDirectory,
      ...fileSegments,
    );

    const resolvedUploadDirectory =
      path.resolve(uploadDirectory);

    const resolvedRequestedPath =
      path.resolve(requestedPath);

    const uploadDirectoryWithSeparator =
      resolvedUploadDirectory.endsWith(path.sep)
        ? resolvedUploadDirectory
        : `${resolvedUploadDirectory}${path.sep}`;

    if (
      resolvedRequestedPath !== resolvedUploadDirectory &&
      !resolvedRequestedPath.startsWith(
        uploadDirectoryWithSeparator,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file path.",
        },
        { status: 403 },
      );
    }

    const fileBuffer = await readFile(
      resolvedRequestedPath,
    );

    const extension = path
      .extname(resolvedRequestedPath)
      .toLowerCase();

    const contentType =
      CONTENT_TYPES[extension] ??
      "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(
          fileBuffer.length,
        ),
        "Cache-Control":
          "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(
      "SAFETY FILE GET ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "File not found.",
      },
      { status: 404 },
    );
  }
}