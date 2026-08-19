import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import type {
  FieldPacket,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

/* =========================================================
   MONTHLY ACTIVITY
   HARUS SAMA DENGAN DATABASE
   ========================================================= */

const MONTHLY_ACTIVITIES = [
  "monthly_meeting",
  "fire_drill",
  "safety_case",
  "monthly_ppt",
  "reward_finding",
] as const;

type MonthlyActivity =
  (typeof MONTHLY_ACTIVITIES)[number];

type MonthlyRow = RowDataPacket & {
  id: number;
  year: number;
  month: number;
  period_type: "monthly";
  week: number | null;
  activity_type: string;
  status: string;
  submission_date: string | null;
  pic: string | null;
  location: string | null;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

function jsonError(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

/* =========================================================
   GET YEAR + MONTH
   ========================================================= */

function getYearMonth(
  request: NextRequest,
) {
  const url = new URL(request.url);

  const now = new Date();

  const yearParam =
    url.searchParams.get("year");

  const monthParam =
    url.searchParams.get("month");

  const year = yearParam
    ? Number(yearParam)
    : now.getFullYear();

  const month = monthParam
    ? Number(monthParam)
    : now.getMonth() + 1;

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Year tidak valid.",
    );
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Month harus antara 1 sampai 12.",
    );
  }

  return {
    year,
    month,
  };
}

/* =========================================================
   NORMALIZE FILE DATA
   ========================================================= */

