"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
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

type ScheduleApiRow = {
  id: number;
  employee_no: string;
  schedule_date: string;
  schedule_type:
    | "D"
    | "N"
    | "D/S"
    | "N/S"
    | "1"
    | "4"
    | "OFF"
    | null;
};

type LeaveType =
  | "AL"
  | "MC"
  | "UPL"
  | "A"
  | "ALPA"
  | "OT";

type LeaveStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

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

type DailyStats = {
  date: string;
  day: number;
  weekday: string;
  present: number;
  leave: number;
  mc: number;
  upl: number;
  absent: number;
  off: number;
  hours: number;
  rate: number;
  presentEmployees: Employee[];
  dayShiftEmployees: Employee[];
  nightShiftEmployees: Employee[];
};

type DepartmentSummary = {
  department: string;
  employees: number;
  present: number;
  leave: number;
  mc: number;
  upl: number;
  absent: number;
  off: number;
  attendanceRate: number;
};

type EmployeeAttendanceSummary = {
  employee: Employee;
  present: number;
  leave: number;
  mc: number;
  upl: number;
  absent: number;
  off: number;
};

const API_EMPLOYEES =
  "/api/organization/employees?limit=100";

const API_DAILY =
  "/api/organization/attendance/daily";

const API_DAILY_SYNC =
  "/api/organization/attendance/daily/sync";

const API_LEAVE =
  "/api/organization/attendance/leave";
const API_SCHEDULES =
  "/api/organization/shift-management/schedules";

const CHART_ANIMATION_DURATION = 1800;

const CHART_ANIMATION_EASING =
  "ease-in-out" as const;

/* =========================================================
   HELPERS
========================================================= */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysInMonth(
  year: number,
  month: number,
) {
  return new Date(
    year,
    month,
    0,
  ).getDate();
}

function employeeName(
  employee: Employee | undefined,
  language: OrganizationLanguage,
) {
  if (!employee) return "—";

  return language === "cn"
    ? employee.name_cn ||
        employee.name_en ||
        employee.employee_no
    : employee.name_en ||
        employee.name_cn ||
        employee.employee_no;
}

function departmentName(
  employee: Employee | undefined,
  language: OrganizationLanguage,
) {
  if (!employee) return "—";

  return language === "cn"
    ? employee.division_name_cn ||
        employee.division_name_en ||
        "—"
    : employee.division_name_en ||
        employee.division_name_cn ||
        "—";
}

function isPresent(
  value: AttendanceValue | undefined,
) {
  return (
    value === "10.5" ||
    value === "8" ||
    value === "4"
  );
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

  return (
    labels[value]?.[
      language === "cn" ? 1 : 0
    ] ?? value
  );
}

/* =========================================================
   CARD
========================================================= */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-border bg-surface",
        "transition-[border-color,box-shadow,background-color]",
        "duration-300",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">
        {title}
      </h2>

      <p className="mt-1 text-xs text-text-muted">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   KPI
