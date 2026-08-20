import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  accountHasPermission,
  PERMISSIONS,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth";
import { pool } from "@/lib/db";
import type {
  FieldPacket,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

export const runtime = "nodejs";

/* =========================================================
   SAFETY UPLOAD DIRECTORY
   ========================================================= */

function getSafetyUploadDir(): string {
  const dir = process.env.SAFETY_UPLOAD_DIR;

  if (!dir) {
    throw new Error(
      "SAFETY_UPLOAD_DIR environment variable is not configured.",
    );
  }

  return dir;
}

/* =========================================================
   MONTHLY ACTIVITIES
   HARUS SAMA DENGAN DATABASE / FRONTEND
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

/* =========================================================
   STATUS
   ========================================================= */

type MonthlyStatus =
  | "completed"
  | "not_applicable"
  | "case_found"
  | "not_submitted";

/* =========================================================
   DATABASE ROW
   ========================================================= */

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
  pic_en: string | null;
  pic_cn: string | null;
  location: string | null;
  description: string | null;
  description_en: string | null;
  description_cn: string | null;
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
   NORMALIZE STORED FILES
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
      const parsed =
        JSON.parse(fileUrl);

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

  return names.map(
    (name, index) => ({
      name,
      url: urls[index] ?? "",
    }),
  );
}

/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeStatus(
  activityType: MonthlyActivity,
  rawStatus: unknown,
): MonthlyStatus {
  /*
   * Safety Case:
   *
   * case_found     = ada case
   * not_applicable = tidak ada case
   */

  if (
    activityType ===
    "safety_case"
  ) {
    const value =
      String(
        rawStatus ?? "",
      )
        .trim()
        .toLowerCase();

    if (
      value ===
      "case_found"
    ) {
      return "case_found";
    }

    if (
      value ===
      "not_applicable"
    ) {
      return "not_applicable";
    }

    if (
      value === "case" ||
      value === "found" ||
      value === "yes" ||
      value === "true" ||
      value === "1"
    ) {
      return "case_found";
    }

    if (
      value === "no_case" ||
      value === "no-case" ||
      value === "none" ||
      value === "no" ||
      value === "false" ||
      value === "0"
    ) {
      return "not_applicable";
    }

    /*
     * Default Safety Case:
     * tidak ada status = No Case.
     */
    return "not_applicable";
  }

  return "completed";
}

/* =========================================================
   GET
   /api/safety/monthly?year=2026&month=8
   ========================================================= */

export async function GET(
  request: NextRequest,
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetyOverviewView,
    PERMISSIONS.safetySubmissionRead,
  ]);
  if (gate instanceof NextResponse) return gate;

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
            pic_en,
            pic_cn,
            location,
            description,
            description_en,
            description_cn,
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
   pic_en
   pic_cn
   location
   description
   description_en
   description_cn
   status
   submissionId

   Files:
   files
   ========================================================= */

