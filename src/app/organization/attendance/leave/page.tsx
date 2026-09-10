"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OrganizationGate } from "@/components/organization/OrganizationGate";
import { handleGuestForbiddenResponse } from "@/lib/apiClient";
import { useGuestWriteGuard } from "@/hooks/useGuestWriteGuard";
import { useLang } from "@/lib/i18n";
import { organizationLanguageValue } from "@/lib/organization/copy";
import { Skeleton } from "@/components/ui/Skeleton";
import { organizationText } from "@/lib/organization/copy";
import type { OrganizationLanguage } from "@/lib/organization/copy";

type RequestType = "AL" | "MC" | "UPL" | "OT" | "ALPA" | "NO_ATTENDANCE";
type NoAttendanceType = "NO_CHECK_IN" | "NO_CHECK_OUT" | "NO_CHECK_IN_OUT";
type RequestStatus = "Pending" | "Approved" | "Rejected";
type LeaveSource = "pending" | "final" | "history";

type Employee = {
  id: number;
  employee_no: string;
  name_en: string | null;
  name_cn: string | null;
  division_name_en: string | null;
  division_name_cn: string | null;
  employment_status: string | null;
  is_manager: boolean;
};

type LeaveRequest = {
  id: string;
  source: LeaveSource;
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
    labelEn: "Unpaid Leave",
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
  source: LeaveSource;
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

  return organizationLanguageValue(language, employee.name_en || employee.name_cn || employee.employee_no, employee.name_cn || employee.name_en || employee.employee_no);
}

function requestKey(request: Pick<LeaveRequest, "id" | "source">): string {
  return `${request.source}:${request.id}`;
}

function departmentDisplayName(
  employee: Employee | null | undefined,
  language: OrganizationLanguage,
  fallback = "—",
) {
  if (!employee) return fallback;

  return organizationLanguageValue(language, employee.division_name_en || employee.division_name_cn || fallback, employee.division_name_cn || employee.division_name_en || fallback);
}

