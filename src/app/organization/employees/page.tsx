"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

/* =========================================================
   TYPES
========================================================= */

type OrganizationLanguage = "en" | "cn";

type EmployeeStatus =
  | "Active"
  | "On Leave"
  | "Inactive"
  | "Resigned";

type EmploymentType =
  | "Permanent"
  | "Contract"
  | "Probation"
  | "Intern"
  | "Outsource";

type Employee = {
  id: number;

  employeeId: string;

  name: string;

  nameCn: string;

  department: string;

  departmentCn: string;

  position: string;

  positionCn: string;

  positionId: number | null;

  manager: string;

  managerCn: string;

  managerId: number | null;

  location: string;

  employmentType: EmploymentType;

  joinDate: string;

  status: EmployeeStatus;
};

type Position = {
  id: number;

  name_en: string;

  name_cn: string | null;

  division_id: number | null;

  division_name_en: string | null;

  division_name_cn: string | null;
};

type ApiEmployee = {
  id: number;

  employee_no: string;

  name_en: string | null;

  name_cn: string | null;

  division_id: number | null;

  division_name_en: string | null;

  division_name_cn: string | null;

  position_id: number | null;

  position_name_en: string | null;

  position_name_cn: string | null;

  manager_id: number | null;

  manager_name_en: string | null;

  manager_name_cn: string | null;

  employment_type:
    | EmploymentType
    | null;

  employment_status:
    | EmployeeStatus
    | "Terminated"
    | null;

  join_date: string | null;

  work_location: string | null;

  team_name: string | null;
};

type FormState = {
  userId: string;

  employeeId: string;

  name: string;

  nameCn: string;

  department: string;

  positionId: string;

  managerId: string;

  location: string;

  employmentType: EmploymentType;

  joinDate: string;

  status: EmployeeStatus;
};