export async function POST(
  request: NextRequest,
) {
  const gate = await requireAnyPermission([
    PERMISSIONS.safetySubmissionCreate,
    PERMISSIONS.safetySubmissionUpdate,
  ]);
  if (gate instanceof NextResponse) return gate;

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

    const rawStatus =
      formData.get("status");

    const status =
      normalizeStatus(
        activityType,
        rawStatus,
      );

    /* =====================================================
       SUBMISSION ID
       ===================================================== */

    const submissionIdValue =
      formData.get(
        "submissionId",
      );

    const submissionId =
      submissionIdValue !== null &&
      String(
        submissionIdValue,
      ).trim() !== ""
        ? Number(
            submissionIdValue,
          )
        : null;

    const validSubmissionId =
      submissionId !== null &&
      Number.isInteger(
        submissionId,
      ) &&
      submissionId > 0
        ? submissionId
        : null;

    /* =====================================================
       SUBMISSION DATE
       ===================================================== */

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

    /* =====================================================
       PIC
       ===================================================== */

    const picValue =
      formData.get("pic");

    const pic =
      picValue !== null
        ? String(
            picValue,
          ).trim() || null
        : null;

    const picEnValue =
      formData.get("pic_en");

    const picEn =
      picEnValue !== null
        ? String(
            picEnValue,
          ).trim() || null
        : null;

    const picCnValue =
      formData.get("pic_cn");

    const picCn =
      picCnValue !== null
        ? String(
            picCnValue,
          ).trim() || null
        : null;

    /* =====================================================
       LOCATION
       ===================================================== */

    const locationValue =
      formData.get("location");

    const location =
      locationValue !== null
        ? String(locationValue)
        : null;

    /* =====================================================
       DESCRIPTION
       ===================================================== */

    const descriptionEnValue =
      formData.get(
        "description_en",
      );

    const descriptionCnValue =
      formData.get(
        "description_cn",
      );

    const legacyDescriptionValue =
      formData.get(
        "description",
      );

    const descriptionEn =
      descriptionEnValue !== null
        ? String(
            descriptionEnValue,
          )
        : legacyDescriptionValue !==
              null
          ? String(
              legacyDescriptionValue,
            )
          : null;

    const descriptionCn =
      descriptionCnValue !== null
        ? String(
            descriptionCnValue,
          )
        : null;

    /*
     * Keep old description column
     * populated for compatibility.
     */
    const description =
      descriptionEn ||
      descriptionCn;

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
       VALIDATE ACTIVITY
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
       ===================================================== */

    let existingId:
      number | null = null;

    /*
     * Kalau frontend mengirim
     * submissionId, update record tersebut.
     */

    if (
      validSubmissionId !== null
    ) {
      const selectedQuery =
        await connection.execute(
          `
            SELECT
              id,
              activity_type
            FROM safety_submissions
            WHERE id = ?
              AND year = ?
              AND month = ?
              AND period_type = 'monthly'
            LIMIT 1
            FOR UPDATE
          `,
          [
            validSubmissionId,
            year,
            month,
          ],
        ) as [
          Array<{
            id: number;
            activity_type: string;
          }>,
          FieldPacket[],
        ];

      const selectedRows =
        selectedQuery[0];

      if (
        selectedRows.length ===
        0
      ) {
        await connection.rollback();

        return jsonError(
          "Submission Monthly yang akan di-update tidak ditemukan.",
          404,
        );
      }

      if (
        selectedRows[0]
          .activity_type !==
        activityType
      ) {
        await connection.rollback();

        return jsonError(
          "Submission ID tidak sesuai dengan activity type.",
          400,
        );
      }

      existingId =
        selectedRows[0].id;
    }

    /* =====================================================
       MONTHLY NORMAL
       1 RECORD PER BULAN
       ===================================================== */

    if (
      activityType !==
        "reward_finding" &&
      existingId === null
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
          Array<{
            id: number;
          }>,
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
        "reward_finding" &&
      existingId === null
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
          Array<{
            id: number;
          }>,
          FieldPacket[],
        ];

      const rewardRows =
        rewardQuery[0];

      if (
        rewardRows.length >= 2
      ) {
        await connection.rollback();

        return jsonError(
          "Penemuan Berhadiah bulan ini sudah mencapai maksimal 2 submission. Gunakan Update pada submission yang sudah ada untuk mengganti foto.",
          400,
        );
      }
    }

    /* =====================================================
       FILE VALIDATION
       ===================================================== */

    /*
     * Safety Case:
     *
     * - Case Found -> wajib upload evidence
     * - No Case -> boleh tanpa file
     *
     * Aktivitas lain:
     * - CREATE -> wajib file
     * - UPDATE -> file baru tidak wajib
     */

    const isSafetyCase =
      activityType ===
      "safety_case";

    const isCaseFound =
      isSafetyCase &&
      status === "case_found";

    if (
      uploadedFiles.length ===
        0 &&
      existingId === null &&
      !isSafetyCase
    ) {
      await connection.rollback();

      return jsonError(
        "At least one photo/file is required for this monthly activity.",
        400,
      );
    }

    /*
     * Safety Case yang Case Found
     * wajib punya evidence.
     */

    if (
      isCaseFound &&
      uploadedFiles.length ===
        0 &&
      existingId === null
    ) {
      await connection.rollback();

      return jsonError(
        "Evidence photo/file is required when a Safety Case is found.",
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
          getSafetyUploadDir(),
          String(year),
          String(month).padStart(
            2,
            "0",
          ),
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

        /*
         * URL yang disimpan di database.
         *
         * Browser tidak membaca
         * SAFETY_UPLOAD_DIR langsung.
         *
         * Browser akan meminta:
         *
         * /api/safety/files/...
         *
         * lalu route files membaca
         * file fisik dari SAFETY_UPLOAD_DIR.
         */

        fileUrls.push(
          `/api/safety/files/${year}/${String(
            month,
          ).padStart(
            2,
            "0",
          )}/monthly/${filename}`,
        );
      }
    }

    /* =====================================================
       UPDATE EXISTING MONTHLY
       ===================================================== */

    const needed =
      existingId !== null
        ? PERMISSIONS.safetySubmissionUpdate
        : PERMISSIONS.safetySubmissionCreate;
    if (!accountHasPermission(gate.account, needed)) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 },
      );
    }

    if (
      existingId !== null
    ) {
      let finalFileNames =
        fileNames;

      let finalFileUrls =
        fileUrls;

      /*
       * Kalau tidak upload file baru,
       * gunakan file lama.
       */

      if (
        uploadedFiles.length ===
        0
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
            Array<{
              file_name:
                | string
                | null;
              file_url:
                | string
                | null;
            }>,
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

      /* ===================================================
         UPDATE
         =================================================== */

      await connection.execute(
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
            file_url = ?,
            verified_by = NULL,
            verified_at = NULL
          WHERE id = ?
            AND period_type = 'monthly'
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
          JSON.stringify(
            finalFileNames,
          ),
          JSON.stringify(
            finalFileUrls,
          ),
          existingId,
        ],
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        action: "updated",
        id: existingId,
        year,
        month,
        periodType: "monthly",
        activityType,
        status,
        files:
          finalFileNames.map(
            (
              name,
              index,
            ) => ({
              name,
              url:
                finalFileUrls[
                  index
                ] ?? "",
            }),
          ),
        message:
          "Monthly berhasil di-update.",
      });
    }

    /* =====================================================
       INSERT NEW MONTHLY
       ===================================================== */

    const [
      insertResult,
    ] =
      await connection.execute(
        `
          INSERT INTO safety_submissions
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
            NULL,
            NULL
          )
        `,
        [
          year,
          month,
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
      status,
      files:
        fileNames.map(
          (
            name,
            index,
          ) => ({
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
     * file tersimpan, hapus file
     * supaya tidak menjadi file sampah.
     */

    for (
      const filePath of savedFilePaths
    ) {
      try {
        await unlink(
          filePath,
        );
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
   RESOLVE STORED FILE PATH
   ========================================================= */

/*
 * Mendukung URL baru:
 *
 * /api/safety/files/2026/08/monthly/file.jpg
 *
 * menjadi:
 *
 * SAFETY_UPLOAD_DIR/2026/08/monthly/file.jpg
 *
 * Juga masih mendukung URL lama:
 *
 * /uploads/safety/2026/08/monthly/file.jpg
 *
 * supaya DELETE data lama tetap aman.
 */

function resolveStoredFilePath(
  fileUrl: string,
): string | null {
  const cleanUrl =
    fileUrl
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");

  const parts =
    cleanUrl
      .split("/")
      .filter(Boolean);

  let relativeParts: string[] | null =
    null;

  /*
   * URL baru:
   * api/safety/files/...
   */
  const filesIndex =
    parts.findIndex(
      (part) =>
        part === "files",
    );

  if (
    filesIndex >= 0 &&
    filesIndex <
      parts.length - 1
  ) {
    relativeParts =
      parts.slice(
        filesIndex + 1,
      );
  }

  /*
   * URL lama:
   * uploads/safety/...
   */
  if (
    !relativeParts
  ) {
    const safetyIndex =
      parts.findIndex(
        (part) =>
          part === "safety",
      );

    if (
      safetyIndex >= 0 &&
      safetyIndex <
        parts.length - 1
    ) {
      relativeParts =
        parts.slice(
          safetyIndex + 1,
        );
    }
  }

  if (
    !relativeParts ||
    relativeParts.length === 0
  ) {
    return null;
  }

  const uploadDir =
    path.resolve(
      getSafetyUploadDir(),
    );

  const filePath =
    path.resolve(
      uploadDir,
      ...relativeParts,
    );

  /*
   * Security:
   * Pastikan file tetap berada
   * di dalam SAFETY_UPLOAD_DIR.
   */

  const uploadDirWithSeparator =
    uploadDir.endsWith(
      path.sep,
    )
      ? uploadDir
      : `${uploadDir}${path.sep}`;

  if (
    filePath !== uploadDir &&
    !filePath.startsWith(
      uploadDirWithSeparator,
    )
  ) {
    return null;
  }

  return filePath;
}

/* =========================================================
   DELETE
   /api/safety/monthly?id=123
   ========================================================= */

export async function DELETE(
  request: NextRequest,
) {
  const gate = await requirePermission(
    PERMISSIONS.safetySubmissionDelete,
  );
  if (gate instanceof NextResponse) return gate;

  try {
    const url =
      new URL(request.url);

    const id = Number(
      url.searchParams.get(
        "id",
      ),
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
            file_name,
            file_url
          FROM safety_submissions
          WHERE id = ?
            AND period_type = 'monthly'
          LIMIT 1
        `,
        [id],
      ) as [
        Array<{
          file_name:
            | string
            | null;
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
        rows[0].file_name,
        rows[0].file_url,
      );

    const [
      deleteResult,
    ] =
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
      if (!file.url) {
        continue;
      }

      const filePath =
        resolveStoredFilePath(
          file.url,
        );

      if (!filePath) {
        console.warn(
          "Unable to resolve safety monthly file path:",
          file.url,
        );

        continue;
      }

      try {
        await unlink(
          filePath,
        );
      } catch (
        error
      ) {
        console.warn(
          "Unable to delete safety monthly file:",
          filePath,
          error,
        );
      }
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