const DEMO_REQUESTS: LeaveRequest[] = [
  {
    id: "demo-1",
    source: "final",
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
    source: "pending",
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
    source: "final",
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
  const { lang } = useLang();
  const guardWrite = useGuestWriteGuard();
  const language: OrganizationLanguage = lang === "cn" ? "cn" : "en";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);

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
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [typeFilter, setTypeFilter] = useState<"" | RequestType>("");
  const [statusFilter, setStatusFilter] = useState<"" | RequestStatus>("");
  const [oaNumberFilter, setOaNumberFilter] = useState<"" | "HAS_OA" | "NO_OA">("");

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
            ( employee.employment_status === "Active"||
            employee.is_manager
            ),
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
      source: row.source,
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
    if (!guardWrite()) {
      return;
    }

    if (
      !currentEmployeeNo ||
      !canApproveRequest(request) ||
      approvalId
    ) {
      return;
    }

    const approvalKey = requestKey(request);
    setApprovalId(approvalKey);
    setRequestsError(null);

    try {
      const response = await fetch(API_LEAVE, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(request.id),
          source: request.source,
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
        if (handleGuestForbiddenResponse(response.status, payload, "PATCH")) {
          return;
        }
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      // Reject is stored in attendance_leave_history and removed from the
      // pending table. Reload the list so the new Rejected history row appears.
      if (status === "Rejected") {
        await loadRequests();
        return;
      }

      // Approve moves the pending request into the final table and returns
      // the new final row. The final row can have a different database ID.
      if (!payload.data) {
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      const updatedItem = mapLeaveRow(payload.data as LeaveApiRow);

      setRequests((current) => [
        updatedItem,
        ...current.filter((item) => requestKey(item) !== approvalKey),
      ]);
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
    return organizationLanguageValue(language, labels[value].en, labels[value].cn);
  };

  const canEditOaNumber = (item: LeaveRequest) =>
    item.status === "Approved" &&
    String(currentUserRole ?? "").trim().toLowerCase() === "admin";

  const updateOaNumber = async (request: LeaveRequest) => {
    if (!guardWrite()) {
      return;
    }

    if (!canEditOaNumber(request) || oaSavingId) return;
    const key = requestKey(request);
    const value = (oaDrafts[key] ?? request.oaNumber ?? "").trim();
    setOaSavingId(key);
    setRequestsError(null);
    try {
      const response = await fetch(API_LEAVE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(request.id),
          source: "final",
          oaNumber: value || null,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow;
        error?: string;
      };
      if (!response.ok || payload.success === false || !payload.data) {
        if (handleGuestForbiddenResponse(response.status, payload, "PATCH")) {
          return;
        }
        throw new Error(payload.error || `Leave API failed: ${response.status}`);
      }
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id && item.source === request.source
            ? mapLeaveRow(payload.data as LeaveApiRow)
            : item,
        ),
      );
      setOaDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setOaEditingIds((current) => ({
        ...current,
        [key]: false,
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
      if (monthFilter && !item.date.startsWith(monthFilter)) return false;
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
    monthFilter,
    dateFilter,
    typeFilter,
    statusFilter,
    oaNumberFilter,
  ]);

  const resetForm = () => {
    const firstEmployee = employees[0];

    setEmployeeNo(firstEmployee?.employee_no ?? currentEmployeeNo ?? "");
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

  const closeForm = () => {
    setShowForm(false);
    setEditingRequest(null);
    setRequestsError(null);
  };

  const openNewRequestForm = () => {
    setEditingRequest(null);
    resetForm();
    setRequestsError(null);
    setShowForm(true);
  };

  const canEditRequest = (item: LeaveRequest) => {
    if (authLoading || !currentEmployeeNo) return false;
    if (item.status !== "Pending") return false;
    if (item.source !== "pending") return false;

    const role = String(currentUserRole ?? "").trim().toLowerCase();
    const isAdmin = role === "admin";
    const isOwner = item.employeeNo === currentEmployeeNo;

    return isOwner || isAdmin;
  };

  const openEditForm = (item: LeaveRequest) => {
    if (!canEditRequest(item)) return;

    setEditingRequest(item);
    setEmployeeNo(item.employeeNo);
    setEmployeeName(item.employeeName);
    setDepartment(item.department);
    setDate(item.date);
    setType(item.type);
    setNoAttendanceType(item.noAttendanceType ?? null);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setReason(item.reason);
    setRequestsError(null);
    setShowForm(true);
  };

  const submitRequest = async () => {
    if (!guardWrite()) {
      return;
    }

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

    if (type !== "NO_ATTENDANCE") {
        const startMinutes =
          Number(startTime.slice(0, 2)) * 60 +
          Number(startTime.slice(3, 5));

        const endMinutes =
          Number(endTime.slice(0, 2)) * 60 +
          Number(endTime.slice(3, 5));

        // Same time is invalid
        if (startMinutes === endMinutes) {
          setRequestsError(
            language === "cn"
              ? "开始时间和结束时间不能相同。"
              : "Start time and end time cannot be the same.",
          );
          return;
        }

        // Earlier end time = overnight request
        // Overnight is only allowed when starting at 18:00 or later.
        if (endMinutes < startMinutes && startMinutes < 18 * 60) {
          setRequestsError(
            language === "cn"
              ? "跨天申请的开始时间必须为18:00以后。"
              : "Overnight requests must start at 18:00 or later.",
          );
          return;
        }
      }

    if (editingRequest && !canEditRequest(editingRequest)) {
      setRequestsError(
        language === "cn"
          ? "该申请当前不可编辑。"
          : "This request cannot be edited.",
      );
      return;
    }

    const isEditing = Boolean(editingRequest);

    setSubmitting(true);
    setRequestsError(null);

    try {
      const response = await fetch(API_LEAVE, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditing
            ? {
                id: Number(editingRequest?.id),
                source: "pending",
                employeeNo: employeeNo.trim(),
                requestType: type,
                noAttendanceType:
                  type === "NO_ATTENDANCE" ? noAttendanceType : null,
                date,
                startTime: type === "NO_ATTENDANCE" ? null : startTime,
                endTime: type === "NO_ATTENDANCE" ? null : endTime,
                reason: reason.trim(),
                updatedBy: currentEmployeeNo ?? employeeNo.trim(),
              }
            : {
                employeeNo: employeeNo.trim(),
                date,
                requestType: type,
                noAttendanceType:
                  type === "NO_ATTENDANCE" ? noAttendanceType : null,
                startTime: type === "NO_ATTENDANCE" ? null : startTime,
                endTime: type === "NO_ATTENDANCE" ? null : endTime,
                reason: reason.trim(),
                createdBy: employeeNo.trim(),
              },
        ),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: LeaveApiRow;
        error?: string;
      };

      if (!response.ok || payload.success === false || !payload.data) {
        if (handleGuestForbiddenResponse(response.status, payload, "POST")) {
          return;
        }
        throw new Error(
          payload.error || `Leave API failed: ${response.status}`,
        );
      }

      const updatedItem = mapLeaveRow(payload.data as LeaveApiRow);

      setRequests((current) => {
        if (isEditing) {
          return current.map((item) =>
            item.id === updatedItem.id && item.source === updatedItem.source
              ? updatedItem
              : item,
          );
        }

        return [
          updatedItem,
          ...current.filter((item) => item.id !== updatedItem.id),
        ];
      });

      closeForm();
      await loadRequests();
      
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Failed to update leave request."
            : "Failed to submit leave request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status: RequestStatus) =>
    organizationLanguageValue(language, STATUS_META[status].labelEn, STATUS_META[status].labelCn);

  const typeLabel = (value: RequestType) =>
    TYPE_META[value]?.[organizationLanguageValue(language, "labelEn", "labelCn")] ?? String(value);

  const requestTypeDisplayLabel = (item: LeaveRequest) => {
    if (item.type === "NO_ATTENDANCE") {
      const attendanceLabel = noAttendanceLabel(item.noAttendanceType);
      return attendanceLabel === "—"
         ? typeLabel(item.type)
         : attendanceLabel;
    }

    return `${item.type} · ${typeLabel(item.type)}`;
  };

  return (
    <OrganizationGate
      allow={(access) =>
        access.canViewOrganizationAttendance || access.canManageOrganizationAttendance
      }
    >
    <AppShell
  title={
    organizationText("leavePermission", language)
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
            height: 38px;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
            border-radius: 0.5rem;
            padding: 0 0.65rem;
            font-size: 0.7rem;
            line-height: 1rem;
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
                  {organizationText("leavePermission", language)}
                </h1>
                <p className="mt-1 text-xs text-text-muted">
                  {organizationText("submitReviewAndTrackEmployeeLeaveAndPermissionRequests", language)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewRequestForm}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-md"
          >
            + {organizationText("newRequest2", language)}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label={organizationText("totalRequests", language)}
            value={totalRequestsCount}
            tone="blue"
          />
          <MetricCard
            label={organizationText("pending", language)}
            value={pendingCount}
            tone="amber"
          />
          <MetricCard
            label={organizationText("approved", language)}
            value={approvedCount}
            tone="emerald"
          />
          <MetricCard
            label={organizationText("rejected", language)}
            value={rejectedCount}
            tone="red"
          />
          <MetricCard
            label={organizationText("noAttendance", language)}
            value={noAttendanceCount}
            tone="rose"
          />
          <MetricCard
            label={organizationText("oaCompleted", language)}
            value={oaCompletedCount}
            tone="indigo"
          />
        </div>

        <Card>
          <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-hover p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-text">
                {organizationText("leavePermissionRequests", language)}
              </h2>
              <p className="mt-1 text-[10px] text-text-muted">
                {organizationText("requestsAreLoadedFromTheLeaveApiAndStoredIn", language)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text shadow-sm">
              {filteredRequests.length}{" "}
              {organizationText("records", language)}
            </div>
          </div>

          <div className="grid gap-2 border-b border-border-subtle px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="leave-filter-input"
            >
              <option value="">{organizationText("allEmployees", language)}</option>
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
              <option value="">{organizationText("allDepartments", language)}</option>
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
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="leave-filter-input"
              aria-label={language === "cn" ? "月份" : "Month"}
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "" | RequestType)
              }
              className="leave-filter-input"
            >
              <option value="">{organizationText("allTypes", language)}</option>
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
              <option value="">{organizationText("allStatuses", language)}</option>
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
              <option value="">{organizationText("allOaNumbers", language)}</option>
              <option value="HAS_OA">{organizationText("hasOaNumber", language)}</option>
              <option value="NO_OA">{organizationText("noOaNumber", language)}</option>
            </select>
          </div>

         {requestsError && !showForm && (
            <div className="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {requestsError}
            </div>
          )}

          {!authLoading && !currentEmployeeNo && (
            <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {organizationText("accountNotIdentified", language)}
            </div>
          )}

          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-[1100px] w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="border-b border-r border-border px-3 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "员工" : "Employee"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "部门" : "Department"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "日期" : "Date"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "类型" : "Type"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "时间" : "Time"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "原因" : "Reason"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "状态" : "Status"}
                  </th>
                  <th className="border-b border-r border-border px-2 py-2 text-left text-[9px] font-black text-slate-700 dark:text-white">
                    {language === "cn" ? "OA 编号" : "OA Number"}
                  </th>
                  <th className="w-24 border-b border-border px-2 py-2 text-center text-[9px] font-bold text-slate-700 dark:text-white">
                    {language === "cn" ? "操作" : "Action"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {requestsLoading ? (
                  Array.from({ length: 6 }, (_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 9 }, (_, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3">
                          <Skeleton className="h-3 w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-xs font-semibold text-text-muted"
                    >
                      {organizationText("noLeaveRequestsYet", language)}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => (
                  <tr
                    key={requestKey(item)}
                    className="border-b border-border-subtle transition-colors hover:bg-surface-hover/60"
                  >
                    <td className="px-3 py-2">
                      <p className="text-[11px] font-extrabold text-text">
                        {item.employeeName}
                      </p>
                      <p className="mt-0.5 text-[9px] text-text-dim">
                        {item.employeeNo}
                      </p>
                    </td>

                    <td className="px-2 py-2 text-[10px] font-semibold text-text-muted">
                      {item.department}
                    </td>

                    <td className="px-2 py-2 text-[10px] font-bold text-text">
                      {item.date}
                    </td>

                    <td className="px-2 py-2">
                      <span
                        data-request-type={item.type}
                        className={`leave-type-pill inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${TYPE_META[item.type]?.className ?? "border-slate-200 bg-slate-50"}`}
                      >
                        <span className="leave-type-text">
                          {requestTypeDisplayLabel(item)}
                        </span>
                      </span>
                    </td>

                    <td className="px-2 py-2 whitespace-nowrap text-[10px] font-bold text-text">
                      {item.startTime && item.endTime
                        ? `${item.startTime} – ${item.endTime}`
                        : item.startTime || item.endTime || "—"}
                    </td>

                    <td className="max-w-[260px] px-2 py-2 text-[10px] font-medium text-text">
                      <div className="truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </td>

                    <td className="border-r border-border px-2 py-2">
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

                    <td className="border-r border-border px-2 py-2">
                      {item.status === "Approved" ? (
                        canEditOaNumber(item) ? (
                          oaEditingIds[requestKey(item)] || !item.oaNumber ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                value={oaDrafts[requestKey(item)] ?? item.oaNumber ?? ""}
                                onChange={(event) =>
                                  setOaDrafts((current) => ({
                                    ...current,
                                    [requestKey(item)]: event.target.value,
                                  }))
                                }
                                disabled={oaSavingId === requestKey(item)}
                                className="w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-semibold text-text"
                                placeholder={organizationText("oaNumber", language)}
                              />
                              <button
                                type="button"
                                onClick={() => void updateOaNumber(item)}
                                disabled={oaSavingId === requestKey(item)}
                                className="rounded-lg bg-cyan-600 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                              >
                                {oaSavingId === requestKey(item) ? "..." : language === "cn" ? "保存" : "Save"}
                              </button>
                              {oaEditingIds[requestKey(item)] && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOaEditingIds((current) => ({
                                      ...current,
                                      [requestKey(item)]: false,
                                    }))
                                  }
                                  disabled={oaSavingId === requestKey(item)}
                                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold text-text disabled:opacity-50"
                                >
                                  {organizationText("cancel", language)}
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
                                    [requestKey(item)]: item.oaNumber ?? "",
                                  }));
                                  setOaEditingIds((current) => ({
                                    ...current,
                                    [requestKey(item)]: true,
                                  }));
                                }}
                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-bold text-text transition hover:bg-surface-hover"
                              >
                                {organizationText("edit", language)}
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

                    <td className="w-24 px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {canEditRequest(item) && (
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            disabled={approvalId === requestKey(item)}
                            className="flex size-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300 disabled:opacity-40"
                            title={language === "cn" ? "编辑申请" : "Edit request"}
                            aria-label={language === "cn" ? "编辑申请" : "Edit request"}
                          >
                            <span aria-hidden="true" className="text-[13px] leading-none">✎</span>
                          </button>
                        )}

                        {item.status === "Pending" && canApproveRequest(item) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(item, "Approved")}
                              disabled={approvalId === requestKey(item)}
                              className="flex size-7 items-center justify-center rounded-md bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title={language === "cn" ? "批准" : "Approve"}
                              aria-label={language === "cn" ? "批准" : "Approve"}
                            >
                              <span className="text-[13px] font-bold leading-none">✓</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateRequestStatus(item, "Rejected")}
                              disabled={approvalId === requestKey(item)}
                              className="flex size-7 items-center justify-center rounded-md bg-red-500 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title={language === "cn" ? "拒绝" : "Reject"}
                              aria-label={language === "cn" ? "拒绝" : "Reject"}
                            >
                              <span className="text-[13px] font-bold leading-none">✕</span>
                            </button>
                          </>
                        ) : item.status === "Pending" && !canEditRequest(item) ? (
                          <span
                            className="text-[11px] text-text-dim"
                            title={
                              item.employeeNo === currentEmployeeNo
                                ? language === "cn"
                                  ? "等待经理审核"
                                  : "Manager approval required"
                                : language === "cn"
                                  ? "等待直属经理"
                                  : "Waiting for manager"
                            }
                          >
                            •••
                          </span>
                        ) : !canEditRequest(item) && item.status !== "Pending" ? (
                          <span className="text-[11px] text-text-dim">—</span>
                        ) : null}
                      </div>
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
            <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl">
              <div className="flex items-start justify-between border-b border-border-subtle px-5 py-4">
                <div>
                  <h2 className="text-base font-extrabold text-text">
                    {editingRequest
                      ? language === "cn"
                        ? "编辑请假 / 外出申请"
                        : "Edit Leave / Permission Request"
                      : language === "cn"
                        ? "新建请假 / 外出申请"
                        : "New Leave / Permission Request"}
                  </h2>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {editingRequest
                      ? language === "cn"
                        ? "修改后申请仍保持待审核状态。"
                        : "Changes will keep the request in Pending status."
                      : language === "cn"
                        ? "提交后状态为待审核。"
                        : "New requests are created with Pending status."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg p-2 text-lg font-bold text-text-muted transition hover:bg-surface-hover hover:text-text"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {requestsError && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-400 dark:bg-white">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 px-6 pt-6">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
                        ⚠
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {language === "cn" ? "申请失败" : "Request Error"}
                        </h3>

                        <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                          {requestsError}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setRequestsError(null)}
                        className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-600"
                      >
                        {language === "cn" ? "确定" : "OK"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingRequest && (
                <div className="mx-5 mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-500">
                  {language === "cn"
                    ? "编辑模式：可修改员工、日期、类型、时间和原因。员工姓名和部门会根据所选员工自动同步。"
                    : "Edit mode: you can change the employee, date, type, time, and reason. Employee name and department sync automatically with the selected employee."}
                </div>
              )}

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field
                    label={organizationText("employee2", language)}
                  >
                    <select
                      value={employeeNo}
                      onChange={(event) =>
                        handleEmployeeChange(event.target.value)
                      }
                      disabled={
                        employeesLoading ||
                        employees.length === 0
                      }
                      className="field-input"
                    >
                      {employees.length === 0 ? (
                        <option value="">
                          {employeesLoading
                            ? organizationText("loadingEmployees", language)
                            : organizationText("noEmployees", language)}
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
                  label={organizationText("employeeNo", language)}
                >
                  <select
                    value={employeeNo}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                    disabled={employeesLoading || employees.length === 0}
                    className="field-input"
                  >
                    {employees.map((employee) => (
                      <option key={employee.employee_no} value={employee.employee_no}>
                        {employee.employee_no}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={organizationText("employeeName", language)}
                >
                  <select
                    value={employeeNo}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                    disabled={employeesLoading || employees.length === 0}
                    className="field-input"
                  >
                    {employees.map((employee) => (
                      <option key={employee.employee_no} value={employee.employee_no}>
                        {employeeDisplayName(employee, language, employee.employee_no)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={language === "cn" ? "部门" : "Department"}>
                  <select
                    value={employeeNo}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                    disabled={employeesLoading || employees.length === 0}
                    className="field-input"
                  >
                    {employees.map((employee) => (
                      <option key={employee.employee_no} value={employee.employee_no}>
                        {departmentDisplayName(employee, language, "—")}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={organizationText("type", language)}>
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as RequestType)
                    }
                    className="field-input"
                  >
                    <option value="AL">
                      AL — {organizationText("annualLeave", language)}
                    </option>
                    <option value="MC">
                      MC — {organizationText("sickLeave", language)}
                    </option>
                    <option value="UPL">
                      UPL — {language === "cn" ? "请假 / 外出" : "Unpaid Leave"}
                    </option>
                    <option value="OT">
                      OT — {organizationText("overtime", language)}
                    </option>
                    <option value="ALPA">
                      ALPA — {organizationText("absentWithoutLeave", language)}
                    </option>
                    <option value="NO_ATTENDANCE">
                      {organizationText("noAttendance", language)}
                    </option>
                  </select>
                </Field>

                {type === "NO_ATTENDANCE" && (
                  <Field label={organizationText("noAttendanceType", language)}>
                    <select
                      value={noAttendanceType ?? ""}
                      onChange={(event) =>
                        setNoAttendanceType(
                          (event.target.value || null) as NoAttendanceType | null,
                        )
                      }
                      className="field-input"
                    >
                      <option value="">{organizationText("select", language)}</option>
                      <option value="NO_CHECK_IN">{organizationText("noCheckIn", language)}</option>
                      <option value="NO_CHECK_OUT">{organizationText("noCheckOut", language)}</option>
                      <option value="NO_CHECK_IN_OUT">{organizationText("noCheckInCheckOut", language)}</option>
                    </select>
                  </Field>
                )}

                <div className="md:col-span-2">
                  <Field label={language === "cn" ? "时间安排" : "Schedule"}>
                    <SchedulePicker
                      language={language}
                      date={date}
                      startTime={startTime}
                      endTime={endTime}
                      noAttendance={type === "NO_ATTENDANCE"}
                      onDateChange={setDate}
                      onStartTimeChange={setStartTime}
                      onEndTimeChange={setEndTime}
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label={organizationText("reason", language)}>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={
                        organizationText("enterTheReasonForThisRequest", language)
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
                  onClick={closeForm}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition hover:bg-surface-hover"
                >
                  {organizationText("cancel", language)}
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
                    : editingRequest
                      ? language === "cn"
                        ? "保存修改"
                        : "Save Changes"
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
    </OrganizationGate>
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

function SchedulePicker({
  language,
  date,
  startTime,
  endTime,
  noAttendance,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  language: OrganizationLanguage;
  date: string;
  startTime: string;
  endTime: string;
  noAttendance?: boolean;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const timeParts = (value: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    return {
      hour: match ? match[1] : "00",
      minute: match ? match[2] : "00",
    };
  };

  const setTimePart = (
    value: string,
    part: "hour" | "minute",
    nextValue: string,
  ) => {
    const current = timeParts(value);
    return part === "hour"
      ? `${nextValue}:${current.minute}`
      : `${current.hour}:${nextValue}`;
  };

  const displayDate = date
    ? (() => {
        const [year, month, day] = date.split("-");
        return year && month && day ? `${day}/${month}/${year}` : date;
      })()
    : language === "cn"
      ? "选择日期"
      : "Select date";

  const displayStart = startTime || "--:--";
  const displayEnd = endTime || "--:--";

  const start = timeParts(startTime);
  const end = timeParts(endTime);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex w-full items-center rounded-[0.65rem] border bg-surface px-3 py-2.5 text-left transition",
          open
            ? "border-cyan-500 ring-2 ring-cyan-500/10"
            : "border-border hover:border-cyan-400/60",
        ].join(" ")}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
          {displayDate}
          {!noAttendance && (
            <>
              <span className="mx-3 text-text-dim">|</span>
              <span>{displayStart}</span>
              <span className="mx-2 text-text-dim">→</span>
              <span>{displayEnd}</span>
            </>
          )}
        </span>
        <span className="ml-3 shrink-0 text-sm text-text-muted">⌄</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-full min-w-[320px] rounded-xl border border-border bg-surface p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wide text-text-dim">
              {language === "cn" ? "时间安排" : "Schedule"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-text-muted hover:bg-surface-hover hover:text-text"
            >
              {language === "cn" ? "完成" : "Done"}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-text-dim">
                {language === "cn" ? "日期" : "Date"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className="field-input"
              />
            </div>

            {!noAttendance && (
              <div className="grid grid-cols-2 gap-2">
                <TimeSelect
                  label={language === "cn" ? "开始" : "Start"}
                  hour={start.hour}
                  minute={start.minute}
                  onHourChange={(value) =>
                    onStartTimeChange(setTimePart(startTime, "hour", value))
                  }
                  onMinuteChange={(value) =>
                    onStartTimeChange(setTimePart(startTime, "minute", value))
                  }
                />

                <TimeSelect
                  label={language === "cn" ? "结束" : "End"}
                  hour={end.hour}
                  minute={end.minute}
                  onHourChange={(value) =>
                    onEndTimeChange(setTimePart(endTime, "hour", value))
                  }
                  onMinuteChange={(value) =>
                    onEndTimeChange(setTimePart(endTime, "minute", value))
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeSelect({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  hour: string;
  minute: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-text-dim">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <select
          value={hour}
          onChange={(event) => onHourChange(event.target.value)}
          className="field-input px-2 text-center"
          aria-label={`${label} hour`}
        >
          {Array.from({ length: 24 }, (_, index) => (
            <option key={index} value={padTime(index)}>
              {padTime(index)}
            </option>
          ))}
        </select>
        <span className="text-xs font-bold text-text-dim">:</span>
        <select
          value={minute}
          onChange={(event) => onMinuteChange(event.target.value)}
          className="field-input px-2 text-center"
          aria-label={`${label} minute`}
        >
          {Array.from({ length: 60 }, (_, index) => (
            <option key={index} value={padTime(index)}>
              {padTime(index)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
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
