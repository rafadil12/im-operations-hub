"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
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
    <div className={`rounded-xl border border-border bg-surface transition-[border-color,box-shadow,background-color] duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_32px_rgba(8,47,73,0.12)] ${className}`}>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold shadow-sm ${
        active
          ? "bg-emerald-500 text-white"
          : "bg-slate-500 text-white"
      }`}
    >
      <span className="size-1.5 rounded-full bg-white/80" />
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
      <span className="inline-flex min-w-[92px] items-center justify-center rounded-full bg-slate-500 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm">
        —
      </span>
    );
  }

  const isDay = shift === "D/S";

  return (
    <span
      className={`inline-flex min-w-[92px] items-center justify-center rounded-md px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm ${
  isDay ? "bg-cyan-500" : "bg-violet-500"
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
      ? "border border-emerald-500 bg-emerald-500 text-white"
      : value === "4"
        ? "border border-amber-500 bg-amber-500 text-white"
        : value === "D"
          ? "border border-cyan-500 bg-cyan-500 text-white"
          : value === "N"
            ? "border border-violet-500 bg-violet-500 text-white"
            : "border border-rose-500 bg-rose-500 text-white";

  return (
    <span
      className={`inline-flex min-w-12 justify-center rounded-md px-3 py-1.5 text-[10px] font-extrabold shadow-sm ${className}`}
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
    <div className="mt-2 border-t border-border-subtle pt-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/5 text-lg font-bold text-cyan-300">
            ◎
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">{language === "cn" ? "工作排班日历" : "Work Schedule"}</h1>
            <p className="mt-1 text-xs text-text-muted">{language === "cn" ? "选择未来每个日期的 1、4 或休息。" : "Choose 1, 4, or OFF for each future date."}</p>
          </div>
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-hover p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                {text("currentAccount", language)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-cyan-500 bg-cyan-500 px-3 py-1.5 text-sm font-extrabold text-white shadow-sm">
                  {authLoading ? text("loading", language) : accountLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-white shadow-sm">
                  <span className="size-2.5 rounded-full bg-white" />
                  1 — 08:00–17:00
                </span>
               <span className="inline-flex items-center gap-2 rounded-md border border-amber-500 bg-amber-500 px-3 py-1.5 text-white shadow-sm">
                  <span className="size-2.5 rounded-sm bg-white" />
                    4 — {language === "cn" ? "4小时" : "4 Hours"}
                </span>
                            <span className="inline-flex items-center gap-2 rounded-md border border-slate-500 bg-slate-500 px-3 py-1.5 text-white shadow-sm">
                  <span className="size-2.5 rounded-sm bg-white" />
                 {language === "cn" ? "休息" : "OFF"}
                </span>
            </div>
          </div>

          {!authLoading && !currentEmployeeId && (
            <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/5 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {text("accountNotDetected", language)}
            </div>
          )}
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="cursor-pointer size-10 rounded-lg border border-border bg-surface text-lg font-bold text-text transition hover:border-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/15"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition hover:border-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/15"
              >
                {text("today", language)}
              </button>
              <div className="inline-flex min-w-40 items-center justify-center rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm">
                {monthName}
              </div>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="cursor-pointer size-10 rounded-lg border border-border bg-surface text-lg font-bold text-text transition hover:border-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/15"
              >
                →
              </button>
            </div>

           {isFutureOffMonth && (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={resetUnfixed}
      disabled={!currentEmployeeId || authLoading || saving}
      className="cursor-pointer rounded-lg border border-amber-400 bg-amber-500 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-amber-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      {text("resetUnfixed", language)}
    </button>

    <button
      type="button"
      onClick={saveAndFix}
      disabled={!currentEmployeeId || authLoading || saving}
      className="cursor-pointer rounded-lg border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      {saving ? text("loading", language) : text("saveAndFix", language)}
    </button>
  </div>
)}
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-border bg-surface-hover px-4 py-3 text-xs font-semibold text-text">
              {message}
            </div>
          )}

          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-surface">
            {(language === "cn"
              ? ["一", "二", "三", "四", "五", "六", "日"]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ).map((label) => (
              <div
                key={label}
                className="border-b border-r border-border bg-surface-hover px-2 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-text"
              >
                {label}
              </div>
            ))}

            {calendarCells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-28 border-r border-b border-border-subtle bg-surface-hover"
                  />
                );
              }

              const key = dateKey(year, month, day);
              const off = myDayMap.get(key);
              const work = workScheduleMap.get(key);
              const otherOffs = otherOffsByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isFixed = Boolean(off?.fixed);
              const status = work?.scheduleType ?? (off ? "OFF" : null);
              const isSelected = Boolean(status);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void toggleDate(day)}
                  disabled={!isFutureOffMonth || !currentEmployeeId || authLoading || saving}
                  className={`relative min-h-28 border-r border-b border-border-subtle p-3 text-left align-top transition ${
                    isFixed
                      ? "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                      : isSelected
                        ? "bg-cyan-500/10 hover:bg-cyan-500/15 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/15"
                        : "bg-surface hover:bg-surface-hover"
                  } ${isToday ? "z-10 bg-cyan-500/10 ring-2 ring-inset ring-cyan-400" : ""} ${
                    !isFutureOffMonth || isFixed || saving
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm font-extrabold ${
                      isToday
                        ? "text-cyan-700 dark:text-cyan-300"
                        : isFixed
                          ? "text-rose-700 dark:text-rose-300"
                          : isSelected
                            ? "text-sky-700 dark:text-sky-300"
                            : "text-text"
                    }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="rounded-full border-2 border-cyan-400 bg-surface px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        {text("today", language)}
                      </span>
                    )}
                  </div>

                  {status === "1" && (
                   <div className="mt-5 flex items-center justify-center gap-2 rounded-md border border-emerald-500 bg-emerald-500 px-3 py-3 text-center text-xs font-extrabold text-white shadow-sm">
                      <span className="size-2.5 rounded-sm bg-white" />
                      <span>1 — 08:00–17:00</span>
                    </div>
                  )}

                  {status === "4" && (
                    <div className="mt-5 flex items-center justify-center gap-2 rounded-md border border-amber-500 bg-amber-500 px-3 py-3 text-center text-xs font-extrabold text-white shadow-sm">
                      <span className="size-2.5 rounded-sm bg-white" />
                      <span> 4 — {language === "cn" ? "4小时" : "4 Hours"}</span>
                    </div>
                  )}

                  {status === "OFF" && (
                  <div
                      className={`mt-5 flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-center text-xs font-extrabold text-white shadow-sm ${
                        isFixed
                          ? "border-rose-600 bg-rose-600"
                          : "border-rose-500 bg-rose-500"
                      }`}
                    >
                      <span
                        className={`size-2.5 rounded-sm bg-white ${
                          isFixed
                            ? "bg-rose-500 dark:bg-rose-300"
                            : "bg-rose-400 dark:bg-rose-300"
                        }`}
                      />
                      <span>{language === "cn" ? "休息" : "OFF"}{isFixed ? " 🔒" : ""}</span>
                    </div>
                  )}

                  {otherOffs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {otherOffs.map((name) => (
                        <div
                          key={`${key}-${name}`}
                          className="truncate text-[10px] font-bold text-rose-600 dark:text-rose-300"
                          title={`${name} ${text("off", language)}`}
                        >
                          {name} {text("off", language)}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 px-4 py-3 text-xs text-text-muted">
            {language === "cn"
              ? "未来月份点击日期可循环选择 1 → 4 → OFF → 清空；1=08:00–17:00，4=4小时（08:00–12:00或12:00–17:00）。"
              : "For future months, click a date to cycle 1 → 4 → OFF → clear; 1=08:00–17:00, 4=4 hours (08:00–12:00 or 12:00–17:00)."}
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
    <AppShell title={text("title", language)}>
      <div className="shift-management-page min-h-full space-y-5 p-5 text-text">
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



          /* Sharper, higher-contrast typography. Logic/layout unchanged. */
          .shift-management-page {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: geometricPrecision;
            font-synthesis-weight: none;
          }

          .shift-management-page h1,
          .shift-management-page h2,
          .shift-management-page h3,
          .shift-management-page th,
          .shift-management-page button,
          .shift-management-page select,
          .shift-management-page input {
            text-rendering: geometricPrecision;
          }

          .shift-management-page .text-text {
            color: rgb(15 23 42) !important;
          }

          .shift-management-page .text-text-muted {
            color: rgb(51 65 85) !important;
          }

          .shift-management-page .text-text-dim {
            color: rgb(71 85 105) !important;
          }

          .dark .shift-management-page .text-text,
          [data-theme="dark"] .shift-management-page .text-text {
            color: rgb(248 250 252) !important;
          }

          .dark .shift-management-page .text-text-muted,
          [data-theme="dark"] .shift-management-page .text-text-muted {
            color: rgb(203 213 225) !important;
          }

          .dark .shift-management-page .text-text-dim,
          [data-theme="dark"] .shift-management-page .text-text-dim {
            color: rgb(148 163 184) !important;
          }

          .shift-management-page .text-\[8px\],
          .shift-management-page .text-\[9px\],
          .shift-management-page .text-\[10px\] {
            -webkit-font-smoothing: antialiased;
          }

          .shift-management-page .shift-card-hover:hover {
            border-color: rgb(34 211 238 / .20);
            box-shadow: 0 12px 32px rgb(8 47 73 / .12);
          }

          .shift-management-page {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .shift-management-page .text-text {
            color: rgb(15 23 42) !important;
          }

          .shift-management-page .text-text-muted {
            color: rgb(51 65 85) !important;
          }

          .shift-management-page .text-text-dim {
            color: rgb(71 85 105) !important;
          }

          .dark .shift-management-page .text-text,
          [data-theme="dark"] .shift-management-page .text-text {
            color: rgb(248 250 252) !important;
          }

          .dark .shift-management-page .text-text-muted,
          [data-theme="dark"] .shift-management-page .text-text-muted {
            color: rgb(203 213 225) !important;
          }

          .dark .shift-management-page .text-text-dim,
          [data-theme="dark"] .shift-management-page .text-text-dim {
            color: rgb(148 163 184) !important;
          }

          .shift-management-page th,
          .shift-management-page td,
          .shift-management-page button,
          .shift-management-page select,
          .shift-management-page input {
            text-rendering: optimizeLegibility;
          }
        `}</style>
        {(employeeLoadError || shiftDataError) && (
          <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {employeeLoadError || shiftDataError}
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/5 text-lg font-bold text-cyan-300">
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

        <div className="flex overflow-x-auto rounded-xl border border-border bg-surface-hover/60 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-[10px] font-semibold transition ${
                activeTab === tab.key
                  ? "bg-cyan-500 text-white"
                  : "text-text-muted hover:bg-surface hover:text-text"
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
                <p className="mt-2 text-xl font-bold text-cyan-800 dark:text-cyan-300">D/S</p>
                <p className="mt-1 text-[10px] text-text-dim">08:00 – 20:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("nightShift", language)}</p>
                <p className="mt-2 text-xl font-bold text-indigo-800 dark:text-indigo-300">N/S</p>
                <p className="mt-1 text-[10px] text-text-dim">20:00 – 08:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("rotationType", language)}</p>
                <p className="mt-2 text-xl font-bold text-text">15 / 16</p>
                <p className="mt-1 text-[10px] text-text-dim">{text("every15th16th", language)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">{text("transitionRule", language)}</p>
                <p className="mt-2 text-xl font-bold text-amber-800 dark:text-amber-300">OFF 1</p>
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
                          ? "border-amber-500/50 bg-amber-500/10 dark:border-amber-400/50 dark:bg-amber-500/10"
                          : "border-border-subtle bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-text dark:text-white">
                            {language === "cn" ? member.nameCn || member.name : member.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-text-dim dark:text-slate-300">{member.employeeId}</p>
                        </div>
                        {member.excluded ? (
                          <span className="inline-flex items-center rounded-md border border-amber-400 bg-amber-500 px-2.5 py-1 text-[9px] font-extrabold text-white shadow-sm dark:border-amber-400 dark:bg-amber-500 dark:text-white">
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
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-4">
                  <p className="text-[10px] text-text-dim">{text("periodOne", language)}</p>
                  <p className="mt-2 text-sm font-bold text-text">01 – 14</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-hover p-4">
                  <p className="text-[10px] text-text-dim">{text("periodTwo", language)}</p>
                  <p className="mt-2 text-sm font-bold text-text">15 – 16 / 17 – {daysInMonth}</p>
                </div>
                <div className="rounded-lg border border-amber-400 bg-amber-500 p-4">
                  <p className="text-[10px] font-semibold text-white/90">
                    {text("transitionRule", language)}
                  </p>

                  <p className="mt-2 text-sm font-extrabold text-white">
                    N/S → {language === "cn" ? "休息" : "OFF"} → D/S
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "master" && (
          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle p-4">
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
                  <tr className="border-b border-border-subtle bg-surface-hover">
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
                          className="border-b border-border-subtle last:border-0 transition-colors hover:bg-cyan-500/[0.025]"
                        >
                          <td
                            className={`px-4 py-4 text-xs font-extrabold ${
                              isDayRotation
                                ? "text-cyan-500 dark:text-cyan-300"
                                : isNightRotation
                                  ? "text-indigo-500 dark:text-indigo-300"
                                  : shift.shift_code === "1"
                                    ? "text-emerald-600 dark:text-emerald-300"
                                    : "text-amber-600 dark:text-amber-300"
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
               <div className="rounded-lg border border-amber-400 bg-amber-500 p-4">
                  <p className="text-[10px] font-semibold text-white/90">
                    {text("transitionRule", language)}
                  </p>

                  <p className="mt-2 text-sm font-extrabold text-white">
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

              <div className="grid gap-4 lg:grid-cols-2">
                {(["PAIR_A", "PAIR_B"] as const).map((group) => {
                  const selection = pairSelections[group];
                  const otherGroup = group === "PAIR_A" ? pairSelections.PAIR_B : pairSelections.PAIR_A;

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

                  return (
                    <div
                      key={group}
                      className="rounded-xl border border-border-subtle bg-surface-hover p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-text">
                            {group === "PAIR_A" ? text("pairA", language) : text("pairB", language)}
                          </p>
                          <p className="mt-1 text-[10px] text-text-dim">
                            {group === "PAIR_A"
                              ? `Rotation day: ${rotationRules[0]?.first_rotation_day ?? "—"}`
                              : `Rotation day: ${rotationRules[0]?.second_rotation_day ?? "—"}`}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-md border border-cyan-500 bg-cyan-500 px-2.5 py-1 text-[9px] font-extrabold text-white shadow-sm">
                          {group}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                            {text("employeeOne", language)}
                          </span>
                          <select
                            value={selection.first}
                            onChange={(event) =>
                              updatePairSelection(group, "first", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="cursor-pointer w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text"
                          >
                            <option value="">{text("selectEmployee", language)}</option>
                            {optionsFor("first", selection.first).map((member) => (
                              <option key={member.employeeId} value={member.employeeId}>
                                {member.employeeId} — {language === "cn" ? member.nameCn || member.name : member.name} — {member.shift ?? "—"}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                            {text("employeeTwo", language)}
                          </span>
                          <select
                            value={selection.second}
                            onChange={(event) =>
                              updatePairSelection(group, "second", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="cursor-pointer w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text"
                          >
                            <option value="">{text("selectEmployee", language)}</option>
                            {optionsFor("second", selection.second).map((member) => (
                              <option key={member.employeeId} value={member.employeeId}>
                                {member.employeeId} — {language === "cn" ? member.nameCn || member.name : member.name} — {member.shift ?? "—"}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
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
                  className="inline-flex items-center justify-center rounded-md border border-cyan-500 bg-cyan-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
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
                    <tr className="border-b border-border-subtle bg-surface-hover">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("employee", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("department", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("shiftMaster", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("status", language)}</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-text-muted">{text("action", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border-subtle last:border-0 transition-colors hover:bg-cyan-500/[0.025]">
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
                            <span className="inline-flex rounded-full bg-amber-500 px-3 py-1 text-[10px] font-extrabold text-white shadow-sm">
                              {text("fixed", language)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold text-white shadow-sm">
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
                              className="cursor-pointer rounded-md border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold text-text-muted hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 disabled:opacity-50"
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
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0">
                  <SectionTitle
                    title={text("schedule", language)}
                    subtitle={
                      generated
                        ? language === "cn"
                          ? "排班已从数据库加载"
                          : "Schedule loaded from the database"
                        : language === "cn"
                          ? "查看 智能物流 月度排班"
                          : "View Smart Logistic monthly schedule"
                    }
                  />

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                      1 = 08:00–17:00
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                      4 = 4 Hours
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-800 dark:text-cyan-300">
                      D = {text("day", language)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-400/20 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 text-[9px] font-bold text-indigo-800 dark:text-indigo-300">
                      N = {text("night", language)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-400/20 bg-surface-hover px-2 py-1 text-[9px] font-bold text-text">
                      O = {text("off", language)}
                    </span>
                  </div>
                </div>

                <div className="flex w-full flex-col items-stretch gap-2.5 xl:w-auto xl:items-end">
                  <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-border bg-surface-hover/70 p-1.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setActiveTab("calendar")}
                      title={text("goOffCalendar", language)}
                      className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500 px-3.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                      >
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
                      className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500 px-3.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="size-4 shrink-0 transition-transform duration-200 group-hover:rotate-12"
                      >
                        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
                        <path d="m19 3 .6 1.4L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.6L19 3Z" />
                      </svg>
                      <span>{text("generate", language)}</span>
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
                      className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-50 px-3.5 text-xs font-extrabold text-emerald-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                      >
                        <path d="M5 3h10l4 4v14H5z" />
                        <path d="M15 3v5h5M8 12h8M8 16h8M8 20h5" />
                      </svg>
                      <span>
                        {exportingExcel
                          ? text("loading", language)
                          : text("exportExcel", language)}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      aria-label="Previous month"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[10px] font-extrabold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                    >
                      {text("today", language)}
                    </button>
                    <div className="inline-flex h-9 min-w-36 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500 px-4 text-[10px] font-extrabold text-white shadow-md shadow-cyan-500/20">
                      {monthName}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      aria-label="Next month"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-sm font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text("search", language)}
                  className="cursor-text rounded-md border border-border bg-surface px-3 py-2 text-xs text-text outline-none transition focus:border-cyan-400/50"
                />
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text outline-none transition focus:border-cyan-400/50"
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
                  className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-text outline-none transition focus:border-cyan-400/50"
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
                    <th className="sticky left-0 z-20 min-w-56 border-r border-border-subtle bg-surface-hover px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.08em] text-text">
                      {text("employee", language)}
                    </th>
                    {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                      const isRotationDay = day === 15 || day === 16;
                      const isToday = dateKey(year, month, day) === todayKey;
                      return (
                        <th
                          key={day}
                          className={`min-w-14 px-2 py-3 text-center text-[10px] font-extrabold ${
                            isToday
                              ? "bg-blue-600 dark:bg-blue-500/15 text-blue-700 dark:text-blue-500"
                              : isRotationDay
                                ? "border-b border-amber-400 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-500"
                                : "text-text-muted"
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
                    <tr key={row.employeeId} className="border-b border-border-subtle last:border-0 transition-colors hover:bg-cyan-500/[0.025]">
                      <td className="sticky left-0 z-10 border-r border-border-subtle bg-surface px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-[9px] font-extrabold text-cyan-600 dark:text-cyan-300">
                            {row.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="whitespace-nowrap text-xs font-bold text-text">{language === "cn" ? row.nameCn || row.name : row.name}</p>
                            <p className="mt-0.5 whitespace-nowrap text-[9px] text-text-dim">{row.employeeId}</p>
                            {row.fixed && (
                              <span className="mt-1 inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-extrabold text-white shadow-sm">
                                {text("fixed", language)}
                              </span>
                            )}
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
                            className={`px-2 py-3 text-center ${
                              isToday
                                ? "bg-blue-50 dark:bg-blue-600/20"
                                : isRotationDay
                                  ? "bg-amber-50 dark:bg-amber-500/10"
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
                {text("transitionRule", language)}: <span className="font-bold text-amber-800 dark:text-amber-300"> N/S → {language === "cn" ? "休息" : "OFF"} → D/S</span>
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
  );
}

export default function ShiftManagementPage() {
  return <ShiftManagementView />;
}
