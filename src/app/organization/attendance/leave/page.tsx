"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type OrganizationLanguage = "en" | "cn";

type RequestType = "AL" | "MC" | "UPL" | "OT";
type RequestStatus = "Pending" | "Approved" | "Rejected";

type Employee = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status: string | null;
};

type LeaveRequest = {
  id: string;
  employeeNo: string;
  employeeName: string;
  department: string;
  date: string;
  type: RequestType;
  startTime: string;
  endTime: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  managerEmployeeNo?: string | null;
  managerName?: string;
};

const TYPE_META: Record<
  RequestType,
  { labelEn: string; labelCn: string; className: string }
> = {
  AL: {
    labelEn: "Annual Leave",
    labelCn: "年假",
    className:
      "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10",
  },
  MC: {
    labelEn: "Sick Leave",
    labelCn: "病假",
    className:
      "border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10",
  },
  UPL: {
    labelEn: "Permission",
    labelCn: "请假 / 外出",
    className:
      "border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10",
  },
  OT: {
    labelEn: "Overtime",
    labelCn: "加班",
    className:
      "border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10",
  },
};

const STATUS_META: Record<
  RequestStatus,
  { labelEn: string; labelCn: string; className: string }
> = {
  Pending: {
    labelEn: "Pending",
    labelCn: "待审核",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  },
  Approved: {
    labelEn: "Approved",
    labelCn: "已批准",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  },
  Rejected: {
    labelEn: "Rejected",
    labelCn: "已拒绝",
    className:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
  },
};

const API_EMPLOYEES = "/api/organization/employees?limit=100";
const API_LEAVE = "/api/organization/attendance/leave";

type LeaveApiRow = {
  id: number;
  employee_no: string;
  request_date: string;
  request_type: RequestType;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: RequestStatus;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  manager_id: number | null;
  manager_employee_no: string | null;
  manager_name_en: string | null;
  manager_name_cn: string | null;
};

function employeeDisplayName(
  employee: Employee | null | undefined,
  language: OrganizationLanguage,
  fallback = "—",
) {
  if (!employee) return fallback;

  return language === "cn"
    ? employee.name_cn || employee.name_en || employee.employee_no
    : employee.name_en || employee.name_cn || employee.employee_no;
}

function departmentDisplayName(
  employee: Employee | null | undefined,
  language: OrganizationLanguage,
  fallback = "—",
) {
  if (!employee) return fallback;

  return language === "cn"
    ? employee.division_name_cn || employee.division_name_en || fallback
    : employee.division_name_en || employee.division_name_cn || fallback;
}

const DEMO_REQUESTS: LeaveRequest[] = [
  {
    id: "demo-1",
    employeeNo: "62000085",
    employeeName: "Ari Wira Saputra",
    department: "IT",
    date: "2026-08-28",
    type: "AL",
    startTime: "08:00",
    endTime: "17:00",
    reason: "Family matter",
    status: "Approved",
    createdAt: "2026-08-27 09:10",
  },
  {
    id: "demo-2",
    employeeNo: "62000059",
    employeeName: "Antoni Lau",
    department: "IT",
    date: "2026-08-28",
    type: "UPL",
    startTime: "10:00",
    endTime: "12:00",
    reason: "Personal administration",
    status: "Pending",
    createdAt: "2026-08-28 08:30",
  },
  {
    id: "demo-3",
    employeeNo: "62000468",
    employeeName: "Galuh Pratama",
    department: "IT",
    date: "2026-08-27",
    type: "MC",
    startTime: "08:00",
    endTime: "17:00",
    reason: "Medical treatment",
    status: "Approved",
    createdAt: "2026-08-27 07:45",
  },
];

