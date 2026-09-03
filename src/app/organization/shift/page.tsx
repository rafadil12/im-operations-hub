"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OrganizationGate } from "@/components/organization/OrganizationGate";
import { handleGuestForbiddenResponse } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";

type ShiftCode = "D/S" | "N/S" | "1" | "4";

type ShiftMaster = {
  id: number;
  shift_code: ShiftCode;
  shift_name_en: string | null;
  shift_name_cn: string | null;
  start_time: string;
  end_time: string;
  shift_category: string;
  is_active: number | boolean;
};

type ScheduleType = "D" | "N" | "1" | "4" | "OFF";
type OrganizationLanguage = "en" | "cn";
type ActiveTab = "overview" | "master" | "rotation" | "schedule" | "calendar";

type OrganizationEmployee = {
  id: number;
  employee_no: string;
  manager_id: number | null;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  position_id: number | null;
  employment_status:
    | "Active"
    | "On Leave"
    | "Inactive"
    | "Resigned"
    | "Terminated"
    | null;
};

type OrganizationEmployeeResponse = {
  data: OrganizationEmployee[];
};

type ShiftAssignment = {
  shift: ShiftCode | null;
  excluded: boolean;
};

type AssignmentApiRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  shift_code: ShiftCode;
  is_excluded: number | boolean;
};

type RotationRule = {
  id: number;
  rule_name: string;
  rotation_type: string;
  effective_date: string;
  first_rotation_day: number;
  second_rotation_day: number;
  transition_off_days: number;
  is_active: number | boolean;
};

type RotationMemberApiRow = {
  id: number;
  rotation_rule_id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en?: string | null;
  name_cn?: string | null;
  pair_group: string;
  rotation_day: number | null;
  initial_shift: ShiftCode;
  rotation_order: number;
  is_active: number | boolean;
};

type OffDayApiRow = {
  id: number;
  employee_organization_id: number;
  employee_no: string;
  name_en?: string | null;
  name_cn?: string | null;
  off_date: string;
  is_fixed: number | boolean;
  created_by?: number | null;
  fixed_at?: string | null;
};

type PersonalOffDay = {
  id: string;
  employeeId: string;
  date: string;
  fixed: boolean;
  databaseId?: number;
};

type CalendarWorkSchedule = {
  id: string;
  employeeId: string;
  date: string;
  scheduleType: "1" | "4" | "OFF";
  databaseId?: number;
};

type RotationMember = {
  id: number;
  employeeId: string;
  userId: number;
  name: string;
  nameCn?: string;
  department: string;
  departmentCn?: string;
  shift: ShiftCode | null;
  excluded: boolean;
};

type ScheduleRow = {
  employeeId: string;
  name: string;
  nameCn?: string;
  department: string;
  departmentCn?: string;
  fixed?: boolean;
  schedule: ScheduleType[];
};

type RotationState = {
  shiftByEmployeeId: Record<string, ShiftCode>;
};

type PairSelection = {
  first: string;
  second: string;
};

const API_BASE = "/api/organization/shift-management";

const SHIFT_TEXT = {
  title: ["Shift Management", "班次管理"],
  overview: ["Overview", "概览"],
  shiftMaster: ["Shift Master", "班次主数据"],
  rotation: ["Rotation", "轮班规则"],
  schedule: ["Schedule", "排班"],
  dayShift: ["Day Shift", "白班"],
  nightShift: ["Night Shift", "夜班"],
  time: ["Time", "时间"],
  status: ["Status", "状态"],
  active: ["Active", "启用"],
  inactive: ["Inactive", "停用"],
  smartLogisticRotation: ["Smart Logistic Rotation", "智能物流轮班"],
  employees: ["Employees", "员工"],
  rotationType: ["Rotation Type", "轮班类型"],
  semiMonthly: ["Semi Monthly", "半月轮班"],
  changeDate: ["Change Date", "换班日期"],
  every15th16th: ["Every 15th / 16th", "每月15日 / 16日"],
  oneFromEachSide: [
    "1 employee from each shift changes per rotation",
    "每次轮班各有1名员工互换班次",
  ],
  transitionRule: ["Night → Day Transition", "夜班 → 白班过渡"],
  oneDayOff: ["1 Day OFF", "休息1天"],
  members: ["Members", "成员"],
  pairConfiguration: ["Rotation Pair Configuration", "轮班配对配置"],
  pairConfigurationDescription: [
    "Choose which employees work together as Pair A and Pair B.",
    "选择哪些员工组成 A 组和 B 组。",
  ],
  pairA: ["Pair A", "A 组"],
  pairB: ["Pair B", "B 组"],
  employeeOne: ["Employee 1", "员工 1"],
  employeeTwo: ["Employee 2", "员工 2"],
  selectEmployee: ["Select employee...", "选择员工..."],
  saveRotationPairs: ["Save Rotation Pairs", "保存轮班配对"],
  rotationPairsSaved: ["Rotation pairs saved.", "轮班配对已保存。"],
  pairValidation: ["Please select four different employees for Pair A and Pair B.", "请为 A 组和 B 组选择四名不同的员工。"],
  excluded: ["Excluded", "排除"],
  fixedDay: ["Fixed Day Shift", "固定白班"],
  search: ["Search employee...", "搜索员工..."],
  allDepartments: ["All Departments", "全部部门"],
  allShifts: ["All Shifts", "全部班次"],
  day: ["Day", "白班"],
  night: ["Night", "夜班"],
  off: ["OFF", "休息"],
  generate: ["Generate Schedule", "生成排班"],
  exportExcel: ["Export Excel", "导出 Excel"],
  today: ["Today", "今天"],
  employee: ["Employee", "员工"],
  department: ["Department", "部门"],
  action: ["Action", "操作"],
  code: ["Code", "代码"],
  rotate: ["ROTATE", "轮班"],
  addShift: ["Add Shift", "新增班次"],
  edit: ["Edit", "编辑"],
  noData: ["No data found", "没有数据"],
  rotationPeriod: ["Rotation Period", "轮班周期"],
  periodOne: ["01 – 14", "01 – 14日"],
  periodTwo: ["15 – 16 / 17 – End", "15 – 16日 / 17日 – 月末"],
  scheduleRule: ["Night → OFF → Day", "夜班 → 休息 → 白班"],
  rotationRule: ["Rotation Rule", "轮班规则"],
  fixed: ["Fixed", "固定"],
  myOffCalendar: ["My OFF Calendar", "我的休息日历"],
  calendar: ["Calendar", "日历"],
  offCalendarSubtitle: [
    "Choose your personal OFF days, then fix them.",
    "选择个人休息日，然后锁定。",
  ],
  saveAndFix: ["Save & Fix", "保存并锁定"],
  resetUnfixed: ["Reset Unfixed", "重置未锁定"],
  fixedOff: ["Fixed OFF", "已锁定休息"],
  selectedOff: ["Selected OFF", "已选择休息"],
  currentAccount: ["Current account", "当前账户"],
  accountNotDetected: [
    "Current account could not be detected. Please sign in again.",
    "无法识别当前账户，请重新登录。",
  ],
  goOffCalendar: ["My OFF Calendar", "我的休息日历"],
  fixedLocked: ["Locked", "已锁定"],
  loading: ["Loading...", "加载中..."],
  saveSuccess: ["Saved", "已保存"],
  supervisorOnly: [
    "Only a Supervisor can generate schedules.",
    "只有上级主管可以生成排班。",
  ],
  monthLocked: [
    "This month is already in progress and can no longer be generated.",
    "本月已经开始，不能再生成排班。",
  ],
  generateFutureOnly: [
    "You can only generate schedules for a future month.",
    "只能生成未来月份的排班。",
  ],
} as const;

function text(key: keyof typeof SHIFT_TEXT, language: OrganizationLanguage) {
  return SHIFT_TEXT[key][language === "cn" ? 1 : 0];
}

function shiftName(
  shift: ShiftCode,
  language: OrganizationLanguage,
) {
  if (shift === "1") {
    return "08:00–17:00";
  }

  if (shift === "4") {
    return language === "cn"
      ? "4小时"
      : "4 Hours";
  }

  if (shift === "D/S") {
    return language === "cn"
      ? "白班"
      : "Day Shift";
  }

  return language === "cn"
    ? "夜班"
    : "Night Shift";
}

function scheduleName(value: ScheduleType, language: OrganizationLanguage) {
  if (value === "1") return language === "cn" ? "8小时" : "8 Hours";
  if (value === "4") return language === "cn" ? "4小时" : "4 Hours";
  if (value === "D") return language === "cn" ? "白班" : "Day";
  if (value === "N") return language === "cn" ? "夜班" : "Night";
  return language === "cn" ? "休息" : "OFF";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = getDaysInMonth(year, month);

  return Array.from(
    { length: mondayOffset + daysInMonth },
    (_, index) => (index < mondayOffset ? null : index - mondayOffset + 1),
  );
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    const preview = raw.slice(0, 250).replace(/\s+/g, " ");
    throw new Error(
      `API ${url} returned ${response.status} ${response.statusText} instead of JSON. ${preview}`,
    );
  }

  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`API ${url} returned invalid JSON.`);
  }

  if (!response.ok) {
    if (handleGuestForbiddenResponse(response.status, payload, init?.method)) {
      throw new Error("Not allowed, please login.");
    }
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "API request failed")
        : "API request failed";
    throw new Error(error);
  }

  return payload as T;
}

function getEmployeeNameKey(employee: OrganizationEmployee) {
  return `${employee.name_en || ""} ${employee.name_cn || ""}`
    .trim()
    .toLowerCase();
}

function mapOrganizationEmployee(
  employee: OrganizationEmployee,
  assignment?: ShiftAssignment,
): RotationMember {
  return {
    id: employee.id,
    userId: employee.id,
    employeeId: employee.employee_no,
    name:
      employee.name_en || employee.name_cn || employee.employee_no,
    nameCn: employee.name_cn || undefined,
    department: employee.division_name_en || "—",
    departmentCn:
      employee.division_name_cn || employee.division_name_en || "—",
    shift: assignment?.shift ?? null,
    excluded: assignment?.excluded ?? false,
  };
}

