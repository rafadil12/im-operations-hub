import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */

type EmployeeRow = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status:
    | "Active"
    | "On Leave"
    | "Inactive"
    | "Resigned"
    | "Terminated"
    | null;
};

type ScheduleRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  shift_code: "D/S" | "N/S" | null;
  schedule_type: "D" | "N" | "1" | "4" | "OFF";
  rotation_rule_id: number | null;
  generated_at: string;
  updated_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDaysInMonth(
  year: number,
  month: number,
) {
  return new Date(
    year,
    month,
    0,
  ).getDate();
}

function dateKey(
  year: number,
  month: number,
  day: number,
) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/* =========================================================
   MAP SCHEDULE
========================================================= */

function mapScheduleValue(
  value: string | null | undefined,
) {
  const normalized = String(
    value ?? "OFF",
  )
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "D":
      return "D";

    case "N":
      return "N";

    case "1":
      return "1";

    case "4":
      return "4";

    case "OFF":
    default:
      return "Rest";
  }
}

/* =========================================================
   COPY STYLE
========================================================= */

type CellStyleSnapshot = {
  font?: any;
  fill?: any;
  border?: any;
  alignment?: any;
  protection?: any;
  numFmt?: string;
};

type RowStyleSnapshot = {
  height?: number;
  styles: Map<
    number,
    CellStyleSnapshot
  >;
};

function captureRowStyles(
  row: ExcelJS.Row,
): RowStyleSnapshot {
  const styles = new Map<
    number,
    CellStyleSnapshot
  >();

  row.eachCell(
    {
      includeEmpty: true,
    },
    (
      cell,
      columnNumber,
    ) => {
      styles.set(
        columnNumber,
        {
          font: cell.font
            ? { ...cell.font }
            : undefined,

          fill: cell.fill
            ? { ...cell.fill }
            : undefined,

          border: cell.border
            ? { ...cell.border }
            : undefined,

          alignment: cell.alignment
            ? { ...cell.alignment }
            : undefined,

          protection:
            cell.protection
              ? {
                  ...cell.protection,
                }
              : undefined,

          numFmt:
            cell.numFmt,
        },
      );
    },
  );

  return {
    height: row.height,
    styles,
  };
}

function applyRowStyles(
  row: ExcelJS.Row,
  snapshot: RowStyleSnapshot,
  maxColumns = 34,
) {
  if (snapshot.height !== undefined) {
    row.height = snapshot.height;
  }

  for (
    let columnNumber = 1;
    columnNumber <= maxColumns;
    columnNumber += 1
  ) {
    const style =
      snapshot.styles.get(
        columnNumber,
      );

    if (!style) {
      continue;
    }

    const cell =
      row.getCell(
        columnNumber,
      );

    if (style.font) {
      cell.font = {
        ...style.font,
      };
    }

    if (style.fill) {
      cell.fill = {
        ...style.fill,
      };
    }

    if (style.border) {
      cell.border = {
        ...style.border,
      };
    }

    if (style.alignment) {
      cell.alignment = {
        ...style.alignment,
      };
    }

    if (style.protection) {
      cell.protection = {
        ...style.protection,
      };
    }

    if (style.numFmt) {
      cell.numFmt =
        style.numFmt;
    }
  }
}

