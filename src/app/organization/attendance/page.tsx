"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type Employee = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status: string | null;
};

type ScheduleRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  schedule_type: "1" | "4" | "D" | "N" | "OFF";
};

type AttendanceStatus = "WORK" | "OFF" | "AL" | "MC" | "UPL" | "ABSENT";

const API_EMPLOYEES = "/api/organization/employees?limit=100";
const API_SCHEDULES = "/api/organization/shift-management/schedules";

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function plannedHours(schedule: ScheduleRow["schedule_type"]) {
  if (schedule === "D" || schedule === "N") return 10.5;
  if (schedule === "1") return 8;
  if (schedule === "4") return 4;
  return 0;
}

function cn(type: string, language: "en" | "cn") {
  const dict: Record<string, [string, string]> = {
    title: ["Attendance Management", "考勤管理"],
    subtitle: [
      "Automatic daily attendance based on schedule and approved requests",
      "根据排班和已批准申请自动生成每日考勤",
    ],
    present: ["Present", "出勤"],
    leaveStat: ["Leave", "请假"],
    sick: ["Sick", "病假"],
    permission: ["Permission", "外出"],
    absent: ["Absent", "缺勤"],
    plannedHours: ["Planned Hours", "计划工时"],
    employee: ["Employee", "员工"],
    schedule: ["Schedule", "排班"],
    result: ["Result", "结果"],
    today: ["Today", "今天"],
    search: ["Search employee...", "搜索员工..."],
    allDepartments: ["All Departments", "全部部门"],
    automatic: ["Automatic", "自动"],
    sync: ["Schedule source: Shift Management", "排班来源：班次管理"],
    note: [
      "Work hours are calculated from the planned shift. Approved AL / MC / UPL requests override the daily result.",
      "工时根据排班自动计算。已批准的 AL / MC / UPL 申请会覆盖当天考勤结果。",
    ],
  };

  return dict[type]?.[language === "cn" ? 1 : 0] ?? type;
}

function statusLabel(status: AttendanceStatus, language: "en" | "cn") {
  const dict: Record<AttendanceStatus, [string, string]> = {
    WORK: ["Present", "出勤"],
    OFF: ["OFF", "休息"],
    AL: ["Annual Leave", "年假"],
    MC: ["Sick Leave", "病假"],
    UPL: ["Permission", "外出"],
    ABSENT: ["Absent", "缺勤"],
  };

  return dict[status][language === "cn" ? 1 : 0];
}

