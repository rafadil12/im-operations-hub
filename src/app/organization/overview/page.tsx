 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type OrganizationLanguage = "en" | "cn";

type AttendanceValue =
  | "10.5"
  | "8"
  | "4"
  | "OFF"
  | "AL"
  | "MC"
  | "UPL"
  | "A";

type Employee = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status: string | null;
};

type AttendanceDailyRow = {
  id: number;
  employee_no: string;
  attendance_date: string;
  attendance_value: AttendanceValue;
  planned_hours: number | string;
  source: "SHIFT" | "LEAVE";
  leave_request_id: number | null;
};

type LeaveType = "AL" | "MC" | "UPL" | "A" | "OT";
type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRow = {
  id: number;
  employee_no: string;
  request_date: string;
  request_type: LeaveType;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: LeaveStatus;
};

const API_EMPLOYEES = "/api/organization/employees?limit=100";
const API_DAILY = "/api/organization/attendance/daily";
const API_DAILY_SYNC = "/api/organization/attendance/daily/sync";
const API_LEAVE = "/api/organization/attendance/leave";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function employeeName(
  employee: Employee | undefined,
  language: OrganizationLanguage,
) {
  if (!employee) return "—";

  return language === "cn"
    ? employee.name_cn || employee.name_en || employee.employee_no
    : employee.name_en || employee.name_cn || employee.employee_no;
}

function departmentName(
  employee: Employee | undefined,
  language: OrganizationLanguage,
) {
  if (!employee) return "—";

  return language === "cn"
    ? employee.division_name_cn || employee.division_name_en || "—"
    : employee.division_name_en || employee.division_name_cn || "—";
}

function valueLabel(
  value: AttendanceValue,
  language: OrganizationLanguage,
) {
  const labels: Record<
    AttendanceValue,
    [string, string]
  > = {
    "10.5": ["Present", "出勤"],
    "8": ["Present", "出勤"],
    "4": ["Present", "出勤"],
    OFF: ["OFF", "休息"],
    AL: ["Annual Leave", "年假"],
    MC: ["Sick Leave", "病假"],
    UPL: ["Permission", "请假 / 外出"],
    A: ["Absent", "缺勤"],
  };

  return labels[value]?.[language === "cn" ? 1 : 0] ?? value;
}

