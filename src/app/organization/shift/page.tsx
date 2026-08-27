"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type ShiftCode = "D/S" | "N/S";
type ScheduleType = "D" | "N" | "OFF";
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
  smartLogisticRotation: ["Smart Logistic Rotation", "Smart Logistic 轮班"],
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

function shiftName(shift: ShiftCode, language: OrganizationLanguage) {
  return shift === "D/S"
    ? language === "cn"
      ? "白班"
      : "Day Shift"
    : language === "cn"
      ? "夜班"
      : "Night Shift";
}

function scheduleName(value: ScheduleType, language: OrganizationLanguage) {
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
    <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>
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
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-[10px] text-slate-500">{subtitle}</p>}
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
          ? "border-emerald-600 bg-emerald-100 text-emerald-900"
          : "border-slate-400 bg-slate-100 text-slate-800"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-600" : "bg-slate-500"}`} />
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
      <span className="inline-flex min-w-[92px] items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
        —
      </span>
    );
  }

  const isDay = shift === "D/S";

  return (
    <span
      className={`inline-flex min-w-[92px] items-center justify-center rounded-md border px-2.5 py-1 text-[10px] font-semibold ${
        isDay
          ? "border-sky-600 bg-sky-100 text-sky-900"
          : "border-violet-600 bg-violet-100 text-violet-900"
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
    value === "D"
      ? "border-sky-600 bg-sky-100 text-sky-900"
      : value === "N"
        ? "border-violet-600 bg-violet-100 text-violet-900"
        : "border-slate-500 bg-slate-100 text-slate-900";

  return (
    <span
      className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[10px] font-bold ${className}`}
      title={scheduleName(value, language)}
    >
      {value}
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
}: {
  language: OrganizationLanguage;
  organizationEmployees: OrganizationEmployee[];
  personalOffDays: PersonalOffDay[];
  onPersonalOffDaysChange: (days: PersonalOffDay[]) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  async function toggleDate(day: number) {
    // OFF can only be selected for a future month.
    // Current and past months are read-only.
    if (!isFutureOffMonth || !currentEmployeeId || saving) return;

    const key = dateKey(year, month, day);
    const existing = myDayMap.get(key);

    if (existing?.fixed) return;

    const next = existing
      ? personalOffDays.filter((item) => item.id !== existing.id)
      : [
          ...personalOffDays,
          {
            id: `${currentEmployeeId}-${key}`,
            employeeId: currentEmployeeId,
            date: key,
            fixed: false,
          },
        ];

    onPersonalOffDaysChange(next);
    setMessage(null);

    if (existing && !existing.fixed) {
      try {
        await fetchJson(`${API_BASE}/off-days`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeNo: currentEmployeeId,
            date: key,
          }),
        });
      } catch (error) {
        console.error("Failed to remove selected OFF", error);
        setMessage(error instanceof Error ? error.message : "Failed to remove OFF day.");
      }
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
    <div className="mt-2 border-t border-slate-200 pt-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border-2 border-sky-500 bg-sky-100 text-lg font-bold text-sky-700">
            ◎
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{text("myOffCalendar", language)}</h1>
            <p className="mt-1 text-xs text-slate-600">{text("offCalendarSubtitle", language)}</p>
          </div>
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b-2 border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {text("currentAccount", language)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-md border-2 border-sky-500 bg-sky-100 px-3 py-1.5 text-sm font-bold text-sky-800">
                  {authLoading ? text("loading", language) : accountLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-sky-500 bg-sky-100 px-3 py-1.5 text-sky-800">
                <span className="size-2.5 rounded-full bg-sky-600" />
                {text("selectedOff", language)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-100 px-3 py-1.5 text-amber-900">
                <span className="size-2.5 rounded-full bg-amber-600" />
                {text("fixedOff", language)}
              </span>
            </div>
          </div>

          {!authLoading && !currentEmployeeId && (
            <div className="mt-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
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
                className="cursor-pointer size-10 rounded-lg border-2 border-slate-300 bg-white text-lg font-bold text-slate-800 transition hover:border-sky-500 hover:bg-sky-50"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="cursor-pointer rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:border-sky-500 hover:bg-sky-50"
              >
                {text("today", language)}
              </button>
              <div className="min-w-44 rounded-lg border-2 border-sky-500 bg-sky-50 px-4 py-2.5 text-center text-sm font-bold text-sky-800">
                {monthName}
              </div>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="cursor-pointer size-10 rounded-lg border-2 border-slate-300 bg-white text-lg font-bold text-slate-800 transition hover:border-sky-500 hover:bg-sky-50"
              >
                →
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetUnfixed}
                disabled={!isFutureOffMonth || !currentEmployeeId || authLoading || saving}
                className="cursor-pointer rounded-lg border-2 border-amber-500 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {text("resetUnfixed", language)}
              </button>
              <button
                type="button"
                onClick={saveAndFix}
                disabled={!isFutureOffMonth || !currentEmployeeId || authLoading || saving}
                className="cursor-pointer rounded-lg border-2 border-emerald-600 bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? text("loading", language) : text("saveAndFix", language)}
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-800">
              {message}
            </div>
          )}

          <div className="grid grid-cols-7 overflow-hidden rounded-xl border-2 border-slate-300 bg-white">
            {(language === "cn"
              ? ["一", "二", "三", "四", "五", "六", "日"]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ).map((label) => (
              <div
                key={label}
                className="border-b-2 border-r border-slate-300 bg-slate-100 px-2 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-slate-800"
              >
                {label}
              </div>
            ))}

            {calendarCells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-28 border-r border-b border-slate-200 bg-slate-50"
                  />
                );
              }

              const key = dateKey(year, month, day);
              const off = myDayMap.get(key);
              const otherOffs = otherOffsByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isFixed = Boolean(off?.fixed);
              const isSelected = Boolean(off && !off.fixed);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void toggleDate(day)}
                  disabled={!isFutureOffMonth || !currentEmployeeId || authLoading || isFixed || saving}
                  className={`relative min-h-28 border-r border-b border-slate-200 p-3 text-left align-top transition ${
                    isFixed
                      ? "bg-amber-100 hover:bg-amber-200"
                      : isSelected
                        ? "bg-sky-100 hover:bg-sky-200"
                        : "bg-white hover:bg-slate-50"
                  } ${isToday ? "z-10 bg-red-50 ring-4 ring-inset ring-red-500" : ""} ${
                    !isFutureOffMonth || isFixed || saving
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-sm font-extrabold ${
                        isToday
                          ? "text-red-700"
                          : isFixed
                            ? "text-amber-900"
                            : isSelected
                              ? "text-sky-800"
                              : "text-slate-800"
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="rounded-full border-2 border-red-500 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-700">
                        {text("today", language)}
                      </span>
                    )}
                  </div>

                  {isFixed && (
                    <div className="mt-5 rounded-lg border-2 border-amber-600 bg-amber-200 px-2 py-2 text-center text-xs font-extrabold text-amber-950">
                      {text("off", language)} 🔒
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-5 rounded-lg border-2 border-sky-600 bg-sky-200 px-2 py-2 text-center text-xs font-extrabold text-sky-950">
                      {text("off", language)}
                    </div>
                  )}

                  {otherOffs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {otherOffs.map((name) => (
                        <div
                          key={`${key}-${name}`}
                          className="truncate text-[10px] font-bold text-red-600"
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

          <div className="mt-4 rounded-lg border-2 border-sky-200 bg-sky-50 px-4 py-3 text-xs text-slate-700">
            {language === "cn"
              ? "只能为未来月份选择个人休息日；当前月和过去月份为只读。其他员工的 OFF 会以红色小字显示。保存并锁定后，已锁定日期将自动同步到排班表。"
              : "You can select personal OFF days only for future months. The current and past months are read-only. Other employees' OFF days are shown in small red text. After Save & Fix, locked OFF dates are synced to Schedule."}
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
      <div className="min-h-full space-y-5 bg-white p-5 text-slate-900">
        <style>{`
          button:not(:disabled),
          select:not(:disabled) { cursor: pointer; }
          button:disabled,
          select:disabled { cursor: not-allowed; }
        `}</style>
        {(employeeLoadError || shiftDataError) && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {employeeLoadError || shiftDataError}
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border-2 border-sky-500 bg-sky-100 text-lg font-bold text-sky-700">
              ⇄
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{text("title", language)}</h1>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {language === "cn"
                  ? "Smart Logistic 半月轮班管理"
                  : "Smart Logistic semi-monthly shift rotation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className="cursor-pointer rounded-md border-2 border-amber-500 bg-amber-100 px-3 py-2 text-[10px] font-bold text-amber-900 transition hover:bg-amber-200"
            >
              {text("goOffCalendar", language)}
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
              className="cursor-pointer rounded-md border-2 border-sky-500 bg-sky-100 px-3 py-2 text-[10px] font-bold text-sky-900 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {text("generate", language)}
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto rounded-xl border-2 border-slate-200 bg-slate-50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-[10px] font-bold transition ${
                activeTab === tab.key
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
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
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{text("dayShift", language)}</p>
                <p className="mt-2 text-xl font-bold text-sky-800">D/S</p>
                <p className="mt-1 text-[10px] text-slate-500">08:00 – 20:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{text("nightShift", language)}</p>
                <p className="mt-2 text-xl font-bold text-violet-800">N/S</p>
                <p className="mt-1 text-[10px] text-slate-500">20:00 – 08:00</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{text("rotationType", language)}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">15 / 16</p>
                <p className="mt-1 text-[10px] text-slate-500">{text("every15th16th", language)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{text("transitionRule", language)}</p>
                <p className="mt-2 text-xl font-bold text-amber-900">OFF 1</p>
                <p className="mt-1 text-[10px] text-slate-500">{text("scheduleRule", language)}</p>
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
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-600">
                  {text("loading", language)}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-600">
                  {text("noData", language)}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`rounded-lg border-2 p-3 ${
                        member.excluded
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {language === "cn" ? member.nameCn || member.name : member.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{member.employeeId}</p>
                        </div>
                        {member.excluded ? (
                          <span className="rounded-md border-2 border-amber-400 bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-900">
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
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] text-slate-500">{text("periodOne", language)}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">01 – 14</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] text-slate-500">{text("periodTwo", language)}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">15 – 16 / 17 – {daysInMonth}</p>
                </div>
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                  <p className="text-[10px] text-amber-800">{text("transitionRule", language)}</p>
                  <p className="mt-2 text-sm font-bold text-amber-950">N/S → OFF → D/S</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "master" && (
          <Card className="overflow-hidden">
            <div className="border-b-2 border-slate-200 p-4">
              <SectionTitle
                title={text("shiftMaster", language)}
                subtitle={language === "cn" ? "当前系统使用两个12小时班次" : "The system currently uses two 12-hour shifts"}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("code", language)}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("dayShift", language)}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("time", language)}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("status", language)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-4 text-xs font-bold text-sky-800">D/S</td>
                    <td className="px-4 py-4 text-xs text-slate-800">{text("dayShift", language)}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">08:00 – 20:00</td>
                    <td className="px-4 py-4"><StatusBadge active language={language} /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-xs font-bold text-violet-800">N/S</td>
                    <td className="px-4 py-4 text-xs text-slate-800">{text("nightShift", language)}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">20:00 – 08:00</td>
                    <td className="px-4 py-4"><StatusBadge active language={language} /></td>
                  </tr>
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
                subtitle={language === "cn" ? "数据库中的 Smart Logistic 轮班规则" : "Smart Logistic rotation rules stored in MySQL"}
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">{text("rotationType", language)}</p>
                  <p className="mt-2 text-xs font-bold text-slate-900">{text("semiMonthly", language)}</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">{text("changeDate", language)}</p>
                  <p className="mt-2 text-xs font-bold text-slate-900">{text("every15th16th", language)}</p>
                </div>
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
                  <p className="text-[10px] text-amber-800">{text("transitionRule", language)}</p>
                  <p className="mt-2 text-xs font-bold text-amber-950">{text("oneDayOff", language)}</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">{text("rotationPeriod", language)}</p>
                  <p className="mt-2 text-xs font-bold text-slate-900">01–14 / 15–16 / 17–End</p>
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
                      className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {group === "PAIR_A" ? text("pairA", language) : text("pairB", language)}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {group === "PAIR_A"
                              ? `Rotation day: ${rotationRules[0]?.first_rotation_day ?? "—"}`
                              : `Rotation day: ${rotationRules[0]?.second_rotation_day ?? "—"}`}
                          </p>
                        </div>
                        <span className="rounded-md border-2 border-sky-300 bg-sky-100 px-2 py-1 text-[9px] font-bold text-sky-900">
                          {group}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {text("employeeOne", language)}
                          </span>
                          <select
                            value={selection.first}
                            onChange={(event) =>
                              updatePairSelection(group, "first", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="cursor-pointer w-full rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
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
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {text("employeeTwo", language)}
                          </span>
                          <select
                            value={selection.second}
                            onChange={(event) =>
                              updatePairSelection(group, "second", event.target.value)
                            }
                            disabled={savingPairs || loadingEmployees || loadingShiftData}
                            className="cursor-pointer w-full rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
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
                  className="cursor-pointer rounded-md border-2 border-sky-500 bg-sky-100 px-4 py-2 text-xs font-bold text-sky-900 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingPairs ? text("loading", language) : text("saveRotationPairs", language)}
                </button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b-2 border-slate-200 p-4">
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
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("employee", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("department", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("shiftMaster", language)}</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("status", language)}</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-600">{text("action", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b border-slate-200 last:border-0">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-900">{language === "cn" ? member.nameCn || member.name : member.name}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{member.employeeId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{language === "cn" ? member.departmentCn || member.department : member.department}</td>
                        <td className="px-4 py-3">
                          <ShiftBadge shift={member.shift} language={language} />
                        </td>
                        <td className="px-4 py-3">
                          {member.excluded ? (
                            <span className="inline-flex rounded-md border-2 border-amber-500 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                              {text("fixed", language)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md border-2 border-emerald-600 bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
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
                              className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            >
                              <option value="">— Not Assigned —</option>
                              <option value="D/S">D/S</option>
                              <option value="N/S">N/S</option>
                            </select>
                            <button
                              type="button"
                              disabled={savingEmployee === member.employeeId}
                              onClick={() =>
                                void updateShiftAssignment(member.employeeId, {
                                  excluded: !member.excluded,
                                })
                              }
                              className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:border-sky-500 hover:text-sky-800 disabled:opacity-50"
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
            <div className="border-b-2 border-slate-200 p-4">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                  <SectionTitle
                    title={text("schedule", language)}
                    subtitle={
                      generated
                        ? language === "cn"
                          ? "排班已从数据库加载"
                          : "Schedule loaded from the database"
                        : language === "cn"
                          ? "查看 Smart Logistic 月度排班"
                          : "View Smart Logistic monthly schedule"
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-sky-500 bg-sky-100 px-2 py-1 text-[9px] font-bold text-sky-900">
                      D = {text("day", language)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-violet-500 bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-900">
                      N = {text("night", language)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-slate-500 bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-900">
                      O = {text("off", language)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-sky-500 hover:text-sky-800"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date())}
                    className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:border-sky-500 hover:text-sky-800"
                  >
                    {text("today", language)}
                  </button>
                  <div className="min-w-36 rounded-md border-2 border-sky-500 bg-sky-50 px-3 py-2 text-center text-[10px] font-bold text-sky-900">
                    {monthName}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-sky-500 hover:text-sky-800"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text("search", language)}
                  className="cursor-text rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                />
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500"
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
                  className="cursor-pointer rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500"
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
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="sticky left-0 z-20 min-w-56 border-r-2 border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      {text("employee", language)}
                    </th>
                    {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                      const isRotationDay = day === 15 || day === 16;
                      const isToday = dateKey(year, month, day) === todayKey;
                      return (
                        <th
                          key={day}
                          className={`min-w-14 px-2 py-3 text-center text-[10px] font-bold ${
                            isToday
                              ? "bg-red-100 text-red-900"
                              : isRotationDay
                                ? "border-b-2 border-amber-500 bg-amber-100 text-amber-900"
                                : "text-slate-600"
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
                      <td colSpan={daysInMonth + 1} className="px-4 py-10 text-center text-xs font-semibold text-slate-500">
                        {text("loading", language)}
                      </td>
                    </tr>
                  ) : scheduleRows.filter((row) => {
                    const member = filteredMembers.find((item) => item.employeeId === row.employeeId);
                    return Boolean(member);
                  }).map((row) => (
                    <tr key={row.employeeId} className="border-b border-slate-200 last:border-0">
                      <td className="sticky left-0 z-10 border-r-2 border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-sky-300 bg-sky-100 text-[9px] font-bold text-sky-800">
                            {row.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="whitespace-nowrap text-xs font-bold text-slate-900">{language === "cn" ? row.nameCn || row.name : row.name}</p>
                            <p className="mt-0.5 whitespace-nowrap text-[9px] text-slate-500">{row.employeeId}</p>
                            {row.fixed && (
                              <span className="mt-1 inline-flex rounded border-2 border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-900">
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
                                ? "bg-red-50"
                                : isRotationDay
                                  ? "bg-amber-50"
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

            <div className="flex flex-col gap-2 border-t-2 border-slate-200 px-4 py-3 text-[9px] text-slate-600 md:flex-row md:items-center md:justify-between">
              <span>
                {text("transitionRule", language)}: <span className="font-bold text-amber-900">N/S → OFF → D/S</span>
              </span>
              <span>
                {text("changeDate", language)}: <span className="font-bold text-slate-900">{text("every15th16th", language)}</span>
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
          />
        )}
      </div>
    </AppShell>
  );
}

export default function ShiftManagementPage() {
  return <ShiftManagementView />;
}