========================================================= */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  tone:
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "info";
}) {
  const iconClass = {
    accent: "bg-cyan-500/10",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    danger: "bg-rose-500/10",
    info: "bg-violet-500/10",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-all duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_34px_rgba(8,47,73,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wide text-text-dim">
          {title}
        </p>

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${iconClass[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold text-text">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-text-muted">
        {subtitle}
      </p>
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  const tone =
    value >= 90
      ? "success"
      : value >= 70
        ? "warning"
        : "danger";

  const toneClass = {
    success: {
      text: "text-success",
      bar: "bg-emerald-500",
    },
    warning: {
      text: "text-warning",
      bar: "bg-amber-500",
    },
    danger: {
      text: "text-danger",
      bar: "bg-rose-500",
    },
  }[tone];

  return (
    <div className="rounded-xl border border-border-subtle bg-bg/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg">
          {icon}
        </span>

        <span
          className={`text-2xl font-semibold ${toneClass.text}`}
        >
          {value}
          %
        </span>
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-wide text-text-dim">
        {title}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full ${toneClass.bar}`}
          style={{
            width: `${Math.min(
              Math.max(value, 0),
              100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND STAT
========================================================= */

function LegendStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "success"
    | "warning"
    | "danger"
    | "accent"
    | "info";
}) {
  const classes = {
    success:
      "bg-emerald-500/12 text-emerald-400",
    warning:
      "bg-amber-500/12 text-amber-400",
    danger:
      "bg-rose-500/12 text-rose-400",
    accent:
      "bg-cyan-500/12 text-cyan-300",
    info:
      "bg-violet-500/12 text-violet-300",
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-bg/30 p-3 text-center">
      <p
        className={`text-lg font-semibold ${
          classes[tone].split(" ")[1]
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[9px] text-text-dim">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   DONUT
========================================================= */

function DonutChart({
  values,
}: {
  values: {
    label: string;
    value: number;
    className: string;
  }[];
}) {
  const total = values.reduce(
    (sum, item) =>
      sum + item.value,
    0,
  );

  const radius = 55;

  const circumference =
    2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div className="relative size-52">
      <svg
        viewBox="0 0 140 140"
        className="size-full -rotate-90"
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className="stroke-bg"
          strokeWidth="16"
        />

        {values.map(
          (item, index) => {
            const percentage =
              total > 0
                ? item.value / total
                : 0;

            const dash =
              percentage *
              circumference;

            const gap = 3;

            const offset =
              -accumulated *
              circumference;

            accumulated +=
              percentage;

            return (
              <circle
                key={item.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                className={`${item.className} attendance-donut-segment`}
                style={{
                  animationDelay: `${index * 0.12}s`,
                }}
                strokeWidth="16"
                strokeDasharray={`${Math.max(
                  dash - gap,
                  0,
                )} ${circumference}`}
                strokeDashoffset={
                  offset
                }
                strokeLinecap="butt"
              />
            );
          },
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-text">
          {total}
        </span>

        <span className="mt-0.5 text-[10px] text-text-dim">
          Total
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   LINE CHART
========================================================= */

function LineChart({
  data,
  max = 100,
}: {
  data: {
    label: string;
    value: number;
  }[];
  max?: number;
}) {
  const width = 700;
  const height = 260;

  const left = 42;
  const right = 20;
  const top = 25;
  const bottom = 35;

  const chartWidth =
    width - left - right;

  const chartHeight =
    height - top - bottom;

  const points = data.map(
    (item, index) => {
      const x =
        left +
        (index /
          Math.max(
            data.length - 1,
            1,
          )) *
          chartWidth;

      const y =
        top +
        chartHeight -
        (item.value / max) *
          chartHeight;

      return {
        x,
        y,
        ...item,
      };
    },
  );

  const path =
    points.length > 0
      ? points
          .map(
            (
              point,
              index,
            ) =>
              `${
                index === 0
                  ? "M"
                  : "L"
              } ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  const durationSeconds =
    CHART_ANIMATION_DURATION /
    1000;

  const pointIntervalSeconds =
    data.length > 1
      ? Math.max(
          durationSeconds /
            (data.length - 1),
          0.08,
        )
      : durationSeconds;

  const labelStep =
    data.length <= 10
      ? 1
      : data.length <= 15
        ? 2
        : 5;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
      >
        {[0, 25, 50, 75, 100].map(
          (value) => {
            const y =
              top +
              chartHeight -
              (value / 100) *
                chartHeight;

            return (
              <g key={value}>
                <line
                  x1={left}
                  x2={
                    width - right
                  }
                  y1={y}
                  y2={y}
                  className="stroke-border-subtle"
                  strokeWidth="1"
                />

                <text
                  x="5"
                  y={y + 3}
                  className="fill-text-dim text-[9px]"
                >
                  {value}%
                </text>
              </g>
            );
          },
        )}

        {path && (
          <path
            d={path}
            fill="none"
            pathLength="1"
            className="stroke-cyan-400 attendance-line-draw"
            style={{
              animationDuration: `${durationSeconds}s`,
            }}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        )}

        {points.map(
          (point, index) => {
            const showLabel =
              index % labelStep === 0 ||
              index ===
                points.length - 1;

            return (
              <g key={point.label}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="fill-surface stroke-cyan-400 attendance-line-point"
                  strokeWidth="3"
                  style={{
                    animationDelay: `${
                      index *
                      pointIntervalSeconds
                    }s`,
                  }}
                />

                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-text-muted text-[9px] attendance-line-value"
                  style={{
                    animationDelay: `${
                      index *
                        pointIntervalSeconds +
                      0.15
                    }s`,
                  }}
                >
                  {point.value.toFixed(
                    0,
                  )}
                  %
                </text>

                {showLabel ? (
                  <text
                    x={point.x}
                    y={
                      height -
                      10
                    }
                    textAnchor="middle"
                    className="fill-text-dim text-[9px] attendance-line-label"
                    style={{
                      animationDelay: `${Math.max(
                        index *
                          pointIntervalSeconds -
                          0.1,
                        0,
                      )}s`,
                    }}
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          },
        )}
      </svg>
    </div>
  );
}

/* =========================================================
   HORIZONTAL BAR
========================================================= */

function HorizontalBarChart({
  data,
}: {
  data: {
    label: string;
    value: number;
  }[];
}) {
  return (
    <div className="space-y-5">
      {data.map(
        (item, index) => (
          <div
            key={item.label}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-xs font-medium text-text">
                {item.label}
              </span>

              <span className="shrink-0 text-xs font-semibold text-text">
                {item.value.toFixed(
                  1,
                )}
                %
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-bg">
              <div
                className={[
                  "h-full rounded-full attendance-horizontal-grow",
                  item.value >= 90
                    ? "bg-emerald-500"
                    : item.value >= 70
                      ? "bg-amber-500"
                      : "bg-rose-500",
                ].join(" ")}
                style={{
                  animationDelay: `${index * 0.08}s`,
                  width: `${Math.min(
                    Math.max(
                      item.value,
                      0,
                    ),
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* =========================================================
   EMPLOYEE MONTHLY ATTENDANCE
========================================================= */

function EmployeeMonthlyAttendance({
  data,
  totalDays,
  language,
}: {
  data: EmployeeAttendanceSummary[];
  totalDays: number;
  language: OrganizationLanguage;
}) {
  const segmentWidth = (value: number) =>
    totalDays > 0 ? `${(value / totalDays) * 100}%` : "0%";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item, index) => {
        const rate =
          totalDays > 0
            ? (item.present / totalDays) * 100
            : 0;

        return (
          <div
            key={item.employee.employee_no}
            className="rounded-xl border border-border-subtle bg-bg/20 p-3 transition-colors duration-200 hover:bg-surface-hover"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-[9px] font-extrabold text-cyan-400">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-text">
                      {employeeName(item.employee, language)}
                    </p>
                    <p className="mt-0.5 truncate text-[8px] text-text-dim">
                      {item.employee.employee_no}
                    </p>
                  </div>

                  <span
                    className={[
                      "shrink-0 text-sm font-extrabold",
                      rate >= 90
                        ? "text-emerald-400"
                        : rate >= 70
                          ? "text-amber-400"
                          : "text-rose-400",
                    ].join(" ")}
                  >
                    {rate.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-bg">
                  {item.present > 0 && (
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: segmentWidth(item.present) }}
                    />
                  )}
                  {item.leave > 0 && (
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: segmentWidth(item.leave) }}
                    />
                  )}
                  {item.mc > 0 && (
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: segmentWidth(item.mc) }}
                    />
                  )}
                  {item.upl > 0 && (
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: segmentWidth(item.upl) }}
                    />
                  )}
                  {item.absent > 0 && (
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: segmentWidth(item.absent) }}
                    />
                  )}
                  {item.off > 0 && (
                    <div
                      className="h-full bg-slate-500"
                      style={{ width: segmentWidth(item.off) }}
                    />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] font-semibold">
                  <span className="text-emerald-400">
                    {language === "cn" ? "出勤" : "P"} {item.present}
                  </span>
                  <span className="text-blue-400">
                    {language === "cn" ? "年假" : "AL"} {item.leave}
                  </span>
                  <span className="text-violet-400">
                    {language === "cn" ? "病假" : "MC"} {item.mc}
                  </span>
                  <span className="text-indigo-400">
                    {language === "cn" ? "外出" : "UPL"} {item.upl}
                  </span>
                  <span className="text-rose-400">
                    {language === "cn" ? "缺勤" : "A"} {item.absent}
                  </span>
                  <span className="text-slate-400">
                    {language === "cn" ? "休息" : "OFF"} {item.off}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted lg:col-span-2">
          {language === "cn"
            ? "没有员工考勤数据"
            : "No employee attendance data"}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DAILY DATE SELECTOR
========================================================= */

function DaySelector({
  days,
  selectedDate,
  onChange,
}: {
  days: DailyStats[];
  selectedDate: string;
  onChange: (
    date: string,
  ) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14 xl:grid-cols-16">
      {days.map((day) => {
        const active =
          day.date ===
          selectedDate;

        const date =
          new Date(
            `${day.date}T00:00:00`,
          );

        const isFuture =
          date >
          startOfDay(
            new Date(),
          );

        return (
          <button
            key={day.date}
            type="button"
            disabled={
              isFuture
            }
            onClick={() =>
              onChange(
                day.date,
              )
            }
            className={[
              "rounded-md border px-1.5 py-2 text-center transition-all duration-200",
              active
                ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
                : isFuture
                  ? "cursor-not-allowed border-border bg-surface text-text-dim opacity-40"
                  : "border-border bg-surface text-text-muted hover:border-cyan-400/30 hover:bg-surface-hover",
            ].join(" ")}
          >
            <div className="text-[9px] font-semibold">
              {pad(
                day.day,
              )}
            </div>

            <div
              className={[
                "mt-1 text-[8px] uppercase tracking-wide",
                active
                  ? "text-cyan-300"
                  : "text-text-dim",
              ].join(" ")}
            >
              {day.weekday}
            </div>

            <div
              className={[
                "mt-1 text-[9px] font-semibold",
                active
                  ? "text-cyan-200"
                  : "text-emerald-400",
              ].join(" ")}
            >
              {day.present}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AttendanceOverviewPage() {
  const { t } = useLang();

  const language: OrganizationLanguage =
    t.safety.management ===
    "安全管理"
      ? "cn"
      : "en";

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    () => new Date(),
  );

  const [
    employees,
    setEmployees,
  ] = useState<Employee[]>([]);

  const [
    attendanceRows,
    setAttendanceRows,
  ] = useState<
    AttendanceDailyRow[]
  >([]);
  const [
    scheduleRows,
    setScheduleRows,
  ] = useState<ScheduleApiRow[]>([]);

  const [
    leaveRows,
    setLeaveRows,
  ] = useState<LeaveRow[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    syncing,
    setSyncing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const year =
    selectedDate.getFullYear();

  const month =
    selectedDate.getMonth() + 1;

  const totalDays =
    daysInMonth(
      year,
      month,
    );

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);

      try {
        /*
         * Load data immediately.
         * Sync runs in background.
         */
        const [
          employeeResponse,
          attendanceResponse,
          leaveResponse,
          scheduleResponse,
        ] = await Promise.all([
          fetch(
            API_EMPLOYEES,
            {
              cache: "no-store",
            },
          ),

          fetch(
            `${API_DAILY}?year=${year}&month=${month}`,
            {
              cache: "no-store",
            },
          ),

          fetch(
            `${API_LEAVE}?year=${year}&month=${month}`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            `${API_SCHEDULES}?year=${year}&month=${month}`,
            {
              cache: "no-store",
            },
          ),
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
          throw new Error(
            `Leave API failed: ${leaveResponse.status}`,
          );
        }
        if (!scheduleResponse.ok) {
          throw new Error(
            `Schedule API failed: ${scheduleResponse.status}`,
          );
        }
        const [
          employeePayload,
          attendancePayload,
          leavePayload,
          schedulePayload,
        ] = await Promise.all([
          employeeResponse.json() as Promise<{
            data?: Employee[];
          }>,

          attendanceResponse.json() as Promise<{
            data?: AttendanceDailyRow[];
          }>,

          leaveResponse.json() as Promise<{
            data?: LeaveRow[];
          }>,
          scheduleResponse.json() as Promise<{
            data?: ScheduleApiRow[];
          }>,
        ]);

        if (cancelled) {
          return;
        }

        setEmployees(
          (
            employeePayload.data ??
            []
          ).filter(
            (employee) =>
              employee.employee_no &&
              employee.employee_no !==
                "SUPERADMIN" &&
              employee.employment_status ===
                "Active",
          ),
        );

        setAttendanceRows(
          attendancePayload.data ??
            [],
        );

        setLeaveRows(
          leavePayload.data ??
            [],
        );
        setScheduleRows(
          schedulePayload.data ??
          [],
        );

        setLoading(false);

        /*
         * -------------------------------------------------
         * BACKGROUND SYNC
         * -------------------------------------------------
         */
        setSyncing(true);

        void fetch(
          API_DAILY_SYNC,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              year,
              month,
            }),
          },
        )
          .then(
            async (
              syncResponse,
            ) => {
              if (
                !syncResponse.ok
              ) {
                const syncPayload =
                  (await syncResponse
                    .json()
                    .catch(
                      () => ({}),
                    )) as {
                    error?: string;
                  };

                throw new Error(
                  syncPayload.error ||
                    `Attendance sync failed: ${syncResponse.status}`,
                );
              }

              /*
               * Refresh attendance after sync.
               */
              const refreshResponse =
                await fetch(
                  `${API_DAILY}?year=${year}&month=${month}`,
                  {
                    cache:
                      "no-store",
                  },
                );

              if (
                !refreshResponse.ok
              ) {
                throw new Error(
                  `Attendance refresh failed: ${refreshResponse.status}`,
                );
              }

              const refreshPayload =
                (await refreshResponse.json()) as {
                  data?: AttendanceDailyRow[];
                };

              if (
                !cancelled
              ) {
                setAttendanceRows(
                  refreshPayload.data ??
                    [],
                );
              }
            },
          )
          .catch(
            (
              syncError,
            ) => {
              console.error(
                "Background attendance sync failed:",
                syncError,
              );
            },
          )
          .finally(() => {
            if (
              !cancelled
            ) {
              setSyncing(
                false,
              );
            }
          });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof
              Error
              ? err.message
              : language ===
                  "cn"
                ? "加载考勤概览失败。"
                : "Failed to load attendance overview.",
          );

          setLoading(false);
          setSyncing(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [
    year,
    month,
    language,
  ]);

  /* =======================================================
     MAPS
  ======================================================= */

  const employeeMap = useMemo(
    () =>
      new Map(
        employees.map(
          (employee) => [
            employee.employee_no,
            employee,
          ],
        ),
      ),
    [employees],
  );

  const attendanceMap = useMemo(() => {
    const map =
      new Map<
        string,
        AttendanceDailyRow
      >();

    for (const row of attendanceRows) {
      const key =
        `${row.employee_no}|${String(
          row.attendance_date,
        ).slice(0, 10)}`;

      map.set(key, row);
    }

    return map;
  }, [attendanceRows]);
  const scheduleMap = useMemo(() => {
    const map =
      new Map<
        string,
        ScheduleApiRow
      >();

    for (const row of scheduleRows) {
      const key =
        `${row.employee_no}|${String(
          row.schedule_date,
        ).slice(0, 10)}`;

      map.set(key, row);
    }

    return map;
  }, [scheduleRows]);


  /* =======================================================
     MONTH DAYS
  ======================================================= */

  const monthDays = useMemo(() => {
    return Array.from(
      {
        length:
          totalDays,
      },
      (_, index) => {
        const day =
          index + 1;

        const date =
          new Date(
            year,
            month - 1,
            day,
          );

        return {
          day,
          date,
          dateKey:
            dateKey(date),
          weekday:
            date.toLocaleDateString(
              language ===
                "cn"
                ? "zh-CN"
                : "en-US",
              {
                weekday:
                  "short",
              },
            ),
        };
      },
    );
  }, [
    year,
    month,
    totalDays,
    language,
  ]);

  /* =======================================================
     SELECTED DATE
  ======================================================= */

  const currentDateKey =
    dateKey(
      startOfDay(
        selectedDate,
      ),
    );

  /* =======================================================
     DAILY MONTH STATS
  ======================================================= */

  const dailyStats = useMemo<
    DailyStats[]
  >(() => {
    return monthDays.map(
      (dayInfo) => {
        let present = 0;
        let leave = 0;
        let mc = 0;
        let upl = 0;
        let absent = 0;
        let off = 0;
        let hours = 0;

        const presentEmployees: Employee[] = [];
        const dayShiftEmployees: Employee[] = [];
        const nightShiftEmployees: Employee[] = [];
        for (const employee of employees) {
          const attendance =
            attendanceMap.get(
              `${employee.employee_no}|${dayInfo.dateKey}`,
            );

          if (!attendance) {
            continue;
          }

          const value =
            attendance.attendance_value;

          if (
            isPresent(value)
          ) {
            present++;

            hours +=
              Number(
                attendance.planned_hours,
              ) || 0;

            presentEmployees.push(
              employee,
            );
            const schedule = scheduleMap.get(
              `${employee.employee_no}|${dayInfo.dateKey}`,
            );

            if (
              schedule?.schedule_type === "D" ||
              schedule?.schedule_type === "D/S"||
              schedule?.schedule_type === "1"
            ) {
              dayShiftEmployees.push(employee);
            }

            if (
              schedule?.schedule_type === "N" ||
              schedule?.schedule_type === "N/S"
            ) {
              nightShiftEmployees.push(employee);
            }
          } else if (
            value === "AL"
          ) {
            leave++;
          } else if (
            value === "MC"
          ) {
            mc++;
          } else if (
            value === "UPL"
          ) {
            upl++;
          } else if (
            value === "A"
          ) {
            absent++;
          } else if (
            value === "OFF"
          ) {
            off++;
          }
        }

        const rate =
          employees.length >
          0
            ? (present /
                employees.length) *
              100
            : 0;

        return {
          date:
            dayInfo.dateKey,
          day: dayInfo.day,
          weekday:
            dayInfo.weekday,
          present,
          leave,
          mc,
          upl,
          absent,
          off,
          hours,
          rate,
          presentEmployees,
          dayShiftEmployees,
          nightShiftEmployees,
        };
      },
    );
  }, [
    monthDays,
    employees,
    attendanceMap,
    scheduleMap,
  ]);

  /* =======================================================
     SELECTED DAY
  ======================================================= */

  const selectedDayStats =
    useMemo(() => {
      return (
        dailyStats.find(
          (item) =>
            item.date ===
            currentDateKey,
        ) ?? {
          date:
            currentDateKey,
          day:
            selectedDate.getDate(),
          weekday:
            selectedDate.toLocaleDateString(
              language ===
                "cn"
                ? "zh-CN"
                : "en-US",
              {
                weekday:
                  "long",
              },
            ),
          present: 0,
          leave: 0,
          mc: 0,
          upl: 0,
          absent: 0,
          off: 0,
          hours: 0,
          rate: 0,
          presentEmployees: [],
          dayShiftEmployees: [],
          nightShiftEmployees: [],
        }
      );
    }, [
      dailyStats,
      currentDateKey,
      selectedDate,
      language,
    ]);

  /* =======================================================
     MONTH STATS
  ======================================================= */

  const monthStats =
    useMemo(() => {
      let present = 0;
      let leave = 0;
      let mc = 0;
      let upl = 0;
      let absent = 0;
      let off = 0;
      let hours = 0;

      for (const day of dailyStats) {
        present += day.present;
        leave += day.leave;
        mc += day.mc;
        upl += day.upl;
        absent += day.absent;
        off += day.off;
        hours += day.hours;
      }

      const employeeDays =
        employees.length *
        totalDays;

      const attendanceRate =
        employeeDays > 0
          ? (present /
              employeeDays) *
            100
          : 0;

      return {
        employees:
          employees.length,
        present,
        leave,
        mc,
        upl,
        absent,
        off,
        hours,
        attendanceRate,
      };
    }, [
      dailyStats,
      employees.length,
      totalDays,
    ]);

  /* =======================================================
     DEPARTMENT SUMMARY
  ======================================================= */

  const departmentSummary =
    useMemo<
      DepartmentSummary[]
    >(() => {
      const map =
        new Map<
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
        const department =
          departmentName(
            employee,
            language,
          );

        const current =
          map.get(
            department,
          ) ?? {
            department,
            employees: 0,
            present: 0,
            leave: 0,
            mc: 0,
            upl: 0,
            absent: 0,
            off: 0,
          };

        current.employees++;

        for (const day of monthDays) {
          const attendance =
            attendanceMap.get(
              `${employee.employee_no}|${day.dateKey}`,
            );

          if (!attendance) {
            continue;
          }

          const value =
            attendance.attendance_value;

          if (
            isPresent(value)
          ) {
            current.present++;
          } else if (
            value === "AL"
          ) {
            current.leave++;
          } else if (
            value === "MC"
          ) {
            current.mc++;
          } else if (
            value === "UPL"
          ) {
            current.upl++;
          } else if (
            value === "A"
          ) {
            current.absent++;
          } else if (
            value === "OFF"
          ) {
            current.off++;
          }
        }

        map.set(
          department,
          current,
        );
      }

      return Array.from(
        map.values(),
      )
        .map((item) => ({
          ...item,
          attendanceRate:
            item.employees *
              totalDays >
            0
              ? (item.present /
                  (item.employees *
                    totalDays)) *
                100
              : 0,
        }))
        .sort(
          (a, b) =>
            b.attendanceRate -
            a.attendanceRate,
        );
    }, [
      employees,
      language,
      monthDays,
      attendanceMap,
      totalDays,
    ]);

  /* =======================================================
     EMPLOYEE MONTHLY ATTENDANCE
  ======================================================= */

  const employeeAttendanceSummary = useMemo<
    EmployeeAttendanceSummary[]
  >(() => {
    return employees
      .map((employee) => {
        let present = 0;
        let leave = 0;
        let mc = 0;
        let upl = 0;
        let absent = 0;
        let off = 0;

        for (const day of monthDays) {
          const attendance = attendanceMap.get(
            `${employee.employee_no}|${day.dateKey}`,
          );

          if (!attendance) continue;

          const value = attendance.attendance_value;
          if (isPresent(value)) present++;
          else if (value === "AL") leave++;
          else if (value === "MC") mc++;
          else if (value === "UPL") upl++;
          else if (value === "A") absent++;
          else if (value === "OFF") off++;
        }

        return {
          employee,
          present,
          leave,
          mc,
          upl,
          absent,
          off,
        };
      })
      .sort((a, b) => {
        const aRate = totalDays > 0 ? a.present / totalDays : 0;
        const bRate = totalDays > 0 ? b.present / totalDays : 0;
        return (
          aRate - bRate ||
          employeeName(a.employee, language).localeCompare(
            employeeName(b.employee, language),
          )
        );
      });
  }, [
    employees,
    monthDays,
    attendanceMap,
    totalDays,
    language,
  ]);

  /* =======================================================
     RECENT REQUESTS
  ======================================================= */

  const recentRequests =
    useMemo(
      () =>
        [
          ...leaveRows,
        ]
          .sort(
            (a, b) =>
              new Date(
                `${b.request_date}T00:00:00`,
              ).getTime() -
                new Date(
                  `${a.request_date}T00:00:00`,
                ).getTime() ||
              b.id - a.id,
          )
          .slice(0, 8),
      [leaveRows],
    );

  /* =======================================================
     OT
  ======================================================= */

  const otStats =
    useMemo(() => {
      const otRows =
        leaveRows.filter(
          (row) =>
            row.request_type ===
            "OT",
        );

      let totalMinutes = 0;

      for (const row of otRows) {
        if (
          !row.start_time ||
          !row.end_time
        ) {
          continue;
        }

        const [
          sh,
          sm,
        ] = String(
          row.start_time,
        )
          .slice(0, 5)
          .split(":")
          .map(Number);

        const [
          eh,
          em,
        ] = String(
          row.end_time,
        )
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

        let start =
          sh * 60 + sm;

        let end =
          eh * 60 + em;

        if (end <= start) {
          end +=
            24 * 60;
        }

        totalMinutes +=
          end - start;
      }

      return {
        requests:
          otRows.length,

        pending:
          otRows.filter(
            (row) =>
              row.status ===
              "Pending",
          ).length,

        approved:
          otRows.filter(
            (row) =>
              row.status ===
              "Approved",
          ).length,

        hours:
          totalMinutes / 60,
      };
    }, [leaveRows]);

  /* =======================================================
     LABELS
  ======================================================= */

  const monthLabel =
    selectedDate.toLocaleDateString(
      language ===
        "cn"
        ? "zh-CN"
        : "en-US",
      {
        month: "long",
        year: "numeric",
      },
    );

  const selectedDateLabel =
    selectedDate.toLocaleDateString(
      language ===
        "cn"
        ? "zh-CN"
        : "en-US",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppShell title="">
      <style>{`
        @keyframes attendanceOverviewFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes attendanceOverviewScaleIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes attendanceHorizontalGrow {
          from {
            transform: scaleX(0);
            transform-origin: left;
            opacity: 0.25;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
            opacity: 1;
          }
        }

        @keyframes attendanceDonutReveal {
          from {
            opacity: 0;
            transform: rotate(-8deg) scale(0.94);
          }
          to {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
        }

        @keyframes attendanceLineDraw {
          from {
            stroke-dashoffset: 1;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes attendancePointReveal {
          from {
            opacity: 0;
            transform: scale(0.4);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes attendanceTextReveal {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .attendance-overview-page {
          --attendance-cyan: 34 211 238;
        }

        .attendance-overview-page
        .attendance-card,
        .attendance-overview-page
        .attendance-section {
          transition:
            border-color .25s ease,
            box-shadow .25s ease,
            background-color .25s ease;
        }

        .attendance-overview-page
        .attendance-card:hover,
        .attendance-overview-page
        .attendance-section:hover {
          border-color:
            rgb(var(--attendance-cyan) / .20);

          box-shadow:
            0 12px 34px
            rgb(8 47 73 / .12);
        }

        .attendance-overview-page
        .attendance-line-draw {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation:
            attendanceLineDraw
            ${CHART_ANIMATION_DURATION}ms
            ${CHART_ANIMATION_EASING}
            both;

          filter:
            drop-shadow(
              0 0 5px
              rgb(var(--attendance-cyan) / .35)
            );
        }

        .attendance-overview-page
        .attendance-line-point {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation:
            attendancePointReveal
            .35s
            ease-out
            both;

          filter:
            drop-shadow(
              0 0 5px
              rgb(var(--attendance-cyan) / .35)
            );
        }

        .attendance-overview-page
        .attendance-line-value,
        .attendance-overview-page
        .attendance-line-label {
          opacity: 0;
          animation:
            attendanceTextReveal
            .3s
            ease-out
            both;
        }

        .attendance-overview-page
        .attendance-horizontal-grow {
          animation:
            attendanceHorizontalGrow
            1s
            cubic-bezier(.42,0,.58,1)
            both;

          box-shadow:
            inset 0 1px
            rgb(255 255 255 / .18),
            0 3px 10px
            rgb(0 0 0 / .10);
        }

        .attendance-overview-page
        .attendance-donut-segment {
          animation:
            attendanceDonutReveal
            .8s
            cubic-bezier(.42,0,.58,1)
            both;

          transform-box: fill-box;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .attendance-overview-page
          .attendance-line-draw,
          .attendance-overview-page
          .attendance-line-point,
          .attendance-overview-page
          .attendance-line-value,
          .attendance-overview-page
          .attendance-line-label,
          .attendance-overview-page
          .attendance-horizontal-grow,
          .attendance-overview-page
          .attendance-donut-segment {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      <div className="attendance-overview-page space-y-5">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-2xl font-black text-cyan-500 dark:text-cyan-300">
              ◫
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-text-dim">
                  {language === "cn"
                    ? "考勤管理"
                    : "Attendance Management"}
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">
                {language === "cn"
                  ? "考勤概览"
                  : "Attendance Overview"}
              </h1>

              <p className="mt-1 max-w-2xl text-xs text-text-muted">
                {language === "cn"
                  ? "员工月度考勤、每日出勤人员、部门表现、请假与加班总览。"
                  : "Monthly attendance, daily employees present, department performance, leave and overtime overview."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    new Date(
                      year,
                      month - 2,
                      1,
                    ),
                  )
                }
                className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:border-cyan-400/30 hover:bg-surface-hover hover:text-cyan-300"
                aria-label={
                  language === "cn"
                    ? "上个月"
                    : "Previous month"
                }
              >
                ‹
              </button>

              <div className="min-w-[120px] rounded-lg border border-border bg-surface px-3 py-2 text-center text-xs font-bold text-text">
                {monthLabel}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    new Date(
                      year,
                      month,
                      1,
                    ),
                  )
                }
                className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:border-cyan-400/30 hover:bg-surface-hover hover:text-cyan-300"
                aria-label={
                  language === "cn"
                    ? "下个月"
                    : "Next month"
                }
              >
                ›
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  new Date(),
                )
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text transition hover:border-cyan-400/50 hover:bg-surface-hover"
            >
              {language === "cn"
                ? "本月"
                : "This Month"}
            </button>

            <div
              className={[
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold",
                syncing
                  ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
              ].join(" ")}
            >
              <span
                className={[
                  "size-2 rounded-full",
                  syncing
                    ? "animate-pulse bg-cyan-400"
                    : "bg-emerald-500",
                ].join(" ")}
              />

              {syncing
                ? language === "cn"
                  ? "同步中"
                  : "Syncing"
                : language === "cn"
                  ? "已同步"
                  : "Synced"}
            </div>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300">
            {error}
          </div>
        ) : null}

        {/* =================================================
            KPI
        ================================================= */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            title={
              language ===
              "cn"
                ? "员工"
                : "Employees"
            }
            value={String(
              monthStats.employees,
            )}
            subtitle={monthLabel}
            icon="👥"
            tone="accent"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "月度出勤"
                : "Present Days"
            }
            value={String(
              monthStats.present,
            )}
            subtitle={
              language ===
              "cn"
                ? "整个月份"
                : "Whole month"
            }
            icon="✓"
            tone="success"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "出勤率"
                : "Attendance Rate"
            }
            value={`${monthStats.attendanceRate.toFixed(
              1,
            )}%`}
            subtitle={
              language ===
              "cn"
                ? "员工天数"
                : "Employee-days"
            }
            icon="📊"
            tone="accent"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "缺勤"
                : "Absent"
            }
            value={String(
              monthStats.absent,
            )}
            subtitle={
              language === "cn"
                ? "旷工 · A"
                : "A"
            }
            icon="!"
            tone="danger"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "计划工时"
                : "Planned Hours"
            }
            value={monthStats.hours.toFixed(
              1,
            )}
            subtitle={
              syncing
                ? language ===
                  "cn"
                  ? "同步中"
                  : "Syncing"
                : language === "cn"
                    ? "每日考勤"
                    : "attendance_daily"
              }
            icon="◷"
            tone="warning"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "年假"
                : "Annual Leave"
            }
            value={String(
              monthStats.leave,
            )}
            subtitle={
                language === "cn"
                  ? "年假 · AL"
                  : "AL"
              }
            icon="A"
            tone="info"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "病假"
                : "Sick Leave"
            }
            value={String(
              monthStats.mc,
            )}
            subtitle={
              language === "cn"
                ? "病假 · MC"
                : "MC"
            }
            icon="M"
            tone="info"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "外出"
                : "Permission"
            }
            value={String(
              monthStats.upl,
            )}
            subtitle={
              language === "cn"
                ? "外出 · UPL"
                : "UPL"
            }
            icon="↗"
            tone="accent"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "休息日"
                : "Rest Days"
            }
            value={String(
              monthStats.off,
            )}
            subtitle={
              language === "cn"
                ? "休息 · OFF"
                : "OFF"
            }
            icon="—"
            tone="info"
          />

          <KpiCard
            title={
              language ===
              "cn"
                ? "加班"
                : "Overtime"
            }
            value={`${otStats.hours.toFixed(
              1,
            )} h`}
            subtitle={`${otStats.requests} ${
              language ===
              "cn"
                ? "申请"
                : "requests"
            }`}
            icon="⏱"
            tone="warning"
          />
        </div>

        {/* =================================================
            MAIN CHARTS
        ================================================= */}

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <SectionHeader
              title={
                language ===
                "cn"
                  ? "月度出勤趋势"
                  : "Monthly Attendance Trend"
              }
              description={
                language ===
                "cn"
                  ? "按照所选月份逐日显示员工出勤率。"
                  : "Daily attendance rate across the selected month."
              }
            />

            <div className="mt-5">
              {loading ? (
                <div className="flex h-[260px] items-center justify-center text-xs text-text-muted">
                  {language ===
                  "cn"
                    ? "加载中..."
                    : "Loading..."}
                </div>
              ) : (
                <LineChart
                  data={dailyStats.map(
                    (
                      item,
                    ) => ({
                      label:
                        String(
                          item.day,
                        ),
                      value:
                        item.rate,
                    }),
                  )}
                />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-[10px] text-text-dim">
                {language ===
                "cn"
                  ? "月度平均"
                  : "Monthly Average"}
              </span>

              <span className="text-xs font-semibold text-cyan-300">
                {monthStats.attendanceRate.toFixed(
                  1,
                )}
                %
              </span>
            </div>
          </section>

          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <SectionHeader
              title={
                language ===
                "cn"
                  ? "月度状态分布"
                  : "Monthly Status Distribution"
              }
              description={
                language ===
                "cn"
                  ? "整个月份的 每日考勤状态统计。"
                  : "Full-month attendance_daily status distribution."
              }
            />

            <div className="mt-3 flex items-center justify-center">
              <DonutChart
                values={[
                  {
                    label: "Present",
                    value:
                      monthStats.present,
                    className:
                      "stroke-emerald-500",
                  },
                  {
                    label: "AL",
                    value:
                      monthStats.leave,
                    className:
                      "stroke-blue-500",
                  },
                  {
                    label: "MC",
                    value:
                      monthStats.mc,
                    className:
                      "stroke-violet-500",
                  },
                  {
                    label: "UPL",
                    value:
                      monthStats.upl,
                    className:
                      "stroke-indigo-500",
                  },
                  {
                    label: "A",
                    value:
                      monthStats.absent,
                    className:
                      "stroke-rose-500",
                  },
                  {
                    label: "OFF",
                    value:
                      monthStats.off,
                    className:
                      "stroke-slate-500",
                  },
                ]}
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <LegendStat
                label={
                  language ===
                  "cn"
                    ? "出勤"
                    : "Present"
                }
                value={
                  monthStats.present
                }
                tone="success"
              />

              <LegendStat
                label={
                  language === "cn"
                    ? "年假"
                    : "AL"
                }
                value={
                  monthStats.leave
                }
                tone="accent"
              />

              <LegendStat
                label={
                  language === "cn"
                    ? "病假"
                    : "MC"
                }
                value={
                  monthStats.mc
                }
                tone="info"
              />

              <LegendStat
                label="UPL"
                value={
                  monthStats.upl
                }
                tone="accent"
              />

              <LegendStat
                label="A"
                value={
                  monthStats.absent
                }
                tone="danger"
              />

              <LegendStat
                label="OFF"
                value={
                  monthStats.off
                }
                tone="warning"
              />
            </div>
          </section>
        </div>

        {/* =================================================
            EMPLOYEE MONTHLY ATTENDANCE
        ================================================= */}

        <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title={
              language === "cn"
                ? "员工月度考勤"
                : "Employee Monthly Attendance"
            }
            description={
              language === "cn"
                ? "每位员工整个月份的出勤及状态构成。"
                : "Monthly attendance rate and status breakdown for each employee."
            }
          />

          <div className="mt-4">
            {loading ? (
              <div className="flex h-[160px] items-center justify-center text-xs text-text-muted">
                {language === "cn" ? "加载中..." : "Loading..."}
              </div>
            ) : (
              <EmployeeMonthlyAttendance
                data={employeeAttendanceSummary}
                totalDays={totalDays}
                language={language}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3 text-[9px] text-text-dim">
            <span className="font-semibold text-text-muted">
              {language === "cn" ? "图例" : "Legend"}
            </span>
            <span className="text-emerald-400">
              {language === "cn" ? "出勤" : "P / Present"}
            </span>
            <span className="text-blue-400">
              {language === "cn" ? "年假" : "AL"}
            </span>
            <span className="text-violet-400">
              {language === "cn" ? "病假" : "MC"}
            </span>
            <span className="text-indigo-400">
              {language === "cn" ? "外出" : "UPL"}
            </span>
            <span className="text-rose-400">
              {language === "cn" ? "缺勤" : "A"}
            </span>
            <span className="text-slate-400">
              {language === "cn" ? "休息" : "OFF"}
            </span>
          </div>
        </section>

        {/* =================================================
            DAILY ATTENDANCE
        ================================================= */}

        <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              title={
                language ===
                "cn"
                  ? "每日出勤"
                  : "Daily Attendance"
              }
              description={
                language ===
                "cn"
                  ? "点击日期即可查看当天实际出勤人员。"
                  : "Click any date to see exactly who was present."
              }
            />

            <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-wide text-text-dim">
                {language ===
                "cn"
                  ? "当前日期"
                  : "Selected Date"}
              </p>

              <p className="mt-0.5 text-xs font-medium text-text">
                {selectedDateLabel}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <DaySelector
              days={dailyStats}
              selectedDate={
                currentDateKey
              }
              onChange={(value) =>
                setSelectedDate(
                  new Date(
                    `${value}T00:00:00`,
                  ),
                )
              }
            />
          </div>

          {/* SELECTED DAY SUMMARY */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <ScoreCard
              title={
                language ===
                "cn"
                  ? "出勤率"
                  : "Attendance Rate"
              }
              value={Number(
                selectedDayStats.rate.toFixed(
                  1,
                ),
              )}
              icon="📊"
            />

            <LegendStat
              label={
                language ===
                "cn"
                  ? "出勤"
                  : "Present"
              }
              value={
                selectedDayStats.present
              }
              tone="success"
            />

            <LegendStat
              label={
                language === "cn"
                  ? "年假"
                  : "AL"
              }
              value={
                selectedDayStats.leave
              }
              tone="accent"
            />

            <LegendStat
              label={
                language === "cn"
                  ? "病假"
                  : "MC"
              }
              value={
                selectedDayStats.mc
              }
              tone="info"
            />

            <LegendStat
              label={
                language === "cn"
                  ? "外出"
                  : "UPL"
              }
              value={
                selectedDayStats.upl
              }
              tone="accent"
            />

            <LegendStat
              label={
                language === "cn"
                  ? "旷工"
                  : "A"
              }
              value={
                selectedDayStats.absent
              }
              tone="danger"
            />

            <LegendStat
             label={
                language === "cn"
                  ? "休息"
                  : "OFF"
              }
              value={
                selectedDayStats.off
              }
              tone="warning"
            />
          </div>

          {/* WHO IS PRESENT */}
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  {language ===
                  "cn"
                    ? "当天出勤人员"
                    : "Employees Present"}
                </h3>

                <p className="mt-1 text-[10px] text-text-muted">
                  {selectedDateLabel}
                </p>
              </div>

              <div className="rounded-md bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
                {
                  selectedDayStats.present
                }{" "}
                {language ===
                "cn"
                  ? "人"
                  : "people"}
              </div>
            </div>

            {selectedDayStats.present === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-bg/20 px-5 py-12 text-center">
                <p className="text-xs font-medium text-text-muted">
                  {language === "cn"
                    ? "当天没有出勤记录。"
                    : "No present employees recorded for this day."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
                {/* DAY SHIFT */}
                <div className="rounded-xl border border-border-subtle bg-surface-hover p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-cyan-600 dark:text-cyan-300">
                         {language === "cn"
                          ? "☀️ 白班"
                          : "☀️ Day Shift"}
                      </h4>
                      <p className="mt-1 text-[10px] text-text-dim">
                        D / D-S
                      </p>
                    </div>

                    <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-[10px] font-extrabold text-cyan-600 dark:text-cyan-300">
                      {selectedDayStats.dayShiftEmployees.length}
                    </span>
                  </div>

                 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedDayStats.dayShiftEmployees.map(
                      (employee, index) => (
                        <div
                          key={employee.employee_no}
                          className="attendance-card rounded-lg border border-border bg-surface p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
                              {String(index + 1).padStart(2, "0")}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-text">
                                {employeeName(employee, language)}
                              </p>

                              <p className="mt-0.5 truncate text-[9px] text-text-dim">
                                {employee.employee_no}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2">
                            <span className="truncate text-[9px] text-text-dim">
                              {departmentName(employee, language)}
                            </span>

                            <span className="ml-2 shrink-0 text-[9px] font-extrabold text-emerald-500">
                              {language === "cn" ? "出勤" : "Present"}
                            </span>
                          </div>
                        </div>
                      ),
                    )}

                    {selectedDayStats.dayShiftEmployees.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[10px] text-text-muted sm:col-span-2">
                        {language === "cn"
                          ? "没有白班出勤人员"
                          : "No day-shift employees"}
                      </div>
                    )}
                  </div>
                </div>

                {/* NIGHT SHIFT */}
                <div className="rounded-xl border border-border-subtle bg-surface-hover p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                        {language === "cn"
                          ? "🌙 夜班"
                          : "🌙 Night Shift"}
                      </h4>
                      <p className="mt-1 text-[10px] text-text-dim">
                        N / N-S
                      </p>
                    </div>

                    <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-300">
                      {selectedDayStats.nightShiftEmployees.length}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {selectedDayStats.nightShiftEmployees.map(
                      (employee, index) => (
                        <div
                          key={employee.employee_no}
                          className="attendance-card rounded-lg border border-border bg-surface p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                              {String(index + 1).padStart(2, "0")}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-text">
                                {employeeName(employee, language)}
                              </p>

                              <p className="mt-0.5 truncate text-[9px] text-text-dim">
                                {employee.employee_no}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2">
                            <span className="truncate text-[9px] text-text-dim">
                              {departmentName(employee, language)}
                            </span>

                            <span className="ml-2 shrink-0 text-[9px] font-extrabold text-emerald-500">
                              {language === "cn" ? "出勤" : "Present"}
                            </span>
                          </div>
                        </div>
                      ),
                    )}

                    {selectedDayStats.nightShiftEmployees.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[10px] text-text-muted sm:col-span-2">
                        {language === "cn"
                          ? "没有夜班出勤人员"
                          : "No night-shift employees"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            DEPARTMENT + OT
        ================================================= */}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <SectionHeader
              title={
                language ===
                "cn"
                  ? "部门月度表现"
                  : "Monthly Department Performance"
              }
              description={
                language ===
                "cn"
                  ? "按照整个月份员工天数计算部门出勤率。"
                  : "Department attendance performance across the whole month."
              }
            />

            <div className="mt-5">
              <HorizontalBarChart
                data={departmentSummary.map(
                  (
                    item,
                  ) => ({
                    label:
                      item.department,
                    value:
                      item.attendanceRate,
                  }),
                )}
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-wide text-text-dim">
                      {language ===
                      "cn"
                        ? "部门"
                        : "Department"}
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                     {language === "cn" ? "员工" : "Employees"}
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                        {language === "cn" ? "出勤" : "Present"}
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                      {language ===
                      "cn"
                        ? "年假"
                        : "AL"}  
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                       {language ===
                      "cn"
                        ? "病假"
                        : "MC"} 
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                       {language ===
                      "cn"
                        ? "外出"
                        : "UPL"} 
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                       {language ===
                      "cn"
                        ? "旷工"
                        : "A"} 
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                       {language ===
                      "cn"
                        ? "休息"
                        : "OFF"}
                    </th>

                    <th className="px-3 py-3 text-center text-[10px] uppercase tracking-wide text-text-dim">
                       {language ===
                      "cn"
                        ? "出勤率"
                        : "Rate"}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {departmentSummary.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.department
                        }
                        className="border-b border-border-subtle hover:bg-surface-hover"
                      >
                        <td className="px-3 py-3 text-xs font-medium text-text">
                          {
                            item.department
                          }
                        </td>

                        <td className="px-3 py-3 text-center text-xs text-text-muted">
                          {
                            item.employees
                          }
                        </td>

                        <td className="px-3 py-3 text-center text-xs font-semibold text-emerald-400">
                          {
                            item.present
                          }
                        </td>

                        <td className="px-3 py-3 text-center text-xs font-semibold text-blue-400">
                          {
                            item.leave
                          }
                        </td>

                        <td className="px-3 py-3 text-center text-xs font-semibold text-violet-400">
                          {
                            item.mc
                          }
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-indigo-400">
                           {item.upl}
                        </td>

                        <td className="px-3 py-3 text-center text-xs font-semibold text-rose-400">
                          {
                            item.absent
                          }
                        </td>

                        <td className="px-3 py-3 text-center text-xs font-semibold text-slate-400">
                          {
                            item.off
                          }
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={
                              item.attendanceRate >=
                              90
                                ? "rounded-md bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300"
                                : item.attendanceRate >=
                                    70
                                  ? "rounded-md bg-amber-500/10 px-2 py-1 text-[9px] font-semibold text-amber-300"
                                  : "rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-semibold text-rose-300"
                            }
                          >
                            {item.attendanceRate.toFixed(
                              1,
                            )}
                            %
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* OT */}
          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <SectionHeader
              title={
                language ===
                "cn"
                  ? "加班概况"
                  : "Overtime Summary"
              }
              description={
                language ===
                "cn"
                  ? "OT 独立于 每日考勤。"
                  : "OT is tracked separately from Daily Attendance."
              }
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <KpiCard
                title={
                  language ===
                  "cn"
                    ? "申请数"
                    : "Requests"
                }
                value={String(
                  otStats.requests,
                )}
                subtitle={
                  language ===
                  "cn"
                    ? "本月"
                    : "This month"
                }
                icon="📄"
                tone="warning"
              />

              <KpiCard
                title={
                  language ===
                  "cn"
                    ? "总时长"
                    : "Total Hours"
                }
                value={`${otStats.hours.toFixed(
                  1,
                )} h`}
                subtitle="OT"
                icon="⏱"
                tone="accent"
              />

              <KpiCard
                title={
                  language ===
                  "cn"
                    ? "待审核"
                    : "Pending"
                }
                value={String(
                  otStats.pending,
                )}
                subtitle="OT"
                icon="!"
                tone="warning"
              />

              <KpiCard
                title={
                  language ===
                  "cn"
                    ? "已批准"
                    : "Approved"
                }
                value={String(
                  otStats.approved,
                )}
                subtitle="OT"
                icon="✓"
                tone="success"
              />
            </div>

            <div className="mt-5 rounded-lg border border-border-subtle bg-bg/30 p-4">
              <p className="text-[10px] uppercase tracking-wide text-text-dim">
                {language ===
                "cn"
                  ? "说明"
                  : "Note"}
              </p>

              <p className="mt-1.5 text-[10px] leading-5 text-text-muted">
                {language ===
                "cn"
                  ? "OT 不覆盖 每日考勤，仅在本区域统计 OT 申请和时长。"
                  : "OT does not override Daily Attendance. This section summarizes monthly OT requests and duration only."}
              </p>
            </div>
          </section>
        </div>

        {/* =================================================
            RECENT REQUESTS
        ================================================= */}

        <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title={
              language ===
              "cn"
                ? "最新申请"
                : "Recent Requests"
            }
            description={
              language ===
              "cn"
                ? "最近的请假、外出和 OT 申请。"
                : "Latest leave, permission and OT requests."
            }
          />

          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {recentRequests.length ===
            0 ? (
              <div className="rounded-lg border border-dashed border-border px-5 py-12 text-center md:col-span-2 xl:col-span-4">
                <p className="text-xs font-medium text-text-muted">
                  {language ===
                  "cn"
                    ? "暂无申请记录"
                    : "No requests yet."}
                </p>
              </div>
            ) : (
              recentRequests.map(
                (request) => {
                  const employee =
                    employeeMap.get(
                      request.employee_no,
                    );

                 const label =
                  request.request_type === "ALPA"
                    ? language === "cn"
                      ? "旷工"
                      : "A"
                    : request.request_type === "OT"
                      ? language === "cn"
                        ? "加班"
                        : "Overtime"
                      : valueLabel(
                          request.request_type,
                          language,
                        );

                  const statusClass =
                    request.status ===
                    "Approved"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : request.status ===
                          "Rejected"
                        ? "bg-rose-500/10 text-rose-300"
                        : "bg-amber-500/10 text-amber-300";

                  return (
                    <div
                      key={
                        request.id
                      }
                      className="attendance-card rounded-lg border border-border bg-bg/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-text">
                            {employeeName(
                              employee,
                              language,
                            )}
                          </p>

                          <p className="mt-0.5 text-[9px] text-text-dim">
                            {
                              request.employee_no
                            }
                          </p>
                        </div>

                        <span
                          className={`rounded-md px-2 py-1 text-[9px] font-medium ${statusClass}`}
                        >
                          {
                            request.status
                          }
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
                        <span className="truncate text-[10px] text-text-muted">
                          {label}
                        </span>

                        <span className="shrink-0 text-[9px] text-text-dim">
                          {String(
                            request.request_date,
                          ).slice(
                            0,
                            10,
                          )}
                        </span>
                      </div>

                      {request.start_time &&
                      request.end_time ? (
                        <p className="mt-2 text-[9px] text-text-dim">
                          {String(
                            request.start_time,
                          ).slice(
                            0,
                            5,
                          )}
                          {" – "}
                          {String(
                            request.end_time,
                          ).slice(
                            0,
                            5,
                          )}
                        </p>
                      ) : null}
                    </div>
                  );
                },
              )
            )}
          </div>
        </section>

        {/* =================================================
            MONTH PERFORMANCE SCORE
        ================================================= */}

        <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title={
              language ===
              "cn"
                ? "月度考勤表现"
                : "Monthly Attendance Performance"
            }
            description={
              language ===
              "cn"
                ? "从整体出勤率、缺勤控制和计划工时查看本月表现。"
                : "Monthly performance based on attendance rate, absence and planned hours."
            }
          />

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ScoreCard
              title={
                language ===
                "cn"
                  ? "出勤率"
                  : "Attendance Rate"
              }
              value={Number(
                monthStats.attendanceRate.toFixed(
                  0,
                ),
              )}
              icon="📊"
            />

            <ScoreCard
              title={
                language ===
                "cn"
                  ? "出勤表现"
                  : "Present Performance"
              }
              value={
                employees.length >
                0
                  ? Math.round(
                      Math.min(
                        100,
                        (monthStats.present /
                          Math.max(
                            employees.length *
                              totalDays,
                            1,
                          )) *
                          100,
                      ),
                    )
                  : 0
              }
              icon="✓"
            />

            <ScoreCard
              title={
                language ===
                "cn"
                  ? "缺勤控制"
                  : "Absence Control"
              }
              value={
                employees.length >
                  0 &&
                totalDays >
                  0
                  ? Math.round(
                      Math.max(
                        0,
                        100 -
                          (monthStats.absent /
                            Math.max(
                              employees.length *
                                totalDays,
                              1,
                            )) *
                            100,
                      ),
                    )
                  : 100
              }
              icon="!"
            />

            <ScoreCard
              title={
                language ===
                "cn"
                  ? "月度状态"
                  : "Monthly Status"
              }
              value={Math.round(
                monthStats.attendanceRate,
              )}
              icon="🏆"
            />
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="rounded-lg border border-border-subtle bg-bg/20 px-4 py-3 text-[10px] text-text-dim">
          {language ===
          "cn"
            ? "本页面按所选月份统计 每日考勤；点击日期可查看当天出勤人员。AL / MC / UPL / A 按 每日考勤 规则统计，OT 独立统计。"
            : "This page summarizes the selected month from attendance_daily. Click a date to see employees present that day. AL / MC / UPL / A follow Daily Attendance rules, while OT is tracked separately."}
        </div>
      </div>
    </AppShell>
  );
}