/* =========================================================
   GET
   /api/organization/shift-management/export
========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    /* =======================================================
       READ QUERY PARAMETER
    ======================================================= */

    const { searchParams } =
      new URL(request.url);

    const year = Number(
      searchParams.get("year"),
    );

    const month = Number(
      searchParams.get("month"),
    );

    /* =======================================================
       VALIDATE YEAR / MONTH
    ======================================================= */

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 2000 ||
      year > 2100 ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Valid year and month are required.",
        },
        {
          status: 400,
        },
      );
    }

    const daysInMonth =
      getDaysInMonth(
        year,
        month,
      );

    const startDate =
      `${year}-${pad(month)}-01`;

    /* =======================================================
       LOAD EMPLOYEES

       Sama dengan struktur Organization Management:
       users
       employee_organization
       divisions
    ======================================================= */

    const employees =
      await query<EmployeeRow[]>(
        `
        SELECT
          u.id,
          u.employee_no,
          u.name_en,
          u.name_cn,

          d.name_en AS division_name_en,
          d.name_cn AS division_name_cn,

          eo.employment_status

        FROM users u

        LEFT JOIN divisions d
          ON d.id = u.division_id

        INNER JOIN employee_organization eo
          ON eo.user_id = u.id

        WHERE
          eo.employment_status = 'Active'
          AND u.employee_no IS NOT NULL
          AND u.employee_no <> 'SUPERADMIN'

        ORDER BY
          COALESCE(
            u.name_en,
            u.name_cn,
            u.employee_no
          ) ASC
        `,
      );

    /* =======================================================
       LOAD SCHEDULE

       Ini mengikuti route /schedules yang sekarang
       dipakai oleh halaman Schedule.
    ======================================================= */

    const schedules =
      await query<ScheduleRow[]>(
        `
        SELECT
          id,
          employee_no,
          schedule_date,
          shift_code,
          schedule_type,
          rotation_rule_id,
          generated_at,
          updated_at

        FROM shift_schedules

        WHERE
          schedule_date >= ?
          AND schedule_date < DATE_ADD(
            ?,
            INTERVAL 1 MONTH
          )

        ORDER BY
          employee_no ASC,
          schedule_date ASC,
          id ASC
        `,
        [
          startDate,
          startDate,
        ],
      );

    /* =======================================================
       NO EMPLOYEE
    ======================================================= */

    if (
      employees.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active employees found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =======================================================
       BUILD SCHEDULE MAP

       key:
       employee_no|YYYY-MM-DD
    ======================================================= */

    const scheduleMap =
      new Map<string, string>();

    for (const row of schedules) {
      const scheduleDate =
        String(
          row.schedule_date,
        ).slice(0, 10);

      scheduleMap.set(
        `${row.employee_no}|${scheduleDate}`,
        mapScheduleValue(
          row.schedule_type,
        ),
      );
    }

    /* =======================================================
       TEMPLATE PATH

       ExcelJS bekerja dengan .xlsx.

       Pastikan file:
       public/templates/
       Emp. Shift_IT AGS 2026.xlsx
    ======================================================= */

    const templatePath =
      path.join(
        process.cwd(),
        "public",
        "templates",
        "Emp. Shift_IT AGS 2026.xlsx",
      );

    /* =======================================================
       READ TEMPLATE
    ======================================================= */

    const templateBuffer =
      await readFile(
        templatePath,
      );

    /* =======================================================
       CREATE WORKBOOK
    ======================================================= */

    const workbook =
      new ExcelJS.Workbook();

    /*
     * IMPORTANT:
     *
     * Pada kombinasi versi Node typings + ExcelJS tertentu,
     * readFile() menghasilkan NonSharedBuffer sedangkan
     * ExcelJS mengharapkan Buffer versi type yang berbeda.
     *
     * Kita sengaja menggunakan `as any` di sini supaya
     * tidak terjadi konflik type-only antara:
     *
     * NonSharedBuffer
     *       vs
     * Buffer
     *
     * Data binary-nya sendiri tetap sama.
     */

    await workbook.xlsx.load(
      templateBuffer as any,
    );

    /* =======================================================
       GET WORKSHEET
    ======================================================= */

    const worksheet =
      workbook.getWorksheet(
        "Shift Table",
      );

    if (!worksheet) {
      throw new Error(
        'Template sheet "Shift Table" was not found.',
      );
    }

    /* =======================================================
       SAVE TEMPLATE ROW STYLE
    ======================================================= */

    const templateEmployeeRow =
      worksheet.getRow(5);

    const templateRowStyle =
      captureRowStyles(
        templateEmployeeRow,
      );

    /* =======================================================
       HEADER
    ======================================================= */

    worksheet.getCell(
      "A1",
    ).value =
      `（${year}-${pad(month)}-01 To ${year}-${pad(month)}-${pad(daysInMonth)}）`;

    worksheet.getCell(
      "A2",
    ).value =
      "Note: please follow the existing format strictly otherwise the data will not be recognized by background";

    worksheet.getCell(
      "A3",
    ).value =
      "Shift:";

    worksheet.getCell(
      "A4",
    ).value =
      "Employee No.";

    worksheet.getCell(
      "B4",
    ).value =
      "Name";

    worksheet.getCell(
      "C4",
    ).value =
      "Dept";

    /* =======================================================
       DATE HEADER

       D = day 1
       E = day 2
       ...
       AH = day 31
    ======================================================= */

    for (
      let day = 1;
      day <= 31;
      day += 1
    ) {
      const column =
        day + 3;

      const cell =
        worksheet.getCell(
          4,
          column,
        );

      if (
        day <= daysInMonth
      ) {
        const date =
          new Date(
            year,
            month - 1,
            day,
          );

        const weekday =
          date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            },
          );

        cell.value =
          `${year}-${pad(month)}-${pad(day)} (${weekday})`;
      } else {
        cell.value = null;
      }
    }

    /* =======================================================
       REMOVE EXISTING EMPLOYEE ROWS

       Keep:
       row 1
       row 2
       row 3
       row 4

       Remove from row 5 downward.
    ======================================================= */

    const oldRowCount =
      Math.max(
        worksheet.rowCount - 4,
        0,
      );

    if (
      oldRowCount > 0
    ) {
      worksheet.spliceRows(
        5,
        oldRowCount,
      );
    }

    /* =======================================================
       WRITE EMPLOYEE DATA
    ======================================================= */

    employees.forEach(
      (
        employee,
        index,
      ) => {
        const rowNumber =
          index + 5;

        const row =
          worksheet.getRow(
            rowNumber,
          );

        /* -----------------------------------------------
           COPY TEMPLATE STYLE
        ------------------------------------------------ */

        applyRowStyles(
          row,
          templateRowStyle,
          34,
        );

        /* -----------------------------------------------
           EMPLOYEE NO
        ------------------------------------------------ */

        row.getCell(
          1,
        ).value =
          employee.employee_no;

        /* -----------------------------------------------
           NAME
        ------------------------------------------------ */

        row.getCell(
          2,
        ).value =
          employee.name_en ||
          employee.name_cn ||
          employee.employee_no;

        /* -----------------------------------------------
           DEPARTMENT
        ------------------------------------------------ */

        row.getCell(
          3,
        ).value =
          employee.division_name_en ||
          employee.division_name_cn ||
          "";

        /* -----------------------------------------------
           DAILY SCHEDULE
        ------------------------------------------------ */

        for (
          let day = 1;
          day <= 31;
          day += 1
        ) {
          const column =
            day + 3;

          const cell =
            row.getCell(
              column,
            );

          /* -------------------------------------------
             Hari di luar bulan
          -------------------------------------------- */

          if (
            day > daysInMonth
          ) {
            cell.value =
              null;

            continue;
          }

          /* -------------------------------------------
             Cari schedule
          -------------------------------------------- */

          const key =
            `${employee.employee_no}|${dateKey(
              year,
              month,
              day,
            )}`;

          /*
           * Tidak ada record:
           * Rest
           */

          const schedule =
            scheduleMap.get(
              key,
            ) ?? "Rest";

          cell.value =
            schedule;
        }
      },
    );

    /* =======================================================
       FREEZE PANES
    ======================================================= */

    worksheet.views = [
      {
        state: "frozen",
        xSplit: 3,
        ySplit: 4,
      },
    ];

    /* =======================================================
       COLUMN WIDTH
    ======================================================= */

    worksheet.getColumn(
      1,
    ).width = Math.max(
      worksheet.getColumn(1)
        .width || 12,
      14,
    );

    worksheet.getColumn(
      2,
    ).width = Math.max(
      worksheet.getColumn(2)
        .width || 18,
      22,
    );

    worksheet.getColumn(
      3,
    ).width = Math.max(
      worksheet.getColumn(3)
        .width || 14,
      18,
    );

    for (
      let column = 4;
      column <= 34;
      column += 1
    ) {
      worksheet.getColumn(
        column,
      ).width =
        Math.max(
          worksheet
            .getColumn(
              column,
            ).width || 10,
          12,
        );
    }

    /* =======================================================
       WRITE FILE
    ======================================================= */

    const output =
      await workbook.xlsx.writeBuffer();

    /*
     * Sama seperti masalah input buffer,
     * kita hindari konflik type ExcelJS/Node typings.
     */

    const outputBuffer =
      Buffer.from(
        output as any,
      );

    /* =======================================================
       FILENAME
    ======================================================= */

    const filename =
      `Emp. Shift_IT_${year}_${pad(month)}.xlsx`;

    /* =======================================================
       RESPONSE
    ======================================================= */

    return new NextResponse(
      outputBuffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      },
    );
  } catch (error) {
    /* =======================================================
       ERROR HANDLING
    ======================================================= */

    console.error(
      "GET shift schedule export failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to export schedule.",
      },
      {
        status: 500,
      },
    );
  }
}