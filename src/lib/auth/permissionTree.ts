import { PERMISSIONS } from "./access";

export type PermissionRow = {
  id: number;
  code: string;
  description: string | null;
};

/** Label resolved via i18n in the picker. */
export type PermissionTreeLabel =
  | { source: "nav"; key: "overview" | "itsm" | "dailyOperation" | "settings" | "moduleManagement" | "moduleAnalysis" | "master" | "settingsRoles" | "settingsAccounts" }
  | { source: "settings"; key: "permissionsAccess" | "permissionsOther" };

export type PermissionTreeDef = {
  id: string;
  label: PermissionTreeLabel;
  /** Permission codes attached directly under this node. */
  codes?: string[];
  children?: PermissionTreeDef[];
};

/** Sidebar-aligned permission tree (module → submenu → codes). */
export const PERMISSION_TREE: PermissionTreeDef[] = [
  {
    id: "overview",
    label: { source: "nav", key: "overview" },
    codes: [PERMISSIONS.overviewView],
  },
  {
    id: "itsm",
    label: { source: "nav", key: "itsm" },
    children: [
      {
        id: "itsm-overview",
        label: { source: "nav", key: "overview" },
        codes: [PERMISSIONS.itsmOverviewView],
      },
      {
        id: "itsm-management",
        label: { source: "nav", key: "moduleManagement" },
        codes: [
          PERMISSIONS.itsmRequestRead,
          PERMISSIONS.itsmRequestImport,
          PERMISSIONS.itsmRequestExport,
          PERMISSIONS.itsmRequestTemplate,
        ],
      },
      {
        id: "itsm-analysis",
        label: { source: "nav", key: "moduleAnalysis" },
        codes: [PERMISSIONS.itsmAnalysisView],
      },
    ],
  },
  {
    id: "daily-operation",
    label: { source: "nav", key: "dailyOperation" },
    children: [
      {
        id: "daily-management",
        label: { source: "nav", key: "moduleManagement" },
        codes: [
          PERMISSIONS.dailyRecordRead,
          PERMISSIONS.dailyRecordCreate,
          PERMISSIONS.dailyRecordUpdate,
          PERMISSIONS.dailyRecordDelete,
          PERMISSIONS.dailyRecordImport,
          PERMISSIONS.dailyRecordExport,
          PERMISSIONS.dailyRecordTemplate,
        ],
      },
      {
        id: "daily-analysis",
        label: { source: "nav", key: "moduleAnalysis" },
        codes: [PERMISSIONS.dailyAnalysisView],
      },
      {
        id: "daily-master",
        label: { source: "nav", key: "master" },
        codes: [PERMISSIONS.dailyMasterManage],
      },
    ],
  },
  {
    id: "settings",
    label: { source: "nav", key: "settings" },
    children: [
      {
        id: "settings-access",
        label: { source: "settings", key: "permissionsAccess" },
        codes: [PERMISSIONS.settingsAccess],
      },
      {
        id: "settings-roles",
        label: { source: "nav", key: "settingsRoles" },
        codes: [PERMISSIONS.adminRolesManage],
      },
      {
        id: "settings-accounts",
        label: { source: "nav", key: "settingsAccounts" },
        codes: [PERMISSIONS.adminAccountsManage],
      },
    ],
  },
];

export type PermissionTreeNode = {
  id: string;
  label: PermissionTreeLabel;
  permissions: PermissionRow[];
  children: PermissionTreeNode[];
};

function collectCodes(def: PermissionTreeDef): string[] {
  const own = def.codes ?? [];
  const nested = (def.children ?? []).flatMap(collectCodes);
  return [...own, ...nested];
}

function buildNode(
  def: PermissionTreeDef,
  byCode: Map<string, PermissionRow>,
): PermissionTreeNode | null {
  const permissions = (def.codes ?? [])
    .map((code) => byCode.get(code))
    .filter((p): p is PermissionRow => Boolean(p));

  const children = (def.children ?? [])
    .map((child) => buildNode(child, byCode))
    .filter((n): n is PermissionTreeNode => n !== null);

  if (permissions.length === 0 && children.length === 0) return null;

  return {
    id: def.id,
    label: def.label,
    permissions,
    children,
  };
}

/** Map API permissions into the sidebar tree; leftovers go under Other. */
export function groupPermissions(
  permissions: PermissionRow[],
): PermissionTreeNode[] {
  const byCode = new Map(permissions.map((p) => [p.code, p]));
  const claimed = new Set(PERMISSION_TREE.flatMap(collectCodes));

  const nodes = PERMISSION_TREE.map((def) => buildNode(def, byCode)).filter(
    (n): n is PermissionTreeNode => n !== null,
  );

  const other = permissions.filter((p) => !claimed.has(p.code));
  if (other.length > 0) {
    nodes.push({
      id: "other",
      label: { source: "settings", key: "permissionsOther" },
      permissions: other,
      children: [],
    });
  }

  return nodes;
}

export function collectPermissionIds(node: PermissionTreeNode): number[] {
  const ids = node.permissions.map((p) => p.id);
  for (const child of node.children) {
    ids.push(...collectPermissionIds(child));
  }
  return ids;
}
