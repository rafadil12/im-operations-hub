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

  connected: [
    "Connected",
    "已连接",
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
      employee.employeeId !== "620000125",
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
          !employee.positionId,
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
      const isEditing =
        Boolean(
          editingEmployee,
        );

      const url = isEditing
        ? `/api/organization/employees/${form.userId}`
        : "/api/organization/employees";

      const method = isEditing
        ? "PUT"
        : "POST";

      const response =
        await fetch(url, {
          method,

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            user_id:
              Number(form.userId),

            position_id:
              form.positionId
                ? Number(
                    form.positionId,
                  )
                : null,

            manager_id: form.managerId
              ? Number(form.managerId)
              : null,

            employment_type:
              form.employmentType,

            employment_status:
              form.status,

            join_date:
              form.joinDate ||
              null,

            work_location:
              form.location.trim() ||
              null,
          }),
        });

      const payload =
        await response.json();

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
      <div className="organization-page space-y-5">
        <style>{`
          .organization-page {
            --org-cyan: 34 211 238;
          }

          .organization-card {
            transition:
              border-color .25s ease,
              box-shadow .25s ease,
              transform .25s ease;
          }

          .organization-card:hover {
            border-color:
              rgb(var(--org-cyan) / .20);

            box-shadow:
              0 12px 32px
              rgb(8 47 73 / .12);
          }

          .organization-row {
            transition:
              background-color .2s ease;
          }

          .organization-row:hover {
            background:
              rgb(var(--org-cyan) / .035);
          }

          .organization-input {
            width: 100%;
            border: 1px solid rgb(var(--border));
            background: rgb(var(--bg));
            color: rgb(var(--text));
            border-radius: 8px;
            padding: 9px 11px;
            font-size: 12px;
            outline: none;
          }

          .organization-input:focus {
            border-color:
              rgb(var(--org-cyan) / .5);
          }

          .organization-input::placeholder {
            color: rgb(var(--text-dim));
          }

          .organization-input:disabled {
            opacity: .65;
            cursor: not-allowed;
          }

          @media (prefers-reduced-motion: reduce) {
            .organization-card,
            .organization-row {
              transition: none;
            }
          }
        `}</style>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400" />

              <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim">
                {organizationText(
                  "management",
                  organizationLanguage,
                )}
              </span>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300">
                {organizationText(
                  "connected",
                  organizationLanguage,
                )}
              </span>
            </div>

            <h1 className="mt-1 text-xl font-semibold text-text">
              {organizationText(
                "title",
                organizationLanguage,
              )}
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              {organizationText(
                "description",
                organizationLanguage,
              )}
            </p>
          </div>

          {/* GLOBAL LANGUAGE SWITCH IS IN APPSHELL */}

          <button
            type="button"
            onClick={openAddForm}
            disabled={
              availableEmployees.length ===
              0
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-base">
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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

        <section className="organization-card rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    👥
                  </span>

                  <h2 className="text-sm font-semibold text-text">
                    {organizationText(
                      "employeeDirectory",
                      organizationLanguage,
                    )}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-text-muted">
                  {organizationText(
                    "employeeDirectoryDescription",
                    organizationLanguage,
                  )}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {/* SEARCH */}

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-dim">
                    🔍
                  </span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder={organizationText(
                      "search",
                      organizationLanguage,
                    )}
                    className="organization-input pl-9"
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
                  className="organization-input"
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
                  className="organization-input"
                >
                  <option value="all">
                    {organizationText(
                      "allStatuses",
                      organizationLanguage,
                    )}
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="On Leave">
                    On Leave
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                  <option value="Resigned">
                    Resigned
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
                  className="organization-input"
                >
                  <option value="all">
                    {organizationText(
                      "allEmploymentTypes",
                      organizationLanguage,
                    )}
                  </option>

                  <option value="Permanent">
                    Permanent
                  </option>

                  <option value="Contract">
                    Contract
                  </option>

                  <option value="Probation">
                    Probation
                  </option>

                  <option value="Intern">
                    Intern
                  </option>

                  <option value="Outsource">
                    Outsource
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead>
                <tr className="border-b border-border bg-bg/30">
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
                        className="organization-row border-b border-border-subtle last:border-0"
                      >
                        <Td>
                          <span className="font-semibold text-cyan-300">
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
                            />

                            <div>
                              <p className="font-medium text-text transition hover:text-cyan-300">
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
                          />
                        </Td>

                        <Td>
                          <StatusBadge
                            status={
                              employee.status
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
                              className="rounded-md border border-border px-2.5 py-1.5 text-[10px] text-text-muted transition hover:border-cyan-400/30 hover:text-cyan-300"
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
                              className="rounded-md border border-border px-2.5 py-1.5 text-[10px] text-text-muted transition hover:border-cyan-400/30 hover:text-cyan-300"
                            >
                              {organizationText(
                                "edit",
                                organizationLanguage,
                              )}
                            </button>

                            {employee.status !==
                              "Inactive" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void deactivateEmployee(
                                    employee,
                                  )
                                }
                                className="rounded-md border border-rose-400/20 px-2.5 py-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/10"
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

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] text-text-dim">
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

            <span>
              {organizationText(
                "database",
                organizationLanguage,
              )}{" "}
              ·{" "}
              {organizationText(
                "connected",
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
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
                <h2 className="text-sm font-semibold text-text">
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
                  className="rounded-md px-2 py-1 text-text-muted transition hover:bg-bg hover:text-text"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="rounded-xl border border-border bg-bg/30 p-5">
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
                        />
                      </div>

                      <p className="mt-1 text-xs text-cyan-300">
                        {
                          selectedEmployee.employeeId
                        }
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
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
                    className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-400"
                  >
                    {organizationText(
                      "edit",
                      organizationLanguage,
                    )}
                  </button>

                  {selectedEmployee.status !==
                    "Inactive" && (
                    <button
                      type="button"
                      onClick={() =>
                        void deactivateEmployee(
                          selectedEmployee,
                        )
                      }
                      className="rounded-lg border border-rose-400/20 px-4 py-2.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
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
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-text">
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
                  className="rounded-md px-2 py-1 text-text-muted transition hover:bg-bg hover:text-text"
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
                          className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
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
                        className="organization-input"
                      >
                        <option value="Permanent">
                          Permanent
                        </option>

                        <option value="Contract">
                          Contract
                        </option>

                        <option value="Probation">
                          Probation
                        </option>

                        <option value="Intern">
                          Intern
                        </option>

                        <option value="Outsource">
                          Outsource
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
                        className="organization-input"
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
                        className="organization-input"
                      >
                        <option value="Active">
                          Active
                        </option>

                        <option value="On Leave">
                          On Leave
                        </option>

                        <option value="Inactive">
                          Inactive
                        </option>

                        <option value="Resigned">
                          Resigned
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
                  className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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
      border:
        "border-cyan-400/20",
      icon:
        "bg-cyan-500/10 text-cyan-300",
    },

    green: {
      border:
        "border-emerald-400/20",
      icon:
        "bg-emerald-500/10 text-emerald-300",
    },

    amber: {
      border:
        "border-amber-400/20",
      icon:
        "bg-amber-500/10 text-amber-300",
    },

    purple: {
      border:
        "border-purple-400/20",
      icon:
        "bg-purple-500/10 text-purple-300",
    },
  }[tone];

  return (
    <div
      className={`organization-card rounded-xl border bg-surface p-4 ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-dim">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold text-text">
            {value}
          </p>
        </div>

        <div
          className={`flex size-9 items-center justify-center rounded-lg text-sm ${styles.icon}`}
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

function Avatar({
  name,
  large = false,
}: {
  name: string;
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
        "flex shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 font-semibold text-cyan-300",

        large
          ? "size-16 text-lg"
          : "size-9 text-[10px]",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: EmployeeStatus;
}) {
  const config = {
    Active: {
      dot: "bg-emerald-400",

      style:
        "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    },

    "On Leave": {
      dot: "bg-amber-400",

      style:
        "border-amber-400/20 bg-amber-500/10 text-amber-300",
    },

    Inactive: {
      dot: "bg-zinc-400",

      style:
        "border-zinc-400/20 bg-zinc-500/10 text-zinc-300",
    },

    Resigned: {
      dot: "bg-rose-400",

      style:
        "border-rose-400/20 bg-rose-500/10 text-rose-300",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${config.style}`}
    >
      <span
        className={`size-1.5 rounded-full ${config.dot}`}
      />

      {status}
    </span>
  );
}

/* =========================================================
   TYPE
========================================================= */

function TypeBadge({
  type,
}: {
  type: EmploymentType;
}) {
  return (
    <span className="inline-flex rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-text-muted">
      {type}
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
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-text-dim ${
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
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-4 py-3 text-xs ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
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