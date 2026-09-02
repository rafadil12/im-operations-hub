"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

type OrganizationLanguage = "en" | "cn";

type RequestType = "AL" | "MC" | "UPL" | "OT" | "ALPA" | "NO_ATTENDANCE";
type NoAttendanceType = "NO_CHECK_IN" | "NO_CHECK_OUT" | "NO_CHECK_IN_OUT";
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
  noAttendanceType?: NoAttendanceType | null;
  oaNumber?: string | null;
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
  ALPA: {
    labelEn: "Absent Without Leave",
    labelCn: "旷工",
    className:
    "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
  },
  NO_ATTENDANCE: {
    labelEn: "No Attendance",
    labelCn: "未打卡",
    className:
      "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10",
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
  no_attendance_type?: NoAttendanceType | null;
  noAttendanceType?: NoAttendanceType | null;
  oa_number: string | null;
  oaNumber?: string | null;
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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [oaSavingId, setOaSavingId] = useState<string | null>(null);
  const [oaDrafts, setOaDrafts] = useState<Record<string, string>>({});
  const [oaEditingIds, setOaEditingIds] = useState<Record<string, boolean>>({});

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  const [employeeNo, setEmployeeNo] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<RequestType>("AL");
  const [noAttendanceType, setNoAttendanceType] = useState<NoAttendanceType | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | RequestType>("");
  const [statusFilter, setStatusFilter] = useState<"" | RequestStatus>("");
  const [oaNumberFilter, setOaNumberFilter] = useState<"" | "HAS_OA" | "NO_OA">("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
            employee_no?: string | null;
            role?: string | null;
            roleName?: string | null;
          } | null;
        };

        if (cancelled) return;

        const account = payload.account ?? null;
        const employeeNo =
          account?.employeeNo ?? account?.employee_no ?? null;
        const userId = account?.id ?? null;
        const role = account?.roleName ?? account?.role ?? null;

        setCurrentEmployeeNo(
          employeeNo ? String(employeeNo).trim() : null,
        );
        setCurrentUserId(
          typeof userId === "number" ? userId : null,
        );
        setCurrentUserRole(
          role ? String(role).trim().toLowerCase() : null,
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load current login account", error);
          setCurrentEmployeeNo(null);
        setCurrentUserId(null);
        setCurrentUserRole(null);
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
      noAttendanceType:
        row.no_attendance_type ?? row.noAttendanceType ?? null,
      status: row.status,
      createdAt: row.created_at,
      oaNumber: row.oa_number ?? row.oaNumber ?? null,
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
  }, [employees, language]);

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

  const noAttendanceLabel = (value: NoAttendanceType | null | undefined) => {
    if (!value) return "—";
    const labels: Record<NoAttendanceType, { en: string; cn: string }> = {
      NO_CHECK_IN: { en: "No Check-in", cn: "未打上班卡" },
      NO_CHECK_OUT: { en: "No Check-out", cn: "未打下班卡" },
      NO_CHECK_IN_OUT: { en: "No Check-in & Check-out", cn: "上下班均未打卡" },
    };
    return language === "cn" ? labels[value].cn : labels[value].en;
  };

  const canEditOaNumber = (item: LeaveRequest) =>
    item.status === "Approved" &&
    String(currentUserRole ?? "").trim().toLowerCase() === "admin";

  const updateOaNumber = async (request: LeaveRequest) => {
    if (!canEditOaNumber(request) || oaSavingId) return;
    const value = (oaDrafts[request.id] ?? request.oaNumber ?? "").trim();
    setOaSavingId(request.id);
    setRequestsError(null);
    try {
      const response = await fetch(API_LEAVE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(request.id), oaNumber: value || null }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow;
        error?: string;
      };
      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(payload.error || `Leave API failed: ${response.status}`);
      }
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? mapLeaveRow(payload.data as LeaveApiRow) : item,
        ),
      );
      setOaDrafts((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      setOaEditingIds((current) => ({
        ...current,
        [request.id]: false,
      }));
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : "Failed to update OA Number.");
    } finally {
      setOaSavingId(null);
    }
  };

  const totalRequestsCount = useMemo(
    () => requests.length,
    [requests],
  );

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "Pending").length,
    [requests],
  );

  const approvedCount = useMemo(
    () => requests.filter((item) => item.status === "Approved").length,
    [requests],
  );

  const rejectedCount = useMemo(
    () => requests.filter((item) => item.status === "Rejected").length,
    [requests],
  );

  const noAttendanceCount = useMemo(
    () => requests.filter((item) => item.type === "NO_ATTENDANCE").length,
    [requests],
  );

  const oaCompletedCount = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "Approved" && Boolean(item.oaNumber?.trim()),
      ).length,
    [requests],
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (employeeFilter && item.employeeNo !== employeeFilter) return false;
      if (departmentFilter && item.department !== departmentFilter) return false;
      if (dateFilter && item.date !== dateFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (oaNumberFilter === "HAS_OA" && !item.oaNumber?.trim()) return false;
      if (oaNumberFilter === "NO_OA" && item.oaNumber?.trim()) return false;
      return true;
    });
  }, [
    requests,
    employeeFilter,
    departmentFilter,
    dateFilter,
    typeFilter,
    statusFilter,
    oaNumberFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    employeeFilter,
    departmentFilter,
    dateFilter,
    typeFilter,
    statusFilter,
    oaNumberFilter,
  ]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    setNoAttendanceType(null);
    setStartTime("");
    setEndTime("");
    setReason("");
  };

  const submitRequest = async () => {
    if (
      !employeeNo.trim() ||
      !employeeName.trim() ||
      !date ||
      (type === "NO_ATTENDANCE" && !noAttendanceType) ||
      (type !== "NO_ATTENDANCE" && (!startTime || !endTime)) ||
      !reason.trim() ||
      submitting
    ) {
      return;
    }

    if (type !== "NO_ATTENDANCE" && startTime >= endTime) {
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
          noAttendanceType: type === "NO_ATTENDANCE" ? noAttendanceType : null,
          startTime: type === "NO_ATTENDANCE" ? null : startTime,
          endTime: type === "NO_ATTENDANCE" ? null : endTime,
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
    TYPE_META[value]?.[language === "cn" ? "labelCn" : "labelEn"] ?? String(value);

  const requestTypeDisplayLabel = (item: LeaveRequest) => {
    if (item.type === "NO_ATTENDANCE") {
      const attendanceLabel = noAttendanceLabel(item.noAttendanceType);
      return attendanceLabel === "—"
        ? `${item.type} · ${typeLabel(item.type)}`
        : `${item.type} · ${attendanceLabel}`;
    }

    return `${item.type} · ${typeLabel(item.type)}`;
  };

  return (
    <AppShell
  title={
    language === "cn"
      ? "请假 / 外出"
      : "Leave / Permission"
  }>
      <div className="min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        <style>{`
          [data-theme="light"] .leave-page-text,
          [data-theme="light"] .leave-type-text {
            color: #0f172a !important;
          }

          [data-theme="dark"] .leave-page-text,
          [data-theme="dark"] .leave-type-text,
          [data-theme="dark"] .leave-status-pending,
          [data-theme="dark"] .leave-status-approved,
          [data-theme="dark"] .leave-status-rejected {
            color: #f8fafc !important;
          }

          /* Dark mode: keep badges readable instead of using light-mode fills. */
          [data-theme="dark"] .leave-type-pill {
            color: #f8fafc !important;
            background-color: #172033 !important;
            border-color: #475569 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="AL"] {
            background-color: #172554 !important;
            border-color: #3b82f6 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="MC"] {
            background-color: #2e1065 !important;
            border-color: #8b5cf6 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="UPL"] {
            background-color: #1e1b4b !important;
            border-color: #6366f1 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="OT"] {
            background-color: #431407 !important;
            border-color: #f97316 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="ALPA"] {
            background-color: #450a0a !important;
            border-color: #ef4444 !important;
          }

          [data-theme="dark"] .leave-type-pill[data-request-type="NO_ATTENDANCE"] {
            background-color: #4c0519 !important;
            border-color: #fb7185 !important;
          }

          [data-theme="dark"] .leave-status-pill {
            color: #f8fafc !important;
            background-color: #172033 !important;
            border-color: #475569 !important;
          }

          [data-theme="dark"] .leave-status-pill[data-status="Pending"] {
            background-color: #422006 !important;
            border-color: #f59e0b !important;
          }

          [data-theme="dark"] .leave-status-pill[data-status="Approved"] {
            background-color: #052e16 !important;
            border-color: #34d399 !important;
          }

          [data-theme="dark"] .leave-status-pill[data-status="Rejected"] {
            background-color: #450a0a !important;
            border-color: #f87171 !important;
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

          .leave-filter-input {
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

          .leave-filter-input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-soft);
          }
        `}</style>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/5 text-lg font-bold text-cyan-600 dark:text-cyan-300">
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
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-md"
          >
            + {language === "cn" ? "新申请" : "New Request"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label={language === "cn" ? "总申请数" : "Total Requests"}
            value={totalRequestsCount}
            tone="blue"
          />
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
            label={language === "cn" ? "已拒绝" : "Rejected"}
            value={rejectedCount}
            tone="red"
          />
          <MetricCard
            label={language === "cn" ? "未打卡" : "No Attendance"}
            value={noAttendanceCount}
            tone="rose"
          />
          <MetricCard
            label={language === "cn" ? "OA 已完成" : "OA Completed"}
            value={oaCompletedCount}
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

            <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text shadow-sm">
              {filteredRequests.length}{" "}
              {language === "cn" ? "条记录" : "records"}
            </div>
          </div>

          <div className="grid gap-3 border-b border-border-subtle p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="leave-filter-input"
            >
              <option value="">{language === "cn" ? "所有员工" : "All Employees"}</option>
              {employees.map((employee) => (
                <option key={employee.employee_no} value={employee.employee_no}>
                  {employeeDisplayName(employee, language, employee.employee_no)}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="leave-filter-input"
            >
              <option value="">{language === "cn" ? "所有部门" : "All Departments"}</option>
              {Array.from(
                new Set(
                  requests
                    .map((item) => item.department)
                    .filter((value) => value && value !== "—"),
                ),
              ).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="leave-filter-input"
              aria-label={language === "cn" ? "日期" : "Date"}
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "" | RequestType)
              }
              className="leave-filter-input"
            >
              <option value="">{language === "cn" ? "所有类型" : "All Types"}</option>
              {Object.keys(TYPE_META).map((requestType) => (
                <option key={requestType} value={requestType}>
                  {requestType} · {typeLabel(requestType as RequestType)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "" | RequestStatus)
              }
              className="leave-filter-input"
            >
              <option value="">{language === "cn" ? "所有状态" : "All Statuses"}</option>
              {Object.keys(STATUS_META).map((requestStatus) => (
                <option key={requestStatus} value={requestStatus}>
                  {statusLabel(requestStatus as RequestStatus)}
                </option>
              ))}
            </select>

            <select
              value={oaNumberFilter}
              onChange={(event) =>
                setOaNumberFilter(
                  event.target.value as "" | "HAS_OA" | "NO_OA",
                )
              }
              className="leave-filter-input"
            >
              <option value="">{language === "cn" ? "所有 OA 编号" : "All OA Numbers"}</option>
              <option value="HAS_OA">{language === "cn" ? "有 OA 编号" : "Has OA Number"}</option>
              <option value="NO_OA">{language === "cn" ? "无 OA 编号" : "No OA Number"}</option>
            </select>
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
                  <th className="border-b border-r border-border px-3 py-3 text-left text-[10px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "OA 编号" : "OA Number"}
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
                      colSpan={10}
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
                      colSpan={10}
                      className="px-6 py-12 text-center text-xs font-semibold text-text-muted"
                    >
                      {language === "cn"
                        ? "暂无申请记录"
                        : "No leave requests yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border-subtle transition-colors hover:bg-surface-hover/60"
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
                        data-request-type={item.type}
                        className={`leave-type-pill inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${TYPE_META[item.type]?.className ?? "border-slate-200 bg-slate-50"}`}
                      >
                        <span className="leave-type-text">
                          {requestTypeDisplayLabel(item)}
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
                        data-status={item.status}
                        className={`leave-status-pill inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${STATUS_META[item.status]?.className ?? "border-slate-200 bg-slate-50"}`}
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

                    <td className="border-r border-border px-3 py-3">
                      {item.status === "Approved" ? (
                        canEditOaNumber(item) ? (
                          oaEditingIds[item.id] || !item.oaNumber ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                value={oaDrafts[item.id] ?? item.oaNumber ?? ""}
                                onChange={(event) =>
                                  setOaDrafts((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                disabled={oaSavingId === item.id}
                                className="w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-semibold text-text"
                                placeholder={language === "cn" ? "OA 编号" : "OA Number"}
                              />
                              <button
                                type="button"
                                onClick={() => void updateOaNumber(item)}
                                disabled={oaSavingId === item.id}
                                className="rounded-lg bg-cyan-600 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                              >
                                {oaSavingId === item.id ? "..." : language === "cn" ? "保存" : "Save"}
                              </button>
                              {oaEditingIds[item.id] && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOaEditingIds((current) => ({
                                      ...current,
                                      [item.id]: false,
                                    }))
                                  }
                                  disabled={oaSavingId === item.id}
                                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold text-text disabled:opacity-50"
                                >
                                  {language === "cn" ? "取消" : "Cancel"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-text">
                                {item.oaNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOaDrafts((current) => ({
                                    ...current,
                                    [item.id]: item.oaNumber ?? "",
                                  }));
                                  setOaEditingIds((current) => ({
                                    ...current,
                                    [item.id]: true,
                                  }));
                                }}
                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold text-text transition hover:bg-surface-hover"
                              >
                                {language === "cn" ? "编辑" : "Edit"}
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] font-semibold text-text-muted">
                            {item.oaNumber || "—"}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-text-muted">
                          —
                        </span>
                      )}
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

          {!requestsLoading && filteredRequests.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-semibold text-text-muted">
                {language === "cn"
                  ? `第 ${currentPage} / ${totalPages} 页 · 共 ${filteredRequests.length} 条`
                  : `Page ${currentPage} of ${totalPages} · ${filteredRequests.length} records`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {language === "cn" ? "上一页" : "Previous"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {language === "cn" ? "下一页" : "Next"}
                </button>
              </div>
            </div>
          )}
        </Card>

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl">
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
                    <option value="ALPA">
                      ALPA — {language === "cn" ? "旷工" : "Absent Without Leave"}
                    </option>
                    <option value="NO_ATTENDANCE">
                      {language === "cn" ? "未打卡" : "No Attendance"}
                    </option>
                  </select>
                </Field>

                {type === "NO_ATTENDANCE" && (
                  <Field label={language === "cn" ? "未打卡类型" : "No Attendance Type"}>
                    <select
                      value={noAttendanceType ?? ""}
                      onChange={(event) =>
                        setNoAttendanceType(
                          (event.target.value || null) as NoAttendanceType | null,
                        )
                      }
                      className="field-input"
                    >
                      <option value="">{language === "cn" ? "请选择" : "Select"}</option>
                      <option value="NO_CHECK_IN">{language === "cn" ? "未打上班卡" : "No Check-in"}</option>
                      <option value="NO_CHECK_OUT">{language === "cn" ? "未打下班卡" : "No Check-out"}</option>
                      <option value="NO_CHECK_IN_OUT">{language === "cn" ? "上下班均未打卡" : "No Check-in & Check-out"}</option>
                    </select>
                  </Field>
                )}

                {type !== "NO_ATTENDANCE" && (
                  <>
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
                  </>
                )}

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
                    (type === "NO_ATTENDANCE"
                      ? !noAttendanceType
                      : !startTime || !endTime) ||
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
  tone: "amber" | "emerald" | "blue" | "indigo" | "red" | "rose";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_32px_rgba(8,47,73,0.12)]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-text">{value}</p>
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
    <div className="rounded-xl border border-border bg-surface transition-[border-color,box-shadow,background-color] duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_32px_rgba(8,47,73,0.12)]">
      {children}
    </div>
  );
}
