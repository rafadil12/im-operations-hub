"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type OrganizationLanguage = "en" | "cn";

type RawScheduleType =
  | "D"
  | "N"
  | "D/S"
  | "N/S"
  | "1"
  | "4"
  | "OFF"
  | null;

type AttendanceValue =
  | "10.5"
  | "8"
  | "4"
  | "OFF"
  | "AL"
  | "MC"
  | "UPL"
  | "A"
  | "";

type OrganizationEmployee = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status: string | null;
};

type ScheduleApiRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  schedule_type: RawScheduleType;
};

type AttendanceDailyValue =
  | "10.5"
  | "8"
  | "4"
  | "OFF"
  | "AL"
  | "MC"
  | "UPL"
  | "A"
  | "";

type AttendanceDailyApiRow = {
  id: number;
  employee_no: string;
  attendance_date: string;
  attendance_value: Exclude<AttendanceDailyValue, "">;
  planned_hours: number | string;
  source: "SHIFT" | "LEAVE";
  leave_request_id: number | null;
  created_at: string;
  updated_at: string;
};

type AttendanceRow = {
  employee: OrganizationEmployee;
  department: string;
  values: AttendanceDailyValue[];
  totalHours: number;
  al: number;
  mc: number;
  upl: number;
  absent: number;
  off: number;
  x1: number;
  over9: number;
  dayShift: number;
  nightShift: number;
};

const API_EMPLOYEES = "/api/organization/employees?limit=100";
const API_SCHEDULES = "/api/organization/shift-management/schedules";
const API_ATTENDANCE_DAILY = "/api/organization/attendance/daily";
const API_ATTENDANCE_SYNC =
  "/api/organization/attendance/daily/sync";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(
  year: number,
  monthIndex: number,
  day: number,
) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function weekdayLabel(
  year: number,
  monthIndex: number,
  day: number,
  language: OrganizationLanguage,
) {
  return new Date(year, monthIndex, day).toLocaleDateString(
    language === "cn" ? "zh-CN" : "en-US",
    {
      weekday: "short",
    },
  );
}