export default function LeavePermissionPage() {
  const { t } = useLang();
  const language: OrganizationLanguage =
    t.safety.management === "安全管理" ? "cn" : "en";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [currentEmployeeNo, setCurrentEmployeeNo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [approvalId, setApprovalId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  const [employeeNo, setEmployeeNo] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<RequestType>("AL");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function loadCurrentLogin() {
      setAuthLoading(true);

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Auth API failed: ${response.status}`);
        }

        const payload = (await response.json()) as {
          account?: {
            id?: number | null;
            employeeNo?: string | null;
          } | null;
        };

        if (cancelled) return;

        const employeeNo = payload.account?.employeeNo ?? null;
        const userId = payload.account?.id ?? null;

        setCurrentEmployeeNo(
          employeeNo ? String(employeeNo).trim() : null,
        );
        setCurrentUserId(
          typeof userId === "number" ? userId : null,
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load current login account", error);
          setCurrentEmployeeNo(null);
        setCurrentUserId(null);
        setIsManager(false);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void loadCurrentLogin();

    return () => {
      cancelled = true;
    };
  }, [language]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      setEmployeesLoading(true);
      setEmployeeError(null);

      try {
        const response = await fetch(API_EMPLOYEES, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Employee API failed: ${response.status}`);
        }

        const payload = (await response.json()) as {
          data?: Employee[];
        };

        if (cancelled) return;

        const activeEmployees = (payload.data ?? []).filter(
          (employee) =>
            employee.employee_no &&
            employee.employee_no !== "SUPERADMIN" &&
            employee.employment_status === "Active",
        );

        setEmployees(activeEmployees);

        const firstEmployee = activeEmployees[0];
        if (firstEmployee) {
          setEmployeeNo(firstEmployee.employee_no);
          setEmployeeName(
            employeeDisplayName(
              firstEmployee,
              language,
              firstEmployee.employee_no,
            ),
          );
          setDepartment(
            departmentDisplayName(
              firstEmployee,
              language,
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setEmployeeError(
            error instanceof Error
              ? error.message
              : "Failed to load employees.",
          );
        }
      } finally {
        if (!cancelled) {
          setEmployeesLoading(false);
        }
      }
    }

    void loadEmployees();

    return () => {
      cancelled = true;
    };
  }, []);

  const mapLeaveRow = (row: LeaveApiRow): LeaveRequest => {
    const employee = employees.find(
      (item) => item.employee_no === row.employee_no,
    );

    return {
      id: String(row.id),
      employeeNo: row.employee_no,
      managerEmployeeNo: row.manager_employee_no,
      managerName:
        row.manager_name_en ||
        row.manager_name_cn ||
        row.manager_employee_no ||
        "",
      employeeName: employeeDisplayName(
        employee,
        language,
        row.employee_no,
      ),
      department: departmentDisplayName(
        employee,
        language,
      ),
      date: String(row.request_date).slice(0, 10),
      type: row.request_type,
      startTime: row.start_time ? String(row.start_time).slice(0, 5) : "",
      endTime: row.end_time ? String(row.end_time).slice(0, 5) : "",
      reason: row.reason ?? "",
      status: row.status,
      createdAt: row.created_at,
    };
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    setRequestsError(null);

    try {
      const response = await fetch(API_LEAVE, {
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow[];
        error?: string;
      };

      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      setRequests((payload.data ?? []).map(mapLeaveRow));
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : "Failed to load leave requests.",
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  React.useEffect(() => {
    if (employees.length > 0) {
      void loadRequests();
    }
  }, [employees]);

  React.useEffect(() => {
    if (authLoading || !currentUserId || employees.length === 0) {
      return;
    }

    setIsManager(
      employees.some(
        (employee) =>
          // Employee API may expose manager_id even if the UI type does not.
          (employee as Employee & { manager_id?: number | null }).manager_id ===
          currentUserId,
      ),
    );
  }, [authLoading, currentUserId, employees]);

  const handleEmployeeChange = (value: string) => {
    const employee = employees.find(
      (item) => item.employee_no === value,
    );

    if (!employee) {
      setEmployeeNo(value);
      setEmployeeName("");
      setDepartment("");
      return;
    }

    setEmployeeNo(employee.employee_no);
    setEmployeeName(
      employeeDisplayName(
        employee,
        language,
        employee.employee_no,
      ),
    );
    setDepartment(
      departmentDisplayName(
        employee,
        language,
      ),
    );
  };

  const canApproveRequest = (item: LeaveRequest & {
    managerEmployeeNo?: string | null;
  }) => {
    if (authLoading || !currentEmployeeNo) return false;
    if (item.status !== "Pending") return false;

    const isOwnRequest = item.employeeNo === currentEmployeeNo;

    if (isOwnRequest && isManager) {
      return true;
    }

    return item.managerEmployeeNo === currentEmployeeNo;
  };

  const updateRequestStatus = async (
    request: LeaveRequest & {
      managerEmployeeNo?: string | null;
    },
    status: "Approved" | "Rejected",
  ) => {
    if (
      !currentEmployeeNo ||
      !canApproveRequest(request) ||
      approvalId
    ) {
      return;
    }

    setApprovalId(request.id);
    setRequestsError(null);

    try {
      const response = await fetch(API_LEAVE, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(request.id),
          status,
          approvedBy: currentEmployeeNo,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow;
        error?: string;
      };

      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? mapLeaveRow(payload.data as LeaveApiRow)
            : item,
        ),
      );
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : "Failed to update request status.",
      );
    } finally {
      setApprovalId(null);
    }
  };

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "Pending").length,
    [requests],
  );

  const approvedCount = useMemo(
    () => requests.filter((item) => item.status === "Approved").length,
    [requests],
  );

  const leaveCount = useMemo(
    () => requests.filter((item) => item.type === "AL").length,
    [requests],
  );

  const permissionCount = useMemo(
    () => requests.filter((item) => item.type === "UPL").length,
    [requests],
  );

  const resetForm = () => {
    const firstEmployee = employees[0];

    setEmployeeNo(firstEmployee?.employee_no ?? "");
    setEmployeeName(
      firstEmployee
        ? employeeDisplayName(
            firstEmployee,
            language,
            firstEmployee.employee_no,
          )
        : "",
    );
    setDepartment(
      firstEmployee
        ? departmentDisplayName(
            firstEmployee,
            language,
          )
        : "",
    );
    setDate("");
    setType("AL");
    setStartTime("");
    setEndTime("");
    setReason("");
  };

  const submitRequest = async () => {
    if (
      !employeeNo.trim() ||
      !employeeName.trim() ||
      !date ||
      !startTime ||
      !endTime ||
      !reason.trim() ||
      submitting
    ) {
      return;
    }

    if (startTime >= endTime) {
      setRequestsError(
        language === "cn"
          ? "结束时间必须晚于开始时间。"
          : "End time must be later than start time.",
      );
      return;
    }

    setSubmitting(true);
    setRequestsError(null);

    try {
      const response = await fetch(API_LEAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeNo: employeeNo.trim(),
          date,
          requestType: type,
          startTime,
          endTime,
          reason: reason.trim(),
          createdBy: employeeNo.trim(),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow;
        error?: string;
      };

      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      setRequests((current) => [
        mapLeaveRow(payload.data as LeaveApiRow),
        ...current.filter(
          (item) => item.id !== String(payload.data?.id),
        ),
      ]);

      resetForm();
      setShowForm(false);
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : "Failed to submit leave request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status: RequestStatus) =>
    language === "cn"
      ? STATUS_META[status].labelCn
      : STATUS_META[status].labelEn;

  const typeLabel = (value: RequestType) =>
    language === "cn"
      ? TYPE_META[value].labelCn
      : TYPE_META[value].labelEn;

  return (
    <AppShell title="">
      <div className="min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        <style>{`
          [data-theme="light"] .leave-page-text,
          [data-theme="light"] .leave-type-text {
            color: #0f172a !important;
          }

          [data-theme="dark"] .leave-page-text,
          [data-theme="dark"] .leave-type-text {
            color: #ffffff !important;
          }

          [data-theme="light"] .leave-status-pending {
            color: #92400e !important;
          }

          [data-theme="light"] .leave-status-approved {
            color: #166534 !important;
          }

          [data-theme="light"] .leave-status-rejected {
            color: #991b1b !important;
          }

          [data-theme="dark"] .leave-status-pending,
          [data-theme="dark"] .leave-status-approved,
          [data-theme="dark"] .leave-status-rejected {
            color: #ffffff !important;
          }
        `}</style>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-lg font-black text-cyan-600 dark:text-cyan-300">
                📝
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text">
                  {language === "cn"
                    ? "请假 / 外出"
                    : "Leave / Permission"}
                </h1>
                <p className="mt-1 text-xs text-text-muted">
                  {language === "cn"
                    ? "提交、查看和审核员工请假与外出申请。"
                    : "Submit, review and track employee leave and permission requests."}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-cyan-700"
          >
            + {language === "cn" ? "新申请" : "New Request"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={language === "cn" ? "待审核" : "Pending"}
            value={pendingCount}
            tone="amber"
          />
          <MetricCard
            label={language === "cn" ? "已批准" : "Approved"}
            value={approvedCount}
            tone="emerald"
          />
          <MetricCard
            label={language === "cn" ? "年假申请" : "Annual Leave"}
            value={leaveCount}
            tone="blue"
          />
          <MetricCard
            label={language === "cn" ? "外出 / 事假" : "Permission"}
            value={permissionCount}
            tone="indigo"
          />
        </div>

        <Card>
          <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-hover p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-text">
                {language === "cn"
                  ? "申请记录"
                  : "Leave & Permission Requests"}
              </h2>
              <p className="mt-1 text-[10px] text-text-muted">
                {language === "cn"
                  ? "申请记录来自 Leave API，并保存到数据库。"
                  : "Requests are loaded from the Leave API and stored in the database."}
              </p>
            </div>

            <div className="rounded-full border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text">
              {requests.length}{" "}
              {language === "cn" ? "条记录" : "records"}
            </div>
          </div>

          {requestsError && (
            <div className="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-yelow">
              {requestsError}
            </div>
          )}

          {!authLoading && !currentEmployeeNo && (
            <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {language === "cn"
                ? "无法识别当前登录账户，无法执行审核。"
                : "Current login account could not be identified. Approval is disabled."}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="border-b border-r border-border px-4 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "员工" : "Employee"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "部门" : "Department"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "日期" : "Date"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "类型" : "Type"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "开始" : "Start"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "结束" : "End"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "原因" : "Reason"}
                  </th>
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "状态" : "Status"}
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "操作" : "Action"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {requestsLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-xs font-semibold text-text-muted"
                    >
                      {language === "cn"
                        ? "加载申请记录..."
                        : "Loading requests..."}
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-xs font-semibold text-text-muted"
                    >
                      {language === "cn"
                        ? "暂无申请记录"
                        : "No leave requests yet."}
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border-subtle transition hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-extrabold text-text">
                        {item.employeeName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-text-dim">
                        {item.employeeNo}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-[10px] font-semibold text-text-muted">
                      {item.department}
                    </td>

                    <td className="px-3 py-3 text-[10px] font-bold text-text">
                      {item.date}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${TYPE_META[item.type].className}`}
                      >
                        <span className="leave-type-text">
                          {item.type} · {typeLabel(item.type)}
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-3 text-[10px] font-bold text-text">
                      {item.startTime || "—"}
                    </td>

                    <td className="px-3 py-3 text-[10px] font-bold text-text">
                      {item.endTime || "—"}
                    </td>

                    <td className="max-w-[300px] px-3 py-3 text-xs font-medium text-text">
                      <div className="truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </td>

                    <td className="border-r border-border px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${STATUS_META[item.status].className}`}
                      >
                        <span
                          className={
                            item.status === "Pending"
                              ? "leave-status-pending"
                              : item.status === "Approved"
                                ? "leave-status-approved"
                                : "leave-status-rejected"
                          }
                        >
                          {statusLabel(item.status)}
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {item.status === "Pending" && canApproveRequest(item) ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(item, "Approved")
                            }
                            disabled={approvalId === item.id}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {approvalId === item.id
                              ? language === "cn"
                                ? "处理中..."
                                : "Working..."
                              : language === "cn"
                                ? "批准"
                                : "Approve"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(item, "Rejected")
                            }
                            disabled={approvalId === item.id}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {language === "cn" ? "拒绝" : "Reject"}
                          </button>
                        </div>
                      ) : item.status === "Pending" ? (
                        <span className="block text-center text-[10px] font-semibold text-text-dim">
                          {item.employeeNo === currentEmployeeNo
                            ? language === "cn"
                              ? "等待经理权限"
                              : "Manager approval required"
                            : language === "cn"
                              ? "等待直属经理"
                              : "Waiting for manager"}
                        </span>
                      ) : (
                        <span className="block text-center text-[10px] font-semibold text-text-dim">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl">
              <div className="flex items-start justify-between border-b border-border-subtle px-5 py-4">
                <div>
                  <h2 className="text-base font-extrabold text-text">
                    {language === "cn"
                      ? "新建请假 / 外出申请"
                      : "New Leave / Permission Request"}
                  </h2>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {language === "cn"
                      ? "提交后状态为待审核。"
                      : "New requests are created with Pending status."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-lg font-bold text-text-muted transition hover:bg-surface-hover hover:text-text"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field
                    label={language === "cn" ? "选择员工" : "Employee"}
                  >
                    <select
                      value={employeeNo}
                      onChange={(event) =>
                        handleEmployeeChange(event.target.value)
                      }
                      disabled={employeesLoading || employees.length === 0}
                      className="field-input"
                    >
                      {employees.length === 0 ? (
                        <option value="">
                          {employeesLoading
                            ? language === "cn"
                              ? "加载员工..."
                              : "Loading employees..."
                            : language === "cn"
                              ? "没有可用员工"
                              : "No active employees"}
                        </option>
                      ) : (
                        employees.map((employee) => {
                          const displayName = employeeDisplayName(
                            employee,
                            language,
                            employee.employee_no,
                          );

                          return (
                            <option
                              key={employee.employee_no}
                              value={employee.employee_no}
                            >
                              {displayName} · {employee.employee_no}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </Field>

                  {employeeError && (
                    <p className="mt-1.5 text-[10px] font-semibold text-red-600 dark:text-red-300">
                      {employeeError}
                    </p>
                  )}
                </div>

                <Field
                  label={language === "cn" ? "员工工号" : "Employee No."}
                >
                  <input
                    value={employeeNo}
                    readOnly
                    className="field-input bg-slate-50 dark:bg-slate-900/40"
                  />
                </Field>

                <Field
                  label={language === "cn" ? "员工姓名" : "Employee Name"}
                >
                  <input
                    value={employeeName}
                    readOnly
                    className="field-input bg-slate-50 dark:bg-slate-900/40"
                  />
                </Field>

                <Field label={language === "cn" ? "部门" : "Department"}>
                  <input
                    value={department}
                    readOnly
                    placeholder="IT"
                    className="field-input bg-slate-50 dark:bg-slate-900/40"
                  />
                </Field>

                <Field label={language === "cn" ? "日期" : "Date"}>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="field-input"
                  />
                </Field>

                <Field label={language === "cn" ? "类型" : "Type"}>
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as RequestType)
                    }
                    className="field-input"
                  >
                    <option value="AL">
                      AL — {language === "cn" ? "年假" : "Annual Leave"}
                    </option>
                    <option value="MC">
                      MC — {language === "cn" ? "病假" : "Sick Leave"}
                    </option>
                    <option value="UPL">
                      UPL — {language === "cn" ? "请假 / 外出" : "Permission"}
                    </option>
                    <option value="OT">
                      OT — {language === "cn" ? "加班" : "Overtime"}
                    </option>
                  </select>
                </Field>

                <Field label={language === "cn" ? "开始时间" : "Start Time"}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="field-input"
                  />
                </Field>

                <Field label={language === "cn" ? "结束时间" : "End Time"}>
                  <input
                    type="time"
                    value={endTime}
                    min={startTime || undefined}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="field-input"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label={language === "cn" ? "原因" : "Reason"}>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={
                        language === "cn"
                          ? "请输入申请原因..."
                          : "Enter the reason for this request..."
                      }
                      rows={4}
                      className="field-input resize-none"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition hover:bg-surface-hover"
                >
                  {language === "cn" ? "取消" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={
                    employeesLoading ||
                    employees.length === 0 ||
                    submitting ||
                    !employeeNo ||
                    !date ||
                    !startTime ||
                    !endTime ||
                    !reason.trim()
                  }
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? language === "cn"
                      ? "提交中..."
                      : "Submitting..."
                    : language === "cn"
                      ? "提交申请"
                      : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "blue" | "indigo";
}) {
  const toneClass = {
    amber:
      "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
    emerald:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    blue:
      "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
    indigo:
      "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-text">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-text-dim">
        {label}
      </span>
      <style>{`
        .field-input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 0.65rem;
          padding: 0.7rem 0.75rem;
          font-size: 0.75rem;
          line-height: 1.2rem;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .field-input::placeholder {
          color: var(--text-dim);
        }

        .field-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
      `}</style>
      {children}
    </label>
  );
}

function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface">
      {children}
    </div>
  );
}
