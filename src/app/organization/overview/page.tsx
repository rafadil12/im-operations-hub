"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OrganizationGate } from "@/components/organization/OrganizationGate";
import { handleGuestForbiddenResponse } from "@/lib/apiClient";
import { useRoleAccess } from "@/hooks/useRoleAccess";
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

type ScheduleExceptionStatus =
  | "MISSED"
  | "LEAVE"
  | "WORKED_ON_OFF"
  | "UNSCHEDULED_PRESENT";

type ScheduleException = {
  employee: Employee;
  date: string;
  scheduleType: ScheduleApiRow["schedule_type"];
  attendanceValue: AttendanceValue | null;
  status: ScheduleExceptionStatus;
};

type DailyScheduleComparison = {
  date: string;
  day: number;
  weekday: string;
  scheduled: number;
  actual: number;
  rate: number;
  leave: number;
  missed: number;
  workedOnOff: number;
  unscheduledPresent: number;
  exceptions: ScheduleException[];
};

type LeaveType =
  | "AL"
  | "MC"
  | "UPL"
  | "A"
  | "ALPA"
  | "OT"
  | "NO_ATTENDANCE";

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


type EmployeeLeaveSummary = {
  employee: Employee;
  al: number;
  mc: number;
  upl: number;
  alpa: number;
  total: number;
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

function requestTypeStyle(requestType: LeaveType) {
  const styles: Record<
    LeaveType,
    { card: string; label: string }
  > = {
    AL: {
      card: "border-sky-400/30 bg-sky-500/[0.04]",
      label: "bg-sky-500/10 text-sky-300",
    },
    MC: {
      card: "border-rose-400/30 bg-rose-500/[0.04]",
      label: "bg-rose-500/10 text-rose-300",
    },
    UPL: {
      card: "border-amber-400/30 bg-amber-500/[0.04]",
      label: "bg-amber-500/10 text-amber-300",
    },
    A: {
      card: "border-slate-400/30 bg-slate-500/[0.04]",
      label: "bg-slate-500/10 text-slate-300",
    },
    ALPA: {
      card: "border-fuchsia-400/30 bg-fuchsia-500/[0.04]",
      label: "bg-fuchsia-500/10 text-fuchsia-300",
    },
    OT: {
      card: "border-violet-400/30 bg-violet-500/[0.04]",
      label: "bg-violet-500/10 text-violet-300",
    },
    NO_ATTENDANCE: {
      card: "border-slate-400/30 bg-slate-500/[0.04]",
      label: "bg-slate-500/10 text-slate-300",
    },
  };

  return styles[requestType];
}

function leaveRequestLabel(
  requestType: LeaveType,
  language: OrganizationLanguage,
) {
  if (requestType === "ALPA") return language === "cn" ? "旷工" : "A";
  if (requestType === "OT") return language === "cn" ? "加班" : "Overtime";
  if (requestType === "NO_ATTENDANCE") {
    return language === "cn" ? "无考勤" : "No Attendance";
  }

  return valueLabel(requestType, language);
}

function isWorkScheduleType(
  scheduleType: ScheduleApiRow["schedule_type"],
) {
  return (
    scheduleType === "D" ||
    scheduleType === "N" ||
    scheduleType === "D/S" ||
    scheduleType === "N/S" ||
    scheduleType === "1" ||
    scheduleType === "4"
  );
}

function isLeaveAttendanceValue(
  value: AttendanceValue | undefined,
) {
  return value === "AL" || value === "MC" || value === "UPL";
}

function scheduleLabel(
  value: ScheduleApiRow["schedule_type"],
  language: OrganizationLanguage,
) {
  if (!value) return language === "cn" ? "无排班" : "No schedule";
  if (value === "D" || value === "D/S") return language === "cn" ? "白班" : "Day";
  if (value === "N" || value === "N/S") return language === "cn" ? "夜班" : "Night";
  if (value === "1") return language === "cn" ? "8小时" : "8 Hours";
  if (value === "4") return language === "cn" ? "4小时" : "4 Hours";
  return language === "cn" ? "休息" : "OFF";
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

      <p className="mt-2 text-2xl font-semibold text-text">
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

      <p className="mt-2 text-[10px] uppercase tracking-wide text-text-dim">
        {title}
      </p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
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
  onClick,
}: {
  label: string;
  value: number;
  tone:
    | "success"
    | "warning"
    | "danger"
    | "accent"
    | "info";
  onClick?: () => void;
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
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        "w-full rounded-lg border border-border-subtle bg-bg/30 p-3 text-center transition-all duration-200",
        onClick
          ? "cursor-pointer hover:border-rose-400/30 hover:bg-rose-500/5 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
          : "cursor-default",
      ].join(" ")}
    >
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
    </button>
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
   SCHEDULE VS ACTUAL CHART