function Badge({
  status,
  language,
}: {
  status: AttendanceStatus;
  language: "en" | "cn";
}) {
  const classes: Record<AttendanceStatus, string> = {
    WORK:
      "border-emerald-400 bg-emerald-500 text-white shadow-sm",
    OFF:
      "border-rose-400 bg-rose-500 text-white shadow-sm",
    AL:
      "border-blue-400 bg-blue-500 text-white shadow-sm",
    MC:
      "border-violet-400 bg-violet-500 text-white shadow-sm",
    UPL:
      "border-indigo-400 bg-indigo-500 text-white shadow-sm",
    ABSENT:
      "border-red-400 bg-red-500 text-white shadow-sm",
  };

  return (
    <span
      className={`attendance-badge inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${classes[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(status, language)}
    </span>
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
    <div className={`rounded-2xl border border-border-subtle bg-surface ${className}`}>
      {children}
    </div>
  );
}

export default function AttendanceOverviewPage() {
  const { t } = useLang();
  const language: "en" | "cn" =
    t.safety.management === "安全管理" ? "cn" : "en";

  const [date, setDate] = useState(() => new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = date.getFullYear();
  const month = date.getMonth();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [employeeResponse, scheduleResponse] = await Promise.all([
          fetch(API_EMPLOYEES, { cache: "no-store" }),
          fetch(
            `${API_SCHEDULES}?year=${year}&month=${month + 1}`,
            { cache: "no-store" },
          ),
        ]);

        if (!employeeResponse.ok || !scheduleResponse.ok) {
          throw new Error("Failed to load attendance data.");
        }

        const employeeJson =
          (await employeeResponse.json()) as { data?: Employee[] };
        const scheduleJson =
          (await scheduleResponse.json()) as { data?: ScheduleRow[] };

        if (cancelled) return;

        setEmployees(
          (employeeJson.data ?? []).filter(
            (employee) =>
              employee.employee_no &&
              employee.employment_status === "Active" &&
              employee.employee_no !== "SUPERADMIN",
          ),
        );
        setSchedules(scheduleJson.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load attendance data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const scheduleMap = useMemo(
    () =>
      new Map(
        schedules.map((row) => [
          `${row.employee_no}|${String(row.schedule_date).slice(0, 10)}`,
          row,
        ]),
      ),
    [schedules],
  );

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map(
              (employee) =>
                language === "cn"
                  ? employee.division_name_cn || employee.division_name_en
                  : employee.division_name_en || employee.division_name_cn,
            )
            .filter(Boolean),
        ),
      ).sort() as string[],
    [employees, language],
  );

  const employeesFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const employeeDepartment =
        language === "cn"
          ? employee.division_name_cn || employee.division_name_en
          : employee.division_name_en || employee.division_name_cn;

      const matchesDepartment =
        department === "all" || employeeDepartment === department;

      const haystack =
        `${employee.employee_no} ${employee.name_en ?? ""} ${
          employee.name_cn ?? ""
        }`.toLowerCase();

      const matchesSearch = !query || haystack.includes(query);

      return matchesDepartment && matchesSearch;
    });
  }, [employees, search, department, language]);

  const dailyRows = useMemo(() => {
    const dateKey = toDateKey(date);

    return employeesFiltered.map((employee) => {
      const schedule = scheduleMap.get(
        `${employee.employee_no}|${dateKey}`,
      );

      let result: AttendanceStatus = "ABSENT";
      let hours = 0;

      if (schedule?.schedule_type === "OFF") {
        result = "OFF";
      } else if (schedule) {
        result = "WORK";
        hours = plannedHours(schedule.schedule_type);
      }

      return {
        employee,
        schedule: schedule?.schedule_type ?? "—",
        result,
        hours,
      };
    });
  }, [date, employeesFiltered, scheduleMap]);

  const stats = useMemo(() => {
    const value = {
      WORK: 0,
      OFF: 0,
      AL: 0,
      MC: 0,
      UPL: 0,
      ABSENT: 0,
      hours: 0,
    };

    for (const row of dailyRows) {
      value[row.result] += 1;
      value.hours += row.hours;
    }

    return value;
  }, [dailyRows]);

  const monthLabel = date.toLocaleString(
    language === "cn" ? "zh-CN" : "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  const todayLabel = date.toLocaleDateString(
    language === "cn" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  return (
    <AppShell title="">
      <div className="attendance-management-page min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        <style>{`
          /*
           * =====================================================
           * ATTENDANCE MANAGEMENT — TYPOGRAPHY / CONTRAST ONLY
           * =====================================================
           *
           * No business logic is changed here.
           * The rules below only make text sharper and readable
           * in both light and dark themes.
           */

          /* -----------------------------------------------------
           * BADGES / STATUS — FORCE LEGIBLE CONTRAST
           * ----------------------------------------------------- */
          .attendance-management-page .attendance-badge {
            color: #ffffff !important;
            opacity: 1 !important;
            font-weight: 800 !important;
            -webkit-text-fill-color: #ffffff !important;
            text-shadow: none !important;
          }

          .attendance-management-page .attendance-auto-badge {
            color: #ffffff !important;
            opacity: 1 !important;
            font-weight: 800 !important;
            -webkit-text-fill-color: #ffffff !important;
            text-shadow: none !important;
          }

          .dark .attendance-management-page .attendance-badge,
          html.dark .attendance-management-page .attendance-badge,
          body.dark .attendance-management-page .attendance-badge,
          [data-theme="dark"] .attendance-management-page .attendance-badge,
          [data-mode="dark"] .attendance-management-page .attendance-badge,
          .attendance-management-page.dark .attendance-badge {
            color: #f8fafc !important;
            -webkit-text-fill-color: #f8fafc !important;
          }

          .dark .attendance-management-page .attendance-auto-badge,
          html.dark .attendance-management-page .attendance-auto-badge,
          body.dark .attendance-management-page .attendance-auto-badge,
          [data-theme="dark"] .attendance-management-page .attendance-auto-badge,
          [data-mode="dark"] .attendance-management-page .attendance-auto-badge,
          .attendance-management-page.dark .attendance-auto-badge {
            color: #67e8f9 !important;
            -webkit-text-fill-color: #67e8f9 !important;
          }

          .attendance-management-page {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            color: #0f172a !important;
          }

          /*
           * LIGHT MODE
           */
          .attendance-management-page .text-text {
            color: #0f172a !important;
          }

          .attendance-management-page .text-text-muted {
            color: #475569 !important;
          }

          .attendance-management-page .text-text-dim {
            color: #64748b !important;
          }

          .attendance-management-page th {
            color: #475569 !important;
            font-weight: 800 !important;
          }

          .attendance-management-page td {
            color: #0f172a;
          }

          .attendance-management-page input,
          .attendance-management-page select {
            color: #0f172a !important;
            background-color: #ffffff !important;
            font-weight: 600;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .attendance-management-page input::placeholder {
            color: #64748b !important;
            opacity: 1 !important;
            font-weight: 500;
          }

          .attendance-management-page button {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .attendance-management-page .text-xs {
            letter-spacing: 0.005em;
          }

          .attendance-management-page .text-\[10px\] {
            letter-spacing: 0.01em;
          }

          .attendance-management-page .text-\[9px\] {
            letter-spacing: 0.01em;
          }

          /*
           * =====================================================
           * DARK MODE
           *
           * Support the common theme patterns used by the app:
           * .dark
           * html.dark
           * body.dark
           * [data-theme="dark"]
           * [data-mode="dark"]
           *
           * This is intentionally scoped to this page only.
           * =====================================================
           */

          .dark .attendance-management-page,
          html.dark .attendance-management-page,
          body.dark .attendance-management-page,
          [data-theme="dark"] .attendance-management-page,
          [data-mode="dark"] .attendance-management-page {
            color: #f8fafc !important;
          }

          .dark .attendance-management-page .text-text,
          html.dark .attendance-management-page .text-text,
          body.dark .attendance-management-page .text-text,
          [data-theme="dark"] .attendance-management-page .text-text,
          [data-mode="dark"] .attendance-management-page .text-text {
            color: #f8fafc !important;
          }

          .dark .attendance-management-page .text-text-muted,
          html.dark .attendance-management-page .text-text-muted,
          body.dark .attendance-management-page .text-text-muted,
          [data-theme="dark"] .attendance-management-page .text-text-muted,
          [data-mode="dark"] .attendance-management-page .text-text-muted {
            color: #cbd5e1 !important;
          }

          .dark .attendance-management-page .text-text-dim,
          html.dark .attendance-management-page .text-text-dim,
          body.dark .attendance-management-page .text-text-dim,
          [data-theme="dark"] .attendance-management-page .text-text-dim,
          [data-mode="dark"] .attendance-management-page .text-text-dim {
            color: #94a3b8 !important;
          }

          .dark .attendance-management-page th,
          html.dark .attendance-management-page th,
          body.dark .attendance-management-page th,
          [data-theme="dark"] .attendance-management-page th,
          [data-mode="dark"] .attendance-management-page th {
            color: #cbd5e1 !important;
          }

          .dark .attendance-management-page td,
          html.dark .attendance-management-page td,
          body.dark .attendance-management-page td,
          [data-theme="dark"] .attendance-management-page td,
          [data-mode="dark"] .attendance-management-page td {
            color: #f8fafc;
          }

          /*
           * Explicitly strengthen common Tailwind text colors
           * used inside the page so they cannot disappear in
           * dark mode.
           */
          .dark .attendance-management-page .text-slate-950,
          html.dark .attendance-management-page .text-slate-950,
          body.dark .attendance-management-page .text-slate-950,
          [data-theme="dark"] .attendance-management-page .text-slate-950,
          [data-mode="dark"] .attendance-management-page .text-slate-950 {
            color: #f8fafc !important;
          }

          .dark .attendance-management-page .text-slate-900,
          html.dark .attendance-management-page .text-slate-900,
          body.dark .attendance-management-page .text-slate-900,
          [data-theme="dark"] .attendance-management-page .text-slate-900,
          [data-mode="dark"] .attendance-management-page .text-slate-900 {
            color: #f8fafc !important;
          }

          .dark .attendance-management-page .text-slate-800,
          html.dark .attendance-management-page .text-slate-800,
          body.dark .attendance-management-page .text-slate-800,
          [data-theme="dark"] .attendance-management-page .text-slate-800,
          [data-mode="dark"] .attendance-management-page .text-slate-800 {
            color: #f1f5f9 !important;
          }

          .dark .attendance-management-page .text-slate-700,
          html.dark .attendance-management-page .text-slate-700,
          body.dark .attendance-management-page .text-slate-700,
          [data-theme="dark"] .attendance-management-page .text-slate-700,
          [data-mode="dark"] .attendance-management-page .text-slate-700 {
            color: #e2e8f0 !important;
          }

          .dark .attendance-management-page .text-slate-600,
          html.dark .attendance-management-page .text-slate-600,
          body.dark .attendance-management-page .text-slate-600,
          [data-theme="dark"] .attendance-management-page .text-slate-600,
          [data-mode="dark"] .attendance-management-page .text-slate-600 {
            color: #cbd5e1 !important;
          }

          .dark .attendance-management-page .text-slate-500,
          html.dark .attendance-management-page .text-slate-500,
          body.dark .attendance-management-page .text-slate-500,
          [data-theme="dark"] .attendance-management-page .text-slate-500,
          [data-mode="dark"] .attendance-management-page .text-slate-500 {
            color: #94a3b8 !important;
          }

          /*
           * Colored status text — keep colors vivid in dark mode.
           */
          .dark .attendance-management-page .text-emerald-400,
          html.dark .attendance-management-page .text-emerald-400,
          body.dark .attendance-management-page .text-emerald-400,
          [data-theme="dark"] .attendance-management-page .text-emerald-400,
          [data-mode="dark"] .attendance-management-page .text-emerald-400 {
            color: #6ee7b7 !important;
          }

          .dark .attendance-management-page .text-blue-400,
          html.dark .attendance-management-page .text-blue-400,
          body.dark .attendance-management-page .text-blue-400,
          [data-theme="dark"] .attendance-management-page .text-blue-400,
          [data-mode="dark"] .attendance-management-page .text-blue-400 {
            color: #93c5fd !important;
          }

          .dark .attendance-management-page .text-violet-400,
          html.dark .attendance-management-page .text-violet-400,
          body.dark .attendance-management-page .text-violet-400,
          [data-theme="dark"] .attendance-management-page .text-violet-400,
          [data-mode="dark"] .attendance-management-page .text-violet-400 {
            color: #c4b5fd !important;
          }

          .dark .attendance-management-page .text-indigo-400,
          html.dark .attendance-management-page .text-indigo-400,
          body.dark .attendance-management-page .text-indigo-400,
          [data-theme="dark"] .attendance-management-page .text-indigo-400,
          [data-mode="dark"] .attendance-management-page .text-indigo-400 {
            color: #a5b4fc !important;
          }

          .dark .attendance-management-page .text-rose-400,
          html.dark .attendance-management-page .text-rose-400,
          body.dark .attendance-management-page .text-rose-400,
          [data-theme="dark"] .attendance-management-page .text-rose-400,
          [data-mode="dark"] .attendance-management-page .text-rose-400 {
            color: #fda4af !important;
          }

          .dark .attendance-management-page .text-cyan-300,
          html.dark .attendance-management-page .text-cyan-300,
          body.dark .attendance-management-page .text-cyan-300,
          [data-theme="dark"] .attendance-management-page .text-cyan-300,
          [data-mode="dark"] .attendance-management-page .text-cyan-300,
          .dark .attendance-management-page .text-cyan-400,
          html.dark .attendance-management-page .text-cyan-400,
          body.dark .attendance-management-page .text-cyan-400,
          [data-theme="dark"] .attendance-management-page .text-cyan-400,
          [data-mode="dark"] .attendance-management-page .text-cyan-400 {
            color: #67e8f9 !important;
          }

          /*
           * Form controls in dark mode.
           */
          .dark .attendance-management-page input,
          html.dark .attendance-management-page input,
          body.dark .attendance-management-page input,
          [data-theme="dark"] .attendance-management-page input,
          [data-mode="dark"] .attendance-management-page input,
          .dark .attendance-management-page select,
          html.dark .attendance-management-page select,
          body.dark .attendance-management-page select,
          [data-theme="dark"] .attendance-management-page select,
          [data-mode="dark"] .attendance-management-page select {
            color: #f8fafc !important;
            background-color: #111c31 !important;
            border-color: #334155 !important;
          }

          .dark .attendance-management-page input::placeholder,
          html.dark .attendance-management-page input::placeholder,
          body.dark .attendance-management-page input::placeholder,
          [data-theme="dark"] .attendance-management-page input::placeholder,
          [data-mode="dark"] .attendance-management-page input::placeholder {
            color: #94a3b8 !important;
            opacity: 1 !important;
          }

          .dark .attendance-management-page option,
          html.dark .attendance-management-page option,
          body.dark .attendance-management-page option,
          [data-theme="dark"] .attendance-management-page option,
          [data-mode="dark"] .attendance-management-page option {
            color: #f8fafc !important;
            background-color: #111c31 !important;
          }

          /*
           * Slightly stronger weights for the actual content
           * so text remains crisp at small sizes.
           */
          .attendance-management-page h1,
          .attendance-management-page h2,
          .attendance-management-page h3,
          .attendance-management-page label,
          .attendance-management-page th,
          .attendance-management-page button {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .attendance-management-page h1,
          .attendance-management-page h2,
          .attendance-management-page h3 {
            text-rendering: optimizeLegibility;
          }

          .attendance-management-page p,
          .attendance-management-page span,
          .attendance-management-page td,
          .attendance-management-page th,
          .attendance-management-page label {
            text-rendering: optimizeLegibility;
          }

          @media (prefers-reduced-motion: reduce) {
            .attendance-management-page * {
              scroll-behavior: auto !important;
            }
          }
        `}</style>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-xl font-black text-cyan-600 dark:text-cyan-300">
                ◎
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text">
                  {cn("title", language)}
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-text-muted">
                  {cn("subtitle", language)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate(new Date(year, month - 1, 1))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-text transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              ←
            </button>

            <button
              type="button"
              onClick={() => setDate(new Date())}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              {cn("today", language)}
            </button>

            <div className="min-w-36 rounded-lg bg-cyan-500 px-4 py-2 text-center text-sm font-extrabold text-white shadow-sm">
                {monthLabel}
                </div>

            <button
              type="button"
              onClick={() => setDate(new Date(year, month + 1, 1))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-text transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              →
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["present", stats.WORK],
            ["leaveStat", stats.AL],
            ["sick", stats.MC],
            ["permission", stats.UPL],
            ["absent", stats.ABSENT],
            ["plannedHours", stats.hours.toFixed(1)],
          ].map(([labelKey, value]) => (
            <Card key={String(labelKey)} className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
                {cn(String(labelKey), language)}
              </p>
              <p className="mt-2 text-2xl font-black text-text">{value}</p>
              {labelKey === "plannedHours" && (
                <p className="mt-1 text-[10px] text-text-muted">
                  {cn("automatic", language)}
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border-subtle p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-text">
                  {cn("today", language)} · {todayLabel}
                </h2>
                <p className="mt-1 text-[10px] text-text-muted">
                  {cn("sync", language)}
                </p>
              </div>

              <Badge status="WORK" language={language} />
            </div>

            <div className="border-b border-border-subtle bg-surface-hover p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
                    {language === "cn" ? "搜索员工" : "Search employee"}
                  </label>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={cn("search", language)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-text outline-none transition placeholder:text-text-dim focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
                    {language === "cn" ? "部门" : "Department"}
                  </label>
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-text outline-none focus:border-cyan-500"
                  >
                    <option value="all">
                      {cn("allDepartments", language)}
                    </option>
                    {departments.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-surface-hover text-[10px] uppercase tracking-wide text-text-dim">
                  <tr>
                    <th className="px-5 py-3">
                      {cn("employee", language)}
                    </th>
                    <th className="px-4 py-3">
                      {cn("schedule", language)}
                    </th>
                    <th className="px-4 py-3">
                      {cn("result", language)}
                    </th>
                    <th className="px-4 py-3"> {language === "cn" ? "工时" : "Hours"}</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-xs text-text-muted"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : dailyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-xs text-text-muted"
                      >
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    dailyRows.slice(0, 10).map((row) => (
                      <tr
                        key={row.employee.employee_no}
                        className="border-t border-border-subtle transition hover:bg-surface-hover/60"
                      >
                        <td className="px-5 py-3">
                          <p className="text-xs font-bold text-text">
                            {language === "cn"
                              ? row.employee.name_cn || row.employee.name_en
                              : row.employee.name_en || row.employee.name_cn}
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-dim">
                            {row.employee.employee_no}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-xs font-bold text-text">
                          {row.schedule}
                        </td>

                        <td className="px-4 py-3">
                          <Badge status={row.result} language={language} />
                        </td>

                        <td className="px-4 py-3 text-xs font-bold text-text">
                          {row.hours ? row.hours.toFixed(1) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-text">
                  {language === "cn" ? "考勤规则" : "Attendance Rule"}
                </h2>
                <p className="mt-1 text-[10px] text-text-muted">
                  {language === "cn" ? "自动考勤结果优先级" : "Automatic result priority"}
                </p>
              </div>

              <span className="attendance-auto-badge rounded-sm border border-cyan-500 bg-cyan-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                {language === "cn" ? "自动" : "AUTO"}
              </span>
            </div>

           <div className="mt-5 space-y-3">
                {[
                    ["D / N", "10.5 h"],
                    ["1", "8 h"],
                    ["4", "4 h"],
                    ["OFF", language === "cn" ? "休息" : "OFF"],
                    [
                    "AL / MC / UPL",
                    language === "cn" ? "覆盖结果" : "Override result",
                    ],
                ].map(([left, right]) => (
                <div
                  key={left}
                  className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-hover px-4 py-3"
                >
                  <span className="text-xs font-bold text-text">{left}</span>
                  <span className="text-xs font-extrabold text-text">
                    {right}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-[10px] leading-5 text-text-muted">
              {cn("note", language)}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
