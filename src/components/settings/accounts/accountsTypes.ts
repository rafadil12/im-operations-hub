export type RoleOption = {
  id: number;
  name: string;
  description: string | null;
  permissionIds: number[];
};

export type DivisionOption = {
  id: number;
  nameEn: string | null;
  nameCn: string | null;
};

export type AccountRow = {
  id: number;
  userId: number;
  employeeNo: string | null;
  nameEn: string | null;
  nameCn: string | null;
  isActive: boolean;
  roleId: number | null;
  roleName: string | null;
  lastLoginAt: string | null;
};

export const accountsInputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
export const accountsLabelCls = "mb-1 block text-xs font-medium text-text-muted";
export const accountsTh =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
export const accountsTd = "px-3 py-2 text-xs text-text-muted";