========================================================= */
function ScheduleVsActualChart({
  data,
  selectedDate,
  onSelectDate,
  language,
}: {
  data: DailyScheduleComparison[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  language: OrganizationLanguage;
}) {
  const width = 900;
  const height = 330;
  const left = 46;
  const right = 52;
  const top = 24;
  const bottom = 44;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxCount = Math.max(
    1,
    ...data.map((item) => Math.max(item.scheduled, item.actual)),
  );
  const step = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.min(12, Math.max(4, step * 0.28));
  const points = data.map((item, index) => {
    const x = left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const scheduledY = top + chartHeight - (item.scheduled / maxCount) * chartHeight;
    const actualY = top + chartHeight - (item.actual / maxCount) * chartHeight;
    const rateY = top + chartHeight - (Math.min(item.rate, 100) / 100) * chartHeight;
    return { ...item, x, scheduledY, actualY, rateY };
  });

  const ratePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.rateY}`)
    .join(" ");

  const animationMs = 1800;
  const barDelay = 0.045;
  const actualOffset = 0.08;
  const rateStart = Math.min(data.length * barDelay + 0.15, 1.5);

  return (
    <div className="w-full overflow-x-auto">
      <style>{`
        @keyframes scheduleBarGrow {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes actualBarGrow {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes attendanceLineDraw {
          0% {
            stroke-dashoffset: 1;
            opacity: 0.15;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes attendancePointReveal {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          70% {
            opacity: 1;
            transform: scale(1.18);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes varianceDotReveal {
          0% {
            opacity: 0;
            transform: scale(0.15);
          }
          55% {
            opacity: 1;
            transform: scale(1.4);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes varianceDotPulse {
          0%, 100% {
            filter: drop-shadow(0 0 0 rgba(244,63,94,0));
          }
          50% {
            filter: drop-shadow(0 0 5px rgba(244,63,94,0.55));
          }
        }

        .schedule-bar-grow {
          transform-box: fill-box;
          transform-origin: bottom;
          animation-name: scheduleBarGrow;
          animation-duration: 700ms;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }

        .actual-bar-grow {
          transform-box: fill-box;
          transform-origin: bottom;
          animation-name: actualBarGrow;
          animation-duration: 700ms;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }

        .attendance-line-draw {
          pathLength: 1;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation-name: attendanceLineDraw;
          animation-duration: 1800ms;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .attendance-point-reveal {
          transform-box: fill-box;
          transform-origin: center;
          animation-name: attendancePointReveal;
          animation-duration: 420ms;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }

        .variance-dot-reveal {
          transform-box: fill-box;
          transform-origin: center;
          animation-name: varianceDotReveal;
          animation-duration: 420ms;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }

        .variance-dot-pulse {
          animation-name: varianceDotPulse;
          animation-duration: 1400ms;
          animation-timing-function: ease-in-out;
          animation-iteration-count: 2;
        }

        @media (prefers-reduced-motion: reduce) {
          .schedule-bar-grow,
          .actual-bar-grow,
          .attendance-line-draw,
          .attendance-point-reveal,
          .variance-dot-reveal,
          .variance-dot-pulse {
            animation: none !important;
          }
        }
      `}</style>

      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full">
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = top + chartHeight - (percent / 100) * chartHeight;
          const count = Math.round((percent / 100) * maxCount);
          return (
            <g key={percent}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                className="stroke-border-subtle"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-text-dim text-[9px]"
              >
                {count}
              </text>
              <text
                x={width - right + 9}
                y={y + 4}
                className="fill-text-dim text-[9px]"
              >
                {percent}%
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const selected = point.date === selectedDate;
          const hasVariance =
            point.missed + point.workedOnOff + point.unscheduledPresent > 0;

          const sequenceDelay = `${(index * barDelay).toFixed(2)}s`;
          const actualDelay = `${(index * barDelay + actualOffset).toFixed(2)}s`;
          const pointDelay = `${(rateStart + index * 0.045).toFixed(2)}s`;
          const varianceDelay = `${(rateStart + index * 0.04 + 0.08).toFixed(2)}s`;

          return (
            <g
              key={`bar-${point.date}`}
              onClick={() => onSelectDate(point.date)}
              className="cursor-pointer"
            >
              {selected && (
                <rect
                  x={point.x - step / 2}
                  y={top}
                  width={step}
                  height={chartHeight}
                  rx="8"
                  className="fill-cyan-500/5"
                />
              )}

              {hasVariance && !selected && (
                <circle
                  cx={point.x}
                  cy={top - 11}
                  r="3"
                  className="fill-rose-400 variance-dot-reveal variance-dot-pulse"
                  style={{ animationDelay: varianceDelay }}
                />
              )}

              <rect
                x={point.x - barWidth - 2}
                y={point.scheduledY}
                width={barWidth}
                height={top + chartHeight - point.scheduledY}
                rx="3"
                className="fill-slate-400 schedule-bar-grow"
                style={{ animationDelay: sequenceDelay }}
              />

              <rect
                x={point.x + 2}
                y={point.actualY}
                width={barWidth}
                height={top + chartHeight - point.actualY}
                rx="3"
                className="fill-cyan-400 actual-bar-grow"
                style={{ animationDelay: actualDelay }}
              />

              {(data.length <= 15 || Number(point.day) % 4 === 1 || point.day === data.length) && (
                <text
                  x={point.x}
                  y={height - 18}
                  textAnchor="middle"
                  className={
                    selected
                      ? "fill-cyan-400 text-[9px]"
                      : "fill-text-dim text-[9px]"
                  }
                >
                  {String(point.day).padStart(2, "0")}
                </text>
              )}
            </g>
          );
        })}

        <path
          d={ratePath}
          fill="none"
          className="stroke-emerald-400 attendance-line-draw"
          style={{ animationDelay: `${rateStart.toFixed(2)}s` }}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const selected = point.date === selectedDate;
          const pointDelay = `${(rateStart + index * 0.045 + 0.08).toFixed(2)}s`;

          return (
            <g
              key={`rate-${point.date}`}
              onClick={() => onSelectDate(point.date)}
              className="cursor-pointer"
            >
              <circle
                cx={point.x}
                cy={point.rateY}
                r={selected ? 6 : 4}
                className="fill-emerald-400 stroke-surface attendance-point-reveal"
                style={{ animationDelay: pointDelay }}
                strokeWidth="2"
              />

              {(selected || point.rate < 100 || data.length <= 10) && (
                <text
                  x={point.x}
                  y={point.rateY - 9}
                  textAnchor="middle"
                  className="fill-emerald-400 text-[8px] font-semibold"
                >
                  {point.rate.toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-5 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-slate-400" />
          {language === "cn" ? "应出勤" : "Scheduled"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-cyan-400" />
          {language === "cn" ? "实际出勤" : "Actual"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-emerald-400" />
          {language === "cn" ? "出勤率" : "Attendance Rate"}
        </span>
        <span className="text-text-dim">
          {language === "cn"
            ? "红点 = 存在排班偏差"
            : "Red dot = schedule variance"}
        </span>
      </div>
    </div>
  );
}

function SimpleDonut({
  values,
  centerLabel,
}: {
  values: { label: string; value: number; className: string }[];
  centerLabel: string;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="relative size-[clamp(9rem,15vw,13rem)] shrink-0">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" className="stroke-bg" strokeWidth="18" />
        {values.map((item, index) => {
          const percentage = total > 0 ? item.value / total : 0;
          const dash = percentage * circumference;
          const offset = -accumulated * circumference;
          accumulated += percentage;
          return (
            <circle
              key={item.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              className={item.className}
              strokeWidth="18"
              strokeDasharray={`${Math.max(dash - 2, 0)} ${circumference}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text">{centerLabel}</span>
        <span className="mt-1 text-[9px] text-text-dim">{total}</span>
      </div>
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
   EMPLOYEE LEAVE BY PERSON
========================================================= */

function EmployeeLeaveChart({
  data,
  language,
}: {
  data: EmployeeLeaveSummary[];
  language: OrganizationLanguage;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
        {language === "cn"
          ? "本月没有已批准的请假记录"
          : "No approved leave records this month"}
      </div>
    );
  }

  const maxTotal = Math.max(
    ...data.map((item) => item.total),
    1,
  );

  // Compact chart: keep the whole visualization visible without a vertical scroll area.
  const chartHeight = 185;
  const barMaxHeight = 125;
  // Small totals can round to the same value (for example, 1, 1, 1, 0).
  // Keep only distinct grid lines so React keys and chart labels stay stable.
  const yTicks = [
    ...new Set(
      Array.from(
        { length: 4 },
        (_, index) => Math.ceil((maxTotal * (3 - index)) / 3),
      ),
    ),
  ];

  return (
    <div className="rounded-lg border border-border-subtle bg-bg/20 px-3 pb-3 pt-2.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {language === "cn" ? "员工请假" : "Leave by Employee"}
        </p>
        <p className="mt-0.5 text-[8px] text-text-dim">
          {language === "cn"
            ? "仅显示本月有已批准请假的员工"
            : "Only employees with approved leave are shown"}
        </p>
      </div>

      <div
        className="relative mt-1.5 w-full"
        style={{ height: `${chartHeight}px` }}
      >
        {yTicks.map((tick) => {
          const top =
            maxTotal > 0
              ? ((maxTotal - tick) / maxTotal) * barMaxHeight + 10
              : 10;

          return (
            <div
              key={tick}
              className="pointer-events-none absolute left-8 right-1 flex items-center"
              style={{ top: `${top}px` }}
            >
              <span className="absolute -left-7 -translate-y-1/2 text-[8px] text-text-dim">
                {tick}
              </span>
              <div className="h-px flex-1 bg-border-subtle/70" />
            </div>
          );
        })}

        <div
          className="absolute inset-x-0 bottom-0 top-2 grid items-end gap-1 px-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {data.map((item) => {
            const totalHeight =
              maxTotal > 0
                ? Math.max(
                    (item.total / maxTotal) * barMaxHeight,
                    item.total > 0 ? 6 : 0,
                  )
                : 0;

            const alHeight =
              item.total > 0
                ? (item.al / item.total) * totalHeight
                : 0;
            const mcHeight =
              item.total > 0
                ? (item.mc / item.total) * totalHeight
                : 0;
            const uplHeight =
              item.total > 0
                ? (item.upl / item.total) * totalHeight
                : 0;
            const alpaHeight =
              item.total > 0
                ? (item.alpa / item.total) * totalHeight
                : 0;

            return (
              <div
                key={item.employee.employee_no}
                className="flex min-w-0 h-full flex-col items-center justify-end"
              >
                <div className="mb-1 text-[10px] font-extrabold text-text">
                  {item.total}
                </div>

                <div
                  className="flex w-8 max-w-[2rem] flex-col justify-end overflow-hidden rounded-t-md bg-bg/50 ring-1 ring-inset ring-border-subtle"
                  style={{ height: `${totalHeight}px` }}
                  title={`${employeeName(item.employee, language)} — ${item.total} approved leave`}
                >
                  {item.alpa > 0 ? (
                    <div
                      className="w-full bg-fuchsia-500 transition-all duration-300"
                      style={{ height: `${alpaHeight}px` }}
                      title={`ALPA: ${item.alpa}`}
                    />
                  ) : null}

                  {item.upl > 0 ? (
                    <div
                      className="w-full bg-amber-500 transition-all duration-300"
                      style={{ height: `${uplHeight}px` }}
                      title={`UPL: ${item.upl}`}
                    />
                  ) : null}

                  {item.mc > 0 ? (
                    <div
                      className="w-full bg-rose-500 transition-all duration-300"
                      style={{ height: `${mcHeight}px` }}
                      title={`MC: ${item.mc}`}
                    />
                  ) : null}

                  {item.al > 0 ? (
                    <div
                      className="w-full bg-blue-500 transition-all duration-300"
                      style={{ height: `${alHeight}px` }}
                      title={`AL: ${item.al}`}
                    />
                  ) : null}
                </div>

                <div className="mt-1.5 w-full min-w-0 text-center">
                  <p className="truncate text-[8px] font-semibold text-text">
                    {employeeName(item.employee, language)}
                  </p>
                  <p className="mt-0.5 truncate text-[7px] text-text-dim">
                    {item.employee.employee_no}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[8px]">
        <span className="flex items-center gap-1 font-semibold text-blue-400">
          <span className="size-2 rounded-full bg-blue-500" />
          {language === "cn" ? "年假" : "AL"}
        </span>
        <span className="flex items-center gap-1 font-semibold text-rose-400">
          <span className="size-2 rounded-full bg-rose-500" />
          {language === "cn" ? "病假" : "MC"}
        </span>
        <span className="flex items-center gap-1 font-semibold text-amber-400">
          <span className="size-2 rounded-full bg-amber-500" />
          {language === "cn" ? "请假 / 外出" : "UPL"}
        </span>
        <span className="flex items-center gap-1 font-semibold text-fuchsia-400">
          <span className="size-2 rounded-full bg-fuchsia-500" />
          {language === "cn" ? "旷工" : "ALPA"}
        </span>
      </div>
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

                <div
                  className="mt-2 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/90 ring-1 ring-inset ring-black/5 dark:ring-white/5"
                >
                  {item.present > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.35)] transition-all duration-500"
                      style={{ width: segmentWidth(item.present) }}
                      title={`Present: ${item.present}`}
                    />
                  )}

                  {item.leave > 0 && (
                    <div
                      className="h-full border-l border-white/20 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.30)] transition-all duration-500"
                      style={{ width: segmentWidth(item.leave) }}
                      title={`AL: ${item.leave}`}
                    />
                  )}

                  {item.mc > 0 && (
                    <div
                      className="h-full border-l border-white/20 bg-gradient-to-r from-fuchsia-400 via-purple-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.30)] transition-all duration-500"
                      style={{ width: segmentWidth(item.mc) }}
                      title={`MC: ${item.mc}`}
                    />
                  )}

                  {item.upl > 0 && (
                    <div
                      className="h-full border-l border-white/20 bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.35)] transition-all duration-500"
                      style={{ width: segmentWidth(item.upl) }}
                      title={`UPL: ${item.upl}`}
                    />
                  )}

                  {item.absent > 0 && (
                    <div
                      className="h-full border-l border-white/20 bg-gradient-to-r from-red-400 via-rose-500 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.35)] transition-all duration-500"
                      style={{ width: segmentWidth(item.absent) }}
                      title={`Absent: ${item.absent}`}
                    />
                  )}

                  {item.off > 0 && (
                    <div
                      className="h-full border-l border-white/20 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 transition-all duration-500"
                      style={{ width: segmentWidth(item.off) }}
                      title={`OFF: ${item.off}`}
                    />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] font-semibold">
                  <span className="text-emerald-400">
                    {language === "cn" ? "出勤" : "P"} {item.present}
                  </span>
                  <span className="text-blue-400">
                    {language === "cn" ? "AL · 年假" : "AL"} {item.leave}
                  </span>
                  <span className="text-purple-400">
                    {language === "cn" ? "MC · 病假" : "MC"} {item.mc}
                  </span>
                  <span className="text-orange-400">
                    {language === "cn" ? "UPL · 请假 / 外出" : "UPL"} {item.upl}
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
              "cursor-pointer rounded-md border px-1.5 py-2 text-center transition-all duration-200",
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
  const { isGuest } = useRoleAccess();

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

  const [showAllScheduleVariance, setShowAllScheduleVariance] = useState(true);
  const [showScheduleVarianceZoom, setShowScheduleVarianceZoom] = useState(false);
  const [showAllMismatchEmployees, setShowAllMismatchEmployees] = useState(false);
  const [showAllRecentRequests, setShowAllRecentRequests] = useState(false);

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
        if (!isGuest) {
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

                if (handleGuestForbiddenResponse(syncResponse.status, syncPayload, "POST")) {
                  return;
                }

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
        }
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
     SCHEDULE COMPARISON
  ======================================================= */

  const todayKey = dateKey(startOfDay(new Date()));

  const dailyScheduleComparison = useMemo<DailyScheduleComparison[]>(() => {
    return monthDays.map((dayInfo) => {
      let scheduled = 0;
      let actual = 0;
      let leave = 0;
      let missed = 0;
      let workedOnOff = 0;
      let unscheduledPresent = 0;

      const exceptions: ScheduleException[] = [];
      const isFuture = dayInfo.dateKey > todayKey;

      for (const employee of employees) {
        const key = `${employee.employee_no}|${dayInfo.dateKey}`;
        const schedule = scheduleMap.get(key);
        const attendance = attendanceMap.get(key);
        const scheduleType = schedule?.schedule_type ?? null;
        const value = attendance?.attendance_value;

        if (isWorkScheduleType(scheduleType)) {
          scheduled++;

          if (isFuture) continue;

          if (!attendance) {
            missed++;
            exceptions.push({
              employee,
              date: dayInfo.dateKey,
              scheduleType,
              attendanceValue: null,
              status: "MISSED",
            });
            continue;
          }

          if (isPresent(value)) {
            actual++;
            continue;
          }

          if (isLeaveAttendanceValue(value)) {
            leave++;
            exceptions.push({
              employee,
              date: dayInfo.dateKey,
              scheduleType,
              attendanceValue: value ?? null,
              status: "LEAVE",
            });
            continue;
          }

          missed++;
          exceptions.push({
            employee,
            date: dayInfo.dateKey,
            scheduleType,
            attendanceValue: value ?? null,
            status: "MISSED",
          });
          continue;
        }

        if (scheduleType === "OFF") {
          if (!isFuture && isPresent(value)) {
            workedOnOff++;
            exceptions.push({
              employee,
              date: dayInfo.dateKey,
              scheduleType,
              attendanceValue: value ?? null,
              status: "WORKED_ON_OFF",
            });
          }
          continue;
        }

        if (!isFuture && isPresent(value)) {
          unscheduledPresent++;
          exceptions.push({
            employee,
            date: dayInfo.dateKey,
            scheduleType: null,
            attendanceValue: value,
            status: "UNSCHEDULED_PRESENT",
          });
        }
      }

      return {
        date: dayInfo.dateKey,
        day: dayInfo.day,
        weekday: dayInfo.weekday,
        scheduled,
        actual,
        rate: scheduled > 0 ? Math.min(100, (actual / scheduled) * 100) : 0,
        leave,
        missed,
        workedOnOff,
        unscheduledPresent,
        exceptions,
      };
    });
  }, [monthDays, employees, attendanceMap, scheduleMap, todayKey]);

  /* =======================================================
     SELECTED DATE
  ======================================================= */

  const currentDateKey =
    dateKey(
      startOfDay(
        selectedDate,
      ),
    );

  const selectedScheduleDay =
    dailyScheduleComparison.find((item) => item.date === currentDateKey) ?? null;

  const scheduleMonthlySummary = useMemo(() => {
    let scheduled = 0;
    let actual = 0;
    let leave = 0;
    let missed = 0;
    let workedOnOff = 0;
    let unscheduledPresent = 0;

    for (const day of dailyScheduleComparison) {
      scheduled += day.scheduled;
      actual += day.actual;
      leave += day.leave;
      missed += day.missed;
      workedOnOff += day.workedOnOff;
      unscheduledPresent += day.unscheduledPresent;
    }

    return {
      scheduled,
      actual,
      leave,
      missed,
      workedOnOff,
      unscheduledPresent,
      rate: scheduled > 0 ? (actual / scheduled) * 100 : 0,
      variance: missed + workedOnOff + unscheduledPresent,
    };
  }, [dailyScheduleComparison]);

  const allScheduleVarianceExceptions = useMemo(() => {
    return dailyScheduleComparison
      .filter((day) => day.exceptions.some((item) => item.status !== "LEAVE"))
      .flatMap((day) =>
        day.exceptions
          .filter((item) => item.status !== "LEAVE")
          .map((item) => ({
            ...item,
            day: day.day,
            weekday: day.weekday,
          })),
      );
  }, [dailyScheduleComparison]);

  const employeeScheduleSummary = useMemo(() => {
    const map = new Map<string, {
      employee: Employee;
      scheduled: number;
      actual: number;
      leave: number;
      mismatch: number;
    }>();

    for (const day of dailyScheduleComparison) {
      for (const employee of employees) {
        const key = `${employee.employee_no}|${day.date}`;
        const schedule = scheduleMap.get(key)?.schedule_type ?? null;
        const attendance = attendanceMap.get(key)?.attendance_value;
        const current = map.get(employee.employee_no) ?? {
          employee,
          scheduled: 0,
          actual: 0,
          leave: 0,
          mismatch: 0,
        };

        if (isWorkScheduleType(schedule)) {
          current.scheduled++;
          if (day.date > todayKey) continue;

          if (isPresent(attendance)) current.actual++;
          else if (isLeaveAttendanceValue(attendance)) current.leave++;
          else current.mismatch++;
        } else if (
          schedule === "OFF" &&
          day.date <= todayKey &&
          isPresent(attendance)
        ) {
          current.mismatch++;
        } else if (
          !schedule &&
          day.date <= todayKey &&
          isPresent(attendance)
        ) {
          current.mismatch++;
        }

        map.set(employee.employee_no, current);
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        rate: item.scheduled > 0 ? (item.actual / item.scheduled) * 100 : 100,
      }))
      .filter((item) => item.scheduled > 0 || item.mismatch > 0)
      .sort((a, b) => b.mismatch - a.mismatch || a.rate - b.rate);
  }, [dailyScheduleComparison, employees, scheduleMap, attendanceMap, todayKey]);

  const mismatchEmployees = useMemo(
    () => employeeScheduleSummary.filter((item) => item.mismatch > 0),
    [employeeScheduleSummary],
  );

  const departmentScheduleSummary = useMemo(() => {
    const map = new Map<string, {
      department: string;
      scheduled: number;
      actual: number;
      mismatch: number;
    }>();

    for (const employee of employees) {
      const department = departmentName(employee, language);
      const current = map.get(department) ?? {
        department,
        scheduled: 0,
        actual: 0,
        mismatch: 0,
      };

      for (const day of dailyScheduleComparison) {
        const key = `${employee.employee_no}|${day.date}`;
        const schedule = scheduleMap.get(key)?.schedule_type ?? null;
        const attendance = attendanceMap.get(key)?.attendance_value;
        if (isWorkScheduleType(schedule)) {
          current.scheduled++;
          if (day.date <= todayKey) {
            if (isPresent(attendance)) current.actual++;
            else if (!isLeaveAttendanceValue(attendance)) current.mismatch++;
          }
        } else if (
          day.date <= todayKey &&
          ((schedule === "OFF" || !schedule) && isPresent(attendance))
        ) {
          current.mismatch++;
        }
      }

      map.set(department, current);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        rate: item.scheduled > 0 ? (item.actual / item.scheduled) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [employees, dailyScheduleComparison, scheduleMap, attendanceMap, language, todayKey]);

  const shiftHealthSummary = useMemo(() => {
    const groups: Record<string, { label: string; scheduled: number; actual: number }> = {
      day: { label: language === "cn" ? "白班" : "Day Shift", scheduled: 0, actual: 0 },
      night: { label: language === "cn" ? "夜班" : "Night Shift", scheduled: 0, actual: 0 },
      four: { label: language === "cn" ? "4小时" : "4 Hours", scheduled: 0, actual: 0 },
      eight: { label: language === "cn" ? "8小时" : "8 Hours", scheduled: 0, actual: 0 },
    };

    for (const employee of employees) {
      for (const day of dailyScheduleComparison) {
        const schedule = scheduleMap.get(`${employee.employee_no}|${day.date}`)?.schedule_type ?? null;
        const attendance = attendanceMap.get(`${employee.employee_no}|${day.date}`)?.attendance_value;
        if (!isWorkScheduleType(schedule)) continue;
        const target =
          schedule === "D" || schedule === "D/S" ? groups.day :
          schedule === "N" || schedule === "N/S" ? groups.night :
          schedule === "4" ? groups.four : groups.eight;
        target.scheduled++;
        if (day.date <= todayKey && isPresent(attendance)) target.actual++;
      }
    }

    return Object.values(groups).map((item) => ({
      ...item,
      rate: item.scheduled > 0 ? (item.actual / item.scheduled) * 100 : 0,
    }));
  }, [employees, dailyScheduleComparison, scheduleMap, attendanceMap, language, todayKey]);

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

          const approvedLeave = leaveRows.find(
            (row) =>
              row.status === "Approved" &&
              row.employee_no === employee.employee_no &&
              String(row.request_date).slice(0, 10) ===
                dayInfo.dateKey &&
              (row.request_type === "AL" ||
                row.request_type === "MC" ||
                row.request_type === "UPL"),
          );

          // Approved leave requests are the source of truth for AL / MC / UPL.
          // Count them even when attendance_daily has no row for the employee.
          if (approvedLeave) {
            if (approvedLeave.request_type === "AL") {
              leave++;
            } else if (approvedLeave.request_type === "MC") {
              mc++;
            } else if (approvedLeave.request_type === "UPL") {
              upl++;
            }

            // Do not let an attendance_daily leave value duplicate the request count.
            if (
              attendance?.attendance_value === "AL" ||
              attendance?.attendance_value === "MC" ||
              attendance?.attendance_value === "UPL"
            ) {
              continue;
            }
          }

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
    leaveRows,
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
     APPROVED LEAVE REQUEST SUMMARY
     Keep KPI / leave-request totals consistent with
     "Recent Requests" by using approved leaveRows.
  ======================================================= */

  const approvedLeaveRequestStats = useMemo(() => {
    const approved = leaveRows.filter(
      (row) => row.status === "Approved",
    );

    return {
      al: approved.filter(
        (row) => row.request_type === "AL",
      ).length,
      mc: approved.filter(
        (row) => row.request_type === "MC",
      ).length,
      upl: approved.filter(
        (row) => row.request_type === "UPL",
      ).length,
    };
  }, [leaveRows]);

  /* =======================================================
     APPROVED LEAVE COUNTS BY EMPLOYEE
     Used by department summary so AL / MC / UPL are sourced
     from the same approved leave requests as the KPI cards.
  ======================================================= */

  const approvedLeaveByEmployee = useMemo(() => {
    const map = new Map<
      string,
      {
        al: number;
        mc: number;
        upl: number;
      }
    >();

    for (const row of leaveRows) {
      if (row.status !== "Approved") continue;

      const current = map.get(row.employee_no) ?? {
        al: 0,
        mc: 0,
        upl: 0,
      };

      if (row.request_type === "AL") current.al++;
      else if (row.request_type === "MC") current.mc++;
      else if (row.request_type === "UPL") current.upl++;

      map.set(row.employee_no, current);
    }

    return map;
  }, [leaveRows]);

  const employeeLeaveSummary = useMemo<EmployeeLeaveSummary[]>(() => {
    const map = new Map<string, EmployeeLeaveSummary>();

    for (const row of leaveRows) {
      if (row.status !== "Approved") continue;
      if (
        row.request_type !== "AL" &&
        row.request_type !== "MC" &&
        row.request_type !== "UPL" &&
        row.request_type !== "ALPA"
      ) {
        continue;
      }

      const employee = employeeMap.get(row.employee_no);
      if (!employee) continue;

      const current =
        map.get(row.employee_no) ?? {
          employee,
          al: 0,
          mc: 0,
          upl: 0,
          alpa: 0,
          total: 0,
        };

      if (row.request_type === "AL") current.al++;
      else if (row.request_type === "MC") current.mc++;
      else if (row.request_type === "UPL") current.upl++;
      else if (row.request_type === "ALPA") current.alpa++;

      current.total =
        current.al + current.mc + current.upl + current.alpa;

      map.set(row.employee_no, current);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.total - a.total ||
        employeeName(a.employee, language).localeCompare(
          employeeName(b.employee, language),
        ),
    );
  }, [leaveRows, employeeMap, language]);

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

        const approvedLeave =
          approvedLeaveByEmployee.get(
            employee.employee_no,
          );

        current.leave += approvedLeave?.al ?? 0;
        current.mc += approvedLeave?.mc ?? 0;
        current.upl += approvedLeave?.upl ?? 0;

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
      approvedLeaveByEmployee,
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
        let absent = 0;
        let off = 0;

        /*
         * AL / MC / UPL must come from approved leave requests.
         * This is the source of truth for leave and also fixes cases
         * where attendance_daily has no AL/MC/UPL row.
         */
        const approvedLeave =
          approvedLeaveByEmployee.get(
            employee.employee_no,
          );

        const leave = approvedLeave?.al ?? 0;
        const mc = approvedLeave?.mc ?? 0;
        const upl = approvedLeave?.upl ?? 0;

        /*
         * Present / A / OFF continue to come from attendance_daily.
         * AL / MC / UPL are intentionally not counted here to avoid
         * double-counting leave that is already taken from leaveRows.
         */
        for (const day of monthDays) {
          const attendance = attendanceMap.get(
            `${employee.employee_no}|${day.dateKey}`,
          );

          if (!attendance) continue;

          const value = attendance.attendance_value;

          if (isPresent(value)) {
            present++;
          } else if (value === "A") {
            absent++;
          } else if (value === "OFF") {
            off++;
          }
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
        const aRate =
          totalDays > 0
            ? a.present / totalDays
            : 0;
        const bRate =
          totalDays > 0
            ? b.present / totalDays
            : 0;

        return (
          aRate - bRate ||
          employeeName(
            a.employee,
            language,
          ).localeCompare(
            employeeName(
              b.employee,
              language,
            ),
          )
        );
      });
  }, [
    employees,
    monthDays,
    attendanceMap,
    approvedLeaveByEmployee,
    totalDays,
    language,
  ]);

  /* =======================================================
     RECENT REQUESTS
  ======================================================= */

  const allRecentRequests =
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
          ),
      [leaveRows],
    );

  const recentRequests = allRecentRequests.slice(0, 4);

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
    <OrganizationGate allow={(access) => access.canViewOrganizationOverview}>
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

        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-1.5.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-2xl font-black text-cyan-500 dark:text-cyan-300">
              ◫
            </div>

            <div>
              <div className="flex items-center gap-1.5">
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
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
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
              approvedLeaveRequestStats.al,
            )}
            subtitle={
                language === "cn"
                  ? "已批准申请 · AL"
                  : "Approved requests · AL"
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
              approvedLeaveRequestStats.mc,
            )}
            subtitle={
              language === "cn"
                ? "已批准申请 · MC"
                : "Approved requests · MC"
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
              approvedLeaveRequestStats.upl,
            )}
            subtitle={
              language === "cn"
                ? "已批准申请 · UPL"
                : "Approved requests · UPL"
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
            ATTENDANCE VS SCHEDULE DASHBOARD
        ================================================= */}
        <div className="grid items-stretch gap-5 xl:grid-cols-[1.55fr_0.75fr]">
          <section className="attendance-section h-full rounded-xl border border-border bg-surface p-4 md:p-5">
            <SectionHeader
              title={language === "cn" ? "每日出勤 vs 排班（排班达成走势）" : "Daily Attendance vs Schedule"}
              description={language === "cn" ? "灰柱=排班计划应出勤人数；蓝柱=实际到岗人数；绿线=当日出勤率。红点表示存在排班偏差。" : "Scheduled employees vs actual attendance by day. Red dots indicate schedule variance."}
            />

            <div className="mt-2.5">
              {loading ? (
                <div className="flex h-[330px] items-center justify-center text-xs text-text-muted">
                  {language === "cn" ? "加载中..." : "Loading..."}
                </div>
              ) : (
                <ScheduleVsActualChart
                  data={dailyScheduleComparison}
                  selectedDate={currentDateKey}
                  language={language}
                  onSelectDate={(date) => {
                    // Clicking any chart point always switches back to the
                    // selected-date variance view.
                    setSelectedDate(new Date(`${date}T00:00:00`));
                    setShowAllScheduleVariance(false);
                  }}
                />
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
              <LegendStat label={language === "cn" ? "计划工作日次" : "Scheduled Workdays"} value={scheduleMonthlySummary.scheduled} tone="info" />
              <LegendStat label={language === "cn" ? "实际出勤" : "Scheduled Actual"} value={scheduleMonthlySummary.actual} tone="success" />
              <LegendStat label={language === "cn" ? "月度出勤率" : "Monthly Rate"} value={Number(scheduleMonthlySummary.rate.toFixed(1))} tone="accent" />
              <LegendStat
                label={language === "cn" ? "排班偏差" : "Schedule Variance"}
                value={scheduleMonthlySummary.variance}
                tone="danger"
                onClick={() => setShowAllScheduleVariance((value) => !value)}
              />
            </div>
          </section>

          <section className="attendance-section flex h-full min-h-0 flex-col rounded-xl border border-border bg-surface p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 shrink-0">
              <SectionHeader
                title={language === "cn" ? "出勤排班差异" : "Attendance Variance"}
                description={language === "cn" ? "查看本月排班与实际出勤之间的主要差异原因。" : "Understand why scheduled and actual attendance differ this month."}
              />

              <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-1.5 text-right">
                <p className="text-[8px] uppercase tracking-wide text-text-dim">Rate</p>
                <p className="mt-0.5 text-sm font-extrabold text-cyan-300">
                  {scheduleMonthlySummary.rate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex min-h-0 flex-1 items-center gap-2.5 rounded-lg border border-border-subtle bg-bg/20 p-2.5">
              <div className="shrink-0">
                <SimpleDonut
                  centerLabel={`${scheduleMonthlySummary.rate.toFixed(1)}%`}
                  values={[
                    { label: "Match", value: scheduleMonthlySummary.actual, className: "stroke-emerald-500" },
                    { label: "Leave", value: scheduleMonthlySummary.leave, className: "stroke-amber-400" },
                    { label: "Missed", value: scheduleMonthlySummary.missed, className: "stroke-rose-500" },
                    { label: "OFF Work", value: scheduleMonthlySummary.workedOnOff, className: "stroke-orange-400" },
                    { label: "Unscheduled", value: scheduleMonthlySummary.unscheduledPresent, className: "stroke-violet-500" },
                  ]}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {[
                  { label: language === "cn" ? "正常出勤" : "Scheduled Present", value: scheduleMonthlySummary.actual, tone: "text-emerald-400", dot: "bg-emerald-400" },
                  { label: language === "cn" ? "请假" : "Leave", value: scheduleMonthlySummary.leave, tone: "text-amber-400", dot: "bg-amber-400" },
                  { label: language === "cn" ? "应到未到" : "Missed", value: scheduleMonthlySummary.missed, tone: "text-rose-400", dot: "bg-rose-400" },
                  { label: language === "cn" ? "休息日出勤" : "Worked on OFF", value: scheduleMonthlySummary.workedOnOff, tone: "text-orange-400", dot: "bg-orange-400" },
                  { label: language === "cn" ? "无排班出勤" : "Unscheduled", value: scheduleMonthlySummary.unscheduledPresent, tone: "text-violet-400", dot: "bg-violet-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`size-2 shrink-0 rounded-full ${item.dot}`} />
                      <span className={`truncate text-[10px] font-semibold ${item.tone}`}>{item.label}</span>
                    </div>
                    <span className="shrink-0 text-xs font-extrabold text-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-rose-400/15 bg-rose-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-rose-300">
                    {language === "cn" ? "需处理" : "Needs Attention"}
                  </span>
                  <span className="text-sm font-extrabold text-rose-400">
                    {scheduleMonthlySummary.missed}
                  </span>
                </div>
                <p className="mt-1 text-[8px] leading-4 text-text-dim">
                  {language === "cn" ? "排班工作日未出勤" : "Scheduled workdays without matching attendance."}
                </p>
              </div>

              <div className="rounded-lg border border-amber-400/15 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                    {language === "cn" ? "休息日出勤" : "OFF Work"}
                  </span>
                  <span className="text-sm font-extrabold text-amber-400">
                    {scheduleMonthlySummary.workedOnOff}
                  </span>
                </div>
                <p className="mt-1 text-[8px] leading-4 text-text-dim">
                  {language === "cn" ? "休息日仍有出勤记录" : "Employees recorded as present on OFF days."}
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-lg border border-cyan-400/10 bg-cyan-500/5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold text-cyan-300">
                    {language === "cn" ? "排班完成度" : "Schedule adherence"}
                  </p>
                  <p className="mt-0.5 text-[8px] text-text-dim">
                    {language === "cn" ? "实际出勤 / 应出勤" : "Actual attendance divided by scheduled attendance."}
                  </p>
                </div>
                <span className="text-base font-black text-text">
                  {scheduleMonthlySummary.actual} / {scheduleMonthlySummary.scheduled}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* =================================================
            SELECTED DATE SCHEDULE VARIANCE
        ================================================= */}
        <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-dim">{language === "cn" ? "排班偏差" : "Schedule Variance"}</p>
              <h2 className="mt-1 text-base font-semibold text-text">
                {showAllScheduleVariance
                  ? language === "cn"
                    ? `${monthLabel} · 全部排班偏差`
                    : `All Schedule Variances · ${monthLabel}`
                  : selectedDateLabel}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <KpiCard
                title={language === "cn" ? "应出勤" : "Scheduled"}
                value={String(showAllScheduleVariance ? scheduleMonthlySummary.scheduled : selectedScheduleDay?.scheduled ?? 0)}
                subtitle=""
                icon=""
                tone="info"
              />
              <KpiCard
                title={language === "cn" ? "实际" : "Actual"}
                value={String(showAllScheduleVariance ? scheduleMonthlySummary.actual : selectedScheduleDay?.actual ?? 0)}
                subtitle=""
                icon=""
                tone="success"
              />
              <KpiCard
                title={language === "cn" ? "差异" : "Variance"}
                value={String(showAllScheduleVariance
                  ? scheduleMonthlySummary.variance
                  : (selectedScheduleDay?.missed ?? 0) + (selectedScheduleDay?.workedOnOff ?? 0) + (selectedScheduleDay?.unscheduledPresent ?? 0))}
                subtitle=""
                icon=""
                tone="danger"
              />
            </div>
          </div>

          <div className="mt-5">
            {showAllScheduleVariance ? (
              allScheduleVarianceExceptions.length > 0 ? (
                <div className="space-y-3">
                  {allScheduleVarianceExceptions.slice(0, 2).map((item, index) => (
                    <button
                      key={`${item.date}-${item.employee.employee_no}-${item.status}-${index}`}
                      type="button"
                      onClick={() => setShowScheduleVarianceZoom(true)}
                      className="group flex w-full flex-col gap-3 rounded-lg border border-border-subtle bg-bg/20 p-3 text-left transition-all duration-200 hover:border-cyan-400/25 hover:bg-cyan-500/[0.03] hover:shadow-[0_8px_24px_rgba(8,47,73,0.08)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-500 dark:text-rose-300">
                            {String(item.day).padStart(2, "0")} {item.weekday}
                          </span>
                          <p className="truncate text-xs font-semibold text-text">
                            {employeeName(item.employee, language)}
                          </p>
                        </div>
                        <p className="mt-1 text-[9px] text-text-dim">
                          {item.date} · {item.employee.employee_no} · {departmentName(item.employee, language)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">
                          {scheduleLabel(item.scheduleType, language)}
                        </span>
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">
                          {item.attendanceValue
                            ? valueLabel(item.attendanceValue, language)
                            : language === "cn"
                              ? "无考勤"
                              : "No attendance"}
                        </span>
                        <span
                          className={[
                            "rounded-md px-2 py-1 font-semibold",
                            item.status === "WORKED_ON_OFF"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400",
                          ].join(" ")}
                        >
                          {item.status === "WORKED_ON_OFF"
                            ? language === "cn"
                              ? "休息日出勤"
                              : "Worked on OFF"
                            : item.status === "UNSCHEDULED_PRESENT"
                              ? language === "cn"
                                ? "无排班出勤"
                                : "Unscheduled Present"
                              : language === "cn"
                                ? "应到未到"
                                : "Missed"}
                        </span>
                      </div>
                    </button>
                  ))}

                  {allScheduleVarianceExceptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowScheduleVarianceZoom(true)}
                      className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-rose-400/25 bg-rose-500/5 px-3 py-2.5 text-left transition-all duration-200 hover:border-rose-400/50 hover:bg-rose-500/10"
                    >
                      <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-300">
                        {language === "cn"
                          ? `点击查看全部 ${allScheduleVarianceExceptions.length} 条偏差`
                          : `View all ${allScheduleVarianceExceptions.length} schedule variances`}
                      </span>
                      <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-500 dark:text-rose-300 transition-transform duration-200 group-hover:scale-105">
                        ↗
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-400">
                  {language === "cn" ? "本月没有排班偏差。" : "No schedule variance found for this month."}
                </div>
              )
            ) : selectedScheduleDay && selectedScheduleDay.exceptions.filter((item) => item.status !== "LEAVE").length > 0 ? (
              <div className="space-y-2">
                {selectedScheduleDay.exceptions
                  .filter((item) => item.status !== "LEAVE")
                  .map((item, index) => (
                    <div key={`${item.employee.employee_no}-${item.status}-${index}`} className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg/20 p-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-text">{employeeName(item.employee, language)}</p>
                        <p className="mt-0.5 text-[9px] text-text-dim">{item.employee.employee_no} · {departmentName(item.employee, language)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">{scheduleLabel(item.scheduleType, language)}</span>
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">{item.attendanceValue ? valueLabel(item.attendanceValue, language) : (language === "cn" ? "无考勤" : "No attendance")}</span>
                        <span className={[
                          "rounded-md px-2 py-1 font-semibold",
                          item.status === "WORKED_ON_OFF" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400",
                        ].join(" ")}>{item.status === "WORKED_ON_OFF" ? (language === "cn" ? "休息日出勤" : "Worked on OFF") : item.status === "UNSCHEDULED_PRESENT" ? (language === "cn" ? "无排班出勤" : "Unscheduled Present") : (language === "cn" ? "应到未到" : "Missed")}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-400">
                {selectedScheduleDay?.exceptions.some((item) => item.status === "LEAVE")
                  ? language === "cn" ? "没有实际缺勤偏差；当天差异来自已记录的请假。" : "No attendance mismatch; the variance is explained by recorded leave."
                  : language === "cn" ? "当天没有排班偏差。" : "No schedule variance found for this date."}
              </div>
            )}
          </div>
        </section>

        {showScheduleVarianceZoom && showAllScheduleVariance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm md:p-6">
            <div
              className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
              role="dialog"
              aria-modal="true"
              aria-label={language === "cn" ? "全部排班偏差" : "All Schedule Variances"}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-4 md:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-cyan-400/80">
                    {language === "cn" ? "排班偏差" : "Schedule Variance"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-text md:text-lg">
                      {language === "cn" ? "全部排班偏差" : "All Schedule Variances"}
                    </h3>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                      {allScheduleVarianceExceptions.length}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScheduleVarianceZoom(false)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg/40 text-text-muted transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label={language === "cn" ? "关闭" : "Close"}
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-3 md:p-5">
                <div className="space-y-3">
                  {allScheduleVarianceExceptions.map((item, index) => (
                    <div
                      key={`zoom-${item.date}-${item.employee.employee_no}-${item.status}-${index}`}
                      className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg/20 p-3 transition-colors duration-200 hover:border-cyan-400/15 hover:bg-surface-hover md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-500 dark:text-rose-300">
                            {String(item.day).padStart(2, "0")} {item.weekday}
                          </span>
                          <p className="truncate text-xs font-semibold text-text">
                            {employeeName(item.employee, language)}
                          </p>
                        </div>
                        <p className="mt-1 text-[9px] text-text-dim">
                          {item.date} · {item.employee.employee_no} · {departmentName(item.employee, language)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">
                          {scheduleLabel(item.scheduleType, language)}
                        </span>
                        <span className="rounded-md bg-bg px-2 py-1 text-text-muted">
                          {item.attendanceValue
                            ? valueLabel(item.attendanceValue, language)
                            : language === "cn"
                              ? "无考勤"
                              : "No attendance"}
                        </span>
                        <span
                          className={[
                            "rounded-md px-2 py-1 font-semibold",
                            item.status === "WORKED_ON_OFF"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400",
                          ].join(" ")}
                        >
                          {item.status === "WORKED_ON_OFF"
                            ? language === "cn"
                              ? "休息日出勤"
                              : "Worked on OFF"
                            : item.status === "UNSCHEDULED_PRESENT"
                              ? language === "cn"
                                ? "无排班出勤"
                                : "Unscheduled Present"
                              : language === "cn"
                                ? "应到未到"
                                : "Missed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


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
              <div className="grid gap-2.5 md:grid-cols-[1.6fr_1fr]">
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

                          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
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

                          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
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
          <div className="mt-2.5">
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
          <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3 text-[9px] text-text-dim">
            <span className="font-semibold text-text-muted">
              {language === "cn" ? "图例" : "Legend"}
            </span>
            <span className="text-emerald-400">
              {language === "cn" ? "出勤" : "P / Present"}
            </span>
            <span className="text-blue-400">
              {language === "cn" ? "AL · 年假" : "AL"}
            </span>
            <span className="text-violet-400">
              {language === "cn" ? "MC · 病假" : "MC"}
            </span>
            <span className="text-indigo-400">
              {language === "cn" ? "UPL · 请假 / 外出" : "UPL"}
            </span>
            <span className="text-rose-400">
              {language === "cn" ? "缺勤" : "A"}
            </span>
            <span className="text-slate-400">
              {language === "cn" ? "休息" : "OFF"}
            </span>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">

          {/* =========================================================
              DEPARTMENT PLANNED VS ACTUAL
          ========================================================= */}
          <section className="attendance-section overflow-hidden rounded-xl border border-border bg-surface p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeader
                title={
                  language === "cn"
                    ? "班组维度比较（应出勤 vs 实际出勤）"
                    : "Department Planned vs Actual"
                }
                description={
                  language === "cn"
                    ? "按部门比较排班计划与实际出勤，并显示排班偏差数量。"
                    : "Compare scheduled headcount with actual attendance by department."
                }
              />

              <div className="hidden shrink-0 rounded-lg border border-border-subtle bg-bg/40 px-2.5 py-1.5 text-right sm:block">
                <p className="text-[8px] uppercase tracking-wide text-text-dim">
                  {language === "cn" ? "部门" : "Departments"}
                </p>
                <p className="text-sm font-black text-text">
                  {departmentScheduleSummary.length}
                </p>
              </div>
            </div>

            <div className="grid gap-2.5">
              {departmentScheduleSummary.map((item, index) => {
                const rate = Math.min(item.rate, 100);
                const isPerfect = rate >= 100;
                const hasVariance = item.mismatch > 0;
                const rank = String(index + 1).padStart(2, "0");

                return (
                  <div
                    key={item.department}
                    className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg/25 p-3 transition-all duration-200 hover:-translate-y-px hover:border-cyan-400/25 hover:bg-bg/40"
                  >
                    <div
                      className={[
                        "absolute inset-y-0 left-0 w-1",
                        hasVariance ? "bg-amber-400" : "bg-emerald-400",
                      ].join(" ")}
                    />

                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-[9px] font-black text-text-dim ring-1 ring-inset ring-border-subtle">
                        {rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[11px] font-bold text-text">
                            {item.department}
                          </p>

                          <span
                            className={[
                              "shrink-0 text-sm font-black",
                              isPerfect
                                ? "text-emerald-400"
                                : rate >= 90
                                  ? "text-cyan-400"
                                  : "text-amber-400",
                            ].join(" ")}
                          >
                            {rate.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 text-[8px] text-text-dim">
                          <span className="font-semibold text-text-muted">
                            {item.actual}/{item.scheduled}
                          </span>
                          <span>
                            {language === "cn" ? "实际 / 计划" : "Actual / Scheduled"}
                          </span>

                          <span className="ml-auto">
                            {hasVariance
                              ? `${language === "cn" ? "偏差" : "Variance"} ${item.mismatch}`
                              : language === "cn"
                                ? "完全匹配"
                                : "Perfect match"}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                            <div
                              className={[
                                "h-full rounded-full transition-all duration-700",
                                isPerfect
                                  ? "bg-emerald-400"
                                  : rate >= 90
                                    ? "bg-cyan-400"
                                    : rate >= 70
                                      ? "bg-amber-400"
                                      : "bg-rose-400",
                              ].join(" ")}
                              style={{ width: `${rate}%` }}
                            />
                          </div>

                          <span
                            className={[
                              "rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide",
                              hasVariance
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-400",
                            ].join(" ")}
                          >
                            {hasVariance ? "Gap" : "Match"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {departmentScheduleSummary.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
                  {language === "cn" ? "暂无数据" : "No department data"}
                </div>
              )}
            </div>

            {/* SIMPLE DEPARTMENT SUMMARY */}
            {departmentScheduleSummary.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-4 rounded-lg border border-border-subtle bg-bg/20 px-3 py-2 text-[9px]">
                <span className="text-text-dim">
                  {language === "cn" ? "计划" : "Scheduled"}
                  <span className="ml-1 font-bold text-violet-400">
                    {scheduleMonthlySummary.scheduled}
                  </span>
                </span>

                <span className="text-text-dim">
                  {language === "cn" ? "实际" : "Actual"}
                  <span className="ml-1 font-bold text-emerald-400">
                    {scheduleMonthlySummary.actual}
                  </span>
                </span>

                <span className="text-text-dim">
                  {language === "cn" ? "缺口" : "Gap"}
                  <span className="ml-1 font-bold text-rose-400">
                    {scheduleMonthlySummary.variance}
                  </span>
                </span>
              </div>
            )}
          </section>

          {/* =========================================================
              SHIFT HEALTH
          ========================================================= */}
          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeader
                title={
                  language === "cn"
                    ? "班次类型健康度"
                    : "Shift Health"
                }
                description={
                  language === "cn"
                    ? "按排班类型查看计划出勤与实际到岗。"
                    : "Planned vs actual attendance by schedule type."
                }
              />

              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold text-emerald-400">
                {shiftHealthSummary.length} {language === "cn" ? "班次" : "Shifts"}
              </span>
            </div>

            <div className="grid gap-2.5">
              {shiftHealthSummary.map((item) => {
                const rate = Math.min(item.rate, 100);
                const isPerfect = rate >= 100;
                const hasGap = item.actual < item.scheduled;
                const icon =
                  item.label === "Day Shift"
                    ? "☀"
                    : item.label === "Night Shift"
                      ? "☾"
                      : "◷";

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border-subtle bg-bg/25 p-3 transition-all duration-200 hover:border-cyan-400/20 hover:bg-bg/40"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-black",
                          isPerfect
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-cyan-500/10 text-cyan-400",
                        ].join(" ")}
                      >
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[10px] font-bold text-text">
                            {item.label}
                          </p>
                          <p
                            className={[
                              "text-sm font-black",
                              isPerfect
                                ? "text-emerald-400"
                                : rate >= 90
                                  ? "text-cyan-400"
                                  : "text-amber-400",
                            ].join(" ")}
                          >
                            {rate.toFixed(1)}%
                          </p>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[8px] text-text-dim">
                          <span>
                            {language === "cn" ? "计划" : "Scheduled"} {item.scheduled}
                            <span className="mx-1 text-text-dim/50">•</span>
                            {language === "cn" ? "实际" : "Actual"} {item.actual}
                          </span>

                          <span
                            className={
                              hasGap
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }
                          >
                            {hasGap
                              ? `${item.scheduled - item.actual} ${language === "cn" ? "差异" : "gap"}`
                              : "✓"}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                          <div
                            className={[
                              "h-full rounded-full transition-all duration-700",
                              isPerfect
                                ? "bg-emerald-400"
                                : rate >= 90
                                  ? "bg-cyan-400"
                                  : rate >= 70
                                    ? "bg-amber-400"
                                    : "bg-rose-400",
                            ].join(" ")}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {shiftHealthSummary.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
                  {language === "cn"
                    ? "暂无班次数据"
                    : "No shift data"}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <div>
              <SectionHeader
                title={language === "cn" ? "员工请假情况" : "Leave by Employee"}
                description={language === "cn" ? "只显示本月有已批准请假的员工。" : "Only employees with approved leave this month are shown."}
              />
            </div>

            <div className="mt-2.5">
              <EmployeeLeaveChart
                data={employeeLeaveSummary}
                language={language}
              />
            </div>
          </section>

          <section className="attendance-section rounded-xl border border-border bg-surface p-4 md:p-5">
            <div className="flex items-end justify-between gap-2.5">
              <SectionHeader
                title={language === "cn" ? "排班异常 · Top 人员" : "Top Schedule Mismatch Employees"}
                description={language === "cn" ? "优先显示本月最常发生排班偏差的员工。" : "Employees with the most schedule variance in the selected month."}
              />
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] text-text-dim">Top 5</span>
                {mismatchEmployees.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllMismatchEmployees(true)}
                    className="cursor-pointer rounded-md border border-cyan-400/20 bg-cyan-500/5 px-2 py-1 text-[9px] font-semibold text-cyan-400 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    {language === "cn" ? "查看全部" : "View all"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {mismatchEmployees.slice(0, 5).map((item) => {
                const maxMismatch = Math.max(...mismatchEmployees.map((x) => x.mismatch), 1);
                return (
                  <div key={item.employee.employee_no}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="truncate text-[10px] font-semibold text-text">{employeeName(item.employee, language)}</span>
                        <span className="ml-2 text-[8px] text-text-dim">{item.employee.employee_no}</span>
                      </div>
                      <span className="text-xs font-extrabold text-rose-400">{item.mismatch}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(item.mismatch / maxMismatch) * 100}%` }} />
                    </div>
                  </div>
                );
              })}

              {mismatchEmployees.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
                  {language === "cn" ? "暂无排班偏差" : "No schedule variance"}
                </div>
              )}
            </div>

            <div className="mt-2.5 border-t border-border-subtle pt-4">
              <p className="text-[9px] text-text-dim">
                {language === "cn" ? "点击上方日柱可查看当天具体员工的排班偏差。" : "Click a day in the chart above to inspect the employees behind that variance."}
              </p>
            </div>
          </section>
        </div>

        {showAllMismatchEmployees ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm md:p-6">
            <div
              className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
              role="dialog"
              aria-modal="true"
              aria-label={language === "cn" ? "全部排班异常员工" : "All Schedule Mismatch Employees"}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-4 md:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-cyan-400/80">
                    {language === "cn" ? "排班异常" : "Schedule Mismatch"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-text md:text-lg">
                      {language === "cn" ? "全部异常员工" : "All Mismatch Employees"}
                    </h3>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                      {mismatchEmployees.length}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllMismatchEmployees(false)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg/40 text-text-muted transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label={language === "cn" ? "关闭" : "Close"}
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-4 md:p-5">
                <div className="space-y-3">
                  {mismatchEmployees.map((item) => {
                    const maxMismatch = Math.max(
                      ...mismatchEmployees.map((employee) => employee.mismatch),
                      1,
                    );

                    return (
                      <div
                        key={`all-mismatch-${item.employee.employee_no}`}
                        className="rounded-lg border border-border-subtle bg-bg/20 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-text">
                              {employeeName(item.employee, language)}
                            </p>
                            <p className="mt-0.5 text-[9px] text-text-dim">
                              {item.employee.employee_no}
                            </p>
                          </div>
                          <span className="text-sm font-extrabold text-rose-400">
                            {item.mismatch}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${(item.mismatch / maxMismatch) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}


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
          <div className="flex items-start justify-between gap-4">
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

            {allRecentRequests.length > recentRequests.length ? (
              <button
                type="button"
                onClick={() => setShowAllRecentRequests(true)}
                className="cursor-pointer group mt-0.5 flex shrink-0 items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-400 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
              >
                <span>
                  {language === "cn"
                    ? `查看全部 ${allRecentRequests.length}`
                    : `View all (${allRecentRequests.length})`}
                </span>
                <span className="cursor-pointer transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            ) : null}
          </div>

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
                (request, index) => {
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
                      : leaveRequestLabel(
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
                  const typeStyle = requestTypeStyle(request.request_type);

                  return (
                    <div
                      key={`${request.id}-${request.employee_no}-${request.request_date}-${request.request_type}-${index}`}
                      className={`attendance-card rounded-lg border p-3 ${typeStyle.card}`}
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

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
                        <span className={`truncate rounded-md px-2 py-1 text-[9px] font-medium ${typeStyle.label}`}>
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

        {showAllRecentRequests ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm md:p-6">
            <div
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
              role="dialog"
              aria-modal="true"
              aria-label={language === "cn" ? "全部申请" : "All Requests"}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-4 md:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-cyan-400/80">
                    {language === "cn" ? "申请" : "Requests"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-text md:text-lg">
                      {language === "cn" ? "全部申请" : "All Requests"}
                    </h3>
                    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-400">
                      {allRecentRequests.length}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllRecentRequests(false)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg/40 text-text-muted transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label={language === "cn" ? "关闭" : "Close"}
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-3 md:p-5">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {allRecentRequests.map((request, index) => {
                    const employee = employeeMap.get(request.employee_no);
                    const label =
                      request.request_type === "ALPA"
                        ? language === "cn"
                          ? "旷工"
                          : "A"
                        : request.request_type === "OT"
                          ? language === "cn"
                            ? "加班"
                            : "Overtime"
                          : leaveRequestLabel(request.request_type, language);
                    const statusClass =
                      request.status === "Approved"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : request.status === "Rejected"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-amber-500/10 text-amber-300";
                    const typeStyle = requestTypeStyle(request.request_type);

                    return (
                      <div
                        key={`all-${request.id}-${request.employee_no}-${request.request_date}-${request.request_type}-${index}`}
                        className={`attendance-card rounded-lg border p-3 ${typeStyle.card}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-text">
                              {employeeName(employee, language)}
                            </p>
                            <p className="mt-0.5 text-[9px] text-text-dim">
                              {request.employee_no}
                            </p>
                          </div>
                          <span className={`rounded-md px-2 py-1 text-[9px] font-medium ${statusClass}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
                          <span className={`truncate rounded-md px-2 py-1 text-[9px] font-medium ${typeStyle.label}`}>
                            {label}
                          </span>
                          <span className="shrink-0 text-[9px] text-text-dim">
                            {String(request.request_date).slice(0, 10)}
                          </span>
                        </div>
                        {request.start_time && request.end_time ? (
                          <p className="mt-2 text-[9px] text-text-dim">
                            {String(request.start_time).slice(0, 5)} {"–"} {String(request.end_time).slice(0, 5)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

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

          <div className="mt-5 grid gap-2.5 md:grid-cols-4">
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
    </OrganizationGate>
  );
}
