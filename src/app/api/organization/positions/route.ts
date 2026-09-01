import { NextRequest, NextResponse } from "next/server";

import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth";

import { query } from "@/lib/db";

type PositionRow = {
  id: number;
  name_en: string;
  name_cn: string | null;
  division_id: number | null;
  division_name_en: string | null;
  division_name_cn: string | null;
};

type DefaultPosition = {
  nameEn: string;
  nameCn: string;
  divisionEn: string | null;
};

/*
 * =========================================================
 * DEFAULT ORGANIZATION POSITIONS
 * =========================================================
 *
 * Struktur organisasi:
 *
 * WANG CHUNLAI
 * Position: General Manager
 * Manager: No Manager
 * │
 * ├── IT Staff
 * │   └── IT Technician
 * │
 * ├── MES Staff
 * │   └── MES Technician
 * │
 * └── Intelligent Logistics Staff
 *     └── Intelligent Logistics Technician
 *
 * Manager diatur terpisah melalui manager_id.
 *
 * General Manager tidak mempunyai Manager.
 * =========================================================
 */

const DEFAULT_POSITIONS: DefaultPosition[] = [
  /*
   * ROOT / BOSS
   *
   * Tidak terikat ke division tertentu.
   */
  {
    nameEn: "General Manager",
    nameCn: "总经理",
    divisionEn: null,
  },

  /*
   * IT
   */
  {
    nameEn: "IT Staff",
    nameCn: "IT员工",
    divisionEn: "IT",
  },
  {
    nameEn: "IT Technician",
    nameCn: "IT技术员",
    divisionEn: "IT",
  },

  /*
   * MES
   */
  {
    nameEn: "MES Staff",
    nameCn: "MES员工",
    divisionEn: "MES",
  },
  {
    nameEn: "MES Technician",
    nameCn: "MES技术员",
    divisionEn: "MES",
  },

  /*
   * INTELLIGENT LOGISTICS
   */
  {
    nameEn: "Intelligent Logistics Staff",
    nameCn: "智能物流员工",
    divisionEn: "Intelligent Logistics",
  },
  {
    nameEn: "Intelligent Logistics Technician",
    nameCn: "智能物流技术员",
    divisionEn: "Intelligent Logistics",
  },
];

/*
 * =========================================================
 * GET POSITIONS
 * =========================================================
 */

export async function GET(
  _request: NextRequest,
) {
  /*
   * =======================================================
   * PERMISSION CHECK
   * =======================================================
   */

  const gate = await requirePermission(
    PERMISSIONS.dailyMasterManage,
  );

  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    /*
     * =======================================================
     * 1. MAKE SURE REQUIRED POSITIONS EXIST
     * =======================================================
     *
     * Position yang belum ada akan dibuat otomatis.
     *
     * General Manager:
     * - Tidak membutuhkan division
     * - division_id = NULL
     *
     * Position lainnya:
     * - Menggunakan division masing-masing.
     */

    for (const position of DEFAULT_POSITIONS) {
      if (position.divisionEn === null) {
        /*
         * ===================================================
         * GENERAL MANAGER
         * ===================================================
         *
         * General Manager adalah posisi root.
         * Tidak mempunyai division.
         */

        await query(
          `
          INSERT INTO positions (
            name_en,
            name_cn,
            division_id
          )
          SELECT
            ?,
            ?,
            NULL
          FROM DUAL
          WHERE NOT EXISTS (
            SELECT 1
            FROM positions p
            WHERE p.name_en = ?
              AND p.division_id IS NULL
          )
          `,
          [
            position.nameEn,
            position.nameCn,
            position.nameEn,
          ],
        );
      } else {
        /*
         * ===================================================
         * DEPARTMENT POSITION
         * ===================================================
         */

        await query(
          `
          INSERT INTO positions (
            name_en,
            name_cn,
            division_id
          )
          SELECT
            ?,
            ?,
            d.id
          FROM divisions d
          WHERE d.name_en = ?
            AND NOT EXISTS (
              SELECT 1
              FROM positions p
              WHERE p.name_en = ?
                AND p.division_id = d.id
            )
          LIMIT 1
          `,
          [
            position.nameEn,
            position.nameCn,
            position.divisionEn,
            position.nameEn,
          ],
        );
      }
    }

    /*
     * =======================================================
     * 2. LOAD POSITIONS FROM DATABASE
     * =======================================================
     */

    const rows =
      await query<PositionRow[]>(
        `
        SELECT
          p.id,
          p.name_en,
          p.name_cn,
          p.division_id,

          d.name_en AS division_name_en,
          d.name_cn AS division_name_cn

        FROM positions p

        LEFT JOIN divisions d
          ON d.id = p.division_id

        WHERE p.name_en IN (
          'General Manager',

          'IT Staff',
          'IT Technician',

          'MES Staff',
          'MES Technician',

          'Intelligent Logistics Staff',
          'Intelligent Logistics Technician'
        )

        ORDER BY
          CASE

            /*
             * ROOT
             */
            WHEN p.name_en = 'General Manager'
              THEN 1

            /*
             * IT
             */
            WHEN d.name_en = 'IT'
              AND p.name_en = 'IT Staff'
              THEN 2

            WHEN d.name_en = 'IT'
              AND p.name_en = 'IT Technician'
              THEN 3

            /*
             * MES
             */
            WHEN d.name_en = 'MES'
              AND p.name_en = 'MES Staff'
              THEN 4

            WHEN d.name_en = 'MES'
              AND p.name_en = 'MES Technician'
              THEN 5

            /*
             * INTELLIGENT LOGISTICS
             */
            WHEN d.name_en = 'Intelligent Logistics'
              AND p.name_en = 'Intelligent Logistics Staff'
              THEN 6

            WHEN d.name_en = 'Intelligent Logistics'
              AND p.name_en = 'Intelligent Logistics Technician'
              THEN 7

            ELSE 99

          END,

          p.name_en ASC
        `,
      );

    /*
     * =======================================================
     * 3. RETURN DATA
     * =======================================================
     */

    return NextResponse.json({
      data: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/organization/positions failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load positions.",
      },
      {
        status: 500,
      },
    );
  }
}