import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execute, query } from "@/lib/db";

function getSafetyUploadDir(): string {
  const dir = process.env.SAFETY_UPLOAD_DIR;

  if (!dir) {
    throw new Error(
      "SAFETY_UPLOAD_DIR environment variable is not configured.",
    );
  }

  return dir;
}

export const runtime = "nodejs";

const WEEKLY_ACTIVITY_TYPES = [
  "training",
  "routine_meeting",
  "hse_tuesday",
  "ert",
  "five_s",
  "potential_hazard",
] as const;

type WeeklyActivityType =
  (typeof WEEKLY_ACTIVITY_TYPES)[number];

type WeeklyDatabaseRow = {
  id: number;
  year: number;
  month: number;
  period_type: "weekly";
  week: number;
  activity_type: string;
  status:
    | "completed"
    | "not_submitted"
    | "not_applicable"
    | "case_found";
  submission_date: string | null;
  pic: string | null;
  pic_en: string | null;
  pic_cn: string | null;
  location: string | null;
  description: string | null;
  description_en: string | null;
  description_cn: string | null;
  file_name: string | null;
  file_url: string | null;
};

type WeeklyDatabaseFile = {
  id: number;
  submission_id: number;
  original_name: string;
  stored_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  file_group: string;
};

function isWeeklyActivityType(
  value: string,
): value is WeeklyActivityType {
  return WEEKLY_ACTIVITY_TYPES.includes(
    value as WeeklyActivityType,
  );
}

function sanitizeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function getExtension(name: string) {
  return path.extname(name).toLowerCase();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    const year = Number(
      searchParams.get("year") ??
        now.getFullYear(),
    );

    const month = Number(
      searchParams.get("month") ??
        now.getMonth() + 1,
    );

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid year.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid month.",
        },
        { status: 400 },
      );
    }

    const rows =
      await query<WeeklyDatabaseRow[]>(
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
        [year, month],
      );

    const ids = rows.map((row) =>
      Number(row.id),
    );

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
              WHERE submission_id IN (${ids
                .map(() => "?")
                .join(",")})
              ORDER BY
                submission_id ASC,
                sort_order ASC,
                id ASC
            `,
            ids,
          )
        : [];

    const filesBySubmission =
      new Map<
        number,
        WeeklyDatabaseFile[]
      >();

    for (const file of files) {
      const submissionId = Number(
        (
          file as WeeklyDatabaseFile & {
            submission_id: number;
          }
        ).submission_id,
      );

      const current =
        filesBySubmission.get(
          submissionId,
        ) ?? [];

      current.push(file);

      filesBySubmission.set(
        submissionId,
        current,
      );
    }

    const data = rows.map((row) => ({
      ...row,
      files:
        filesBySubmission.get(
          Number(row.id),
        ) ?? [],
    }));

    return NextResponse.json({
      success: true,
      year,
      month,
      data,
    });
  } catch (error) {
    console.error(
      "SAFETY WEEKLY GET ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load weekly safety data.",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData =
      await request.formData();

    const rawActivityType = String(
      formData.get("activityType") ?? "",
    ).trim();

    // Frontend and database names are normalized here
    // so either "routine-meeting",
    // "routine_meeting", or "routineMeeting"
    // will be accepted.
    const normalizeActivityType = (
      value: string,
    ): string => {
      const key = value
        .trim()
        .toLowerCase()
        .replace(/[-\s]/g, "_");

      const aliases: Record<
        string,
        string
      > = {
        training:
          "training",

        routine_meeting:
          "routine_meeting",

        routinemeeting:
          "routine_meeting",

        hse_tuesday:
          "hse_tuesday",

        hsetuesday:
          "hse_tuesday",

        ert:
          "ert",

        five_s:
          "five_s",

        fives:
          "five_s",

        "5s":
          "five_s",

        potential_hazard:
          "potential_hazard",

        potentialhazard:
          "potential_hazard",

        // Backward-compatible old names.
        hazard:
          "potential_hazard",

        cleaning:
          "five_s",
      };

      return aliases[key] ?? key;
    };

    const activityType =
      normalizeActivityType(
        rawActivityType,
      );

    if (
      !isWeeklyActivityType(
        activityType,
      )
    ) {
      console.error(
        "Invalid weekly activityType received:",
        rawActivityType,
        "normalized:",
        activityType,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid weekly activityType.",
          received:
            rawActivityType,
          normalized:
            activityType,
          allowedActivityTypes:
            WEEKLY_ACTIVITY_TYPES,
        },
        { status: 400 },
      );
    }

    const year = Number(
      formData.get("year") ??
        new Date().getFullYear(),
    );

    const month = Number(
      formData.get("month") ??
        new Date().getMonth() + 1,
    );

    const week = Number(
      formData.get("week") ?? 0,
    );

    const submissionDate =
      String(
        formData.get(
          "submissionDate",
        ) ?? "",
      ).trim() || null;

    const pic =
      String(
        formData.get("pic") ?? "",
      ).trim() || null;

    const picEn =
      String(
        formData.get("pic_en") ?? "",
      ).trim() || null;

    const picCn =
      String(
        formData.get("pic_cn") ?? "",
      ).trim() || null;

    const location =
      String(
        formData.get("location") ?? "",
      ).trim() || null;

    const descriptionEn =
      String(
        formData.get(
          "description_en",
        ) ?? "",
      ).trim() || null;

    const descriptionCn =
      String(
        formData.get(
          "description_cn",
        ) ?? "",
      ).trim() || null;

    // Legacy fallback: keep description populated with English.
    const description =
      descriptionEn;

    const files = formData
      .getAll("files")
      .filter(
        (
          value,
        ): value is File =>
          value instanceof File &&
          value.size > 0,
      );

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid year.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid month.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(week) ||
      week < 1 ||
      week > 4
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "week must be between 1 and 4.",
        },
        { status: 400 },
      );
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
    const existing =
      await query<
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
        [
          year,
          month,
          week,
          activityType,
        ],
      );

    /*
     * CREATE BARU:
     * File wajib ada.
     *
     * UPDATE:
     * Kalau file lama sudah ada,
     * tidak wajib upload ulang.
     */
    if (
      files.length === 0 &&
      existing.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one photo/file is required for this weekly activity.",
        },
        { status: 400 },
      );
    }

    const MAX_FILE_SIZE =
      100 * 1024 * 1024;

    for (const file of files) {
      if (
        file.size > MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `File "${file.name}" exceeds the 100 MB limit.`,
          },
          { status: 400 },
        );
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
      `week-${week}`,
    );

    const savedFiles: Array<{
      originalName: string;
      storedName: string;
      url: string;
      type: string;
      size: number;
    }> = [];

    if (files.length > 0) {
      await mkdir(
        uploadDirectory,
        { recursive: true },
      );

      for (
        const file of files
      ) {
        const safeName =
          sanitizeFileName(
            file.name,
          );

        const storedName =
          `${randomUUID()}${getExtension(
            safeName,
          )}`;

        const filePath =
          path.join(
            uploadDirectory,
            storedName,
          );

        await writeFile(
          filePath,
          Buffer.from(
            await file.arrayBuffer(),
          ),
        );

        savedFiles.push({
          originalName:
            file.name,

          storedName,

          /*
           * File fisik disimpan di:
           * SAFETY_UPLOAD_DIR
           *
           * Browser mengaksesnya melalui:
           * /api/safety/files/...
           */
          url:
            `/api/safety/files/${year}/${String(
              month,
            ).padStart(
              2,
              "0",
            )}/week-${week}/${storedName}`,

          type:
            file.type ||
            "application/octet-stream",

          size:
            file.size,
        });
      }
    }

    const firstFile =
      savedFiles[0] ?? null;

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

      submissionId =
        Number(
          existing[0].id,
        );

      /*
       * Kalau tidak ada file baru,
       * gunakan file lama.
       *
       * Kalau ada file baru,
       * gunakan file baru.
       */
      const finalFileName =
        firstFile?.originalName ??
        existing[0]
          .file_name ??
        null;

      const finalFileUrl =
        firstFile?.url ??
        existing[0]
          .file_url ??
        null;

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
        ],
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
          [submissionId],
        );
      }
    } else {
      /*
       * ============================
       * INSERT DATA BARU
       * ============================
       */

      const result =
        await execute(
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
            firstFile?.originalName ??
              null,
            firstFile?.url ??
              null,
          ],
        );

      submissionId =
        Number(
          result.insertId,
        );
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
    const fileGroup =
      String(
        formData.get(
          "fileGroup",
        ) ??
          "general",
      ).trim() || "general";

    for (
      let index = 0;
      index <
      savedFiles.length;
      index += 1
    ) {
      const file =
        savedFiles[index];

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
        ],
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Weekly safety activity saved successfully.",
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
    console.error(
      "SAFETY WEEKLY POST ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save weekly safety activity.",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}