function daysInMonth(
  year: number,
  monthIndex: number,
) {
  return new Date(
    year,
    monthIndex + 1,
    0,
  ).getDate();
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function normalizeSchedule(
  value: RawScheduleType | undefined,
): Exclude<RawScheduleType, null> | null {
  if (!value) return null;

  if (value === "D/S") return "D/S";
  if (value === "N/S") return "N/S";
  if (value === "D") return "D";
  if (value === "N") return "N";

  if (
    value === "1" ||
    value === "4" ||
    value === "OFF"
  ) {
    return value;
  }

  return null;
}

function cellClass(
  value: AttendanceValue,
  language: OrganizationLanguage,
) {
  const base =
    "h-10 min-w-[58px] border-r border-b px-2 text-center align-middle text-[10px] font-extrabold text-slate-800 transition-all dark:text-slate-100";

  if (value === "10.5") {
    return `${base} border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-500/20 dark:text-cyan-50 dark:hover:bg-cyan-500/30`;
  }

  if (value === "8") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-50 dark:hover:bg-emerald-500/30`;
  }

  if (value === "4") {
    return `${base} border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-50 dark:hover:bg-amber-500/30`;
  }

  if (value === "OFF") {
    return `${base} border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-50 dark:hover:bg-rose-500/30`;
  }

  if (value === "AL") {
    return `${base} border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-50 dark:hover:bg-blue-500/30`;
  }

  if (value === "MC") {
    return `${base} border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-500/20 dark:text-violet-50 dark:hover:bg-violet-500/30`;
  }

  if (value === "UPL") {
    return `${base} border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/20 dark:text-indigo-50 dark:hover:bg-indigo-500/30`;
  }

  if (value === "A") {
    return `${base} border-red-300 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-50 dark:hover:bg-red-500/30`;
  }

  return `${base} border-border bg-surface text-text hover:bg-surface-hover dark:text-slate-100`;
}

function LegendItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[10px] font-extrabold text-text">
      <span
        className={`size-2 rounded-full ${tone}`}
      />
      <span>{value}</span>
      <span className="text-text-muted">
        {label}
      </span>
    </span>
  );
}

export default function DailyAttendancePage() {
  const { t } = useLang();

  const language: OrganizationLanguage =
    t.safety.management === "安全管理"
      ? "cn"
      : "en";

  const [selectedDate, setSelectedDate] = useState(
    () => new Date(),
  );

  const tableScrollRef =
    useRef<HTMLDivElement | null>(null);

  const [employees, setEmployees] = useState<
    OrganizationEmployee[]
  >([]);

  const [schedules, setSchedules] = useState<
    ScheduleApiRow[]
  >([]);

  const [attendanceDaily, setAttendanceDaily] =
    useState<AttendanceDailyApiRow[]>([]);

  const [department, setDepartment] =
    useState("all");

  const [shift, setShift] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const year = selectedDate.getFullYear();
  const monthIndex = selectedDate.getMonth();
  const totalDays = daysInMonth(
    year,
    monthIndex,
  );

  /*
   * ------------------------------------------------------
   * CURRENT DATE
   * ------------------------------------------------------
   *
   * Dibuat satu kali per render supaya tidak membuat
   * new Date() berulang-ulang ketika render table.
   */
  const today = useMemo(
    () => startOfDay(new Date()),
    [],
  );

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  /*
   * ------------------------------------------------------
   * DAY KEYS
   * ------------------------------------------------------
   *
   * Sebelumnya dateKey() dibuat berkali-kali
   * untuk setiap employee x setiap hari.
   *
   * Sekarang dibuat sekali.
   */
  const dayKeys = useMemo(() => {
    return Array.from(
      { length: totalDays },
      (_, index) =>
        dateKey(
          year,
          monthIndex,
          index + 1,
        ),
    );
  }, [
    year,
    monthIndex,
    totalDays,
  ]);

  /*
   * Reset scroll ketika pindah bulan.
   */
  useEffect(() => {
    tableScrollRef.current?.scrollTo({
      left: 0,
      behavior: "auto",
    });
  }, [year, monthIndex]);

  /*
   * ------------------------------------------------------
   * LOAD DATA
   * ------------------------------------------------------
   *
   * PERUBAHAN UTAMA:
   *
   * Sebelumnya:
   *
   *   sync -> wait -> load employee/schedule/attendance
   *
   * Sekarang:
   *
   *   employee/schedule/attendance
   *              ↓
   *         tampilkan tabel
   *              ↓
   *        background sync
   *              ↓
   *        refresh attendance
   *
   * Jadi halaman tidak menunggu sync.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        /*
         * --------------------------------------------------
         * LOAD DATA UTAMA SECARA PARALEL
         * --------------------------------------------------
         */
        const [
          employeesResponse,
          schedulesResponse,
          attendanceResponse,
        ] = await Promise.all([
          fetch(API_EMPLOYEES, {
            cache: "no-store",
          }),

          fetch(
            `${API_SCHEDULES}?year=${year}&month=${
              monthIndex + 1
            }`,
            {
              cache: "no-store",
            },
          ),

          fetch(
            `${API_ATTENDANCE_DAILY}?year=${year}&month=${
              monthIndex + 1
            }`,
            {
              cache: "no-store",
            },
          ),
        ]);

        if (!employeesResponse.ok) {
          throw new Error(
            `Employee API failed: ${employeesResponse.status}`,
          );
        }

        if (!schedulesResponse.ok) {
          throw new Error(
            `Schedule API failed: ${schedulesResponse.status}`,
          );
        }

        if (!attendanceResponse.ok) {
          throw new Error(
            `Daily attendance API failed: ${attendanceResponse.status}`,
          );
        }

        /*
         * --------------------------------------------------
         * PARSE JSON SECARA PARALEL
         * --------------------------------------------------
         */
        const [
          employeePayload,
          schedulePayload,
          attendancePayload,
        ] = await Promise.all([
          employeesResponse.json() as Promise<{
            data?: OrganizationEmployee[];
          }>,

          schedulesResponse.json() as Promise<{
            data?: ScheduleApiRow[];
          }>,

          attendanceResponse.json() as Promise<{
            data?: AttendanceDailyApiRow[];
          }>,
        ]);

        if (cancelled) {
          return;
        }

        /*
         * --------------------------------------------------
         * TAMPILKAN DATA SECEPATNYA
         * --------------------------------------------------
         */
        setEmployees(
          (employeePayload.data ?? []).filter(
            (employee) =>
              employee.employee_no &&
              employee.employee_no !== "SUPERADMIN" &&
              employee.employment_status === "Active",
          ),
        );

        setSchedules(
          schedulePayload.data ?? [],
        );

        setAttendanceDaily(
          attendancePayload.data ?? [],
        );

        /*
         * Jangan tunggu sync.
         * Table langsung boleh dirender.
         */
        setLoading(false);

        /*
         * --------------------------------------------------
         * BACKGROUND SYNC
         * --------------------------------------------------
         *
         * Sync berjalan setelah data sudah tampil.
         */
        void fetch(
          API_ATTENDANCE_SYNC,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              year,
              month: monthIndex + 1,
            }),
          },
        )
          .then(
            async (syncResponse) => {
              if (!syncResponse.ok) {
                throw new Error(
                  `Attendance sync failed: ${syncResponse.status}`,
                );
              }

              /*
               * Setelah sync selesai,
               * ambil attendance terbaru.
               */
              const refreshedResponse =
                await fetch(
                  `${API_ATTENDANCE_DAILY}?year=${year}&month=${
                    monthIndex + 1
                  }`,
                  {
                    cache: "no-store",
                  },
                );

              if (!refreshedResponse.ok) {
                throw new Error(
                  `Attendance refresh failed: ${refreshedResponse.status}`,
                );
              }

              const refreshedPayload =
                (await refreshedResponse.json()) as {
                  data?: AttendanceDailyApiRow[];
                };

              if (cancelled) {
                return;
              }

              setAttendanceDaily(
                refreshedPayload.data ?? [],
              );
            },
          )
          .catch((syncError) => {
            /*
             * Background sync gagal tidak membuat
             * halaman utama menjadi error.
             *
             * Data awal tetap ditampilkan.
             */
            console.error(
              "Background attendance sync failed:",
              syncError,
            );
          });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : language === "cn"
                ? "加载考勤数据失败。"
                : "Failed to load attendance data.",
          );

          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    year,
    monthIndex,
    language,
  ]);

  /*
   * ------------------------------------------------------
   * SCHEDULE MAP
   * ------------------------------------------------------
   */
  const scheduleMap = useMemo(() => {
    const map =
      new Map<string, RawScheduleType>();

    for (const row of schedules) {
      map.set(
        `${row.employee_no}|${String(
          row.schedule_date,
        ).slice(0, 10)}`,
        row.schedule_type,
      );
    }

    return map;
  }, [schedules]);

  /*
   * ------------------------------------------------------
   * ATTENDANCE MAP
   * ------------------------------------------------------
   */
  const attendanceDailyMap = useMemo(() => {
    const map =
      new Map<string, AttendanceDailyApiRow>();

    for (const row of attendanceDaily) {
      const key =
        `${row.employee_no}|${String(
          row.attendance_date,
        ).slice(0, 10)}`;

      map.set(key, row);
    }

    return map;
  }, [attendanceDaily]);

  /*
   * ------------------------------------------------------
   * DEPARTMENTS
   * ------------------------------------------------------
   */
  const departments = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((employee) =>
            language === "cn"
              ? employee.division_name_cn ||
                employee.division_name_en
              : employee.division_name_en ||
                employee.division_name_cn,
          )
          .filter(Boolean),
      ),
    ).sort() as string[];
  }, [employees, language]);

  /*
   * ------------------------------------------------------
   * ROWS
   * ------------------------------------------------------
   *
   * Logika tetap sama:
   *
   * - attendance_daily = source utama
   * - missing = blank
   * - total hours dari planned_hours
   * - shift tetap dibaca dari schedule
   * - filter department
   * - filter shift
   * - search employee
   */
  const rows = useMemo<AttendanceRow[]>(() => {
    const query =
      search.trim().toLowerCase();

    return employees
      .map((employee) => {
        const employeeDepartment =
          (language === "cn"
            ? employee.division_name_cn ||
              employee.division_name_en
            : employee.division_name_en ||
              employee.division_name_cn) || "—";

        /*
         * -----------------------------------------------
         * ATTENDANCE VALUES
         * -----------------------------------------------
         */
        const values =
          dayKeys.map((dayKey) => {
            const daily =
              attendanceDailyMap.get(
                `${employee.employee_no}|${dayKey}`,
              );

            if (!daily) {
              return "";
            }

            return daily.attendance_value;
          });

        /*
         * -----------------------------------------------
         * TOTAL HOURS
         * -----------------------------------------------
         */
        const totalHours = dayKeys.reduce(
          (sum, dayKey) => {
            const daily =
              attendanceDailyMap.get(
                `${employee.employee_no}|${dayKey}`,
              );

            if (!daily) {
              return sum;
            }

            return (
              sum +
              (Number(
                daily.planned_hours,
              ) || 0)
            );
          },
          0,
        );

        /*
         * -----------------------------------------------
         * SHIFT
         *
         * Tetap sama seperti logic sebelumnya:
         * D/D-S diprioritaskan,
         * kemudian N/N-S.
         * -----------------------------------------------
         */
        let hasDayShift = false;
        let hasNightShift = false;

        for (const dayKey of dayKeys) {
          const normalized =
            normalizeSchedule(
              scheduleMap.get(
                `${employee.employee_no}|${dayKey}`,
              ),
            );

          if (
            normalized === "D" ||
            normalized === "D/S"
          ) {
            hasDayShift = true;
            break;
          }

          if (
            normalized === "N" ||
            normalized === "N/S"
          ) {
            hasNightShift = true;
          }
        }

        const rowShift = hasDayShift
          ? "D"
          : hasNightShift
            ? "N"
            : "";

        /*
         * -----------------------------------------------
         * COUNTS
         * -----------------------------------------------
         */
        let al = 0;
        let mc = 0;
        let upl = 0;
        let absent = 0;
        let off = 0;
        let x1 = 0;
        let over9 = 0;
        let tenPointFive = 0;

        for (const value of values) {
          if (value === "AL") {
            al++;
          }

          if (value === "MC") {
            mc++;
          }

          if (value === "UPL") {
            upl++;
          }

          if (value === "A") {
            absent++;
          }

          if (value === "OFF") {
            off++;
          }

          if (value === "8") {
            x1++;
          }

          if (value === "10.5") {
            tenPointFive++;
            over9++;
          }
        }

        return {
          employee,
          department: employeeDepartment,
          values,
          totalHours,
          al,
          mc,
          upl,
          absent,
          off,
          x1,
          over9,
          dayShift:
            rowShift === "D"
              ? tenPointFive
              : 0,
          nightShift:
            rowShift === "N"
              ? tenPointFive
              : 0,
        };
      })
      .filter((row) => {
        /*
         * -----------------------------------------------
         * DEPARTMENT FILTER
         * -----------------------------------------------
         */
        const matchesDepartment =
          department === "all" ||
          row.department === department;

        /*
         * -----------------------------------------------
         * SHIFT FILTER
         * -----------------------------------------------
         */
        const matchesShift =
          shift === "all" ||
          row.values.some(
            (_, index) => {
              const normalized =
                normalizeSchedule(
                  scheduleMap.get(
                    `${row.employee.employee_no}|${
                      dayKeys[index]
                    }`,
                  ),
                );

              if (shift === "D") {
                return (
                  normalized === "D" ||
                  normalized === "D/S"
                );
              }

              if (shift === "N") {
                return (
                  normalized === "N" ||
                  normalized === "N/S"
                );
              }

              return normalized === shift;
            },
          );

        /*
         * -----------------------------------------------
         * SEARCH FILTER
         * -----------------------------------------------
         */
        const haystack =
          `${row.employee.employee_no} ${
            row.employee.name_en ?? ""
          } ${
            row.employee.name_cn ?? ""
          } ${row.department}`.toLowerCase();

        const matchesSearch =
          !query ||
          haystack.includes(query);

        return (
          matchesDepartment &&
          matchesShift &&
          matchesSearch
        );
      });
  }, [
    employees,
    scheduleMap,
    attendanceDailyMap,
    dayKeys,
    department,
    shift,
    search,
    language,
  ]);

  /*
   * ------------------------------------------------------
   * MONTH LABEL
   * ------------------------------------------------------
   */
  const monthLabel =
    selectedDate.toLocaleDateString(
      language === "cn"
        ? "zh-CN"
        : "en-US",
      {
        month: "long",
        year: "numeric",
      },
    );

  /*
   * ------------------------------------------------------
   * SUMMARY
   * ------------------------------------------------------
   */
  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.employees += 1;
        acc.hours += row.totalHours;
        acc.off += row.off;

        return acc;
      },
      {
        employees: 0,
        hours: 0,
        off: 0,
      },
    );
  }, [rows]);

  /*
   * ------------------------------------------------------
   * EMPLOYEE NAME
   * ------------------------------------------------------
   */
  const employeeName = (
    employee: OrganizationEmployee,
  ) =>
    language === "cn"
      ? employee.name_cn ||
        employee.name_en ||
        employee.employee_no
      : employee.name_en ||
        employee.name_cn ||
        employee.employee_no;

  return (
    <AppShell
      title={
        language === "cn"
          ? "每日考勤"
          : "Daily Attendance"
      }
    >
      <div className="min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/5 text-lg font-bold text-cyan-300">
                ▦
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text">
                  {language === "cn"
                    ? "每日考勤"
                    : "Daily Attendance"}
                </h1>

                <p className="mt-1 text-xs text-text-muted">
                  {language === "cn"
                    ? "按月份查看员工每日考勤结果与工时。"
                    : "View employee attendance results and hours by day."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  new Date(
                    year,
                    monthIndex - 1,
                    1,
                  ),
                )
              }
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
            >
              ←
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(new Date())
              }
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[10px] font-extrabold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
            >
              {language === "cn"
                ? "本月"
                : "This Month"}
            </button>

            <div className="inline-flex h-9 min-w-36 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500 px-4 text-[10px] font-extrabold text-white shadow-md shadow-cyan-500/20">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  new Date(
                    year,
                    monthIndex + 1,
                    1,
                  ),
                )
              }
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
            >
              →
            </button>
          </div>
        </div>

        {/* LEGEND */}
        <div className="flex flex-wrap gap-2.5">
          <LegendItem
            value="10.5"
            label={
              language === "cn"
                ? "D/S / N/S"
                : "D/S / N/S"
            }
            tone="bg-cyan-500"
          />

          <LegendItem
            value="8"
            label={
              language === "cn"
                ? "班次 1"
                : "Shift 1"
            }
            tone="bg-emerald-500"
          />

          <LegendItem
            value="4"
            label={
              language === "cn"
                ? "班次 4"
                : "Shift 4"
            }
            tone="bg-amber-500"
          />

          <LegendItem
            value="OFF"
            label={
              language === "cn"
                ? "休息"
                : "Rest"
            }
            tone="bg-slate-500"
          />

          <LegendItem
            value="AL"
            label={
              language === "cn"
                ? "年假"
                : "Annual Leave"
            }
            tone="bg-blue-500"
          />

          <LegendItem
            value="MC"
            label={
              language === "cn"
                ? "病假"
                : "Sick Leave"
            }
            tone="bg-violet-500"
          />

          <LegendItem
            value="UPL"
            label={
              language === "cn"
                ? "请假/外出"
                : "Permission"
            }
            tone="bg-indigo-500"
          />
        </div>

        <Card className="overflow-hidden">
          {/* FILTERS */}
          <div className="border-b border-border-subtle bg-surface-hover p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  {language === "cn"
                    ? "搜索员工"
                    : "Search Employee"}
                </label>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder={
                    language === "cn"
                      ? "姓名 / 工号..."
                      : "Name / employee no..."
                  }
                  className="cursor-text rounded-md border border-border bg-surface px-3 py-2 text-xs text-text outline-none transition focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  {language === "cn"
                    ? "部门"
                    : "Department"}
                </label>

                <select
                  value={department}
                  onChange={(event) =>
                    setDepartment(
                      event.target.value,
                    )
                  }
                  className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text outline-none transition focus:border-cyan-400/50"
                >
                  <option value="all">
                    {language === "cn"
                      ? "全部部门"
                      : "All Departments"}
                  </option>

                  {departments.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  {language === "cn"
                    ? "班次"
                    : "Shift"}
                </label>

                <select
                  value={shift}
                  onChange={(event) =>
                    setShift(
                      event.target.value,
                    )
                  }
                  className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text outline-none transition focus:border-cyan-400/50"
                >
                  <option value="all">
                    {language === "cn"
                      ? "全部班次"
                      : "All Shifts"}
                  </option>

                  <option value="D">
                    D/S / Day
                  </option>

                  <option value="N">
                    N/S / Night
                  </option>

                  <option value="1">
                    1 / 08:00–17:00
                  </option>

                  <option value="4">
                    4 / 4 Hours
                  </option>

                  <option value="OFF">
                    OFF
                  </option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDepartment("all");
                    setShift("all");
                  }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-extrabold text-text shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                >
                  {language === "cn"
                    ? "重置筛选"
                    : "Reset Filters"}
                </button>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-3 border-b border-border-subtle md:grid-cols-6">
            <div className="border-r border-border-subtle p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn"
                  ? "员工"
                  : "Employees"}
              </p>

              <p className="mt-1 text-2xl font-bold text-text">
                {summary.employees}
              </p>
            </div>

            <div className="border-r border-border-subtle p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn"
                  ? "计划工时"
                  : "Planned Hours"}
              </p>

              <p className="mt-1 text-2xl font-bold text-cyan-600 dark:text-cyan-300">
                {summary.hours.toFixed(1)}
              </p>
            </div>

            <div className="border-r border-border-subtle p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                OFF
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-600 dark:text-slate-300">
                {summary.off}
              </p>
            </div>

            <div className="border-r border-border-subtle p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn"
                  ? "当前月份"
                  : "Month"}
              </p>

              <p className="mt-1 text-sm font-bold text-text">
                {monthLabel}
              </p>
            </div>

            <div className="border-r border-border-subtle p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn"
                  ? "数据来源"
                  : "Source"}
              </p>

              <p className="mt-1 text-sm font-bold text-text">
                {language === "cn"
                  ? "班次接口"
                  : "Shift API"}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn"
                  ? "状态"
                  : "Mode"}
              </p>

              <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-300">
                {language === "cn"
                  ? "自动"
                  : "Automatic"} 
              </p>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="m-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* TABLE */}
          <div
            ref={tableScrollRef}
            className="overflow-x-auto overscroll-x-contain"
          >
            <table className="w-max min-w-full border-collapse">
              <thead>
                <tr className="bg-surface-hover">
                  <th className="sticky left-0 z-20 min-w-[52px] border-r border-b border-border bg-surface-hover px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide text-text-muted">
                    #
                  </th>

                  <th className="sticky left-[52px] z-20 min-w-[190px] border-r border-b border-border bg-surface-hover px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-text-muted">
                    {language === "cn"
                      ? "员工"
                      : "Employee"}
                  </th>

                  <th className="sticky left-[242px] z-20 min-w-[120px] border-r border-b border-border bg-surface-hover px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-text-muted">
                    {language === "cn"
                      ? "部门"
                      : "Department"}
                  </th>

                  {Array.from(
                    {
                      length: totalDays,
                    },
                    (_, index) => {
                      const day =
                        index + 1;

                      const dayDate =
                        new Date(
                          year,
                          monthIndex,
                          day,
                        );

                      const weekday =
                        dayDate.getDay();

                      const isWeekend =
                        weekday === 0 ||
                        weekday === 6;

                      const isToday =
                        todayYear === year &&
                        todayMonth ===
                          monthIndex &&
                        todayDay === day;

                      return (
                        <th
                          key={day}
                          className={`min-w-[58px] border-r border-b px-1.5 py-2 text-center ${
                            isToday
                            ? "border-cyan-400 bg-cyan-200 text-slate-900 dark:border-cyan-400/60 dark:bg-cyan-500/30 dark:text-white"
                            : weekday === 0
                            ? "border-red-500 bg-red-500 text-white dark:border-red-400 dark:bg-red-500 dark:text-white"
                            : isWeekend
                                ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                                : "border-border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white"
                        }`}
                        >
                          <div className="text-[10px] font-black leading-none">
                            {pad(day)}
                          </div>

                          <div className="mt-1 text-[8px] font-bold uppercase tracking-wide opacity-70">
                            {weekdayLabel(
                              year,
                              monthIndex,
                              day,
                              language,
                            )}
                          </div>
                          {isToday && (
                            <span className="mx-auto mt-1 block size-1.5 rounded-full bg-emerald-500" />
                          )}
                        </th>
                      );
                    },
                  )}

                  <th className="min-w-[90px] border-r-2 border-b border-l border-border bg-slate-100 px-3 py-3 text-center text-[10px] font-black text-slate-800 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "总工时"
                      : "Total Hours"}
                  </th>

                  <th className="min-w-[50px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    X 1
                  </th>

                  <th className="min-w-[50px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    &gt;9
                  </th>

                  <th className="min-w-[55px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "年假"
                      : "AL"}
                  </th>

                  <th className="min-w-[55px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "病假"
                      : "MC"}  
                  </th>

                  <th className="min-w-[55px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "外出"
                      : "UPL"}
                  </th> 

                  <th className="min-w-[55px] border-r border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "旷工"
                      : "A"} 
                  </th>

                  <th className="min-w-[55px] border-b border-border bg-slate-100 px-2 py-3 text-center text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-white">
                    {language === "cn"
                      ? "休息"
                      : "OFF"}   
                  </th> 
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        totalDays + 11
                      }
                      className="px-6 py-16 text-center text-xs font-semibold text-text-muted"
                    >
                      {language === "cn"
                        ? "加载中..."
                        : "Loading attendance data..."}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        totalDays + 11
                      }
                      className="px-6 py-16 text-center text-xs font-semibold text-text-muted"
                    >
                      {language === "cn"
                        ? "没有找到考勤数据"
                        : "No attendance data found"}
                    </td>
                  </tr>
                ) : (
                  rows.map(
                    (
                      row,
                      rowIndex,
                    ) => (
                      <tr
                        key={
                          row.employee
                            .employee_no
                        }
                        className="group"
                      >
                        <td className="sticky left-0 z-20 border-r border-b border-border-subtle bg-surface px-3 text-center text-[10px] font-semibold text-text-dim group-hover:bg-surface-hover">
                          {rowIndex + 1}
                        </td>

                        <td className="sticky left-[52px] z-20 border-r border-b border-border-subtle bg-surface px-4 group-hover:bg-surface-hover">
                          <div className="min-w-[170px]">
                            <p className="truncate text-xs font-bold text-text">
                              {employeeName(
                                row.employee,
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-text-dim">
                              {
                                row
                                  .employee
                                  .employee_no
                              }
                            </p>
                          </div>
                        </td>

                        <td className="sticky left-[242px] z-20 border-r border-b border-border-subtle bg-surface px-3 group-hover:bg-surface-hover">
                          <span
                            className="block max-w-[110px] truncate text-[10px] font-medium text-text-muted"
                            title={
                              row.department
                            }
                          >
                            {
                              row.department
                            }
                          </span>
                        </td>

                        {row.values.map(
                          (
                            value,
                            index,
                          ) => {
                            const day =
                              index +
                              1;

                            const isToday =
                              todayYear ===
                                year &&
                              todayMonth ===
                                monthIndex &&
                              todayDay ===
                                day;

                            return (
                              <td
                                key={
                                  day
                                }
                                className={`${cellClass(
                                  value,
                                  language,
                                )} ${
                                  isToday
                                    ? "bg-cyan-50/70 shadow-[inset_0_0_0_1px_rgb(34_211_238_/_0.18)] dark:bg-cyan-500/5 dark:shadow-[inset_0_0_18px_rgb(34_211_238_/_0.08)]"
                                    : ""
                                }`} 
                                title={`${day} ${monthLabel}: ${
                                  value ||
                                  "—"
                                }`}
                              >
                               {value === "OFF"
                                ? language === "cn"
                                    ? "休息"
                                    : "OFF"
                                : value || "—"}
                              </td>
                            );
                          },
                        )}

                        <td className="min-w-[90px] border-r-2 border-b border-l border-border-subtle bg-surface-hover px-3 text-center text-xs font-black text-text">
                          {row.totalHours.toFixed(
                            1,
                          )}
                        </td>

                        <td className="min-w-[50px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.x1}
                        </td>

                        <td className="min-w-[50px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.over9}
                        </td>

                        <td className="min-w-[55px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.al}
                        </td>

                        <td className="min-w-[55px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.mc}
                        </td>

                        <td className="min-w-[55px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.upl}
                        </td>

                        <td className="min-w-[55px] border-r border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.absent}
                        </td>

                        <td className="min-w-[55px] border-b border-border-subtle bg-surface-hover px-2 text-center text-[10px] font-black text-text">
                          {row.off}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER NOTE */}
          <div className="border-t border-border-subtle bg-surface-hover px-5 py-3 text-[10px] font-medium text-text-muted">
            {language === "cn"
              ? "每日考勤数据保存于 attendance_daily；AL / MC / UPL / A 直接覆盖对应日期，OT 不影响每日考勤，未来日期保持空白。"
              : "Daily Attendance is stored in attendance_daily. AL / MC / UPL / A immediately override the corresponding date; OT does not affect Daily Attendance; future dates remain blank."}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface transition-[border-color,box-shadow,background-color] duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_32px_rgba(8,47,73,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}