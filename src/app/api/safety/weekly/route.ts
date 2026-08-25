import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { accountHasPermission, PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { getExtension, getSafetyUploadDir, sanitizeFileName } from "@/lib/safety/upload";
import { jsonError, normalizeWeeklyActivityType } from "@/lib/safety/apiHelpers";
import {
  isWeeklyActivityType,
  type WeeklyDatabaseFile,
  type WeeklyDatabaseRow,
} from "@/lib/safety/weeklyConstants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetyOverviewView,
    PERMISSIONS.safetySubmissionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    const year = Number(searchParams.get("year") ?? now.getFullYear());

    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return jsonError("Invalid year.");
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return jsonError("Invalid month.");
    }

    const rows = await query<WeeklyDatabaseRow[]>(
      `
          SELECT
            id,
            year,
            month,
            period_type,
            week,
            activity_type,
            status,
            submission_date,
            pic,
            pic_en,
            pic_cn,
            location,
            description,
            description_en,
            description_cn,
            file_name,
            file_url
          FROM safety_submissions
          WHERE year = ?
            AND month = ?
            AND period_type = 'weekly'
          ORDER BY week ASC, id ASC
        `,
      [year, month]
    );

    const ids = rows.map((row) => Number(row.id));

    const files =
      ids.length > 0
        ? await query<WeeklyDatabaseFile[]>(
            `
              SELECT
                id,
                submission_id,
                original_name,
                stored_name,
                file_url,
                mime_type,
                file_size,
                file_group
              FROM safety_submission_files
              WHERE submission_id IN (${ids.map(() => "?").join(",")})
              ORDER BY
                submission_id ASC,
                sort_order ASC,
                id ASC
            `,
            ids
          )
        : [];

    const filesBySubmission = new Map<number, WeeklyDatabaseFile[]>();

    for (const file of files) {
      const submissionId = Number(
        (
          file as WeeklyDatabaseFile & {
            submission_id: number;
          }
        ).submission_id
      );

      const current = filesBySubmission.get(submissionId) ?? [];

      current.push(file);

      filesBySubmission.set(submissionId, current);
    }

    const data = rows.map((row) => ({
      ...row,
      files: filesBySubmission.get(Number(row.id)) ?? [],
    }));

    return NextResponse.json({
      success: true,
      year,
      month,
      data,
    });
  } catch (error) {
    console.error("GET /api/safety/weekly ERROR:", error);
    return jsonError("Failed to load weekly safety data.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetySubmissionCreate,
    PERMISSIONS.safetySubmissionUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

  try {
    const formData = await request.formData();

    const rawActivityType = String(formData.get("activityType") ?? "").trim();

    const activityType = normalizeWeeklyActivityType(rawActivityType);

    if (!isWeeklyActivityType(activityType)) {
      console.error(
        "POST /api/safety/weekly: invalid activityType:",
        rawActivityType,
        "normalized:",
        activityType
      );

      return jsonError("Invalid weekly activityType.");
    }

    const year = Number(formData.get("year") ?? new Date().getFullYear());

    const month = Number(formData.get("month") ?? new Date().getMonth() + 1);

    const week = Number(formData.get("week") ?? 0);

    const submissionDate = String(formData.get("submissionDate") ?? "").trim() || null;

    const pic = String(formData.get("pic") ?? "").trim() || null;

    const picEn = String(formData.get("pic_en") ?? "").trim() || null;

    const picCn = String(formData.get("pic_cn") ?? "").trim() || null;

    const location = String(formData.get("location") ?? "").trim() || null;

    const descriptionEn = String(formData.get("description_en") ?? "").trim() || null;

    const descriptionCn = String(formData.get("description_cn") ?? "").trim() || null;

    // Legacy fallback: keep description populated with English.
    const description = descriptionEn;

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return jsonError("Invalid year.");
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return jsonError("Invalid month.");
    }

    if (!Number.isInteger(week) || week < 1 || week > 4) {
      return jsonError("week must be between 1 and 4.");
    }

    /*
     * CEK DATA LAMA TERLEBIH DAHULU
     *
     * Ini penting untuk Update.
     * Kalau sudah ada submission:
     *
     * - file baru ada  -> replace file lama
     * - file baru tidak ada -> pertahankan file lama
     */
    const existing = await query<
      Array<{
        id: number;
        file_name: string | null;
        file_url: string | null;
      }>
    >(
      `
          SELECT
            id,
            file_name,
            file_url
          FROM safety_submissions
          WHERE year = ?
            AND month = ?
            AND period_type = 'weekly'
            AND week = ?
            AND activity_type = ?
          LIMIT 1
        `,
      [year, month, week, activityType]
    );

    const needed =
      existing.length > 0 ? PERMISSIONS.safetySubmissionUpdate : PERMISSIONS.safetySubmissionCreate;
    if (!accountHasPermission(gate.account, needed)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    /*
     * CREATE BARU:
     * File wajib ada.
     *
     * UPDATE:
     * Kalau file lama sudah ada,
     * tidak wajib upload ulang.
     */
    if (files.length === 0 && existing.length === 0) {
      return jsonError("At least one photo/file is required for this weekly activity.");
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return jsonError(`File "${file.name}" exceeds the 100 MB limit.`);
      }
    }

    /*
     * Hanya membuat folder dan menyimpan
     * file kalau memang ada file baru.
     */
    const uploadDirectory = path.join(
      getSafetyUploadDir(),
      String(year),
      String(month).padStart(2, "0"),
      `week-${week}`
    );

    const savedFiles: Array<{
      originalName: string;
      storedName: string;
      url: string;
      type: string;
      size: number;
    }> = [];

    if (files.length > 0) {
      await mkdir(uploadDirectory, { recursive: true });

      for (const file of files) {
        const safeName = sanitizeFileName(file.name);

        const storedName = `${randomUUID()}${getExtension(safeName)}`;

        const filePath = path.join(uploadDirectory, storedName);

        await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

        savedFiles.push({
          originalName: file.name,

          storedName,

          /*
           * File fisik disimpan di:
           * SAFETY_UPLOAD_DIR
           *
           * Browser mengaksesnya melalui:
           * /api/safety/files/...
           */
          url: `/api/safety/files/${year}/${String(month).padStart(
            2,
            "0"
          )}/week-${week}/${storedName}`,

          type: file.type || "application/octet-stream",

          size: file.size,
        });
      }
    }

    const firstFile = savedFiles[0] ?? null;

    let submissionId: number;

    // Weekly yang berhasil di-upload
    // langsung menjadi completed.
    // HSE tidak lagi memakai status checklist/not_submitted.
    const status = "completed";

    if (existing.length > 0) {
      /*
       * ============================
       * UPDATE DATA LAMA
       * ============================
       */

      submissionId = Number(existing[0].id);

      /*
       * Kalau tidak ada file baru,
       * gunakan file lama.
       *
       * Kalau ada file baru,
       * gunakan file baru.
       */
      const finalFileName = firstFile?.originalName ?? existing[0].file_name ?? null;

      const finalFileUrl = firstFile?.url ?? existing[0].file_url ?? null;

      await execute(
        `
          UPDATE safety_submissions
          SET
            status = ?,
            submission_date = ?,
            pic = ?,
            pic_en = ?,
            pic_cn = ?,
            location = ?,
            description = ?,
            description_en = ?,
            description_cn = ?,
            file_name = ?,
            file_url = ?
          WHERE id = ?
        `,
        [
          status,
          submissionDate,
          pic,
          picEn,
          picCn,
          location,
          description,
          descriptionEn,
          descriptionCn,
          finalFileName,
          finalFileUrl,
          submissionId,
        ]
      );

      /*
       * HANYA hapus attachment lama
       * kalau user benar-benar
       * mengupload file baru.
       */
      if (files.length > 0) {
        await execute(
          `
            DELETE FROM
              safety_submission_files
            WHERE submission_id = ?
          `,
          [submissionId]
        );
      }
    } else {
      /*
       * ============================
       * INSERT DATA BARU
       * ============================
       */

      const result = await execute(
        `
            INSERT INTO
              safety_submissions
            (
              year,
              month,
              period_type,
              week,
              activity_type,
              status,
              submission_date,
              pic,
              pic_en,
              pic_cn,
              location,
              description,
              description_en,
              description_cn,
              file_name,
              file_url
            )
            VALUES
            (
              ?,
              ?,
              'weekly',
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `,
        [
          year,
          month,
          week,
          activityType,
          status,
          submissionDate,
          pic,
          picEn,
          picCn,
          location,
          description,
          descriptionEn,
          descriptionCn,
          firstFile?.originalName ?? null,
          firstFile?.url ?? null,
        ]
      );

      submissionId = Number(result.insertId);
    }

    /*
     * ============================
     * SIMPAN FILE BARU
     * ============================
     *
     * Kalau Update tanpa file baru,
     * bagian ini tidak melakukan apa-apa.
     *
     * File lama tetap berada di database.
     */
    const fileGroup = String(formData.get("fileGroup") ?? "general").trim() || "general";

    for (let index = 0; index < savedFiles.length; index += 1) {
      const file = savedFiles[index];

      await execute(
        `
          INSERT INTO
            safety_submission_files
          (
            submission_id,
            original_name,
            stored_name,
            file_url,
            mime_type,
            file_size,
            file_group,
            sort_order
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          submissionId,
          file.originalName,
          file.storedName,
          file.url,
          file.type,
          file.size,
          fileGroup,
          index,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Weekly safety activity saved successfully.",
      submission: {
        id: submissionId,
        year,
        month,
        week,
        periodType: "weekly",
        activityType,
        status,
      },
      files: savedFiles,
    });
  } catch (error) {
    console.error("POST /api/safety/weekly ERROR:", error);
    return jsonError("Failed to save weekly safety activity.", 500);
  }
}