function statusTone(value: AttendanceValue) {
  if (value === "AL") return "blue";
  if (value === "MC") return "violet";
  if (value === "UPL") return "indigo";
  if (value === "A") return "rose";
  if (value === "OFF") return "slate";
  return "emerald";
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
      className={`rounded-2xl border border-border-subtle bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "cyan" | "emerald" | "blue" | "violet" | "indigo" | "rose" | "slate" | "amber";
}) {
  const toneClass = {
    cyan:
      "border-cyan-200 bg-cyan-50 dark:border-cyan-500/20 dark:bg-cyan-500/10",
    emerald:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    blue:
      "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
    violet:
      "border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10",
    indigo:
      "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10",
    rose:
      "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10",
    slate:
      "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80",
    amber:
      "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
      {detail ? (
        <p className="mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-900 dark:text-white">{label}</span>
        <span className="text-[10px] font-extrabold text-slate-900 dark:text-white">
          {value} · {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function AttendanceOverviewPage() {
  const { t } = useLang();
  const language: OrganizationLanguage =
    t.safety.management === "安全管理" ? "cn" : "en";

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceDailyRow[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      setSyncing(true);

      try {
        const syncResponse = await fetch(API_DAILY_SYNC, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ year, month }),
        });

        if (!syncResponse.ok) {
          const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            syncPayload.error ||
              `Attendance sync failed: ${syncResponse.status}`,
          );
        }

        const [employeeResponse, attendanceResponse, leaveResponse] =
          await Promise.all([
            fetch(API_EMPLOYEES, { cache: "no-store" }),
            fetch(`${API_DAILY}?year=${year}&month=${month}`, {
              cache: "no-store",
            }),
            fetch(`${API_LEAVE}?year=${year}&month=${month}`, {
              cache: "no-store",
            }),
          ]);

        if (!employeeResponse.ok) {
          throw new Error(
            `Employee API failed: ${employeeResponse.status}`,
          );
        }

        if (!attendanceResponse.ok) {
          throw new Error(
            `Daily attendance API failed: ${attendanceResponse.status}`,
          );
        }

        if (!leaveResponse.ok) {
          throw new Error(`Leave API failed: ${leaveResponse.status}`);
        }

        const employeePayload = (await employeeResponse.json()) as {
          data?: Employee[];
        };

        const attendancePayload = (await attendanceResponse.json()) as {
          data?: AttendanceDailyRow[];
        };

        const leavePayload = (await leaveResponse.json()) as {
          data?: LeaveRow[];
        };

        if (cancelled) return;

        setEmployees(
          (employeePayload.data ?? []).filter(
            (employee) =>
              employee.employee_no &&
              employee.employee_no !== "SUPERADMIN" &&
              employee.employment_status === "Active",
          ),
        );
        setAttendanceRows(attendancePayload.data ?? []);
        setLeaveRows(leavePayload.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : language === "cn"
                ? "加载考勤概览失败。"
                : "Failed to load attendance overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [year, month, language]);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.employee_no, employee])),
    [employees],
  );

  const currentDateKey = dateKey(startOfDay(selectedDate));

  const todayRows = useMemo(
    () =>
      attendanceRows.filter(
        (row) => String(row.attendance_date).slice(0, 10) === currentDateKey,
      ),
    [attendanceRows, currentDateKey],
  );

  const todayStats = useMemo(() => {
    const stats = {
      employees: employees.length,
      present: 0,
      leave: 0,
      mc: 0,
      upl: 0,
      absent: 0,
      off: 0,
      hours: 0,
    };

    for (const row of todayRows) {
      if (
        row.attendance_value === "10.5" ||
        row.attendance_value === "8" ||
        row.attendance_value === "4"
      ) {
        stats.present += 1;
        stats.hours += Number(row.planned_hours) || 0;
      } else if (row.attendance_value === "AL") {
        stats.leave += 1;
      } else if (row.attendance_value === "MC") {
        stats.mc += 1;
      } else if (row.attendance_value === "UPL") {
        stats.upl += 1;
      } else if (row.attendance_value === "A") {
        stats.absent += 1;
      } else if (row.attendance_value === "OFF") {
        stats.off += 1;
      }
    }

    /*
     * Employees without a generated record for today are not counted as
     * present/leave/etc. This keeps the overview faithful to attendance_daily.
     */
    return stats;
  }, [employees.length, todayRows]);

  const attendanceRate = useMemo(() => {
    if (!todayStats.employees) return 0;
    return (todayStats.present / todayStats.employees) * 100;
  }, [todayStats]);

  const departmentSummary = useMemo(() => {
    const byDepartment = new Map<
      string,
      {
        department: string;
        employees: number;
        present: number;
        leave: number;
        mc: number;
        upl: number;
        absent: number;
        off: number;
      }
    >();

    for (const employee of employees) {
      const department = departmentName(employee, language);
      const current = byDepartment.get(department) ?? {
        department,
        employees: 0,
        present: 0,
        leave: 0,
        mc: 0,
        upl: 0,
        absent: 0,
        off: 0,
      };

      current.employees += 1;

      const attendance = todayRows.find(
        (row) => row.employee_no === employee.employee_no,
      );

      if (attendance) {
        if (
          attendance.attendance_value === "10.5" ||
          attendance.attendance_value === "8" ||
          attendance.attendance_value === "4"
        ) {
          current.present += 1;
        } else if (attendance.attendance_value === "AL") {
          current.leave += 1;
        } else if (attendance.attendance_value === "MC") {
          current.mc += 1;
        } else if (attendance.attendance_value === "UPL") {
          current.upl += 1;
        } else if (attendance.attendance_value === "A") {
          current.absent += 1;
        } else if (attendance.attendance_value === "OFF") {
          current.off += 1;
        }
      }

      byDepartment.set(department, current);
    }

    return Array.from(byDepartment.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    );
  }, [employees, todayRows, language]);

  const recentRequests = useMemo(
    () =>
      [...leaveRows]
        .sort(
          (a, b) =>
            new Date(`${b.request_date}T00:00:00`).getTime() -
            new Date(`${a.request_date}T00:00:00`).getTime() ||
            b.id - a.id,
        )
        .slice(0, 6),
    [leaveRows],
  );

  const otStats = useMemo(() => {
    const otRows = leaveRows.filter(
      (row) => row.request_type === "OT",
    );

    let totalMinutes = 0;

    for (const row of otRows) {
      if (!row.start_time || !row.end_time) continue;

      const [sh, sm] = String(row.start_time)
        .slice(0, 5)
        .split(":")
        .map(Number);
      const [eh, em] = String(row.end_time)
        .slice(0, 5)
        .split(":")
        .map(Number);

      if (
        !Number.isFinite(sh) ||
        !Number.isFinite(sm) ||
        !Number.isFinite(eh) ||
        !Number.isFinite(em)
      ) {
        continue;
      }

      let start = sh * 60 + sm;
      let end = eh * 60 + em;

      if (end <= start) {
        end += 24 * 60;
      }

      totalMinutes += end - start;
    }

    return {
      requests: otRows.length,
      pending: otRows.filter((row) => row.status === "Pending").length,
      approved: otRows.filter((row) => row.status === "Approved").length,
      hours: totalMinutes / 60,
    };
  }, [leaveRows]);

  const monthLabel = selectedDate.toLocaleDateString(
    language === "cn" ? "zh-CN" : "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  const todayLabel = selectedDate.toLocaleDateString(
    language === "cn" ? "zh-CN" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  return (
    <AppShell title="">
      <div className="attendance-overview-page min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        <style>{`
          .attendance-overview-page .text-slate-950,
          .attendance-overview-page .text-slate-900,
          .attendance-overview-page .text-slate-800,
          .attendance-overview-page .text-slate-700 {
            color: #0f172a !important;
          }

          .attendance-overview-page .text-slate-600,
          .attendance-overview-page .text-slate-500 {
            color: #475569 !important;
          }

          .attendance-overview-page .text-emerald-800,
          .attendance-overview-page .text-emerald-700 {
            color: #166534 !important;
          }

          .attendance-overview-page .text-blue-800,
          .attendance-overview-page .text-blue-700 {
            color: #1d4ed8 !important;
          }

          .attendance-overview-page .text-violet-800,
          .attendance-overview-page .text-violet-700 {
            color: #6d28d9 !important;
          }

          .attendance-overview-page .text-indigo-800,
          .attendance-overview-page .text-indigo-700 {
            color: #4338ca !important;
          }

          .attendance-overview-page .text-rose-800,
          .attendance-overview-page .text-rose-700 {
            color: #be123c !important;
          }

          .attendance-overview-page .text-amber-800,
          .attendance-overview-page .text-amber-700 {
            color: #92400e !important;
          }

          [data-theme="dark"] .attendance-overview-page .text-slate-950,
          [data-theme="dark"] .attendance-overview-page .text-slate-900,
          [data-theme="dark"] .attendance-overview-page .text-slate-800,
          [data-theme="dark"] .attendance-overview-page .text-slate-700 {
            color: #ffffff !important;
          }

          [data-theme="dark"] .attendance-overview-page .text-slate-600,
          [data-theme="dark"] .attendance-overview-page .text-slate-500 {
            color: #cbd5e1 !important;
          }

          [data-theme="dark"] .attendance-overview-page .text-emerald-800,
          [data-theme="dark"] .attendance-overview-page .text-emerald-700,
          [data-theme="dark"] .attendance-overview-page .text-blue-800,
          [data-theme="dark"] .attendance-overview-page .text-blue-700,
          [data-theme="dark"] .attendance-overview-page .text-violet-800,
          [data-theme="dark"] .attendance-overview-page .text-violet-700,
          [data-theme="dark"] .attendance-overview-page .text-indigo-800,
          [data-theme="dark"] .attendance-overview-page .text-indigo-700,
          [data-theme="dark"] .attendance-overview-page .text-rose-800,
          [data-theme="dark"] .attendance-overview-page .text-rose-700,
          [data-theme="dark"] .attendance-overview-page .text-amber-800,
          [data-theme="dark"] .attendance-overview-page .text-amber-700 {
            color: #ffffff !important;
          }
        `}</style>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-lg font-black text-cyan-600 dark:text-cyan-300">
                ◫
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {language === "cn"
                    ? "考勤概览"
                    : "Attendance Overview"}
                </h1>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {language === "cn"
                    ? "查看今日考勤、部门状态、请假申请和加班概况。"
                    : "View today's attendance, department status, leave requests and overtime summary."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedDate(new Date(year, month - 2, 1))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-slate-900 dark:text-white transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              ←
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-slate-900 dark:text-white transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              {language === "cn" ? "今天" : "Today"}
            </button>

            <div className="min-w-40 rounded-lg border border-cyan-400/60 bg-cyan-100 px-4 py-2 text-center text-sm font-extrabold text-slate-900 shadow-sm dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-white">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(new Date(year, month, 1))
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-slate-900 dark:text-white transition hover:border-cyan-500 hover:bg-surface-hover"
            >
              →
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-black dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-white">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={language === "cn" ? "员工" : "Employees"}
            value={todayStats.employees}
            detail={todayLabel}
            tone="cyan"
          />
          <MetricCard
            label={language === "cn" ? "出勤" : "Present"}
            value={todayStats.present}
            detail={`${attendanceRate.toFixed(0)}%`}
            tone="emerald"
          />
          <MetricCard
            label={language === "cn" ? "年假" : "Annual Leave"}
            value={todayStats.leave}
            detail={language === "cn" ? "AL" : "AL"}
            tone="blue"
          />
          <MetricCard
            label={language === "cn" ? "病假" : "Sick Leave"}
            value={todayStats.mc}
            detail="MC"
            tone="violet"
          />
          <MetricCard
            label={language === "cn" ? "外出" : "Permission"}
            value={todayStats.upl}
            detail="UPL"
            tone="indigo"
          />
          <MetricCard
            label={language === "cn" ? "缺勤" : "Absent"}
            value={todayStats.absent}
            detail="A"
            tone="rose"
          />
          <MetricCard
            label={language === "cn" ? "休息" : "OFF"}
            value={todayStats.off}
            detail={language === "cn" ? "休息日" : "Rest day"}
            tone="slate"
          />
          <MetricCard
            label={language === "cn" ? "计划工时" : "Planned Hours"}
            value={todayStats.hours.toFixed(1)}
            detail={syncing ? (language === "cn" ? "同步中" : "Syncing") : "attendance_daily"}
            tone="amber"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {language === "cn" ? "今日考勤" : "Today's Attendance"}
                </h2>
                <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                  {todayLabel}
                </p>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                {attendanceRate.toFixed(0)}%
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <StatusBar
                label={language === "cn" ? "出勤" : "Present"}
                value={todayStats.present}
                total={todayStats.employees}
                tone="bg-emerald-500"
              />
              <StatusBar
                label={language === "cn" ? "年假" : "Annual Leave"}
                value={todayStats.leave}
                total={todayStats.employees}
                tone="bg-blue-500"
              />
              <StatusBar
                label={language === "cn" ? "病假" : "Sick Leave"}
                value={todayStats.mc}
                total={todayStats.employees}
                tone="bg-violet-500"
              />
              <StatusBar
                label={language === "cn" ? "外出" : "Permission"}
                value={todayStats.upl}
                total={todayStats.employees}
                tone="bg-indigo-500"
              />
              <StatusBar
                label={language === "cn" ? "缺勤" : "Absent"}
                value={todayStats.absent}
                total={todayStats.employees}
                tone="bg-rose-500"
              />
              <StatusBar
                label={language === "cn" ? "休息" : "OFF"}
                value={todayStats.off}
                total={todayStats.employees}
                tone="bg-slate-500"
              />
            </div>
          </Card>

          <Card className="p-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === "cn"
                  ? "加班概况"
                  : "Overtime Summary"}
              </h2>
              <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                {language === "cn"
                  ? "OT 独立于 Daily Attendance。"
                  : "OT is tracked separately from Daily Attendance."}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricCard
                label={language === "cn" ? "申请数" : "Requests"}
                value={otStats.requests}
                tone="amber"
              />
              <MetricCard
                label={language === "cn" ? "总时长" : "Total Hours"}
                value={otStats.hours.toFixed(1)}
                tone="cyan"
              />
              <MetricCard
                label={language === "cn" ? "待审核" : "Pending"}
                value={otStats.pending}
                tone="amber"
              />
              <MetricCard
                label={language === "cn" ? "已批准" : "Approved"}
                value={otStats.approved}
                tone="emerald"
              />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle bg-surface-hover p-5">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === "cn"
                  ? "部门考勤"
                  : "Department Attendance"}
              </h2>
              <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                {language === "cn"
                  ? "按今天的 attendance_daily 数据统计。"
                  : "Based on today's attendance_daily records."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="border-b border-border px-4 py-3 text-[10px] font-black text-slate-700 dark:text-white">
                      {language === "cn" ? "部门" : "Department"}
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-slate-700 dark:text-white">
                      {language === "cn" ? "员工" : "Employees"}
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-emerald-700 dark:text-emerald-200">
                      {language === "cn" ? "出勤" : "Present"}
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-blue-700 dark:text-blue-200">
                      AL
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-violet-700 dark:text-violet-200">
                      MC
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-indigo-700 dark:text-indigo-200">
                      UPL
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-rose-700 dark:text-rose-200">
                      A
                    </th>
                    <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-slate-700 dark:text-slate-200">
                      OFF
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {language === "cn" ? "加载中..." : "Loading..."}
                      </td>
                    </tr>
                  ) : departmentSummary.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {language === "cn"
                          ? "暂无部门数据"
                          : "No department data."}
                      </td>
                    </tr>
                  ) : (
                    departmentSummary.map((item) => (
                      <tr
                        key={item.department}
                        className="border-b border-border-subtle hover:bg-surface-hover"
                      >
                        <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">
                          {item.department}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-bold text-slate-900 dark:text-white">
                          {item.employees}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-emerald-700 dark:text-emerald-200">
                          {item.present}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-blue-700 dark:text-blue-200">
                          {item.leave}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-violet-700 dark:text-violet-200">
                          {item.mc}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-indigo-700 dark:text-indigo-200">
                          {item.upl}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-rose-700 dark:text-rose-200">
                          {item.absent}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-slate-700 dark:text-slate-200">
                          {item.off}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle bg-surface-hover p-5">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === "cn"
                  ? "最新申请"
                  : "Recent Requests"}
              </h2>
              <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                {language === "cn"
                  ? "最近的请假、外出和 OT 申请。"
                  : "Latest leave, permission and OT requests."}
              </p>
            </div>

            <div className="divide-y divide-border-subtle">
              {recentRequests.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {language === "cn"
                    ? "暂无申请记录"
                    : "No requests yet."}
                </div>
              ) : (
                recentRequests.map((request) => {
                  const employee = employeeMap.get(request.employee_no);
                  const typeValue =
                    request.request_type === "OT"
                      ? language === "cn"
                        ? "加班"
                        : "Overtime"
                      : valueLabel(
                          request.request_type,
                          language,
                        );

                  const tone = statusTone(
                    request.request_type === "OT"
                      ? "UPL"
                      : request.request_type,
                  );

                  const toneClass = {
                    blue:
                      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
                    violet:
                      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
                    indigo:
                      "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100",
                    rose:
                      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
                    slate:
                      "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
                    emerald:
                      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
                  }[tone];

                  return (
                    <div
                      key={request.id}
                      className="px-5 py-4 transition hover:bg-surface-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                            {employeeName(employee, language)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                            {request.employee_no}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${toneClass}`}
                        >
                          {request.request_type}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                          {typeValue}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">·</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {String(request.request_date).slice(0, 10)}
                        </span>

                        {request.start_time && request.end_time ? (
                          <>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">·</span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {String(request.start_time).slice(0, 5)}–{String(
                                request.end_time,
                              ).slice(0, 5)}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[9px] font-black ${
                            request.status === "Approved"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                              : request.status === "Rejected"
                                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
                                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                          }`}
                        >
                          {language === "cn"
                            ? request.status === "Approved"
                              ? "已批准"
                              : request.status === "Rejected"
                                ? "已拒绝"
                                : "待审核"
                            : request.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