function parseStoredFiles(
  fileName: string | null,
  fileUrl: string | null,
) {
  if (!fileName && !fileUrl) {
    return [];
  }

  let names: string[] = [];
  let urls: string[] = [];

  try {
    if (fileName) {
      const parsed =
        JSON.parse(fileName);

      if (Array.isArray(parsed)) {
        names =
          parsed.map(String);
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
      const parsed =
        JSON.parse(fileUrl);

      if (Array.isArray(parsed)) {
        urls =
          parsed.map(String);
      } else {
        urls = [fileUrl];
      }
    }
  } catch {
    if (fileUrl) {
      urls = [fileUrl];
    }
  }

  return names.map(
    (name, index) => ({
      name,
      url: urls[index] ?? "",
    }),
  );
}

/* =========================================================
   GET
   /api/safety/monthly?year=2026&month=8
   ========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    const {
      year,
      month,
    } = getYearMonth(request);

    const [rows] =
      await pool.execute(
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
            location,
            description,
            file_name,
            file_url,
            verified_by,
            verified_at,
            created_at,
            updated_at
          FROM safety_submissions
          WHERE year = ?
            AND month = ?
            AND period_type = 'monthly'
          ORDER BY
            CASE activity_type
              WHEN 'monthly_meeting' THEN 1
              WHEN 'fire_drill' THEN 2
              WHEN 'safety_case' THEN 3
              WHEN 'monthly_ppt' THEN 4
              WHEN 'reward_finding' THEN 5
              ELSE 99
            END,
            id ASC
        `,
        [year, month],
      ) as [
        MonthlyRow[],
        FieldPacket[],
      ];

    const data = rows.map(
      (row) => ({
        ...row,
        files:
          parseStoredFiles(
            row.file_name,
            row.file_url,
          ),
      }),
    );

    const grouped: Record<
      MonthlyActivity,
      typeof data
    > = {
      monthly_meeting: [],
      fire_drill: [],
      safety_case: [],
      monthly_ppt: [],
      reward_finding: [],
    };

    for (const row of data) {
      if (
        row.activity_type in
        grouped
      ) {
        grouped[
          row.activity_type as MonthlyActivity
        ].push(row);
      }
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      periodType: "monthly",
      count: data.length,
      data,
      grouped,
    });
  } catch (error) {
    console.error(
      "GET /api/safety/monthly ERROR:",
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal membaca data Monthly.",
      500,
    );
  }
}

/* =========================================================
   POST
   /api/safety/monthly

   multipart/form-data

   Fields:
   year
   month
   activityType
   submissionDate
   pic
   location
   description

   Files:
   files
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  let connection:
    Awaited<
      ReturnType<
        typeof pool.getConnection
      >
    > | null = null;

  const savedFilePaths: string[] =
    [];

  try {
    const formData =
      await request.formData();

    /* =====================================================
       BASIC DATA
       ===================================================== */

    const year = Number(
      formData.get("year"),
    );

    const month = Number(
      formData.get("month"),
    );

    const activityType =
      String(
        formData.get(
          "activityType",
        ) ?? "",
      ) as MonthlyActivity;

    const submissionDateValue =
      formData.get(
        "submissionDate",
      );

    const submissionDate =
      submissionDateValue
        ? String(
            submissionDateValue,
          )
        : null;

    const picValue =
      formData.get("pic");

    const pic =
      picValue !== null
        ? String(picValue)
        : null;

    const locationValue =
      formData.get("location");

    const location =
      locationValue !== null
        ? String(locationValue)
        : null;

    const descriptionValue =
      formData.get("description");

    const description =
      descriptionValue !== null
        ? String(descriptionValue)
        : null;

    /* =====================================================
       VALIDATE YEAR
       ===================================================== */

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return jsonError(
        "Year tidak valid.",
      );
    }

    /* =====================================================
       VALIDATE MONTH
       ===================================================== */

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return jsonError(
        "Month harus antara 1 sampai 12.",
      );
    }

    /* =====================================================
       VALIDATE ACTIVITY TYPE

       DATABASE:
       monthly_meeting
       fire_drill
       safety_case
       monthly_ppt
       reward_finding
       ===================================================== */

    if (
      !MONTHLY_ACTIVITIES.includes(
        activityType,
      )
    ) {
      return jsonError(
        "Invalid activityType. Allowed: " +
          MONTHLY_ACTIVITIES.join(
            ", ",
          ),
      );
    }

    /* =====================================================
       FILES
       ===================================================== */

    const uploadedFiles =
      formData
        .getAll("files")
        .filter(
          (
            value,
          ): value is File =>
            value instanceof File &&
            value.size > 0,
        );

    /* =====================================================
       DATABASE CONNECTION
       ===================================================== */

    connection =
      await pool.getConnection();

    await connection.beginTransaction();

    /* =====================================================
       CHECK EXISTING RECORD

       Aktivitas Monthly normal:
       1 record per bulan.

       reward_finding:
       boleh lebih dari satu sampai 2.
       ===================================================== */

    let existingId:
      number | null = null;

    if (
      activityType !==
      "reward_finding"
    ) {
      const existingQuery =
        await connection.execute(
          `
            SELECT
              id
            FROM safety_submissions
            WHERE year = ?
              AND month = ?
              AND period_type = 'monthly'
              AND activity_type = ?
            ORDER BY id ASC
            LIMIT 1
            FOR UPDATE
          `,
          [
            year,
            month,
            activityType,
          ],
        ) as [
          MonthlyRow[],
          FieldPacket[],
        ];

      const existingRows =
        existingQuery[0];

      if (
        existingRows.length > 0
      ) {
        existingId =
          existingRows[0].id;
      }
    }

    /* =====================================================
       REWARD FINDING
       MAKSIMAL 2 PER BULAN
       ===================================================== */

    if (
      activityType ===
      "reward_finding"
    ) {
      const rewardQuery =
        await connection.execute(
          `
            SELECT
              id
            FROM safety_submissions
            WHERE year = ?
              AND month = ?
              AND period_type = 'monthly'
              AND activity_type =
                'reward_finding'
              AND status = 'completed'
            FOR UPDATE
          `,
          [
            year,
            month,
          ],
        ) as [
          MonthlyRow[],
          FieldPacket[],
        ];

      const rewardRows =
        rewardQuery[0];

      /*
       * Kalau sudah 2 record,
       * jangan buat record ketiga.
       */
      if (
        rewardRows.length >= 2
      ) {
        await connection.rollback();

        return jsonError(
          "Penemuan Berhadiah bulan ini sudah mencapai maksimal 2 submission.",
          400,
        );
      }
    }

    /* =====================================================
       FILE VALIDATION

       CREATE BARU:
       file wajib ada.

       UPDATE:
       file baru tidak wajib.
       File lama akan dipertahankan.
       ===================================================== */

    if (
      uploadedFiles.length === 0 &&
      existingId === null
    ) {
      /*
       * Monthly baru harus punya
       * minimal satu file.
       */
      await connection.rollback();

      return jsonError(
        "At least one photo/file is required for this monthly activity.",
        400,
      );
    }

    /* =====================================================
       SAVE FILES
       ===================================================== */

    const fileNames: string[] =
      [];

    const fileUrls: string[] =
      [];

    if (
      uploadedFiles.length > 0
    ) {
      const uploadDir =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "safety",
          String(year),
          String(month),
          "monthly",
        );

      await mkdir(
        uploadDir,
        {
          recursive: true,
        },
      );

      for (
        const file of uploadedFiles
      ) {
        const originalName =
          file.name ||
          "attachment";

        const extension =
          path.extname(
            originalName,
          );

        const baseName =
          path
            .basename(
              originalName,
              extension,
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              "_",
            )
            .slice(0, 80);

        const filename =
          `${Date.now()}-${randomUUID()}-${baseName}${extension}`;

        const diskPath =
          path.join(
            uploadDir,
            filename,
          );

        const buffer =
          Buffer.from(
            await file.arrayBuffer(),
          );

        await writeFile(
          diskPath,
          buffer,
        );

        savedFilePaths.push(
          diskPath,
        );

        fileNames.push(
          originalName,
        );

        fileUrls.push(
          `/uploads/safety/${year}/${month}/monthly/${filename}`,
        );
      }
    }

    /* =====================================================
       UPDATE EXISTING MONTHLY
       ===================================================== */

    if (
      existingId !== null
    ) {
      /*
       * Default:
       * gunakan file baru.
       *
       * Kalau tidak ada file baru:
       * ambil file lama.
       */

      let finalFileNames =
        fileNames;

      let finalFileUrls =
        fileUrls;

      if (
        uploadedFiles.length === 0
      ) {
        const oldQuery =
          await connection.execute(
            `
              SELECT
                file_name,
                file_url
              FROM safety_submissions
              WHERE id = ?
              LIMIT 1
            `,
            [existingId],
          ) as [
            Array<
              Pick<
                MonthlyRow,
                | "file_name"
                | "file_url"
              >
            >,
            FieldPacket[],
          ];

        const oldRows =
          oldQuery[0];

        if (
          oldRows.length > 0
        ) {
          const oldFiles =
            parseStoredFiles(
              oldRows[0]
                .file_name,
              oldRows[0]
                .file_url,
            );

          finalFileNames =
            oldFiles.map(
              (file) =>
                file.name,
            );

          finalFileUrls =
            oldFiles.map(
              (file) =>
                file.url,
            );
        }
      }

      /*
       * UPDATE:
       * PIC, date, location,
       * description tetap diperbarui.
       *
       * File:
       * - tidak upload baru -> file lama
       * - upload baru -> file baru
       */

      const updateQuery =
        await connection.execute(
          `
            UPDATE safety_submissions
            SET
              status = 'completed',
              submission_date = ?,
              pic = ?,
              location = ?,
              description = ?,
              file_name = ?,
              file_url = ?,
              verified_by = NULL,
              verified_at = NULL
            WHERE id = ?
              AND period_type = 'monthly'
          `,
          [
            submissionDate,
            pic,
            location,
            description,
            JSON.stringify(
              finalFileNames,
            ),
            JSON.stringify(
              finalFileUrls,
            ),
            existingId,
          ],
        ) as [
          ResultSetHeader,
          FieldPacket[],
        ];

      const updateResult =
        updateQuery[0];

      /*
       * Jangan hapus file fisik lama
       * secara paksa di sini.
       *
       * Database akan menggunakan:
       * - file lama jika tidak ada
       *   file baru
       * - file baru jika ada upload.
       */

      await connection.commit();

      return NextResponse.json({
        success: true,
        action: "updated",
        id: existingId,
        year,
        month,
        periodType: "monthly",
        activityType,
        status: "completed",
        files:
          finalFileNames.map(
            (name, index) => ({
              name,
              url:
                finalFileUrls[
                  index
                ] ?? "",
            }),
          ),
        affectedRows:
          updateResult.affectedRows,
        message:
          "Monthly berhasil di-update.",
      });
    }

    /* =====================================================
       INSERT NEW MONTHLY
       ===================================================== */

    const insertQuery =
      await connection.execute(
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
            location,
            description,
            file_name,
            file_url,
            verified_by,
            verified_at
          )
          VALUES
          (
            ?,
            ?,
            'monthly',
            NULL,
            ?,
            'completed',
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL,
            NULL
          )
        `,
        [
          year,
          month,
          activityType,
          submissionDate,
          pic,
          location,
          description,
          JSON.stringify(
            fileNames,
          ),
          JSON.stringify(
            fileUrls,
          ),
        ],
      ) as [
        ResultSetHeader,
        FieldPacket[],
      ];

    const insertResult =
      insertQuery[0];

    await connection.commit();

    return NextResponse.json({
      success: true,
      action: "created",
      id:
        insertResult.insertId,
      year,
      month,
      periodType: "monthly",
      activityType,
      status: "completed",
      files:
        fileNames.map(
          (name, index) => ({
            name,
            url:
              fileUrls[index] ??
              "",
          }),
        ),
      affectedRows:
        insertResult.affectedRows,
      message:
        "Monthly berhasil disimpan.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    /*
     * Kalau database gagal setelah
     * file tersimpan, hapus file tersebut
     * agar tidak menjadi file sampah.
     */

    for (
      const filePath of savedFilePaths
    ) {
      try {
        await unlink(filePath);
      } catch {}
    }

    console.error(
      "POST /api/safety/monthly ERROR:",
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan Monthly.",
      500,
    );
  } finally {
    connection?.release();
  }
}

/* =========================================================
   DELETE
   /api/safety/monthly?id=123
   ========================================================= */

export async function DELETE(
  request: NextRequest,
) {
  try {
    const url =
      new URL(request.url);

    const id = Number(
      url.searchParams.get("id"),
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return jsonError(
        "ID Monthly tidak valid.",
      );
    }

    const [rows] =
      await pool.execute(
        `
          SELECT
            file_url
          FROM safety_submissions
          WHERE id = ?
            AND period_type = 'monthly'
          LIMIT 1
        `,
        [id],
      ) as [
        Array<{
          file_url:
            | string
            | null;
        }>,
        FieldPacket[],
      ];

    if (
      rows.length === 0
    ) {
      return jsonError(
        "Data Monthly tidak ditemukan.",
        404,
      );
    }

    const fileUrls =
      parseStoredFiles(
        null,
        rows[0].file_url,
      );

    const [deleteResult] =
      await pool.execute(
        `
          DELETE FROM safety_submissions
          WHERE id = ?
            AND period_type = 'monthly'
        `,
        [id],
      ) as [
        ResultSetHeader,
        FieldPacket[],
      ];

    /*
     * Hapus file fisik.
     */

    for (
      const file of fileUrls
    ) {
      if (!file.url) continue;

      const relative =
        file.url.replace(
          /^\/+/,
          "",
        );

      const filePath =
        path.join(
          process.cwd(),
          "public",
          relative,
        );

      try {
        await unlink(filePath);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      id,
      affectedRows:
        deleteResult.affectedRows,
      message:
        "Monthly berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/safety/monthly ERROR:",
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menghapus Monthly.",
      500,
    );
  }
}