type ApiListResponse = {
  data: ApiEmployee[];

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ApiPositionResponse = {
  data: Position[];
};

/* =========================================================
   TEXT
========================================================= */

const ORGANIZATION_TEXT = {
  management: [
    "Organization Management",
    "组织管理",
  ],

  title: [
    "Employee / Member Management",
    "员工 / 成员管理",
  ],

  description: [
    "Manage employee information, organization assignments, and employment status.",
    "管理员工信息、组织分配及员工状态。",
  ],

  totalEmployees: [
    "Total Employees",
    "员工总数",
  ],

  activeEmployees: [
    "Active Employees",
    "在职员工",
  ],

  onLeave: [
    "On Leave",
    "休假员工",
  ],

  departments: [
    "Departments",
    "部门数量",
  ],

  newThisMonth: [
    "New This Month",
    "本月新员工",
  ],

  employeeDirectory: [
    "Employee Directory",
    "员工目录",
  ],

  employeeDirectoryDescription: [
    "View and manage all organization members.",
    "查看和管理员工组织成员。",
  ],

  search: [
    "Search employee...",
    "搜索员工...",
  ],

  allDepartments: [
    "All Departments",
    "所有部门",
  ],

  allStatuses: [
    "All Status",
    "所有状态",
  ],

  allEmploymentTypes: [
    "All Employment Types",
    "所有雇佣类型",
  ],

  addEmployee: [
    "Add Employee",
    "添加员工",
  ],

  employeeId: [
    "Employee ID",
    "员工编号",
  ],

  employee: [
    "Employee",
    "员工",
  ],

  department: [
    "Department",
    "部门",
  ],

  position: [
    "Position",
    "职位",
  ],

  manager: [
    "Supervisor",
    "上级",
  ],

  employmentType: [
    "Employment Type",
    "雇佣类型",
  ],

  status: [
    "Status",
    "状态",
  ],

  action: [
    "Action",
    "操作",
  ],

  view: [
    "View",
    "查看",
  ],

  edit: [
    "Edit",
    "编辑",
  ],

  deactivate: [
    "Deactivate",
    "停用",
  ],

  reactivate: [
    "Reactivate",
    "重新启用",
  ],

  noData: [
    "No employees found.",
    "未找到员工。",
  ],

  loading: [
    "Loading employees...",
    "正在加载员工...",
  ],

  loadingPositions: [
    "Loading positions...",
    "正在加载职位...",
  ],

  employees: [
    "employees",
    "员工",
  ],

  profile: [
    "Employee Profile",
    "员工资料",
  ],

  personalInformation: [
    "Personal Information",
    "个人信息",
  ],

  organizationInformation: [
    "Organization Information",
    "组织信息",
  ],

  employmentInformation: [
    "Employment Information",
    "雇佣信息",
  ],

  fullName: [
    "Full Name",
    "姓名",
  ],

  chineseName: [
    "Chinese Name",
    "中文姓名",
  ],

  location: [
    "Work Location",
    "工作地点",
  ],

  joinDate: [
    "Join Date",
    "入职日期",
  ],

  close: [
    "Close",
    "关闭",
  ],

  saveEmployee: [
    "Save Employee",
    "保存员工",
  ],

  cancel: [
    "Cancel",
    "取消",
  ],

  newEmployee: [
    "Assign Employee",
    "分配员工",
  ],

  selectEmployee: [
    "Select Employee",
    "选择员工",
  ],

  selectEmployeePlaceholder: [
    "Select an employee...",
    "选择员工...",
  ],

  selectPosition: [
    "Select position...",
    "选择职位...",
  ],

  selectManager: [
    "Select supervisor...",
    "请选择上级...",
  ],

  noPosition: [
    "No Position",
    "未设置职位",
  ],

  noManager: [
    "No Supervisor",
    "无上级",
  ],

  required: [
    "Required fields are missing.",
    "必填字段不能为空。",
  ],

  loadingError: [
    "Failed to load employee data.",
    "员工数据加载失败。",
  ],

  saveError: [
    "Failed to save employee.",
    "员工保存失败。",
  ],

  deactivateError: [
    "Failed to deactivate employee.",
    "员工停用失败。",
  ],

  confirmDeactivate: [
    "Are you sure you want to deactivate this employee?",
    "确定要停用该员工吗？",
  ],

  database: [
    "Database",
    "数据库",
  ],
} as const;

/* =========================================================
   TEXT HELPER
========================================================= */

function organizationText(
  key: keyof typeof ORGANIZATION_TEXT,
  language: OrganizationLanguage,
): string {
  return ORGANIZATION_TEXT[key][
    language === "cn" ? 1 : 0
  ];
}

/* =========================================================
   FORM
========================================================= */

const EMPTY_FORM: FormState = {
  userId: "",

  employeeId: "",

  name: "",

  nameCn: "",

  department: "",

  positionId: "",

  managerId: "",

  location: "",

  employmentType: "Permanent",

  joinDate: "",

  status: "Active",
};

/* =========================================================
   HELPERS
========================================================= */

function mapEmployee(
  item: ApiEmployee,
): Employee {
  return {
    id: item.id,

    employeeId:
      item.employee_no,

    name:
      item.name_en ||
      item.name_cn ||
      item.employee_no,

    nameCn:
      item.name_cn || "",

    department:
      item.division_name_en ||
      "—",

    departmentCn:
      item.division_name_cn ||
      item.division_name_en ||
      "—",

    position:
      item.position_name_en ||
      "—",

    positionCn:
      item.position_name_cn ||
      item.position_name_en ||
      "—",

    positionId:
      item.position_id,

    manager:
      item.manager_name_en ||
      "—",

    managerCn:
      item.manager_name_cn ||
      item.manager_name_en ||
      "—",

    managerId:
      item.manager_id,

    location:
      item.work_location ||
      "—",

    employmentType:
      item.employment_type ||
      "Permanent",

    joinDate:
      item.join_date || "",

    status:
      item.employment_status ===
        "Terminated"
        ? "Inactive"
        : item.employment_status ||
          "Active",
  };
}

/* =========================================================
   ORGANIZATION SUPERVISOR
   =========================================================
   Supervisor is stored in the database through manager_id.
   The form does not hard-code organizational hierarchy.
========================================================= */

/* =========================================================
   PAGE
========================================================= */

export default function OrganizationManagementPage() {
  const { t } = useLang();

  const organizationLanguage: OrganizationLanguage =
    t.safety.management ===
    "安全管理"
      ? "cn"
      : "en";

  /* =======================================================
     STATE
  ======================================================= */

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [
    loadingEmployees,
    setLoadingEmployees,
  ] = useState(true);

  const [
    loadingPositions,
    setLoadingPositions,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    employmentTypeFilter,
    setEmploymentTypeFilter,
  ] = useState("all");

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState<Employee | null>(
    null,
  );

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingEmployee,
    setEditingEmployee,
  ] = useState<Employee | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM,
  );

  /* =======================================================
     LOAD EMPLOYEES
  ======================================================= */

  const loadEmployees =
    useCallback(
      async () => {
        setLoadingEmployees(true);

        try {
          const response =
            await fetch(
              "/api/organization/employees?limit=100",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const payload =
            (await response.json()) as
              | ApiListResponse
              | {
                  error?: string;
                };

          if (!response.ok) {
            throw new Error(
              "error" in payload
                ? payload.error ||
                    organizationText(
                      "loadingError",
                      organizationLanguage,
                    )
                : organizationText(
                    "loadingError",
                    organizationLanguage,
                  ),
            );
          }

          const rows =
            "data" in payload
              ? payload.data
              : [];

          setEmployees(
            rows
              .filter(
                (item) =>
                  item.employee_no !==
                  "SUPERADMIN",
              )
              .map(mapEmployee),
          );
        } catch (error) {
          console.error(
            "loadEmployees failed",
            error,
          );

          window.alert(
            organizationText(
              "loadingError",
              organizationLanguage,
            ),
          );
        } finally {
          setLoadingEmployees(false);
        }
      },
      [organizationLanguage],
    );

  /* =======================================================
     LOAD POSITIONS
  ======================================================= */

  const loadPositions =
    useCallback(
      async () => {
        setLoadingPositions(true);

        try {
          const response =
            await fetch(
              "/api/organization/positions",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const payload =
            (await response.json()) as
              | ApiPositionResponse
              | {
                  error?: string;
                };

          if (!response.ok) {
            throw new Error(
              "error" in payload
                ? payload.error
                : organizationText(
                    "loadingPositions",
                    organizationLanguage,
                  ),
            );
          }

          setPositions(
            "data" in payload
              ? payload.data
              : [],
          );
        } catch (error) {
          console.error(
            "loadPositions failed",
            error,
          );
        } finally {
          setLoadingPositions(false);
        }
      },
      [organizationLanguage],
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadEmployees();

    void loadPositions();
  }, [
    loadEmployees,
    loadPositions,
  ]);

  /* =======================================================
     DEPARTMENTS
  ======================================================= */

  const departments =
    useMemo(() => {
      return Array.from(
        new Set(
          employees
            .map(
              (employee) =>
                employee.department,
            )
            .filter(
              (value) =>
                value &&
                value !== "—",
            ),
        ),
      ).sort();
    }, [employees]);

  /* =======================================================
     DIRECTORY VISIBILITY
  ======================================================= */

  /*
   * Wang Chunlai adalah top-level supervisor.
   * Dia tetap berada di dalam `employees` supaya bisa dipakai
   * sebagai pilihan Supervisor, tetapi tidak ditampilkan
   * sebagai employee biasa di Employee Directory.
   */
  const isDirectoryEmployee = useCallback(
    (employee: Employee) =>
      employee.employeeId !== "620000125" &&
      Boolean(employee.positionId) &&
      employee.status === "Active",
    [],
  );

  const directoryEmployees =  
    useMemo(
      () =>
        employees.filter(
          isDirectoryEmployee,
        ),
      [
        employees,
        isDirectoryEmployee,
      ],
    );

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredEmployees =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return directoryEmployees.filter(
        (employee) => {
          const matchesSearch =
            !keyword ||
            employee.employeeId
              .toLowerCase()
              .includes(keyword) ||
            employee.name
              .toLowerCase()
              .includes(keyword) ||
            employee.nameCn
              .toLowerCase()
              .includes(keyword) ||
            employee.department
              .toLowerCase()
              .includes(keyword) ||
            employee.position
              .toLowerCase()
              .includes(keyword) ||
            employee.manager
              .toLowerCase()
              .includes(keyword);

          const matchesDepartment =
            departmentFilter ===
              "all" ||
            employee.department ===
              departmentFilter;

          const matchesStatus =
            statusFilter === "all" ||
            employee.status ===
              statusFilter;

          const matchesEmploymentType =
            employmentTypeFilter ===
              "all" ||
            employee.employmentType ===
              employmentTypeFilter;

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesStatus &&
            matchesEmploymentType
          );
        },
      );
    }, [
      directoryEmployees,
      search,
      departmentFilter,
      statusFilter,
      employmentTypeFilter,
    ]);

  /* =======================================================
     KPI
  ======================================================= */

  const activeCount =
    directoryEmployees.filter(
      (employee) =>
        employee.status ===
        "Active",
    ).length;

  const leaveCount =
    directoryEmployees.filter(
      (employee) =>
        employee.status ===
        "On Leave",
    ).length;

  const newEmployeeCount =
    directoryEmployees.filter(
      (employee) => {
        if (!employee.joinDate) {
          return false;
        }

        const joinDate =
          new Date(
            employee.joinDate,
          );

        const now =
          new Date();

        return (
          joinDate.getMonth() ===
            now.getMonth() &&
          joinDate.getFullYear() ===
            now.getFullYear()
        );
      },
    ).length;

  /* =======================================================
     EMPLOYEES WITHOUT ORGANIZATION DATA
  ======================================================= */

  const availableEmployees =
    useMemo(() => {
      /*
       * API GET mengembalikan semua users
       * kecuali SUPERADMIN.
       *
       * Employee yang belum punya
       * position / organization record
       * dianggap available untuk assignment.
       */

      return employees.filter(
        (employee) =>
          employee.status === "Inactive" ||
          (!employee.positionId &&
            employee.status === "Active"),
      );
    }, [employees]);

  /* =======================================================
     ADD
  ======================================================= */

  function openAddForm() {
    setEditingEmployee(null);

    setForm(
      EMPTY_FORM,
    );

    setShowForm(true);
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function openEditForm(
    employee: Employee,
  ) {
    setEditingEmployee(
      employee,
    );

    setForm({
      userId: String(
        employee.id,
      ),

      employeeId:
        employee.employeeId,

      name: employee.name,

      nameCn:
        employee.nameCn,

      department:
        employee.department,

      positionId:
        employee.positionId
          ? String(
              employee.positionId,
            )
          : "",

      managerId: employee.managerId
        ? String(employee.managerId)
        : "",

      location:
        employee.location ===
        "—"
          ? ""
          : employee.location,

      employmentType:
        employee.employmentType,

      joinDate:
        employee.joinDate,

      status:
        employee.status,
    });

    setShowForm(true);
  }

  /* =======================================================
     SELECT EXISTING EMPLOYEE
  ======================================================= */

  function handleUserSelect(
    userId: string,
  ) {
    const employee =
      employees.find(
        (item) =>
          String(item.id) ===
          userId,
      );

    if (!employee) {
      setForm((current) => ({
        ...current,

        userId,

        employeeId: "",

        name: "",

        nameCn: "",

        managerId: "",
      }));

      return;
    }

    setForm((current) => {
      return {
        ...current,

        userId,

        employeeId:
          employee.employeeId,

        name: employee.name,

        nameCn:
          employee.nameCn,

        department:
          employee.department,

        managerId: employee.managerId
          ? String(employee.managerId)
          : current.managerId,

        // Inactive employees are shown again in Assign Employee.
        // Selecting them means re-activate the existing organization record.
        status:
          employee.status === "Inactive"
            ? "Active"
            : employee.status,
      };
    });
  }

  function applyPositionHierarchy(
    positionId: string,
  ) {
    setForm((current) => ({
      ...current,
      positionId,
    }));
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveEmployee() {
    if (
      !form.userId ||
      !form.employeeId.trim() ||
      !form.name.trim() ||
      !form.department.trim() ||
      !form.positionId
    ) {
      window.alert(
        organizationText(
          "required",
          organizationLanguage,
        ),
      );

      return;
    }

    setSaving(true);

    try {
      const payloadBody = {
        employee_id: form.employeeId.trim(),
        user_id: Number(form.userId),
        name: form.name.trim(),
        name_cn: form.nameCn.trim() || null,
        department: form.department.trim(),
        position_id: form.positionId
          ? Number(form.positionId)
          : null,
        manager_id: form.managerId
          ? Number(form.managerId)
          : null,
        employment_type: form.employmentType,
        employment_status: form.status,
        join_date: form.joinDate || null,
        work_location: form.location.trim() || null,
      };

      const isEditing = Boolean(editingEmployee);

      let response = await fetch(
        isEditing
          ? `/api/organization/employees/${form.userId}`
          : "/api/organization/employees",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadBody),
        },
      );

      let payload = await response.json();

      // Some existing organization records can have no position_id yet,
      // so the GET data looks unassigned even though the database record exists.
      // If POST reports a duplicate, update that existing organization record.
      const duplicateExists =
        !isEditing &&
        !response.ok &&
        typeof payload?.error === "string" &&
        payload.error
          .toLowerCase()
          .includes("organization data already exists");

      if (duplicateExists) {
        response = await fetch(
          `/api/organization/employees/${form.userId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadBody),
          },
        );

        payload = await response.json();
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            organizationText(
              "saveError",
              organizationLanguage,
            ),
        );
      }

      setShowForm(false);

      setEditingEmployee(
        null,
      );

      setForm(
        EMPTY_FORM,
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "saveEmployee failed",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : organizationText(
              "saveError",
              organizationLanguage,
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DEACTIVATE
  ======================================================= */

  async function deactivateEmployee(
    employee: Employee,
  ) {
    const confirmed =
      window.confirm(
        organizationText(
          "confirmDeactivate",
          organizationLanguage,
        ),
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/organization/employees/${employee.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              employment_status:
                "Inactive",
            }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            organizationText(
              "deactivateError",
              organizationLanguage,
            ),
        );
      }

      setSelectedEmployee(
        (current) =>
          current
            ? {
                ...current,
                status:
                  "Inactive",
              }
            : null,
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "deactivateEmployee failed",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : organizationText(
              "deactivateError",
              organizationLanguage,
            ),
      );
    }
  }

  /* =======================================================
     REACTIVATE
  ======================================================= */

  async function reactivateEmployee(
    employee: Employee,
  ) {
    const confirmed =
      window.confirm(
        organizationLanguage === "cn"
          ? `确定要重新启用员工 ${employee.name} 吗？`
          : `Are you sure you want to reactivate ${employee.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/organization/employees/${employee.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              employment_status: "Active",
            }),
          },
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (organizationLanguage === "cn"
              ? "员工重新启用失败。"
              : "Failed to reactivate employee."),
        );
      }

      setSelectedEmployee(
        (current) =>
          current
            ? {
                ...current,
                status: "Active",
              }
            : null,
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "reactivateEmployee failed",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : organizationLanguage === "cn"
            ? "员工重新启用失败。"
            : "Failed to reactivate employee.",
      );
    }
  }

  /* =======================================================
     POSITION DISPLAY
  ======================================================= */

  function positionName(
    position: Position,
  ) {
    return organizationLanguage ===
      "cn"
      ? position.name_cn ||
          position.name_en
      : position.name_en;
  }

  /* =======================================================
     MANAGER DISPLAY
  ======================================================= */

  function managerName(
    employee: Employee,
  ) {
    if (!employee.managerId) {
      return organizationText(
        "noManager",
        organizationLanguage,
      );
    }

    const manager =
      employees.find(
        (item) =>
          item.id ===
          employee.managerId,
      );

    if (!manager) {
      return employee.manager;
    }

    return organizationLanguage ===
      "cn"
      ? manager.nameCn ||
          manager.name
      : manager.name;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppShell
      title={organizationText(
        "title",
        organizationLanguage,
      )}
    >
      <div className="organization-page min-h-full space-y-5 p-5 md:p-6 xl:p-8">
        <style>{`
          .organization-page {
            --org-cyan: 34 211 238;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            color: rgb(var(--text));
          }

          .organization-page *,
          .organization-page button,
          .organization-page input,
          .organization-page select,
          .organization-page textarea {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          .organization-card {
            border: 1px solid rgb(var(--border));
            background: rgb(var(--surface));
            transition:
              border-color .25s ease,
              box-shadow .25s ease,
              background-color .25s ease;
          }

          .organization-card:hover {
            border-color:
              rgb(var(--org-cyan) / .20);

            box-shadow:
              0 12px 32px
              rgb(8 47 73 / .10);
          }

          .organization-row {
            transition:
              background-color .2s ease,
              border-color .2s ease;
          }

          .organization-row:hover {
            background:
              rgb(var(--org-cyan) / .035);
          }

          .organization-input {
            width: 100%;
            min-height: 40px;
            border: 1px solid rgb(var(--border));
            background: rgb(var(--surface));
            color: rgb(var(--text));
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.25;
            outline: none;
            transition:
              border-color .2s ease,
              background-color .2s ease,
              box-shadow .2s ease;
          }

          .organization-input:focus {
            border-color:
              rgb(var(--org-cyan) / .55);
            box-shadow:
              0 0 0 3px
              rgb(var(--org-cyan) / .08);
          }

          .organization-input::placeholder {
            color:
              rgb(var(--text-muted));
            opacity: 1;
            font-weight: 500;
          }

          .organization-input:disabled {
            opacity: .65;
            cursor: not-allowed;
          }

          .organization-page .text-text {
            color: rgb(var(--text)) !important;
          }

          .organization-page .text-text-muted {
            color: rgb(var(--text-muted)) !important;
          }

          .organization-page .text-text-dim {
            color: rgb(var(--text-dim)) !important;
          }

          .organization-page h1,
          .organization-page h2,
          .organization-page h3,
          .organization-page p,
          .organization-page span,
          .organization-page label,
          .organization-page th,
          .organization-page td,
          .organization-page button {
            text-shadow: none;
          }

          .organization-page .organization-strong-text {
            color: rgb(var(--text)) !important;
            font-weight: 700 !important;
          }

          .organization-page .organization-muted-text {
            color: rgb(var(--text-muted)) !important;
            font-weight: 500 !important;
          }

          .organization-page .organization-dim-text {
            color: rgb(var(--text-dim)) !important;
            font-weight: 500 !important;
          }

          /* Solid status pills, matching the Attendance style */
          .organization-page .status-active {
            border-color: rgb(16 185 129 / .25) !important;
            background: rgb(16 185 129) !important;
            color: #ffffff !important;
          }

          .organization-page .status-on-leave {
            border-color: rgb(245 158 11 / .25) !important;
            background: rgb(245 158 11) !important;
            color: #ffffff !important;
          }

          .organization-page .status-inactive {
            border-color: rgb(100 116 139 / .25) !important;
            background: rgb(100 116 139) !important;
            color: #ffffff !important;
          }

          .organization-page .status-resigned {
            border-color: rgb(244 63 94 / .25) !important;
            background: rgb(244 63 94) !important;
            color: #ffffff !important;
          }

          /* Strong light/dark contrast */
          .dark .organization-page {
            color: #f8fafc;
          }

          .dark .organization-page .text-text {
            color: #f8fafc !important;
          }

          .dark .organization-page .text-text-muted {
            color: #cbd5e1 !important;
          }

          .dark .organization-page .text-text-dim {
            color: #94a3b8 !important;
          }

          .dark .organization-page th {
            color: #cbd5e1 !important;
          }

          .dark .organization-page td {
            color: #f8fafc;
          }

          .dark .organization-page .organization-input {
            color: #f8fafc !important;
            background: #111c31 !important;
            border-color: #334155 !important;
          }

          .dark .organization-page .organization-input::placeholder {
            color: #94a3b8 !important;
          }

          .dark .organization-page select option {
            color: #f8fafc;
            background: #111c31;
          }

          .dark .organization-page .bg-bg,
          .dark .organization-page .bg-bg\/20,
          .dark .organization-page .bg-bg\/30 {
            color: #f8fafc;
          }

          .organization-page .icon-accent {
            color: #22d3ee !important;
            background: rgb(34 211 238 / .10) !important;
          }

          @media (prefers-reduced-motion: reduce) {
            .organization-card,
            .organization-row,
            .organization-input {
              transition: none !important;
            }
          }
        `}</style>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-50/80 text-cyan-500 shadow-sm dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-cyan-300">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M16 21V19C16 17.8954 15.1046 17 14 17H6C4.89543 17 4 17.8954 4 19V21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="10"
                  cy="7"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M20 21V19C20 17.3431 18.6569 16 17 16.35M16 4.13C16.8626 4.35118 17.5 5.13382 17.5 6.05C17.5 6.96618 16.8626 7.74882 16 7.97"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-dim">
                  {organizationText(
                    "management",
                    organizationLanguage,
                  )}
                </span>
              </div>

              <h1 className="mt-0.5 truncate text-[21px] font-bold leading-tight tracking-[-0.02em] text-text">
                {organizationText(
                  "title",
                  organizationLanguage,
                )}
              </h1>

              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-text-muted">
                {organizationText(
                  "description",
                  organizationLanguage,
                )}
              </p>
            </div>
          </div>

          {/* GLOBAL LANGUAGE SWITCH IS IN APPSHELL */}

          <button
            type="button"
            onClick={openAddForm}
            disabled={
              availableEmployees.length ===
              0
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500 px-3.5 py-2 text-[11px] font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-base leading-none">
              +
            </span>

            {organizationText(
              "addEmployee",
              organizationLanguage,
            )}
          </button>
        </div>

        {/* =================================================
            KPI
        ================================================= */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title={organizationText(
              "totalEmployees",
              organizationLanguage,
            )}
            value={
              directoryEmployees.length
            }
            icon="👥"
            tone="cyan"
          />

          <KpiCard
            title={organizationText(
              "activeEmployees",
              organizationLanguage,
            )}
            value={activeCount}
            icon="✓"
            tone="green"
          />

          <KpiCard
            title={organizationText(
              "onLeave",
              organizationLanguage,
            )}
            value={leaveCount}
            icon="◷"
            tone="amber"
          />

          <KpiCard
            title={organizationText(
              "departments",
              organizationLanguage,
            )}
            value={
              departments.length
            }
            icon="▦"
            tone="purple"
          />

          <KpiCard
            title={organizationText(
              "newThisMonth",
              organizationLanguage,
            )}
            value={
              newEmployeeCount
            }
            icon="+"
            tone="cyan"
          />
        </div>

        {/* =================================================
            DIRECTORY
        ================================================= */}

        <section className="organization-card overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border-subtle bg-surface-hover p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/5 text-sm text-cyan-500 dark:text-cyan-300">
                    👥
                  </span>

                  <h2 className="text-sm font-bold text-text">
                    {organizationText(
                      "employeeDirectory",
                      organizationLanguage,
                    )}
                  </h2>
                </div>

                <p className="mt-1 text-[10px] text-text-muted">
                  {organizationText(
                    "employeeDirectoryDescription",
                    organizationLanguage,
                  )}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {/* SEARCH */}

                <div className="relative w-full min-w-[220px]">
                    {/* SEARCH ICON */}
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M16.5 16.5L21 21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>

                    <input
                      type="text"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder={organizationText(
                        "search",
                        organizationLanguage,
                      )}
                      className="organization-input w-full rounded-lg"
                      style={{
                        paddingLeft: "40px",
                        paddingRight: "12px",
                      }}
                    />
                  </div>
                {/* DEPARTMENT */}

                <select
                  value={
                    departmentFilter
                  }
                  onChange={(event) =>
                    setDepartmentFilter(
                      event.target
                        .value,
                    )
                  }
                  className="organization-input rounded-lg"
                >
                  <option value="all">
                    {organizationText(
                      "allDepartments",
                      organizationLanguage,
                    )}
                  </option>

                  {departments.map(
                    (
                      department,
                    ) => (
                      <option
                        key={
                          department
                        }
                        value={
                          department
                        }
                      >
                        {department}
                      </option>
                    ),
                  )}
                </select>

                {/* STATUS */}

                <select
                  value={
                    statusFilter
                  }
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value,
                    )
                  }
                  className="organization-input rounded-lg"
                >
                  <option value="all">
                    {organizationText(
                      "allStatuses",
                      organizationLanguage,
                    )}
                  </option>

                  <option value="Active">
                    {employmentStatusName("Active", organizationLanguage)}
                  </option>

                  <option value="On Leave">
                    {employmentStatusName("On Leave", organizationLanguage)}
                  </option>

                  <option value="Inactive">
                    {employmentStatusName("Inactive", organizationLanguage)}
                  </option>

                  <option value="Resigned">
                    {employmentStatusName("Resigned", organizationLanguage)}
                  </option>
                </select>

                {/* TYPE */}

                <select
                  value={
                    employmentTypeFilter
                  }
                  onChange={(event) =>
                    setEmploymentTypeFilter(
                      event.target
                        .value,
                    )
                  }
                  className="organization-input rounded-lg"
                >
                  <option value="all">
                    {organizationText(
                      "allEmploymentTypes",
                      organizationLanguage,
                    )}
                  </option>

                  <option value="Permanent">
                    {employmentTypeName("Permanent", organizationLanguage)}
                  </option>

                  <option value="Contract">
                    {employmentTypeName("Contract", organizationLanguage)}
                  </option>

                  <option value="Probation">
                    {employmentTypeName("Probation", organizationLanguage)}
                  </option>

                  <option value="Intern">
                    {employmentTypeName("Intern", organizationLanguage)}
                  </option>

                  <option value="Outsource">
                    {employmentTypeName("Outsource", organizationLanguage)}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-hover">
                  <Th>
                    {organizationText(
                      "employeeId",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "employee",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "department",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "position",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "manager",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "employmentType",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th>
                    {organizationText(
                      "status",
                      organizationLanguage,
                    )}
                  </Th>

                  <Th align="right">
                    {organizationText(
                      "action",
                      organizationLanguage,
                    )}
                  </Th>
                </tr>
              </thead>

              <tbody>
                {loadingEmployees ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-14 text-center"
                    >
                      <div className="animate-pulse text-3xl">
                        👥
                      </div>

                      <p className="mt-2 text-xs text-text-muted">
                        {organizationText(
                          "loading",
                          organizationLanguage,
                        )}
                      </p>
                    </td>
                  </tr>
                ) : filteredEmployees.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-14 text-center"
                    >
                      <div className="text-3xl">
                        👥
                      </div>

                      <p className="mt-2 text-xs text-text-muted">
                        {organizationText(
                          "noData",
                          organizationLanguage,
                        )}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={
                          employee.id
                        }
                        className="organization-row border-b border-border-subtle last:border-0 transition-colors hover:bg-cyan-500/[0.025]"
                      >
                        <Td>
                          <span
                            className="text-xs font-bold"
                            style={{
                              color:
                                getDepartmentColor(
                                  employee.department,
                                ),
                            }}
                          >
                            {
                              employee.employeeId
                            }
                          </span>
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEmployee(
                                employee,
                              )
                            }
                            className="flex items-center gap-3 text-left"
                          >
                            <Avatar
                              name={
                                employee.name
                              }
                              department={
                                employee.department
                              }
                            />

                            <div>
                              <p
                                className="text-xs font-bold transition"
                                style={{
                                  color:
                                    getDepartmentColor(
                                      employee.department,
                                    ),
                                }}
                              >
                                {
                                  organizationLanguage ===
                                  "cn"
                                    ? employee.nameCn ||
                                      employee.name
                                    : employee.name
                                }
                              </p>

                              {employee.nameCn &&
                                organizationLanguage !==
                                  "cn" && (
                                  <p className="mt-0.5 text-[10px] text-text-dim">
                                    {
                                      employee.nameCn
                                    }
                                  </p>
                                )}
                            </div>
                          </button>
                        </Td>

                        <Td>
                          <span className="text-text">
                            {organizationLanguage ===
                            "cn"
                              ? employee.departmentCn
                              : employee.department}
                          </span>
                        </Td>

                        <Td>
                          <span className="text-text-muted">
                            {organizationLanguage ===
                            "cn"
                              ? employee.positionCn
                              : employee.position}
                          </span>
                        </Td>

                        <Td>
                          <span className="text-text-muted">
                            {managerName(
                              employee,
                            )}
                          </span>
                        </Td>

                        <Td>
                          <TypeBadge
                              type={
                                employee.employmentType
                              }
                              language={
                                organizationLanguage
                              }
                            />
                        </Td>

                        <Td>
                          <StatusBadge
                              status={
                                employee.status
                              }
                              language={
                                organizationLanguage
                              }
                            />
                        </Td>

                        <Td align="right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEmployee(
                                  employee,
                                )
                              }
                              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                            >
                              {organizationText(
                                "view",
                                organizationLanguage,
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  employee,
                                )
                              }
                              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold text-text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                            >
                              {organizationText(
                                "edit",
                                organizationLanguage,
                              )}
                            </button>

                            {employee.status ===
                              "Inactive" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void reactivateEmployee(
                                    employee,
                                  )
                                }
                                className="rounded-lg border border-emerald-400/30 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-100 hover:shadow-md dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                              >
                                {organizationText(
                                  "reactivate",
                                  organizationLanguage,
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void deactivateEmployee(
                                    employee,
                                  )
                                }
                                className="rounded-lg border border-rose-400/30 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-400/50 hover:bg-rose-100 hover:shadow-md dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                              >
                                {organizationText(
                                  "deactivate",
                                  organizationLanguage,
                                )}
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}

          <div className="flex items-center justify-between border-t border-border-subtle bg-surface-hover px-4 py-3 text-[10px] font-semibold text-text-muted">
            <span>
              {
                filteredEmployees.length
              }{" "}
              /{" "}
              {
                directoryEmployees.length
              }{" "}
              {organizationText(
                "employees",
                organizationLanguage,
              )}
            </span>
          </div>
        </section>

        {/* =================================================
            PROFILE DRAWER
        ================================================= */}

        {selectedEmployee && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label={organizationText(
                "close",
                organizationLanguage,
              )}
              onClick={() =>
                setSelectedEmployee(
                  null,
                )
              }
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-border-subtle bg-surface shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface px-5 py-4">
                <h2 className="text-sm font-bold text-text">
                  {organizationText(
                    "profile",
                    organizationLanguage,
                  )}
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedEmployee(
                      null,
                    )
                  }
                  className="rounded-md px-2 py-1 text-text-muted transition hover:bg-surface-hover hover:text-text"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={
                        selectedEmployee.name
                      }
                      large
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-text">
                          {organizationLanguage ===
                          "cn"
                            ? selectedEmployee.nameCn ||
                              selectedEmployee.name
                            : selectedEmployee.name}
                        </h3>

                        <StatusBadge
                          status={
                            selectedEmployee.status
                          }
                          language={
                            organizationLanguage
                          }
                        />
                      </div>

                      <p className="mt-1 text-xs text-cyan-300">
                        {
                          selectedEmployee.employeeId
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-text-muted">
                        {organizationLanguage ===
                        "cn"
                          ? selectedEmployee.positionCn
                          : selectedEmployee.position}{" "}
                        ·{" "}
                        {organizationLanguage ===
                        "cn"
                          ? selectedEmployee.departmentCn
                          : selectedEmployee.department}
                      </p>

                      {organizationLanguage ===
                        "en" &&
                        selectedEmployee.nameCn && (
                          <p className="mt-1 text-[10px] text-text-dim">
                            {
                              selectedEmployee.nameCn
                            }
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                <ProfileSection
                  title={organizationText(
                    "personalInformation",
                    organizationLanguage,
                  )}
                  icon="👤"
                >
                  <InfoRow
                    label={organizationText(
                      "employeeId",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.employeeId
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "fullName",
                      organizationLanguage,
                    )}
                    value={
                      organizationLanguage ===
                      "cn"
                        ? selectedEmployee.nameCn ||
                          selectedEmployee.name
                        : selectedEmployee.name
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "chineseName",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.nameCn
                    }
                  />
                </ProfileSection>

                <ProfileSection
                  title={organizationText(
                    "organizationInformation",
                    organizationLanguage,
                  )}
                  icon="🏢"
                >
                  <InfoRow
                    label={organizationText(
                      "department",
                      organizationLanguage,
                    )}
                    value={
                      organizationLanguage ===
                      "cn"
                        ? selectedEmployee.departmentCn
                        : selectedEmployee.department
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "position",
                      organizationLanguage,
                    )}
                    value={
                      organizationLanguage ===
                      "cn"
                        ? selectedEmployee.positionCn
                        : selectedEmployee.position
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "manager",
                      organizationLanguage,
                    )}
                    value={managerName(
                      selectedEmployee,
                    )}
                  />

                  <InfoRow
                    label={organizationText(
                      "location",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.location
                    }
                  />
                </ProfileSection>

                <ProfileSection
                  title={organizationText(
                    "employmentInformation",
                    organizationLanguage,
                  )}
                  icon="💼"
                >
                  <InfoRow
                    label={organizationText(
                      "employmentType",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.employmentType
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "joinDate",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.joinDate ||
                      "—"
                    }
                  />

                  <InfoRow
                    label={organizationText(
                      "status",
                      organizationLanguage,
                    )}
                    value={
                      selectedEmployee.status
                    }
                  />
                </ProfileSection>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      openEditForm(
                        selectedEmployee,
                      );

                      setSelectedEmployee(
                        null,
                      );
                    }}
                    className="rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
                  >
                    {organizationText(
                      "edit",
                      organizationLanguage,
                    )}
                  </button>

                  {selectedEmployee.status ===
                    "Inactive" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void reactivateEmployee(
                          selectedEmployee,
                        )
                      }
                      className="rounded-md border border-emerald-400/20 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
                    >
                      {organizationText(
                        "reactivate",
                        organizationLanguage,
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void deactivateEmployee(
                          selectedEmployee,
                        )
                      }
                      className="rounded-md border border-rose-400/20 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                    >
                      {organizationText(
                        "deactivate",
                        organizationLanguage,
                      )}
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* =================================================
            ADD / EDIT MODAL
        ================================================= */}

        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-text">
                    {editingEmployee
                      ? organizationText(
                          "edit",
                          organizationLanguage,
                        )
                      : organizationText(
                          "newEmployee",
                          organizationLanguage,
                        )}
                  </h2>

                  <p className="mt-1 text-[10px] text-text-dim">
                    {organizationText(
                      "description",
                      organizationLanguage,
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-md px-2 py-1 text-text-muted transition hover:bg-surface-hover hover:text-text"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 p-5">
                {/* EMPLOYEE */}

                <FormSection
                  title={organizationText(
                    "personalInformation",
                    organizationLanguage,
                  )}
                  icon="👤"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {!editingEmployee && (
                      <FormField
                        label={organizationText(
                          "selectEmployee",
                          organizationLanguage,
                        )}
                        required
                      >
                        <select
                          value={
                            form.userId
                          }
                          onChange={(
                            event,
                          ) =>
                            handleUserSelect(
                              event
                                .target
                                .value,
                            )
                          }
                          className="organization-input rounded-lg"
                        >
                          <option value="">
                            {organizationText(
                              "selectEmployeePlaceholder",
                              organizationLanguage,
                            )}
                          </option>

                          {availableEmployees.map(
                            (
                              employee,
                            ) => (
                              <option
                                key={
                                  employee.id
                                }
                                value={
                                  employee.id
                                }
                              >
                                {
                                  employee.employeeId
                                }{" "}
                                —{" "}
                                {
                                  employee.name
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </FormField>
                    )}

                    <FormField
                      label={organizationText(
                        "employeeId",
                        organizationLanguage,
                      )}
                    >
                      <input
                        value={
                          form.employeeId
                        }
                        className="organization-input rounded-lg"
                        disabled
                        readOnly
                      />
                    </FormField>

                    <FormField
                      label={organizationText(
                        "fullName",
                        organizationLanguage,
                      )}
                    >
                      <input
                        value={
                          form.name
                        }
                        className="organization-input rounded-lg"
                        disabled
                        readOnly
                      />
                    </FormField>

                    <FormField
                      label={organizationText(
                        "chineseName",
                        organizationLanguage,
                      )}
                    >
                      <input
                        value={
                          form.nameCn
                        }
                        className="organization-input rounded-lg"
                        disabled
                        readOnly
                      />
                    </FormField>

                    <FormField
                      label={organizationText(
                        "department",
                        organizationLanguage,
                      )}
                    >
                      <input
                        value={
                          organizationLanguage ===
                          "cn"
                            ? (() => {
                                const employee =
                                  employees.find(
                                    (
                                      item,
                                    ) =>
                                      item.id ===
                                      Number(
                                        form.userId,
                                      ),
                                  );

                                return (
                                  employee?.departmentCn ||
                                  form.department
                                );
                              })()
                            : form.department
                        }
                        className="organization-input rounded-lg"
                        disabled
                        readOnly
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* ORGANIZATION */}

                <FormSection
                  title={organizationText(
                    "organizationInformation",
                    organizationLanguage,
                  )}
                  icon="🏢"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      label={organizationText(
                        "position",
                        organizationLanguage,
                      )}
                      required
                    >
                      <select
                        value={
                          form.positionId
                        }
                        onChange={(
                          event,
                        ) =>
                          applyPositionHierarchy(
                            event.target.value,
                          )
                        }
                        className="organization-input rounded-lg"
                        disabled={
                          loadingPositions
                        }
                      >
                        <option value="">
                          {loadingPositions
                            ? organizationText(
                                "loadingPositions",
                                organizationLanguage,
                              )
                            : organizationText(
                                "selectPosition",
                                organizationLanguage,
                              )}
                        </option>

                        {positions.map(
                          (
                            position,
                          ) => (
                            <option
                              key={
                                position.id
                              }
                              value={
                                position.id
                              }
                            >
                              {positionName(
                                position,
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </FormField>

                    <FormField
                      label={organizationText(
                        "manager",
                        organizationLanguage,
                      )}
                    >
                      <select
                        value={form.managerId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            managerId: event.target.value,
                          }))
                        }
                        className="organization-input rounded-lg"
                      >
                        <option value="">
                          {organizationText(
                            "noManager",
                            organizationLanguage,
                          )}
                        </option>

                        {employees
                          .filter(
                            (employee) =>
                              employee.id !==
                              Number(form.userId),
                          )
                          .map((employee) => (
                            <option
                              key={employee.id}
                              value={employee.id}
                            >
                              {employee.employeeId} — {
                                organizationLanguage === "cn"
                                  ? employee.nameCn || employee.name
                                  : employee.name
                              }
                            </option>
                          ))}
                      </select>
                    </FormField>

                    <FormField
                      label={organizationText(
                        "location",
                        organizationLanguage,
                      )}
                    >
                      <input
                        value={
                          form.location
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              location:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="organization-input rounded-lg"
                        placeholder="Head Office / Site A / Plant 1"
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* EMPLOYMENT */}

                <FormSection
                  title={organizationText(
                    "employmentInformation",
                    organizationLanguage,
                  )}
                  icon="💼"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      label={organizationText(
                        "employmentType",
                        organizationLanguage,
                      )}
                    >
                      <select
                        value={
                          form.employmentType
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              employmentType:
                                event
                                  .target
                                  .value as EmploymentType,
                            }),
                          )
                        }
                        className="organization-input rounded-lg"
                      >
                        <option value="Permanent">
                          {employmentTypeName("Permanent", organizationLanguage)}
                        </option>

                        <option value="Contract">
                          {employmentTypeName("Contract", organizationLanguage)}
                        </option>

                        <option value="Probation">
                          {employmentTypeName("Probation", organizationLanguage)}
                        </option>

                        <option value="Intern">
                          {employmentTypeName("Intern", organizationLanguage)}
                        </option>

                        <option value="Outsource">
                          {employmentTypeName("Outsource", organizationLanguage)}
                        </option>
                      </select>
                    </FormField>

                    <FormField
                      label={organizationText(
                        "joinDate",
                        organizationLanguage,
                      )}
                    >
                      <input
                        type="date"
                        value={
                          form.joinDate
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              joinDate:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="organization-input rounded-lg"
                      />
                    </FormField>

                    <FormField
                      label={organizationText(
                        "status",
                        organizationLanguage,
                      )}
                    >
                      <select
                        value={
                          form.status
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              status:
                                event
                                  .target
                                  .value as EmployeeStatus,
                            }),
                          )
                        }
                        className="organization-input rounded-lg"
                      >
                        <option value="Active">
                          {employmentStatusName("Active", organizationLanguage)}
                        </option>

                        <option value="On Leave">
                          {employmentStatusName("On Leave", organizationLanguage)}
                        </option>

                        <option value="Inactive">
                          {employmentStatusName("Inactive", organizationLanguage)}
                        </option>

                        <option value="Resigned">
                          {employmentStatusName("Resigned", organizationLanguage)}
                        </option>
                      </select>
                    </FormField>
                  </div>
                </FormSection>
              </div>

              {/* FOOTER */}

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  disabled={saving}
                  className="rounded-lg border border-border px-4 py-2.5 text-xs font-medium text-text-muted transition hover:bg-bg disabled:opacity-50"
                >
                  {organizationText(
                    "cancel",
                    organizationLanguage,
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveEmployee()
                  }
                  disabled={
                    saving ||
                    !form.userId ||
                    !form.positionId
                  }
                  className="rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "..."
                    : organizationText(
                        "saveEmployee",
                        organizationLanguage,
                      )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* =========================================================
   KPI
========================================================= */

function KpiCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: string;
  tone:
    | "cyan"
    | "green"
    | "amber"
    | "purple";
}) {
  const styles = {
    cyan: {
      icon: "bg-cyan-500/10 text-cyan-300",
    },
    green: {
      icon: "bg-emerald-500/10 text-emerald-300",
    },
    amber: {
      icon: "bg-amber-500/10 text-amber-300",
    },
    purple: {
      icon: "bg-violet-500/10 text-violet-300",
    },
  }[tone];

  return (
    <div
      className="organization-card rounded-xl border border-border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-300 hover:border-cyan-400/20 hover:shadow-[0_12px_32px_rgba(8,47,73,0.10)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
            {title}
          </p>

          <p className="mt-1 text-2xl font-black text-text">
            {value}
          </p>
        </div>

        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function getDepartmentColor(
  department: string,
): string {
  const value = department
    .trim()
    .toLowerCase();

  if (value === "it") {
    return "#22D3EE";
  }

  if (value === "mes") {
    return "#A78BFA";
  }

  if (
    value === "intelligent logistics"
  ) {
    return "#34D399";
  }

  return "#94A3B8";
}

function getDepartmentBorderColor(
  department: string,
): string {
  const value = department
    .trim()
    .toLowerCase();

  if (value === "it") {
    return "rgba(34, 211, 238, 0.35)";
  }

  if (value === "mes") {
    return "rgba(167, 139, 250, 0.35)";
  }

  if (
    value === "intelligent logistics"
  ) {
    return "rgba(52, 211, 153, 0.35)";
  }

  return "rgba(148, 163, 184, 0.35)";
}

function Avatar({
  name,
  department = "",
  large = false,
}: {
  name: string;
  department?: string;
  large?: boolean;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map(
        (item) =>
          item[0],
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-full border bg-transparent font-semibold",

        large
          ? "size-16 text-lg"
          : "size-9 text-[10px]",
      ].join(" ")}
      style={{
        color: getDepartmentColor(
          department,
        ),
        borderColor:
          getDepartmentBorderColor(
            department,
          ),
        backgroundColor:
          "rgba(34, 211, 238, 0.035)",
      }}
    >
      {initials}
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function employmentStatusName(
  status: EmployeeStatus,
  language: OrganizationLanguage,
): string {
  const names: Record<
    EmployeeStatus,
    [string, string]
  > = {
    Active: ["Active", "在职"],
    "On Leave": ["On Leave", "休假"],
    Inactive: ["Inactive", "停用"],
    Resigned: ["Resigned", "离职"],
  };

  return names[status][language === "cn" ? 1 : 0];
}

function StatusBadge({
  status,
  language,
}: {
  status: EmployeeStatus;
  language: OrganizationLanguage;
}) {
  const config = {
    Active: {
      dot: "bg-emerald-400",

      style:
        "status-active border-emerald-400/20 bg-emerald-500 text-white",
    },

    "On Leave": {
      dot: "bg-amber-400",

      style:
        "status-on-leave border-amber-400/20 bg-amber-500 text-white",
    },

    Inactive: {
      dot: "bg-zinc-400",

      style:
        "status-inactive border-zinc-400/20 bg-zinc-500 text-white",
    },

    Resigned: {
      dot: "bg-rose-400",

      style:
        "status-resigned border-rose-400/20 bg-rose-500 text-white",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${config.style}`}
    >
      <span
        className={`size-1.5 rounded-full ${config.dot}`}
      />

      {employmentStatusName(status, language)}
    </span>
  );
}

/* =========================================================
   TYPE
========================================================= */

function employmentTypeName(
  type: EmploymentType,
  language: OrganizationLanguage,
): string {
  const names: Record<
    EmploymentType,
    [string, string]
  > = {
    Permanent: ["Permanent", "正式员工"],
    Contract: ["Contract", "合同员工"],
    Probation: ["Probation", "试用期员工"],
    Intern: ["Intern", "实习生"],
    Outsource: ["Outsource", "外包员工"],
  };

  return names[type][language === "cn" ? 1 : 0];
}

function TypeBadge({
  type,
  language,
}: {
  type: EmploymentType;
  language: OrganizationLanguage;
}) {
  return (
    <span className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-text-muted">
      {employmentTypeName(type, language)}
    </span>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-text-muted ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/* =========================================================
   TABLE CELL
========================================================= */

function Td({
  children,
  align = "left",
  style,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`px-4 py-3 text-xs ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
      style={style}
    >
      {children}
    </td>
  );
}

/* =========================================================
   PROFILE SECTION
========================================================= */

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-bg/20 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span>{icon}</span>

        <h3 className="text-xs font-semibold text-text">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-border-subtle pb-2.5 last:border-0 last:pb-0">
      <span className="text-[10px] text-text-dim">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-xs text-text">
        {value || "—"}
      </span>
    </div>
  );
}

/* =========================================================
   FORM SECTION
========================================================= */

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span>{icon}</span>

        <h3 className="text-xs font-semibold text-text">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-medium text-text-muted">
        {label}

        {required && (
          <span className="ml-1 text-rose-400">
            *
          </span>
        )}
      </div>

      {children}
    </label>
  );
}