function buildValidPairSelections(
  employees: OrganizationEmployee[],
  assignments: Record<string, ShiftAssignment>,
  existingMembers: RotationMemberApiRow[],
): Record<string, PairSelection> {
  const empty: Record<string, PairSelection> = {
    PAIR_A: { first: "", second: "" },
    PAIR_B: { first: "", second: "" },
  };

  const memberMap = new Map(
    employees.map((employee) => [
      employee.employee_no,
      mapOrganizationEmployee(employee, assignments[employee.employee_no]),
    ]),
  );

  const isEligible = (employeeNo: string) => {
    const member = memberMap.get(employeeNo);
    return Boolean(member && !member.excluded && member.shift);
  };

  const isValidPair = (group: string) => {
    const members = existingMembers
      .filter((member) => member.pair_group === group)
      .sort((a, b) => a.rotation_order - b.rotation_order);

    if (members.length !== 2) return null;
    if (!members.every((member) => isEligible(member.employee_no))) return null;

    const first = memberMap.get(members[0].employee_no);
    const second = memberMap.get(members[1].employee_no);

    if (!first?.shift || !second?.shift || first.shift === second.shift) return null;

    return {
      first: members[0].employee_no,
      second: members[1].employee_no,
    };
  };

  const existingA = isValidPair("PAIR_A");
  const existingB = isValidPair("PAIR_B");

  if (
    existingA &&
    existingB &&
    new Set([existingA.first, existingA.second, existingB.first, existingB.second]).size === 4
  ) {
    return { PAIR_A: existingA, PAIR_B: existingB };
  }

  const eligible: RotationMember[] = employees.flatMap((employee) => {
    const member = memberMap.get(employee.employee_no);
    if (!member || !member.shift || member.excluded) return [];
    return [member];
  });

  const dayMembers = eligible.filter((member) => member.shift === "D/S");
  const nightMembers = eligible.filter((member) => member.shift === "N/S");

  if (dayMembers.length < 2 || nightMembers.length < 2) {
    return empty;
  }

  // Pair A and Pair B must each contain exactly one D/S and one N/S employee.
  return {
    PAIR_A: {
      first: dayMembers[0].employeeId,
      second: nightMembers[0].employeeId,
    },
    PAIR_B: {
      first: dayMembers[1].employeeId,
      second: nightMembers[1].employeeId,
    },
  };
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      {subtitle && <p className="mt-1 text-[10px] text-text-dim">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({
  active,
  language,
}: {
  active: boolean;
  language: OrganizationLanguage;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 "
          : "border-slate-200 bg-slate-100 text-slate-500 "
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? text("active", language) : text("inactive", language)}
    </span>
  );
}

function ShiftBadge({
  shift,
  language,
}: {
  shift: ShiftCode | null;
  language: OrganizationLanguage;
}) {
  if (!shift) {
    return (
      <span className="inline-flex min-w-[64px] items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-500 ">
        —
      </span>
    );
  }

  const isDay = shift === "D/S";

  return (
    <span
      className={`inline-flex min-w-[76px] items-center justify-center rounded-md border px-2.5 py-1 text-[9px] font-semibold ${
        isDay
          ? "border-sky-200 bg-sky-50 text-sky-700 "
          : "border-violet-200 bg-violet-50 text-violet-700 "
      }`}
    >
      {shift} {shiftName(shift, language)}
    </span>
  );
}

function ScheduleBadge({
  value,
  language,
}: {
  value: ScheduleType;
  language: OrganizationLanguage;
}) {
  const className =
    value === "1"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 "
      : value === "4"
        ? "border-amber-200 bg-amber-50 text-amber-700 "
        : value === "D"
          ? "border-sky-200 bg-sky-50 text-sky-700 "
          : value === "N"
            ? "border-violet-200 bg-violet-50 text-violet-700 "
            : "border-red-200 bg-red-100 text-red-500 ";

  return (
    <span
      className={`inline-flex min-w-[46px] justify-center rounded-md border px-2 py-0.5 text-[8px] font-semibold shadow-none ${className}`}
      title={scheduleName(value, language)}
    >
      {scheduleName(value, language)}
    </span>
  );
}

type CurrentLoginAccount = {
  id?: number | null;
  employeeNo?: string | null;
  name_en?: string | null;
  name_cn?: string | null;
  roleName?: string | null;
  role?: string | null;
};

type CurrentLoginResponse = {
  account: CurrentLoginAccount | null;
};

function MyOffCalendar({
  language,
  organizationEmployees,
  personalOffDays,
  onPersonalOffDaysChange,
  onScheduleChanged,
}: {
  language: OrganizationLanguage;
  organizationEmployees: OrganizationEmployee[];
  personalOffDays: PersonalOffDay[];
  onPersonalOffDaysChange: (days: PersonalOffDay[]) => void;
  onScheduleChanged?: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workSchedules, setWorkSchedules] = useState<CalendarWorkSchedule[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentLoginUser() {
      setAuthLoading(true);

      try {
        const payload = await fetchJson<CurrentLoginResponse>("/api/auth/me");

        if (cancelled) return;

        const employeeNo = payload.account?.employeeNo ?? null;

        if (!employeeNo) {
          setCurrentEmployeeId(null);
          setMessage(text("accountNotDetected", language));
          return;
        }

        setCurrentEmployeeId(String(employeeNo));
        setMessage(null);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load current login account", error);
          setCurrentEmployeeId(null);
          setMessage(
            error instanceof Error
              ? error.message
              : text("accountNotDetected", language),
          );
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    void loadCurrentLoginUser();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = currentDate.toLocaleString(
    language === "cn" ? "zh-CN" : "en-US",
    { month: "long", year: "numeric" },
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCalendarWorkSchedules() {
      if (!currentEmployeeId) {
        setWorkSchedules([]);
        return;
      }

      try {
        const payload = await fetchJson<{
          data?: Array<{
            id: number;
            employee_no: string;
            schedule_date: string;
            schedule_type: ScheduleType;
          }>;
        }>(
          `${API_BASE}/schedules?year=${year}&month=${month + 1}&employeeNo=${encodeURIComponent(
            currentEmployeeId,
          )}`,
        );

        if (cancelled) return;

        const rows = (payload.data ?? [])
          .filter(
            (row) =>
              (row.schedule_type === "1" ||
                row.schedule_type === "4" ||
                row.schedule_type === "OFF") &&
              row.employee_no === currentEmployeeId,
          )
          .map<CalendarWorkSchedule>((row) => ({
            id: String(row.id),
            employeeId: row.employee_no,
            date: String(row.schedule_date).slice(0, 10),
            scheduleType: row.schedule_type as "1" | "4" | "OFF",
            databaseId: row.id,
          }));

        setWorkSchedules(rows);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load calendar work schedules", error);
          setWorkSchedules([]);
        }
      }
    }

    void loadCalendarWorkSchedules();

    return () => {
      cancelled = true;
    };
  }, [currentEmployeeId, year, month]);

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const myDays = useMemo(
    () => personalOffDays.filter((item) => item.employeeId === currentEmployeeId),
    [personalOffDays, currentEmployeeId],
  );

  const myDayMap = useMemo(
    () => new Map(myDays.map((item) => [item.date, item])),
    [myDays],
  );

  const workScheduleMap = useMemo(
    () =>
      new Map(
        workSchedules
          .filter((item) => item.employeeId === currentEmployeeId)
          .map((item) => [item.date, item]),
      ),
    [workSchedules, currentEmployeeId],
  );

  const otherOffsByDate = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const item of personalOffDays) {
      if (item.employeeId === currentEmployeeId) continue;

      const employee = organizationEmployees.find(
        (entry) => entry.employee_no === item.employeeId,
      );

      const label =
        language === "cn"
          ? employee?.name_cn || employee?.name_en || item.employeeId
          : employee?.name_en || employee?.name_cn || item.employeeId;

      const current = map.get(item.date) ?? [];
      if (!current.includes(label)) {
        current.push(label);
      }
      map.set(item.date, current);
    }

    return map;
  }, [personalOffDays, currentEmployeeId, organizationEmployees, language]);

  const currentEmployee = useMemo(
    () => organizationEmployees.find((employee) => employee.employee_no === currentEmployeeId),
    [organizationEmployees, currentEmployeeId],
  );

  const usesScheduleOffFallback = !currentEmployee;

  const calendarCells = useMemo(
    () => getCalendarCells(year, month),
    [year, month],
  );

  const todayForOffCalendar = new Date();
  const currentCalendarYear = todayForOffCalendar.getFullYear();
  const currentCalendarMonth = todayForOffCalendar.getMonth() + 1;
  const selectedCalendarMonth = month + 1;
  const isFutureOffMonth =
    year > currentCalendarYear ||
    (year === currentCalendarYear && selectedCalendarMonth > currentCalendarMonth);

  async function saveWorkSchedule(date: string, scheduleType: "1" | "4" | "OFF") {
    if (!currentEmployeeId) return false;

    try {
      await fetchJson(`${API_BASE}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: currentEmployeeId,
          date,
          scheduleType,
        }),
      });

      setWorkSchedules((current) => {
        const next = current.filter(
          (item) => !(item.employeeId === currentEmployeeId && item.date === date),
        );
        return [
          ...next,
          {
            id: `${currentEmployeeId}-${date}`,
            employeeId: currentEmployeeId,
            date,
            scheduleType,
          },
        ];
      });

      onScheduleChanged?.();
      return true;
    } catch (error) {
      console.error("Failed to save work schedule", error);
      setMessage(error instanceof Error ? error.message : "Failed to save work schedule.");
      return false;
    }
  }

  async function deleteWorkSchedule(date: string) {
    if (!currentEmployeeId) return false;

    try {
      await fetchJson(`${API_BASE}/schedules`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: currentEmployeeId,
          date,
        }),
      });

      setWorkSchedules((current) =>
        current.filter(
          (item) => !(item.employeeId === currentEmployeeId && item.date === date),
        ),
      );

      onScheduleChanged?.();
      return true;
    } catch (error) {
      console.error("Failed to delete work schedule", error);
      setMessage(error instanceof Error ? error.message : "Failed to delete work schedule.");
      return false;
    }
  }

  async function toggleDate(day: number) {
    if (!isFutureOffMonth || !currentEmployeeId || saving) return;

    const key = dateKey(year, month, day);
    const existingWork = workScheduleMap.get(key);
    const existingOff = myDayMap.get(key);

    setSaving(true);
    setMessage(null);

    try {
      // 1 -> 4
      if (existingWork?.scheduleType === "1") {
        await saveWorkSchedule(key, "4");
        return;
      }

      // 4 -> OFF
      if (existingWork?.scheduleType === "4") {
        if (usesScheduleOffFallback) {
          await saveWorkSchedule(key, "OFF");
          return;
        }

        await deleteWorkSchedule(key);

        const payload = await fetchJson<{ data?: OffDayApiRow[] }>(`${API_BASE}/off-days`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeNo: currentEmployeeId,
            dates: [key],
            fixed: false,
          }),
        });

        const offRow = (payload.data ?? []).find(
          (row) => String(row.off_date).slice(0, 10) === key,
        );

        if (offRow) {
          onPersonalOffDaysChange([
            ...personalOffDays.filter((item) => item.id !== String(offRow.id) && item.date !== key),
            {
              id: String(offRow.id),
              employeeId: offRow.employee_no,
              date: key,
              fixed: toBoolean(offRow.is_fixed),
              databaseId: offRow.id,
            },
          ]);
        }

        return;
      }

      // OFF -> clear
      if (usesScheduleOffFallback && existingWork?.scheduleType === "OFF") {
        await deleteWorkSchedule(key);
        return;
      }

      if (existingOff) {
        await fetchJson(`${API_BASE}/off-days`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeNo: currentEmployeeId,
            date: key,
          }),
        });

        onPersonalOffDaysChange(
          personalOffDays.filter((item) => item.id !== existingOff.id),
        );
        return;
      }

      // clear -> 1
      await saveWorkSchedule(key, "1");
    } catch (error) {
      console.error("Failed to change calendar schedule", error);
      setMessage(error instanceof Error ? error.message : "Failed to change calendar schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function resetUnfixed() {
    if (!isFutureOffMonth || !currentEmployeeId || saving) return;

    const dates = myDays.filter((item) => !item.fixed).map((item) => item.date);
    if (dates.length === 0) return;

    setSaving(true);
    setMessage(null);

    try {
      await fetchJson(`${API_BASE}/off-days`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: currentEmployeeId,
          dates,
        }),
      });

      onPersonalOffDaysChange(
        personalOffDays.filter(
          (item) => item.employeeId !== currentEmployeeId || item.fixed,
        ),
      );
    } catch (error) {
      console.error("Failed to reset OFF days", error);
      setMessage(error instanceof Error ? error.message : "Failed to reset OFF days.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndFix() {
    if (!isFutureOffMonth || !currentEmployeeId || saving) return;

    const unfixed = myDays.filter((item) => !item.fixed);
    if (unfixed.length === 0) {
      setMessage(text("saveSuccess", language));
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = await fetchJson<{ data: OffDayApiRow[] }>(`${API_BASE}/off-days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: currentEmployeeId,
          dates: unfixed.map((item) => item.date),
          fixed: true,
        }),
      });

      const fixedRows = (payload.data ?? []).map<PersonalOffDay>((row) => ({
        id: String(row.id),
        employeeId: row.employee_no,
        date: String(row.off_date).slice(0, 10),
        fixed: toBoolean(row.is_fixed),
        databaseId: row.id,
      }));

      const otherEmployees = personalOffDays.filter(
        (item) => item.employeeId !== currentEmployeeId,
      );

      onPersonalOffDaysChange([...otherEmployees, ...fixedRows]);
      setMessage(text("saveSuccess", language));
    } catch (error) {
      console.error("Failed to save personal OFF days", error);
      setMessage(error instanceof Error ? error.message : "Failed to save personal OFF days.");
    } finally {
      setSaving(false);
    }
  }

  const accountLabel = currentEmployee
    ? language === "cn"
      ? currentEmployee.name_cn || currentEmployee.name_en || currentEmployee.employee_no
      : currentEmployee.name_en || currentEmployee.name_cn || currentEmployee.employee_no
    : currentEmployeeId || "—";

  return (
    <div className="mt-2">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-text">
            {language === "cn" ? "工作排班日历" : "Work Schedule"}
          </h1>
          <p className="mt-1 text-[11px] text-text-muted">
            {language === "cn"
              ? "为未来日期选择 1、4 小时或休息。"
              : "Choose 1, 4 hours, or OFF for future dates."}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Compact toolbar */}
        <div className="border-b border-border-subtle px-4 py-3.5 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-text-dim">
                {text("currentAccount", language)}
              </span>
              <span className="truncate text-sm font-bold text-text">
                {authLoading ? text("loading", language) : accountLabel}
              </span>

              {!authLoading && !currentEmployeeId && (
                <span className="text-[10px] font-semibold text-rose-600">
                  {text("accountNotDetected", language)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>1</span>
                <span className="text-emerald-600/80">08:00–17:00</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>4</span>
                <span className="text-amber-600/80">{language === "cn" ? "4小时" : "4 Hours"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600">
                <span className="size-1.5 rounded-full bg-slate-400" />
                <span>OFF</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          {/* Calendar toolbar */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-text-muted transition hover:border-slate-300 hover:bg-surface-hover hover:text-text"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[10px] font-bold text-text transition hover:border-slate-300 hover:bg-surface-hover"
              >
                {text("today", language)}
              </button>
              <div className="inline-flex h-9 min-w-36 items-center justify-center rounded-lg border border-border bg-surface px-4 text-[11px] font-bold text-text">
                {monthName}
              </div>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-text-muted transition hover:border-slate-300 hover:bg-surface-hover hover:text-text"
              >
                →
              </button>
            </div>

            {isFutureOffMonth && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetUnfixed}
                  disabled={!currentEmployeeId || authLoading || saving}
                  className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-surface px-3 text-[10px] font-bold text-text-muted transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text("resetUnfixed", language)}
                </button>
                <button
                  type="button"
                  onClick={saveAndFix}
                  disabled={!currentEmployeeId || authLoading || saving}
                  className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? text("loading", language) : text("saveAndFix", language)}
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className="mb-3 rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-[10px] font-semibold text-text-muted">
              {message}
            </div>
          )}

          <div
            className="work-schedule-calendar grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-surface"
            style={{ gridAutoRows: "118px" }}
          >
            {(language === "cn"
              ? ["一", "二", "三", "四", "五", "六", "日"]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ).map((label, weekdayIndex) => (
              <div
                key={label}
                className={`work-schedule-weekday flex items-center border-b border-r border-border px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted last:border-r-0 ${
                  weekdayIndex >= 5 ? "bg-slate-50/80" : "bg-surface-hover"
                }`}
              >
                {label}
              </div>
            ))}

            {calendarCells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="work-schedule-empty border-b border-r border-border-subtle bg-slate-50/50"
                  />
                );
              }

              const key = dateKey(year, month, day);
              const off = myDayMap.get(key);
              const work = workScheduleMap.get(key);
              const otherOffs = otherOffsByDate.get(key) ?? [];
              const dateObject = new Date(year, month, day);
              const weekday = dateObject.getDay();
              const isWeekend = weekday === 0 || weekday === 6;
              const isToday = key === todayKey;
              const isFixed = Boolean(off?.fixed);
              const status = work?.scheduleType ?? (off ? "OFF" : null);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void toggleDate(day)}
                  disabled={!isFutureOffMonth || !currentEmployeeId || authLoading || saving}
                  className={`work-schedule-cell group relative border-b border-r border-border-subtle p-2.5 text-left align-top transition-colors ${
                    isToday
                      ? "bg-cyan-50/60"
                      : isWeekend
                        ? "bg-slate-50/45 hover:bg-slate-50"
                        : "bg-white hover:bg-slate-50/70"
                  } ${
                    !isFutureOffMonth || !currentEmployeeId || authLoading || saving || isFixed
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold ${
                        isToday ? "text-cyan-700" : isWeekend ? "text-slate-500" : "text-text"
                      }`}
                    >
                      {day}
                    </span>

                    {isToday && (
                      <span className="rounded-md border border-cyan-200 bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-cyan-700">
                        {text("today", language)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    {status === "1" && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[9px] font-bold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span>1 · 08:00–17:00</span>
                      </div>
                    )}

                    {status === "4" && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[9px] font-bold text-amber-700">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        <span>4 · {language === "cn" ? "4小时" : "4 Hours"}</span>
                      </div>
                    )}

                    {status === "OFF" && (
                      <div
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[9px] font-bold ${
                          isFixed
                            ? "border-rose-200 bg-rose-50 text-rose-600"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full ${isFixed ? "bg-rose-500" : "bg-slate-400"}`} />
                          <span>{language === "cn" ? "休息" : "OFF"}</span>
                        </span>
                        {isFixed && <span className="text-[8px]">LOCKED</span>}
                      </div>
                    )}
                  </div>

                  {otherOffs.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {otherOffs.slice(0, 2).map((name) => (
                        <div
                          key={`${key}-${name}`}
                          className="truncate text-[8px] font-semibold text-rose-500"
                          title={`${name} ${text("off", language)}`}
                        >
                          {name} {text("off", language)}
                        </div>
                      ))}
                      {otherOffs.length > 2 && (
                        <div className="text-[8px] font-semibold text-slate-400">
                          +{otherOffs.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-text-dim">
            <span>
              {language === "cn"
                ? "点击未来日期：1 → 4 → OFF → 清空"
                : "Click a future date: 1 → 4 → OFF → clear"}
            </span>
            <span>
              {language === "cn"
                ? "1 = 08:00–17:00 · 4 = 4 Hours"
                : "1 = 08:00–17:00 · 4 = 4 Hours"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ShiftManagementView() {
  const { t } = useLang();
  const language: OrganizationLanguage = t.safety.management === "安全管理" ? "cn" : "en";

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [organizationEmployees, setOrganizationEmployees] = useState<OrganizationEmployee[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, ShiftAssignment>>({});
  const [shiftMasters, setShiftMasters] = useState<ShiftMaster[]>([]);
  const [personalOffDays, setPersonalOffDays] = useState<PersonalOffDay[]>([]);
  const [rotationRules, setRotationRules] = useState<RotationRule[]>([]);
  const [rotationDbMembers, setRotationDbMembers] = useState<RotationMemberApiRow[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingShiftData, setLoadingShiftData] = useState(true);
  const [employeeLoadError, setEmployeeLoadError] = useState<string | null>(null);
  const [shiftDataError, setShiftDataError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [generated, setGenerated] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState<string | null>(null);
  const [currentLoginEmployeeNo, setCurrentLoginEmployeeNo] = useState<string | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [pairSelections, setPairSelections] = useState<Record<string, PairSelection>>({
    PAIR_A: { first: "", second: "" },
    PAIR_B: { first: "", second: "" },
  });
  const [savingPairs, setSavingPairs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadShiftMasters() {
      try {
        const payload = await fetchJson<{
          success?: boolean;
          data?: ShiftMaster[];
        }>(`${API_BASE}/master`);

        if (!cancelled) {
          setShiftMasters(payload.data ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load shift masters", error);
        }
      }
    }

    void loadShiftMasters();

    return () => {
      cancelled = true;
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = currentDate.toLocaleString(language === "cn" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const selectedMonth = month + 1;
  const isFutureMonth =
    year > todayYear ||
    (year === todayYear && selectedMonth > todayMonth);
  const canGenerate = isSupervisor && isFutureMonth && !authLoading;

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentLoginUser() {
      setAuthLoading(true);

      try {
        const payload = await fetchJson<CurrentLoginResponse>("/api/auth/me");
        if (cancelled) return;

        const employeeNo = payload.account?.employeeNo ?? null;
        setCurrentLoginEmployeeNo(employeeNo ? String(employeeNo) : null);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load current login account", error);
          setCurrentLoginEmployeeNo(null);
          setIsSupervisor(false);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    void loadCurrentLoginUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      setLoadingEmployees(true);
      setEmployeeLoadError(null);

      try {
        const payload = await fetchJson<OrganizationEmployeeResponse>(
          "/api/organization/employees?limit=100",
        );

        if (cancelled) return;

        const activeEmployees = (payload.data ?? []).filter(
          (employee) =>
            employee.employee_no !== "SUPERADMIN" &&
            Boolean(employee.employee_no) &&
            employee.employment_status === "Active" &&
            Boolean(employee.division_name_en || employee.division_name_cn),
        );

        setOrganizationEmployees(activeEmployees);

        if (currentLoginEmployeeNo) {
          const currentEmployee = activeEmployees.find(
            (employee) => employee.employee_no === currentLoginEmployeeNo,
          );

          const supervisor = Boolean(
            currentEmployee &&
              activeEmployees.some(
                (employee) => employee.manager_id === currentEmployee.id,
              ),
          );

          setIsSupervisor(supervisor);
        } else {
          setIsSupervisor(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("loadOrganizationEmployees failed", error);
          setEmployeeLoadError(
            error instanceof Error ? error.message : "Failed to load organization employees.",
          );
        }
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    }

    void loadEmployees();
    return () => {
      cancelled = true;
    };
  }, [currentLoginEmployeeNo]);

  useEffect(() => {
    if (!currentLoginEmployeeNo || organizationEmployees.length === 0) {
      setIsSupervisor(false);
      return;
    }

    const currentEmployee = organizationEmployees.find(
      (employee) => employee.employee_no === currentLoginEmployeeNo,
    );

    setIsSupervisor(
      Boolean(
        currentEmployee &&
          organizationEmployees.some(
            (employee) => employee.manager_id === currentEmployee.id,
          ),
      ),
    );
  }, [currentLoginEmployeeNo, organizationEmployees]);

  async function loadShiftData(employees: OrganizationEmployee[]) {
    setLoadingShiftData(true);
    setShiftDataError(null);

    try {
      const [assignmentPayload, offDayPayload, rotationPayload] = await Promise.all([
        fetchJson<unknown>(`${API_BASE}/assignments`),
        fetchJson<unknown>(`${API_BASE}/off-days`),
        fetchJson<unknown>(`${API_BASE}/rotation`),
      ]);

      const assignmentData =
        assignmentPayload &&
        typeof assignmentPayload === "object" &&
        "data" in assignmentPayload &&
        Array.isArray((assignmentPayload as { data?: unknown }).data)
          ? ((assignmentPayload as { data: AssignmentApiRow[] }).data ?? [])
          : [];

      const offDayData =
        offDayPayload &&
        typeof offDayPayload === "object" &&
        "data" in offDayPayload &&
        Array.isArray((offDayPayload as { data?: unknown }).data)
          ? ((offDayPayload as { data: OffDayApiRow[] }).data ?? [])
          : [];

      const rotationData =
        rotationPayload &&
        typeof rotationPayload === "object" &&
        "data" in rotationPayload &&
        rotationPayload.data &&
        typeof rotationPayload.data === "object"
          ? (rotationPayload.data as {
              rules?: RotationRule[];
              members?: RotationMemberApiRow[];
            })
          : { rules: [], members: [] };

      const assignmentMap: Record<string, ShiftAssignment> = {};
      for (const row of assignmentData) {
        assignmentMap[row.employee_no] = {
          shift: row.shift_code,
          excluded: toBoolean(row.is_excluded),
        };
      }

      setShiftAssignments(assignmentMap);

      const offDays = offDayData.map<PersonalOffDay>((row) => ({
        id: String(row.id),
        employeeId: row.employee_no,
        date: String(row.off_date).slice(0, 10),
        fixed: toBoolean(row.is_fixed),
        databaseId: row.id,
      }));
      setPersonalOffDays(offDays);

      const rules = Array.isArray(rotationData.rules)
        ? rotationData.rules
        : [];
      const members = Array.isArray(rotationData.members)
        ? rotationData.members
        : [];

      setRotationRules(rules);
      setRotationDbMembers(members);

      // Do not trust stale rotation_members blindly.
      // The current assignment table is authoritative for Fixed vs Rotation.
      // This prevents a previously saved Fixed employee from remaining in a pair.
      setPairSelections(
        buildValidPairSelections(employees, assignmentMap, members),
      );
    } catch (error) {
      console.error("loadShiftData failed", error);
      setShiftDataError(
        error instanceof Error
          ? error.message
          : "Failed to load Shift Management data.",
      );
    } finally {
      setLoadingShiftData(false);
    }
  }

  useEffect(() => {
    if (!loadingEmployees && organizationEmployees.length > 0) {
      void loadShiftData(organizationEmployees);
    }
  }, [loadingEmployees, organizationEmployees]);

  const rotationMembers = useMemo(() => {
    return organizationEmployees.map((employee) =>
      mapOrganizationEmployee(employee, shiftAssignments[employee.employee_no]),
    );
  }, [organizationEmployees, shiftAssignments]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          rotationMembers
            .map((member) => member.department)
            .filter((department) => department && department !== "—"),
        ),
      ).sort(),
    [rotationMembers],
  );

  const filteredMembers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rotationMembers.filter((member) => {
      const matchesSearch =
        !searchValue ||
        member.name.toLowerCase().includes(searchValue) ||
        member.employeeId.toLowerCase().includes(searchValue);
      const matchesDepartment = departmentFilter === "all" || member.department === departmentFilter;
      const matchesShift = shiftFilter === "all" || member.shift === shiftFilter;
      return matchesSearch && matchesDepartment && matchesShift;
    });
  }, [rotationMembers, search, departmentFilter, shiftFilter]);

  function updatePairSelection(
    group: "PAIR_A" | "PAIR_B",
    key: "first" | "second",
    value: string,
  ) {
    setPairSelections((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }));
  }

  async function saveRotationPairs(): Promise<boolean> {
  const currentSelections = {
    PAIR_A: {
      first: String(pairSelections.PAIR_A.first ?? "").trim(),
      second: String(pairSelections.PAIR_A.second ?? "").trim(),
    },
    PAIR_B: {
      first: String(pairSelections.PAIR_B.first ?? "").trim(),
      second: String(pairSelections.PAIR_B.second ?? "").trim(),
    },
  };

  console.log(
    "[ROTATION SAVE] current selections:",
    currentSelections,
  );

  const selected = [
    currentSelections.PAIR_A.first,
    currentSelections.PAIR_A.second,
    currentSelections.PAIR_B.first,
    currentSelections.PAIR_B.second,
  ].filter(Boolean);

  if (selected.length !== 4 || new Set(selected).size !== 4) {
    setShiftDataError(text("pairValidation", language));
    return false;
  }

  const rule = rotationRules[0];

  if (!rule) {
    setShiftDataError("No active rotation rule was found.");
    return false;
  }

  const toMemberPayload = (
    employeeNo: string,
    rotationOrder: number,
  ) => {
    const employee = organizationEmployees.find(
      (item) => item.employee_no === employeeNo,
    );

    const assignment = shiftAssignments[employeeNo];

    return {
      employeeOrganizationId: employee?.id ?? null,
      employeeNo,
      initialShift: assignment?.shift ?? null,
      rotationOrder,
    };
  };

  const members = [
    toMemberPayload(currentSelections.PAIR_A.first, 1),
    toMemberPayload(currentSelections.PAIR_A.second, 2),
    toMemberPayload(currentSelections.PAIR_B.first, 1),
    toMemberPayload(currentSelections.PAIR_B.second, 2),
  ];

  console.log(
    "[ROTATION SAVE] payload members:",
    members,
  );

  if (
    members.some(
      (member) =>
        !member.employeeOrganizationId ||
        !member.initialShift,
    )
  ) {
    setShiftDataError(
      "All selected rotation employees must have a D/S or N/S assignment before saving pairs.",
    );
    return false;
  }

  const selectedAssignments = members.map(
    (member) => shiftAssignments[member.employeeNo],
  );

  if (
    selectedAssignments.some(
      (assignment) =>
        !assignment || assignment.excluded,
    )
  ) {
    setShiftDataError(
      "Fixed employees cannot be used in a rotation pair.",
    );
    return false;
  }

  const pairAShifts = [
    shiftAssignments[currentSelections.PAIR_A.first]?.shift,
    shiftAssignments[currentSelections.PAIR_A.second]?.shift,
  ];

  const pairBShifts = [
    shiftAssignments[currentSelections.PAIR_B.first]?.shift,
    shiftAssignments[currentSelections.PAIR_B.second]?.shift,
  ];

  const isOneDayOneNight = (
    shifts: Array<ShiftCode | null | undefined>,
  ) =>
    shifts.length === 2 &&
    shifts.includes("D/S") &&
    shifts.includes("N/S");

  if (
    !isOneDayOneNight(pairAShifts) ||
    !isOneDayOneNight(pairBShifts)
  ) {
    setShiftDataError(
      "Each rotation pair must contain exactly one D/S employee and one N/S employee.",
    );
    return false;
  }

  setSavingPairs(true);
  setShiftDataError(null);

  try {
    const payload = {
      ruleId: Number(rule.id),
      pairs: [
        {
          pairGroup: "PAIR_A" as const,
          rotationDay: rule.first_rotation_day,
          members: members.slice(0, 2),
        },
        {
          pairGroup: "PAIR_B" as const,
          rotationDay: rule.second_rotation_day,
          members: members.slice(2, 4),
        },
      ],
    };

    console.log(
      "[ROTATION SAVE] FINAL POST:",
      payload,
    );

    await fetchJson(`${API_BASE}/rotation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setShiftDataError(
      text("rotationPairsSaved", language),
    );

    await loadShiftData(organizationEmployees);

    return true;
  } catch (error) {
    console.error(
      "Failed to save rotation pairs",
      error,
    );

    setShiftDataError(
      error instanceof Error
        ? error.message
        : "Failed to save rotation pairs.",
    );

    return false;
  } finally {
    setSavingPairs(false);
  }
}

  async function updateShiftAssignment(employeeId: string, patch: Partial<ShiftAssignment>) {
    const member = rotationMembers.find((item) => item.employeeId === employeeId);
    const current = shiftAssignments[employeeId] ??
      (member?.shift ? { shift: member.shift, excluded: member.excluded } : null);

    const nextShift = patch.shift ?? current?.shift ?? null;
    if (!nextShift) {
      setShiftDataError("Select D/S or N/S before saving the employee assignment.");
      return;
    }

    const nextAssignment: ShiftAssignment = {
      shift: nextShift,
      excluded: patch.excluded ?? current?.excluded ?? false,
    };

    setSavingEmployee(employeeId);
    setShiftDataError(null);

    try {
      await fetchJson(`${API_BASE}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: employeeId,
          shift: nextAssignment.shift,
          excluded: nextAssignment.excluded,
        }),
      });

      setShiftAssignments((currentAssignments) => ({
        ...currentAssignments,
        [employeeId]: nextAssignment,
      }));
    } catch (error) {
      console.error("Failed to save shift assignment", error);
      setShiftDataError(error instanceof Error ? error.message : "Failed to save shift assignment.");
    } finally {
      setSavingEmployee(null);
    }
  }

  type GeneratedScheduleApiRow = {
    employee_no: string;
    schedule_date: string;
    schedule_type: ScheduleType;
    shift_code: ShiftCode | null;
  };

  const [generatedScheduleRows, setGeneratedScheduleRows] = useState<GeneratedScheduleApiRow[]>([]);
  const [loadingGeneratedSchedule, setLoadingGeneratedSchedule] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  async function loadGeneratedSchedules(force = false) {
    if (
      !force &&
      (loadingEmployees || loadingShiftData || organizationEmployees.length === 0)
    ) {
      return;
    }

    if (organizationEmployees.length === 0) return;

    setLoadingGeneratedSchedule(true);

    try {
      const payload = await fetchJson<{
        success?: boolean;
        year?: number;
        month?: number;
        data?: GeneratedScheduleApiRow[];
      }>(
        `${API_BASE}/schedules?year=${year}&month=${month + 1}&_=${Date.now()}`,
      );

      const freshRows = Array.isArray(payload.data) ? payload.data : [];

      setGeneratedScheduleRows(freshRows);
    } catch (error) {
      console.error("Failed to load generated schedules", error);
      setGeneratedScheduleRows([]);
    } finally {
      setLoadingGeneratedSchedule(false);
    }
  }

  useEffect(() => {
    void loadGeneratedSchedules();
  }, [year, month, organizationEmployees.length, loadingEmployees, loadingShiftData]);

  async function exportScheduleExcel() {
    if (
      exportingExcel ||
      loadingEmployees ||
      loadingShiftData ||
      organizationEmployees.length === 0
    ) {
      return;
    }

    setExportingExcel(true);
    setShiftDataError(null);

    try {
      const response = await fetch(
        `${API_BASE}/export?year=${year}&month=${month + 1}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        const raw = await response.text();

        if (contentType.includes("application/json")) {
          try {
            const payload = JSON.parse(raw) as { error?: unknown };
            throw new Error(
              String(payload.error ?? "Failed to export schedule."),
            );
          } catch (parseError) {
            if (parseError instanceof Error) {
              throw parseError;
            }
            throw new Error("Failed to export schedule.");
          }
        }

        throw new Error(
          `Export failed with status ${response.status}.`,
        );
      }

      const blob = await response.blob();

      const disposition =
        response.headers.get("content-disposition") ?? "";

      let filename = `Emp. Shift_IT_${year}_${pad(month + 1)}.xlsx`;

      const filenameMatch = disposition.match(
        /filename\*?=(?:UTF-8'')?[\"']?([^\"';]+)[\"']?/i,
      );

      if (filenameMatch?.[1]) {
        try {
          filename = decodeURIComponent(filenameMatch[1]);
        } catch {
          filename = filenameMatch[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error) {
      console.error("Failed to export schedule", error);
      setShiftDataError(
        error instanceof Error
          ? error.message
          : "Failed to export schedule.",
      );
    } finally {
      setExportingExcel(false);
    }
  }

  async function generateSchedule() {
    if (loadingEmployees || loadingShiftData || loadingGeneratedSchedule || authLoading) return;

    if (!isSupervisor) {
      setShiftDataError(text("supervisorOnly", language));
      return;
    }

    if (!isFutureMonth) {
      setShiftDataError(text("monthLocked", language));
      return;
    }

    setShiftDataError(null);

    const rotationSaved = await saveRotationPairs();
    if (!rotationSaved) return;

    try {
      await fetchJson(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month: month + 1 }),
      });

      await loadGeneratedSchedules(true);
      setGenerated(true);
      setActiveTab("schedule");
    } catch (error) {
      console.error("Failed to generate schedule", error);
      setShiftDataError(
        error instanceof Error ? error.message : "Failed to generate schedule.",
      );
    }
  }

  const scheduleMap = useMemo(() => {
    const byEmployee: Record<string, ScheduleType[]> = {};

    for (const row of generatedScheduleRows) {
      if (!byEmployee[row.employee_no]) {
        byEmployee[row.employee_no] = Array.from(
          { length: daysInMonth },
          () => "OFF" as ScheduleType,
        );
      }

      const day = Number(String(row.schedule_date).slice(8, 10));
      if (day >= 1 && day <= daysInMonth) {
        byEmployee[row.employee_no][day - 1] = row.schedule_type;
      }
    }

    return byEmployee;
  }, [generatedScheduleRows, daysInMonth]);

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    return rotationMembers.map((member) => ({
      employeeId: member.employeeId,
      name: member.name,
      nameCn: member.nameCn,
      department: member.department,
      departmentCn: member.departmentCn,
      fixed: member.excluded ? true : undefined,
      schedule:
        scheduleMap[member.employeeId] ??
        Array.from({ length: daysInMonth }, () => "OFF" as ScheduleType),
    }));
  }, [rotationMembers, scheduleMap, daysInMonth]);

  const tabs = [
    { key: "overview" as const, label: text("overview", language) },
    { key: "master" as const, label: text("shiftMaster", language) },
    { key: "rotation" as const, label: text("rotation", language) },
    { key: "schedule" as const, label: text("schedule", language) },
    { key: "calendar" as const, label: text("calendar", language) },
  ];

  const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <OrganizationGate
      allow={(access) =>
        access.canViewOrganizationShift || access.canManageOrganizationShift
      }
    >
    <AppShell title={text("title", language)}>
      <div className="shift-management-page min-h-full space-y-4 bg-slate-50/70 p-4 text-slate-800 dark:bg-slate-950 dark:text-slate-100 ">
        <style>{`
          button:not(:disabled),
          select:not(:disabled) { cursor: pointer; }
          button:disabled,
          select:disabled { cursor: not-allowed; }

          .shift-management-page .shift-card-hover {
            transition:
              border-color .25s ease,
              box-shadow .25s ease,
              background-color .25s ease;
          }




          /* Clean adaptive enterprise theme.
           * Light mode is the default. Dark mode is supported when the app
           * uses either .dark or data-theme="dark" on an ancestor/root.
           */
          .shift-management-page {
            --sm-page: #f7f9fc;
            --sm-card: #ffffff;
            --sm-panel: #f8fafc;
            --sm-panel-strong: #eef2f7;
            --sm-border: #e3e8ef;
            --sm-text: #172033;
            --sm-muted: #5c687a;
            --sm-dim: #8b96a8;
            --sm-input: #ffffff;
            --sm-table-head: #f5f7fa;
            --sm-table-cell: #ffffff;
            --sm-table-hover: #f8fafc;
            --sm-sticky: #ffffff;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-synthesis-weight: none;
            background: var(--sm-page);
            color: var(--sm-text);
          }

          .shift-management-page .bg-surface { background-color: var(--sm-card) !important; }
          .shift-management-page .bg-surface-hover { background-color: var(--sm-panel) !important; }
          .shift-management-page .bg-surface-hover\/60 { background-color: color-mix(in srgb, var(--sm-panel) 72%, transparent) !important; }
          .shift-management-page .bg-surface-hover\/70 { background-color: color-mix(in srgb, var(--sm-panel) 82%, transparent) !important; }
          .shift-management-page .border-border,
          .shift-management-page .border-border-subtle,
          .shift-management-page .border-slate-100,
          .shift-management-page .border-slate-200 { border-color: var(--sm-border) !important; }
          .shift-management-page .text-text { color: var(--sm-text) !important; }
          .shift-management-page .text-text-muted { color: var(--sm-muted) !important; }
          .shift-management-page .text-text-dim { color: var(--sm-dim) !important; }

          /* Dark theme detection: support class and data-attribute based themes. */
          .shift-management-page.dark,
          .dark .shift-management-page,
          .shift-management-page[data-theme="dark"],
          [data-theme="dark"] .shift-management-page {
            --sm-page: #080d15;
            --sm-card: #0f1621;
            --sm-panel: #121a27;
            --sm-panel-strong: #172233;
            --sm-border: #202b3a;
            --sm-text: #e8edf4;
            --sm-muted: #9aa8ba;
            --sm-dim: #6f7d92;
            --sm-input: #0c131e;
            --sm-table-head: #121b29;
            --sm-table-cell: #0d141f;
            --sm-table-hover: #131d2a;
            --sm-sticky: #101822;
            color-scheme: dark;
            background: var(--sm-page);
            color: var(--sm-text);
          }

          /* Dark overrides for the redesigned utility classes. */
          .shift-management-page.dark .bg-surface,
          .dark .shift-management-page .bg-surface,
          .shift-management-page[data-theme="dark"] .bg-surface,
          [data-theme="dark"] .shift-management-page .bg-surface { background-color: var(--sm-card) !important; }

          .shift-management-page.dark .bg-surface-hover,
          .dark .shift-management-page .bg-surface-hover,
          .shift-management-page[data-theme="dark"] .bg-surface-hover,
          [data-theme="dark"] .shift-management-page .bg-surface-hover { background-color: var(--sm-panel) !important; }

          .shift-management-page.dark .bg-surface-hover\/60,
          .dark .shift-management-page .bg-surface-hover\/60,
          .shift-management-page[data-theme="dark"] .bg-surface-hover\/60,
          [data-theme="dark"] .shift-management-page .bg-surface-hover\/60 { background-color: rgba(23,32,51,.72) !important; }

          .shift-management-page.dark .bg-surface-hover\/70,
          .dark .shift-management-page .bg-surface-hover\/70,
          .shift-management-page[data-theme="dark"] .bg-surface-hover\/70,
          [data-theme="dark"] .shift-management-page .bg-surface-hover\/70 { background-color: rgba(23,32,51,.82) !important; }

          .shift-management-page.dark .bg-white,
          .dark .shift-management-page .bg-white,
          .shift-management-page[data-theme="dark"] .bg-white,
          [data-theme="dark"] .shift-management-page .bg-white,
          .shift-management-page.dark .bg-white\/95,
          .dark .shift-management-page .bg-white\/95,
          .shift-management-page[data-theme="dark"] .bg-white\/95,
          [data-theme="dark"] .shift-management-page .bg-white\/95 { background-color: var(--sm-card) !important; }

          .shift-management-page.dark .bg-slate-50,
          .dark .shift-management-page .bg-slate-50,
          .shift-management-page[data-theme="dark"] .bg-slate-50,
          [data-theme="dark"] .shift-management-page .bg-slate-50,
          .shift-management-page.dark .bg-slate-50\/70,
          .dark .shift-management-page .bg-slate-50\/70,
          .shift-management-page[data-theme="dark"] .bg-slate-50\/70,
          [data-theme="dark"] .shift-management-page .bg-slate-50\/70,
          .shift-management-page.dark .bg-slate-50\/80,
          .dark .shift-management-page .bg-slate-50\/80,
          .shift-management-page[data-theme="dark"] .bg-slate-50\/80,
          [data-theme="dark"] .shift-management-page .bg-slate-50\/80,
          .shift-management-page.dark .bg-slate-50\/95,
          .dark .shift-management-page .bg-slate-50\/95,
          .shift-management-page[data-theme="dark"] .bg-slate-50\/95,
          [data-theme="dark"] .shift-management-page .bg-slate-50\/95 { background-color: var(--sm-table-head) !important; }

          .shift-management-page.dark .bg-slate-100,
          .dark .shift-management-page .bg-slate-100,
          .shift-management-page[data-theme="dark"] .bg-slate-100,
          [data-theme="dark"] .shift-management-page .bg-slate-100,
          .shift-management-page.dark .bg-slate-100\/80,
          .dark .shift-management-page .bg-slate-100\/80,
          .shift-management-page[data-theme="dark"] .bg-slate-100\/80,
          [data-theme="dark"] .shift-management-page .bg-slate-100\/80 { background-color: var(--sm-panel-strong) !important; }

          .shift-management-page.dark .hover\\:bg-slate-50\\/80:hover,
          .dark .shift-management-page .hover\\:bg-slate-50\\/80:hover,
          .shift-management-page[data-theme="dark"] .hover\\:bg-slate-50\\/80:hover,
          [data-theme="dark"] .shift-management-page .hover\\:bg-slate-50\\/80:hover { background-color: var(--sm-table-hover) !important; }

          .shift-management-page.dark .hover\\:bg-slate-50\\/70:hover,
          .dark .shift-management-page .hover\\:bg-slate-50\\/70:hover,
          .shift-management-page[data-theme="dark"] .hover\\:bg-slate-50\\/70:hover,
          [data-theme="dark"] .shift-management-page .hover\\:bg-slate-50\\/70:hover { background-color: var(--sm-table-hover) !important; }

          .shift-management-page.dark .hover\\:bg-slate-50:hover,
          .dark .shift-management-page .hover\\:bg-slate-50:hover,
          .shift-management-page[data-theme="dark"] .hover\\:bg-slate-50:hover,
          [data-theme="dark"] .shift-management-page .hover\\:bg-slate-50:hover { background-color: var(--sm-table-hover) !important; }

          .shift-management-page.dark .border-border,
          .shift-management-page.dark .border-border-subtle,
          .dark .shift-management-page .border-border,
          .dark .shift-management-page .border-border-subtle,
          .shift-management-page[data-theme="dark"] .border-border,
          .shift-management-page[data-theme="dark"] .border-border-subtle,
          [data-theme="dark"] .shift-management-page .border-border,
          [data-theme="dark"] .shift-management-page .border-border-subtle,
          .shift-management-page.dark .border-slate-100,
          .shift-management-page.dark .border-slate-200,
          .dark .shift-management-page .border-slate-100,
          .dark .shift-management-page .border-slate-200,
          .shift-management-page[data-theme="dark"] .border-slate-100,
          .shift-management-page[data-theme="dark"] .border-slate-200,
          [data-theme="dark"] .shift-management-page .border-slate-100,
          [data-theme="dark"] .shift-management-page .border-slate-200 { border-color: var(--sm-border) !important; }

          .shift-management-page.dark .text-text,
          .dark .shift-management-page .text-text,
          .shift-management-page[data-theme="dark"] .text-text,
          [data-theme="dark"] .shift-management-page .text-text { color: var(--sm-text) !important; }

          .shift-management-page.dark .text-text-muted,
          .dark .shift-management-page .text-text-muted,
          .shift-management-page[data-theme="dark"] .text-text-muted,
          [data-theme="dark"] .shift-management-page .text-text-muted { color: var(--sm-muted) !important; }

          .shift-management-page.dark .text-text-dim,
          .dark .shift-management-page .text-text-dim,
          .shift-management-page[data-theme="dark"] .text-text-dim,
          [data-theme="dark"] .shift-management-page .text-text-dim { color: var(--sm-dim) !important; }

          /* Explicit slate text used by the redesign. */
          .shift-management-page.dark .text-slate-900,
          .dark .shift-management-page .text-slate-900,
          .shift-management-page[data-theme="dark"] .text-slate-900,
          [data-theme="dark"] .shift-management-page .text-slate-900 { color: #f1f5f9 !important; }
          .shift-management-page.dark .text-slate-800,
          .dark .shift-management-page .text-slate-800,
          .shift-management-page[data-theme="dark"] .text-slate-800,
          [data-theme="dark"] .shift-management-page .text-slate-800 { color: #e2e8f0 !important; }
          .shift-management-page.dark .text-slate-700,
          .dark .shift-management-page .text-slate-700,
          .shift-management-page[data-theme="dark"] .text-slate-700,
          [data-theme="dark"] .shift-management-page .text-slate-700 { color: #cbd5e1 !important; }
          .shift-management-page.dark .text-slate-600,
          .shift-management-page.dark .text-slate-500,
          .dark .shift-management-page .text-slate-600,
          .dark .shift-management-page .text-slate-500,
          .shift-management-page[data-theme="dark"] .text-slate-600,
          .shift-management-page[data-theme="dark"] .text-slate-500,
          [data-theme="dark"] .shift-management-page .text-slate-600,
          [data-theme="dark"] .shift-management-page .text-slate-500 { color: #94a3b8 !important; }
          .shift-management-page.dark .text-slate-400,
          .dark .shift-management-page .text-slate-400,
          .shift-management-page[data-theme="dark"] .text-slate-400,
          [data-theme="dark"] .shift-management-page .text-slate-400 { color: #64748b !important; }

          .shift-management-page.dark input,
          .shift-management-page.dark select,
          .dark .shift-management-page input,
          .dark .shift-management-page select,
          .shift-management-page[data-theme="dark"] input,
          .shift-management-page[data-theme="dark"] select,
          [data-theme="dark"] .shift-management-page input,
          [data-theme="dark"] .shift-management-page select {
            background-color: var(--sm-input) !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
            color-scheme: dark;
          }

          .shift-management-page.dark option,
          .dark .shift-management-page option,
          .shift-management-page[data-theme="dark"] option,
          [data-theme="dark"] .shift-management-page option {
            background: #131d2d;
            color: #e2e8f0;
          }

          .shift-management-page .bg-white { background-color: var(--sm-card) !important; }

          /* In dark mode the table itself also changes surface, while preserving
             the Today / rotation column highlights supplied by the Tailwind classes. */
          .shift-management-page.dark table tbody td,
          .dark .shift-management-page table tbody td,
          .shift-management-page[data-theme="dark"] table tbody td,
          [data-theme="dark"] .shift-management-page table tbody td { background-color: var(--sm-table-cell); }

          .shift-management-page.dark table thead th,
          .dark .shift-management-page table thead th,
          .shift-management-page[data-theme="dark"] table thead th,
          [data-theme="dark"] .shift-management-page table thead th { background-color: var(--sm-table-head); }

          .shift-management-page.dark table tbody tr:hover td,
          .dark .shift-management-page table tbody tr:hover td,
          .shift-management-page[data-theme="dark"] table tbody tr:hover td,
          [data-theme="dark"] .shift-management-page table tbody tr:hover td { background-color: var(--sm-table-hover); }

          .shift-management-page.dark table td.sticky,
          .dark .shift-management-page table td.sticky,
          .shift-management-page[data-theme="dark"] table td.sticky,
          [data-theme="dark"] .shift-management-page table td.sticky { background-color: var(--sm-sticky) !important; }

          .shift-management-page .text-\[8px\],
          .shift-management-page .text-\[9px\],
          .shift-management-page .text-\[10px\] {
            -webkit-font-smoothing: antialiased;
          }


          /* ============================================================
           * V7 FULL VISUAL REDESIGN
           * A calmer, premium enterprise scheduling surface.
           * No application logic/API behavior is changed.
           * ============================================================ */

          .shift-management-page {
            background: var(--sm-page) !important;
          }

          /* Top title */
          .shift-management-page h1,
          .shift-management-page h2 {
            letter-spacing: -0.015em;
          }

          /* Nav strip */
          .shift-management-page .flex.overflow-x-auto.rounded-xl.border {
            background: var(--sm-panel) !important;
            border-color: var(--sm-border) !important;
            border-radius: 14px !important;
            padding: 4px !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
          }
          .shift-management-page .flex.overflow-x-auto.rounded-xl.border button {
            min-height: 38px;
            border-radius: 10px !important;
          }
          .shift-management-page .flex.overflow-x-auto.rounded-xl.border button.bg-cyan-500 {
            background: var(--sm-card) !important;
            color: var(--sm-text) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 0 0 1px var(--sm-border);
          }

          /* Main card */
          .shift-management-page .rounded-2xl.border.bg-surface {
            background: var(--sm-card) !important;
            border-color: var(--sm-border) !important;
            border-radius: 18px !important;
            box-shadow:
              0 12px 36px rgba(15,23,42,.045),
              inset 0 1px 0 rgba(255,255,255,.025);
            overflow: hidden;
          }

          /* Schedule toolbar */
          .shift-management-page .rounded-2xl.border.bg-surface > .border-b {
            background: var(--sm-card) !important;
            border-color: var(--sm-border) !important;
          }
          .shift-management-page .rounded-2xl.border.bg-surface > .border-b > div {
            gap: 10px;
          }

          /* Make primary action family visually consistent. */
          .shift-management-page button.bg-indigo-500,
          .shift-management-page button.bg-cyan-500 {
            background: var(--sm-panel-strong) !important;
            border-color: var(--sm-border) !important;
            color: var(--sm-text) !important;
            box-shadow: 0 1px 2px rgba(15,23,42,.08) !important;
          }
          .shift-management-page button.bg-indigo-500:hover,
          .shift-management-page button.bg-cyan-500:hover {
            background: color-mix(in srgb, var(--sm-panel-strong) 76%, var(--sm-card)) !important;
          }
          .shift-management-page button.bg-emerald-50 {
            background: rgba(16,185,129,.09) !important;
            border-color: rgba(16,185,129,.24) !important;
            color: #159669 !important;
          }

          /* Legend: lighter, quieter, pill-like. */
          .shift-management-page .rounded-md.border.bg-emerald-50,
          .shift-management-page .rounded-md.border.bg-amber-50,
          .shift-management-page .rounded-md.border.bg-cyan-50,
          .shift-management-page .rounded-md.border.bg-indigo-50,
          .shift-management-page .rounded-md.border.bg-surface-hover {
            border-color: color-mix(in srgb, var(--sm-border) 80%, transparent) !important;
            border-radius: 999px !important;
          }

          /* Filters */
          .shift-management-page input,
          .shift-management-page select {
            min-height: 42px;
            border-radius: 12px !important;
            border-color: var(--sm-border) !important;
            background: var(--sm-input) !important;
            color: var(--sm-text) !important;
            box-shadow: inset 0 1px 1px rgba(15,23,42,.025);
          }
          .shift-management-page input::placeholder {
            color: var(--sm-dim) !important;
          }
          .shift-management-page input:focus,
          .shift-management-page select:focus {
            border-color: rgba(96,165,250,.50) !important;
            box-shadow: 0 0 0 3px rgba(96,165,250,.08) !important;
            outline: none !important;
          }

          /* Date navigator */
          .shift-management-page .inline-flex.h-9 {
            border-radius: 11px !important;
          }

          /* Table becomes a surface instead of a spreadsheet grid. */
          .shift-management-page table.w-max {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            background: var(--sm-table-cell) !important;
          }
          .shift-management-page table.w-max thead tr {
            background: var(--sm-table-head) !important;
          }
          .shift-management-page table.w-max thead th {
            height: 60px;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
            border-color: var(--sm-border) !important;
            background: var(--sm-table-head) !important;
            color: var(--sm-muted) !important;
            font-variant-numeric: tabular-nums;
          }
          .shift-management-page table.w-max thead th:first-child {
            padding-left: 18px !important;
          }
          .shift-management-page table.w-max tbody tr {
            background: var(--sm-table-cell);
            transition: background-color .16s ease;
          }
          .shift-management-page table.w-max tbody tr:nth-child(even) {
            background: color-mix(in srgb, var(--sm-table-cell) 96%, var(--sm-panel));
          }
          .shift-management-page table.w-max tbody tr:hover {
            background: var(--sm-table-hover) !important;
          }
          .shift-management-page table.w-max tbody td {
            height: 66px;
            border-color: color-mix(in srgb, var(--sm-border) 78%, transparent) !important;
          }

          /* Reduce vertical-line noise. */
          .shift-management-page table.w-max tbody td:not(.sticky),
          .shift-management-page table.w-max thead th:not(.sticky) {
            border-left-color: color-mix(in srgb, var(--sm-border) 54%, transparent) !important;
          }

          /* Employee rail */
          .shift-management-page table.w-max th.sticky,
          .shift-management-page table.w-max td.sticky {
            background: var(--sm-sticky) !important;
          }
          .shift-management-page table.w-max th.sticky {
            min-width: 300px !important;
            border-right-color: var(--sm-border) !important;
          }
          .shift-management-page table.w-max td.sticky {
            min-width: 300px !important;
            border-right-color: var(--sm-border) !important;
            box-shadow: 9px 0 22px -23px rgba(0,0,0,.5);
          }

          /* Schedule cells */
          .shift-management-page table.w-max th:not(:first-child),
          .shift-management-page table.w-max td:not(.sticky) {
            min-width: 70px !important;
          }
          .shift-management-page table.w-max td > span {
            min-width: 52px !important;
            min-height: 28px;
            border-radius: 9px !important;
            padding: 5px 8px !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            box-shadow: none !important;
          }

          /* Today */
          .shift-management-page table.w-max thead th.bg-sky-50,
          .shift-management-page table.w-max td.bg-sky-50\/70 {
            background: rgba(56,189,248,.055) !important;
          }
          .shift-management-page table.w-max thead th.bg-sky-50 {
            color: #45a8d4 !important;
            box-shadow: inset 0 -2px 0 rgba(56,189,248,.58);
          }

          /* Rotation days */
          .shift-management-page table.w-max thead th.bg-amber-50,
          .shift-management-page table.w-max td.bg-amber-50\/70 {
            background: rgba(245,158,11,.045) !important;
          }
          .shift-management-page table.w-max thead th.bg-amber-50 {
            color: #b8893b !important;
            box-shadow: inset 0 -2px 0 rgba(245,158,11,.35);
          }

          /* Muted fixed badge */
          .shift-management-page .bg-amber-50.text-amber-700 {
            background: rgba(245,158,11,.075) !important;
            border-color: rgba(245,158,11,.18) !important;
          }

          /* Rotation pair cards — preserve color in dark mode. */
          .shift-management-page .border-cyan-200\/70 {
            background: rgba(236, 254, 255, .72);
            border-color: rgba(103, 232, 249, .35) !important;
          }
          .shift-management-page .border-violet-200\/70 {
            background: rgba(245, 243, 255, .72);
            border-color: rgba(196, 181, 253, .35) !important;
          }
          .shift-management-page.dark .border-cyan-200\/70,
          .dark .shift-management-page .border-cyan-200\/70,
          [data-theme="dark"] .shift-management-page .border-cyan-200\/70 {
            background: linear-gradient(135deg, rgba(8, 47, 73, .78), rgba(12, 74, 110, .34)) !important;
            border-color: rgba(34, 211, 238, .26) !important;
          }
          .shift-management-page.dark .border-violet-200\/70,
          .dark .shift-management-page .border-violet-200\/70,
          [data-theme="dark"] .shift-management-page .border-violet-200\/70 {
            background: linear-gradient(135deg, rgba(46, 16, 101, .76), rgba(76, 29, 149, .32)) !important;
            border-color: rgba(167, 139, 250, .26) !important;
          }

          /* Footer rule */
          .shift-management-page table.w-max + div {
            background: var(--sm-panel) !important;
            border-color: var(--sm-border) !important;
          }

          /* ============================================================
           * DARK MODE — deliberate, low-contrast, no bright spreadsheet grid
           * ============================================================ */
          .shift-management-page.dark,
          .dark .shift-management-page,
          .shift-management-page[data-theme="dark"],
          [data-theme="dark"] .shift-management-page {
            background: #080d15 !important;
          }

          .shift-management-page.dark .flex.overflow-x-auto.rounded-xl.border,
          .dark .shift-management-page .flex.overflow-x-auto.rounded-xl.border,
          [data-theme="dark"] .shift-management-page .flex.overflow-x-auto.rounded-xl.border {
            background: #111a28 !important;
            border-color: #202b3b !important;
          }

          .shift-management-page.dark .rounded-2xl.border.bg-surface,
          .dark .shift-management-page .rounded-2xl.border.bg-surface,
          [data-theme="dark"] .shift-management-page .rounded-2xl.border.bg-surface {
            background: #0f1621 !important;
            border-color: #202b3b !important;
            box-shadow: 0 18px 45px rgba(0,0,0,.16) !important;
          }

          .shift-management-page.dark table.w-max,
          .dark .shift-management-page table.w-max,
          [data-theme="dark"] .shift-management-page table.w-max {
            background: #0d141f !important;
          }
          .shift-management-page.dark table.w-max thead tr,
          .dark .shift-management-page table.w-max thead tr,
          [data-theme="dark"] .shift-management-page table.w-max thead tr {
            background: #121b29 !important;
          }
          .shift-management-page.dark table.w-max thead th,
          .dark .shift-management-page table.w-max thead th,
          [data-theme="dark"] .shift-management-page table.w-max thead th {
            background: #121b29 !important;
            border-color: #202b3b !important;
            color: #7f8da2 !important;
          }
          .shift-management-page.dark table.w-max tbody tr,
          .dark .shift-management-page table.w-max tbody tr,
          [data-theme="dark"] .shift-management-page table.w-max tbody tr {
            background: #0d141f !important;
          }
          .shift-management-page.dark table.w-max tbody tr:nth-child(even),
          .dark .shift-management-page table.w-max tbody tr:nth-child(even),
          [data-theme="dark"] .shift-management-page table.w-max tbody tr:nth-child(even) {
            background: #101823 !important;
          }
          .shift-management-page.dark table.w-max tbody tr:hover,
          .dark .shift-management-page table.w-max tbody tr:hover,
          [data-theme="dark"] .shift-management-page table.w-max tbody tr:hover {
            background: #141e2b !important;
          }
          .shift-management-page.dark table.w-max tbody td,
          .dark .shift-management-page table.w-max tbody td,
          [data-theme="dark"] .shift-management-page table.w-max tbody td {
            border-color: #1d2735 !important;
          }
          .shift-management-page.dark table.w-max td.sticky,
          .dark .shift-management-page table.w-max td.sticky,
          [data-theme="dark"] .shift-management-page table.w-max td.sticky,
          .shift-management-page.dark table.w-max th.sticky,
          .dark .shift-management-page table.w-max th.sticky,
          [data-theme="dark"] .shift-management-page table.w-max th.sticky {
            background: #101822 !important;
          }

          /* Dark inputs and controls */
          .shift-management-page.dark input,
          .shift-management-page.dark select,
          .dark .shift-management-page input,
          .dark .shift-management-page select,
          [data-theme="dark"] .shift-management-page input,
          [data-theme="dark"] .shift-management-page select {
            background: #0c131e !important;
            color: #e5ebf3 !important;
            border-color: #263244 !important;
          }

          /* Dark buttons */
          .shift-management-page.dark button.bg-indigo-500,
          .shift-management-page.dark button.bg-cyan-500,
          .dark .shift-management-page button.bg-indigo-500,
          .dark .shift-management-page button.bg-cyan-500,
          [data-theme="dark"] .shift-management-page button.bg-indigo-500,
          [data-theme="dark"] .shift-management-page button.bg-cyan-500 {
            background: #172232 !important;
            color: #e8edf4 !important;
            border-color: #2a3748 !important;
          }

          /* Dark soft shift colors */
          .shift-management-page.dark table.w-max td > span.border-emerald-200,
          .dark .shift-management-page table.w-max td > span.border-emerald-200,
          [data-theme="dark"] .shift-management-page table.w-max td > span.border-emerald-200 {
            background: rgba(16,185,129,.09) !important;
            border-color: rgba(52,211,153,.20) !important;
            color: #78d6ad !important;
          }
          .shift-management-page.dark table.w-max td > span.border-amber-200,
          .dark .shift-management-page table.w-max td > span.border-amber-200,
          [data-theme="dark"] .shift-management-page table.w-max td > span.border-amber-200 {
            background: rgba(245,158,11,.085) !important;
            border-color: rgba(251,191,36,.18) !important;
            color: #dfb45f !important;
          }
          .shift-management-page.dark table.w-max td > span.border-sky-200,
          .dark .shift-management-page table.w-max td > span.border-sky-200,
          [data-theme="dark"] .shift-management-page table.w-max td > span.border-sky-200 {
            background: rgba(14,165,233,.09) !important;
            border-color: rgba(56,189,248,.18) !important;
            color: #79c5eb !important;
          }
          .shift-management-page.dark table.w-max td > span.border-violet-200,
          .dark .shift-management-page table.w-max td > span.border-violet-200,
          [data-theme="dark"] .shift-management-page table.w-max td > span.border-violet-200 {
            background: rgba(139,92,246,.085) !important;
            border-color: rgba(167,139,250,.18) !important;
            color: #b3a0ed !important;
          }
          .shift-management-page.dark table.w-max td > span.border-slate-200,
          .dark .shift-management-page table.w-max td > span.border-slate-200,
          [data-theme="dark"] .shift-management-page table.w-max td > span.border-slate-200 {
            background: #192230 !important;
            border-color: #293647 !important;
            color: #9aa8ba !important;
          }


          /* ============================================================
           * PREMIUM DARK WORK SCHEDULE CALENDAR
           * Softer contrast, blue-gray surfaces, restrained weekend tint,
           * and compact schedule chips.
           * ============================================================ */
          .shift-management-page.dark,
          .dark .shift-management-page,
          .shift-management-page[data-theme="dark"],
          [data-theme="dark"] .shift-management-page {
            --sm-page: #0b1120;
            --sm-card: #111827;
            --sm-panel: #151f30;
            --sm-panel-strong: #1b2739;
            --sm-border: #263449;
            --sm-text: #f3f6fb;
            --sm-muted: #9eacc0;
            --sm-dim: #708198;
            --sm-input: #0f1726;
            --sm-table-head: #121c2c;
            --sm-table-cell: #101827;
            --sm-table-hover: #162235;
            --sm-sticky: #111a28;
          }

          .dark .shift-management-page .work-schedule-calendar,
          [data-theme="dark"] .shift-management-page .work-schedule-calendar {
            border-color: #27364c !important;
            background: #0f1726 !important;
          }

          .dark .shift-management-page .work-schedule-weekday,
          [data-theme="dark"] .shift-management-page .work-schedule-weekday {
            background: #151f30 !important;
            color: #98a8bf !important;
            border-color: #27364c !important;
          }

          .dark .shift-management-page .work-schedule-weekday:nth-child(n+6),
          [data-theme="dark"] .shift-management-page .work-schedule-weekday:nth-child(n+6) {
            background: #182437 !important;
            color: #8ea1ba !important;
          }

          .dark .shift-management-page .work-schedule-empty,
          [data-theme="dark"] .shift-management-page .work-schedule-empty {
            background: #0f1726 !important;
            border-color: #243248 !important;
          }

          .dark .shift-management-page .work-schedule-cell,
          [data-theme="dark"] .shift-management-page .work-schedule-cell {
            background: #101827 !important;
            border-color: #243248 !important;
          }

          .dark .shift-management-page .work-schedule-cell:nth-child(7n+6),
          .dark .shift-management-page .work-schedule-cell:nth-child(7n),
          [data-theme="dark"] .shift-management-page .work-schedule-cell:nth-child(7n+6),
          [data-theme="dark"] .shift-management-page .work-schedule-cell:nth-child(7n) {
            background: #121d2d !important;
          }

          .dark .shift-management-page .work-schedule-cell:hover,
          [data-theme="dark"] .shift-management-page .work-schedule-cell:hover {
            background: #172438 !important;
          }

          .dark .shift-management-page .work-schedule-cell.bg-cyan-50\/60,
          [data-theme="dark"] .shift-management-page .work-schedule-cell.bg-cyan-50\/60 {
            background:
              linear-gradient(0deg, rgba(34,211,238,.07), rgba(34,211,238,.07)),
              #101827 !important;
            box-shadow: inset 0 0 0 1px rgba(56,189,248,.42) !important;
          }

          .dark .shift-management-page .work-schedule-cell .bg-white,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .bg-white {
            background: transparent !important;
          }

          /* Date labels */
          .dark .shift-management-page .work-schedule-cell .text-text,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .text-text {
            color: #e9eef7 !important;
          }

          .dark .shift-management-page .work-schedule-cell .text-slate-500,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .text-slate-500 {
            color: #90a2bb !important;
          }

          /* Today pill */
          .dark .shift-management-page .work-schedule-cell .border-cyan-200,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .border-cyan-200 {
            border-color: rgba(56,189,248,.45) !important;
          }

          .dark .shift-management-page .work-schedule-cell .text-cyan-700,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .text-cyan-700 {
            color: #65d3f2 !important;
          }

          /* Schedule chips */
          .dark .shift-management-page .work-schedule-cell .border-emerald-200.bg-emerald-50,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .border-emerald-200.bg-emerald-50 {
            background: rgba(16,185,129,.13) !important;
            border-color: rgba(52,211,153,.28) !important;
            color: #78ddb6 !important;
          }

          .dark .shift-management-page .work-schedule-cell .border-amber-200.bg-amber-50,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .border-amber-200.bg-amber-50 {
            background: rgba(245,158,11,.13) !important;
            border-color: rgba(251,191,36,.28) !important;
            color: #f4c56e !important;
          }

          .dark .shift-management-page .work-schedule-cell .border-slate-200.bg-slate-50,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .border-slate-200.bg-slate-50 {
            background: rgba(100,116,139,.12) !important;
            border-color: rgba(148,163,184,.20) !important;
            color: #b2bfd1 !important;
          }

          .dark .shift-management-page .work-schedule-cell .border-rose-200.bg-rose-50,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .border-rose-200.bg-rose-50 {
            background: rgba(244,63,94,.12) !important;
            border-color: rgba(251,113,133,.27) !important;
            color: #ff8ea5 !important;
          }

          /* Locked label */
          .dark .shift-management-page .work-schedule-cell .text-rose-600,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .text-rose-600 {
            color: #ff8ea5 !important;
          }

          /* Other employees' OFF notes */
          .dark .shift-management-page .work-schedule-cell .text-rose-500,
          [data-theme="dark"] .shift-management-page .work-schedule-cell .text-rose-500 {
            color: #ff829d !important;
          }

          /* Calendar toolbar */
          .dark .shift-management-page .work-schedule-calendar + *,
          [data-theme="dark"] .shift-management-page .work-schedule-calendar + * {
            color: #9eacc0;
          }

          /* Avoid tiny text disappearing in dark mode. */
          .shift-management-page.dark .text-slate-400,
          .dark .shift-management-page .text-slate-400,
          [data-theme="dark"] .shift-management-page .text-slate-400 {
            color: #7e8ba0 !important;
          }
          .shift-management-page.dark .text-slate-500,
          .dark .shift-management-page .text-slate-500,
          [data-theme="dark"] .shift-management-page .text-slate-500 {
            color: #8c99ad !important;
          }
          .shift-management-page.dark .text-slate-600,
          .dark .shift-management-page .text-slate-600,
          [data-theme="dark"] .shift-management-page .text-slate-600 {
            color: #a1adbd !important;
          }
          .shift-management-page.dark .text-slate-800,
          .dark .shift-management-page .text-slate-800,
          [data-theme="dark"] .shift-management-page .text-slate-800 {
            color: #e4eaf2 !important;
          }

          @media (max-width: 1024px) {
            .shift-management-page table.w-max th:not(:first-child),
            .shift-management-page table.w-max td:not(.sticky) {
              min-width: 62px !important;
            }
            .shift-management-page table.w-max td.sticky,
            .shift-management-page table.w-max th.sticky {
              min-width: 225px !important;
            }
          }

        `}</style>
        {(employeeLoadError || shiftDataError) && (
          <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-4 py-3 text-xs font-semibold text-rose-700 ">
            {employeeLoadError || shiftDataError}
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-600 shadow-sm ">
              ⇄
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text">{text("title", language)}</h1>
              <p className="mt-0.5 text-[10px] text-text-dim">
                {language === "cn"
                  ? "智能物流半月轮班管理"
                  : "Smart Logistic semi-monthly shift rotation"}
              </p>
            </div>
          </div>

        </div>

        <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm ">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-[10px] font-semibold transition ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 "
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800 "
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("dayShift", language)}</p>
                <p className="mt-2 text-xl font-bold text-sky-700 ">D/S</p>
                <p className="mt-1 text-[10px] text-text-dim">08:00 – 20:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("nightShift", language)}</p>
                <p className="mt-2 text-xl font-bold text-violet-700 ">N/S</p>
                <p className="mt-1 text-[10px] text-text-dim">20:00 – 08:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("rotationType", language)}</p>
                <p className="mt-2 text-xl font-bold text-text">15 / 16</p>
                <p className="mt-1 text-[10px] text-text-dim">{text("every15th16th", language)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("transitionRule", language)}</p>
                <p className="mt-2 text-xl font-bold text-amber-700 ">OFF 1</p>
                <p className="mt-1 text-[10px] text-text-dim">{text("scheduleRule", language)}</p>
              </Card>
            </div>

            <Card className="p-4">
              <SectionTitle
                title={text("smartLogisticRotation", language)}
                subtitle={
                  language === "cn"
                    ? "员工来自组织管理；班次和轮班规则由数据库维护"
                    : "Employees come from Organization Management; shift and rotation data are stored in MySQL"
                }
              />

              {loadingEmployees || loadingShiftData ? (
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-4 text-xs font-semibold text-text-muted">
                  {text("loading", language)}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-4 text-xs font-semibold text-text-muted">
                  {text("noData", language)}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`rounded-lg border p-3 ${
                        member.excluded
                          ? "border-amber-500/50 bg-amber-500/10 "
                          : "border-border-subtle bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-text ">
                            {language === "cn" ? member.nameCn || member.name : member.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-dim ">{member.employeeId}</p>
                        </div>
                        {member.excluded ? (
                          <span className="inline-flex items-center rounded-md border border-amber-400 bg-amber-500 px-2.5 py-1 text-[9px] font-extrabold text-white shadow-sm ">
                            {text("excluded", language)}
                          </span>
                        ) : (
                          <ShiftBadge shift={member.shift} language={language} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <SectionTitle
                title={text("rotationRule", language)}
                subtitle={
                  language === "cn"
                    ? "根据数据库 Pair Group 交替轮换"
                    : "Rotation members alternate according to database Pair Group"
                }
              />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-100/7 p-4 ">
                  <p className="text-[10px] text-text-dim">{text("periodOne", language)}</p>
                  <p className="mt-2 text-sm font-bold text-text">01 – 14</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/7 p-4 ">
                  <p className="text-[10px] text-text-dim">{text("periodTwo", language)}</p>
                  <p className="mt-2 text-sm font-bold text-text">15 – 16 / 17 – {daysInMonth}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 ">
                  <p className="text-[10px] font-semibold text-amber-700 ">
                    {text("transitionRule", language)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-amber-800 ">
                    N/S → {language === "cn" ? "休息" : "OFF"} → D/S
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "master" && (
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle px-4 py-3">
              <SectionTitle
                title={text("shiftMaster", language)}
                subtitle={
                  language === "cn"
                    ? "当前系统班次主数据"
                    : "Current shift master data"
                }
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 ">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                      {text("code", language)}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                      {text("dayShift", language)}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                      {text("time", language)}
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">
                      {text("status", language)}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {shiftMasters.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-xs font-semibold text-text-dim"
                      >
                        {text("noData", language)}
                      </td>
                    </tr>
                  ) : (
                    shiftMasters.map((shift, index) => {
                      const isDayRotation = shift.shift_code === "D/S";
                      const isNightRotation = shift.shift_code === "N/S";

                      const shiftName =
                        language === "cn"
                          ? shift.shift_name_cn || shift.shift_name_en || shift.shift_code
                          : shift.shift_name_en || shift.shift_name_cn || shift.shift_code;

                      return (
                        <tr
                          key={shift.id}
                          className="border-b border-border-subtle last:border-0 transition-colors hover:bg-slate-50/80 "
                        >
                          <td
                            className={`px-4 py-4 text-xs font-extrabold ${
                              isDayRotation
                                ? "text-cyan-500 "
                                : isNightRotation
                                  ? "text-indigo-500 "
                                  : shift.shift_code === "1"
                                    ? "text-emerald-600 "
                                    : "text-amber-600 "
                            }`}
                          >
                            {shift.shift_code}
                          </td>

                          <td className="px-4 py-4 text-xs font-semibold text-text">
                            {shiftName}
                          </td>

                          <td className="px-4 py-4 text-xs font-medium text-text-muted">
                            {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              active={toBoolean(shift.is_active)}
                              language={language}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "rotation" && (
          <div className="space-y-5">
            <Card className="p-4">
              <SectionTitle
                title={text("smartLogisticRotation", language)}
                subtitle={language === "cn" ? "数据库中的 智能物流轮班规则" : "Smart Logistic rotation rules stored in MySQL"}
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-3">
                  <p className="text-[10px] text-text-dim">{text("rotationType", language)}</p>
                  <p className="mt-2 text-xs font-bold text-text">{text("semiMonthly", language)}</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-3">
                  <p className="text-[10px] text-text-dim">{text("changeDate", language)}</p>
                  <p className="mt-2 text-xs font-bold text-text">{text("every15th16th", language)}</p>
                </div>
               <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 ">
                  <p className="text-[10px] font-semibold text-amber-700 ">
                    {text("transitionRule", language)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-amber-800 ">
                    N/S → {language === "cn" ? "休息" : "OFF"} → D/S
                  </p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-3">
                  <p className="text-[10px] text-text-dim">{text("rotationPeriod", language)}</p>
                  <p className="mt-2 text-xs font-bold text-text">01–14 / 15–16 / 17–End</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <SectionTitle
                title={text("pairConfiguration", language)}
                subtitle={
                  language === "cn"
                    ? "仅 Rotation 员工可配对；每组必须 1 名 D/S + 1 名 N/S。Fixed 员工不会轮班。"
                    : "Only Rotation employees can be paired; each pair must contain 1 D/S + 1 N/S. Fixed employees never rotate."
                }
              />

              <div className="grid gap-3 lg:grid-cols-2">
                {(["PAIR_A", "PAIR_B"] as const).map((group) => {
                  const selection = pairSelections[group];
                  const otherGroup = group === "PAIR_A" ? pairSelections.PAIR_B : pairSelections.PAIR_A;
                  const rotationDay =
                    group === "PAIR_A"
                      ? rotationRules[0]?.first_rotation_day
                      : rotationRules[0]?.second_rotation_day;

                  const optionsFor = (slot: "first" | "second", currentValue: string) =>
                    rotationMembers
                      .filter((member) => !member.excluded && Boolean(member.shift))
                      .filter((member) =>
                        slot === "first" ? member.shift === "D/S" : member.shift === "N/S",
                      )
                      .filter((member) => {
                        const selectedElsewhere = [
                          otherGroup.first,
                          otherGroup.second,
                          slot === "first" ? selection.second : selection.first,
                        ].filter(Boolean);

                        return (
                          member.employeeId === currentValue ||
                          !selectedElsewhere.includes(member.employeeId)
                        );
                      });

                  const employeeLabel = (employeeNo: string) => {
                    const member = rotationMembers.find((item) => item.employeeId === employeeNo);
                    if (!member) return null;
                    return {
                      name: language === "cn" ? member.nameCn || member.name : member.name,
                      shift: member.shift ?? "—",
                    };
                  };

                  const first = employeeLabel(selection.first);
                  const second = employeeLabel(selection.second);

                  return (
                    <div
                      key={group}
                      className={`rounded-xl border px-3.5 py-3 shadow-none transition-colors ${
                        group === "PAIR_A"
                          ? "border-cyan-200/70 bg-cyan-50/70 dark:border-cyan-400/20 dark:bg-cyan-400/8"
                          : "border-violet-200/70 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-400/8"
                      }`}
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-extrabold ${
                              group === "PAIR_A"
                                ? "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/12 dark:text-cyan-600"
                                : "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/12 dark:text-violet-600"
                            }`}
                          >
                            {group === "PAIR_A" ? "A" : "B"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-text">
                                {group === "PAIR_A" ? text("pairA", language) : text("pairB", language)}
                              </p>
                              <span className="text-[9px] font-semibold text-text-dim">
                                Day {rotationDay ?? "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
                            group === "PAIR_A"
                              ? "text-cyan-600 dark:text-cyan-300"
                              : "text-violet-600 dark:text-violet-300"
                          }`}
                        >
                          {group}
                        </span>
                      </div>

                      <div className="grid gap-2.5 md:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                            D/S · {text("employeeOne", language)}
                          </span>
                          <select
                            value={selection.first}
                            onChange={(event) =>
                              updatePairSelection(group, "first", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="w-full min-w-0 cursor-pointer rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-[11px] font-semibold text-text outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                          >
                            <option value="">{text("selectEmployee", language)}</option>
                            {optionsFor("first", selection.first).map((member) => (
                              <option key={member.employeeId} value={member.employeeId}>
                                {member.employeeId} — {language === "cn" ? member.nameCn || member.name : member.name}
                              </option>
                            ))}
                          </select>
                          {first && (
                            <div className="mt-1.5 truncate text-[9px] font-medium text-text-dim">
                              {first.name} · {first.shift}
                            </div>
                          )}
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                            N/S · {text("employeeTwo", language)}
                          </span>
                          <select
                            value={selection.second}
                            onChange={(event) =>
                              updatePairSelection(group, "second", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="w-full min-w-0 cursor-pointer rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-[11px] font-semibold text-text outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                          >
                            <option value="">{text("selectEmployee", language)}</option>
                            {optionsFor("second", selection.second).map((member) => (
                              <option key={member.employeeId} value={member.employeeId}>
                                {member.employeeId} — {language === "cn" ? member.nameCn || member.name : member.name}
                              </option>
                            ))}
                          </select>
                          {second && (
                            <div className="mt-1.5 truncate text-[9px] font-medium text-text-dim">
                              {second.name} · {second.shift}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void saveRotationPairs()}
                  disabled={
                    savingPairs ||
                    authLoading ||
                    !isSupervisor ||
                    loadingEmployees ||
                    loadingShiftData
                  }
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface-hover px-3.5 text-[11px] font-bold text-text transition hover:border-cyan-400/50 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingPairs ? text("loading", language) : text("saveRotationPairs", language)}
                </button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-border-subtle p-4">
                <SectionTitle
                  title={text("members", language)}
                  subtitle={
                    language === "cn"
                      ? "调整 D/S / N/S 将同步保存到数据库"
                      : "Changes to D/S / N/S are saved to the database"
                  }
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 ">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("employee", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("department", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("shiftMaster", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("status", language)}</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("action", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border-subtle last:border-0 transition-colors hover:bg-slate-50/80 ">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-text">{language === "cn" ? member.nameCn || member.name : member.name}</p>
                          <p className="mt-0.5 text-[10px] text-text-dim">{member.employeeId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">{language === "cn" ? member.departmentCn || member.department : member.department}</td>
                        <td className="px-4 py-3">
                          <ShiftBadge shift={member.shift} language={language} />
                        </td>
                        <td className="px-4 py-3">
                          {member.excluded ? (
                            <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                              {text("fixed", language)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                              {text("rotation", language)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={member.shift ?? ""}
                              onChange={(event) =>
                                void updateShiftAssignment(member.employeeId, {
                                  shift: event.target.value as ShiftCode,
                                })
                              }
                              disabled={savingEmployee === member.employeeId}
                              className="cursor-pointer rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text"
                            >
                              <option value="">— Not Assigned —</option>
                              {shiftMasters
                                .filter((master) => master.is_active === 1 || master.is_active === true)
                                .map((master) => (
                                  <option
                                    key={master.id}
                                    value={master.shift_code}
                                  >
                                    {master.shift_code} —{" "}
                                    {language === "cn"
                                      ? master.shift_name_cn || master.shift_name_en || master.shift_code
                                      : master.shift_name_en || master.shift_code}
                                    {" ("}
                                    {master.start_time}–{master.end_time}
                                    {")"}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={savingEmployee === member.employeeId}
                              onClick={() =>
                                void updateShiftAssignment(member.employeeId, {
                                  excluded: !member.excluded,
                                })
                              }
                              className="cursor-pointer rounded-md border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold text-text-muted hover:border-cyan-400 hover:text-cyan-700 disabled:opacity-50"
                            >
                              {member.excluded ? text("rotation", language) : text("fixed", language)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

        {activeTab === "schedule" && (
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-sm font-semibold text-text">{text("schedule", language)}</h2>
                      <span className="text-[10px] text-text-dim">
                        {generated
                          ? language === "cn"
                            ? "排班已从数据库加载"
                            : "Schedule loaded from the database"
                          : language === "cn"
                            ? "查看 智能物流 月度排班"
                            : "View Smart Logistic monthly schedule"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-semibold">
                      <span className="text-emerald-700">1 = 08:00–17:00</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-700">4 = 4 Hours</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sky-700">D = {text("day", language)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-violet-700">N = {text("night", language)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">O = {text("off", language)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      aria-label="Previous month"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      {text("today", language)}
                    </button>
                    <div className="inline-flex h-8 min-w-32 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-800">
                      {monthName}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      aria-label="Next month"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      →
                    </button>

                    <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />

                    <button
                      type="button"
                      onClick={() => setActiveTab("calendar")}
                      title={text("goOffCalendar", language)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 shrink-0">
                        <rect x="3" y="4" width="18" height="17" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                      </svg>
                      <span>{text("goOffCalendar", language)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void generateSchedule()}
                      disabled={!canGenerate || loadingGeneratedSchedule || savingPairs}
                      title={
                        authLoading
                          ? "Loading account..."
                          : !isSupervisor
                            ? text("supervisorOnly", language)
                            : !isFutureMonth
                              ? text("monthLocked", language)
                              : text("generate", language)
                      }
                      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-800 bg-slate-800 px-2.5 text-[10px] font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {text("generate", language)}
                    </button>

                    <button
                      type="button"
                      onClick={() => void exportScheduleExcel()}
                      disabled={
                        exportingExcel ||
                        loadingEmployees ||
                        loadingShiftData ||
                        organizationEmployees.length === 0
                      }
                      title={
                        exportingExcel
                          ? text("loading", language)
                          : text("exportExcel", language)
                      }
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 shrink-0">
                        <path d="M5 3h10l4 4v14H5z" />
                        <path d="M15 3v5h5M8 12h8M8 16h8M8 20h5" />
                      </svg>
                      <span>{exportingExcel ? text("loading", language) : text("exportExcel", language)}</span>
                    </button>
                  </div>
                </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text("search", language)}
                  className="cursor-text rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 "
                />
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 "
                >
                  <option value="all">{text("allDepartments", language)}</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <select
                  value={shiftFilter}
                  onChange={(event) => setShiftFilter(event.target.value)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 "
                >
                  <option value="all">{text("allShifts", language)}</option>
                  <option value="D/S">D/S — {text("day", language)}</option>
                  <option value="N/S">N/S — {text("night", language)}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-max min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-hover">
                    <th className="sticky left-0 z-20 w-[300px] min-w-[300px] border-r border-slate-200 bg-slate-50/95 px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 ">
                      {text("employee", language)}
                    </th>
                    {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                      const isRotationDay = day === 15 || day === 16;
                      const isToday = dateKey(year, month, day) === todayKey;
                      return (
                        <th
                          key={day}
                          className={`min-w-14 border-l border-slate-100 px-2 py-1.5 text-center text-[9px] font-semibold ${
                            isToday
                              ? "bg-sky-50 text-sky-700 "
                              : isRotationDay
                                ? "bg-amber-50 text-amber-700 "
                                : "text-slate-500 "
                          }`}
                        >
                          <div>{pad(day)}</div>
                          {isToday && <div className="mt-1 text-[8px] font-extrabold">{text("today", language)}</div>}
                          {!isToday && isRotationDay && <div className="mt-1 text-[8px] font-normal">{text("rotate", language)}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {loadingEmployees || loadingShiftData ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="px-4 py-10 text-center text-xs font-semibold text-text-dim">
                        {text("loading", language)}
                      </td>
                    </tr>
                  ) : scheduleRows.filter((row) => {
                    const member = filteredMembers.find((item) => item.employeeId === row.employeeId);
                    return Boolean(member);
                  }).map((row) => (
                    <tr key={row.employeeId} className="border-b border-border-subtle last:border-0 transition-colors hover:bg-slate-50/60">
                      <td className="sticky left-0 z-10 w-[300px] min-w-[300px] border-r border-slate-200 bg-white px-4 py-2 align-middle">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                            <p className="truncate text-[12px] font-bold leading-4 text-slate-800">
                              {language === "cn" ? row.nameCn || row.name : row.name}
                            </p>
                            {row.fixed && (
                              <span className="shrink-0 border-l border-amber-300 pl-2 text-[8px] font-bold uppercase tracking-wide text-amber-500">
                                {text("fixed", language)}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {row.employeeId}
                            </span>
                            <span className="shrink-0 text-slate-300">•</span>
                            <span
                              className="truncate text-[10px] font-semibold text-slate-500"
                              title={language === "cn" ? row.departmentCn || row.department : row.department}
                            >
                              {language === "cn" ? row.departmentCn || row.department : row.department}
                            </span>
                          </div>
                        </div>
                      </td>
                      {row.schedule.map((value, index) => {
                        const day = index + 1;
                        const isRotationDay = day === 15 || day === 16;
                        const isToday = dateKey(year, month, day) === todayKey;
                        return (
                          <td
                            key={`${row.employeeId}-${day}`}
                            className={`border-l border-slate-100 px-1 py-1 text-center align-middle ${
                              isToday
                                ? "bg-sky-50/70 "
                                : isRotationDay
                                  ? "bg-amber-50/70 "
                                  : ""
                            }`}
                          >
                            <ScheduleBadge value={value} language={language} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t-2 border-border-subtle px-4 py-3 text-[9px] text-text-muted md:flex-row md:items-center md:justify-between">
              <span>
                {text("transitionRule", language)}: <span className="font-bold text-amber-700 "> N/S → {language === "cn" ? "休息" : "OFF"} → D/S</span>
              </span>
              <span>
                {text("changeDate", language)}: <span className="font-bold text-text">{text("every15th16th", language)}</span>
              </span>
            </div>
          </Card>
        )}

        {activeTab === "calendar" && (
          <MyOffCalendar
            language={language}
            organizationEmployees={organizationEmployees}
            personalOffDays={personalOffDays}
            onPersonalOffDaysChange={setPersonalOffDays}
            onScheduleChanged={() => void loadGeneratedSchedules(true)}
          />
        )}
      </div>
    </AppShell>
    </OrganizationGate>
  );
}

export default function ShiftManagementPage() {
  return <ShiftManagementView />;
}
