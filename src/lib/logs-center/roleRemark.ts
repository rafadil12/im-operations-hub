import type { RemarkChange } from "./renderRemark";

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

export function permissionListChange(before: string[], after: string[]): RemarkChange | null {
  const previous = new Set(uniqueSorted(before));
  const next = new Set(uniqueSorted(after));
  const added = [...next].filter((label) => !previous.has(label)).sort((a, b) => a.localeCompare(b));
  const removed = [...previous].filter((label) => !next.has(label)).sort((a, b) => a.localeCompare(b));
  if (added.length === 0 && removed.length === 0) return null;

  const en: string[] = [];
  const cn: string[] = [];
  if (added.length > 0) {
    en.push(`added ${added.join(", ")}`);
    cn.push(`新增 ${added.join("、")}`);
  }
  if (removed.length > 0) {
    en.push(`removed ${removed.join(", ")}`);
    cn.push(`移除 ${removed.join("、")}`);
  }
  return { field: "permissions", to: en.join(", "), toCn: cn.join("，") };
}

export function roleUpdateChanges(input: {
  beforeName: string;
  afterName: string;
  beforeDescription: string | null;
  afterDescription: string | null;
  beforePermissions: string[];
  afterPermissions: string[];
}): RemarkChange[] {
  const changes: RemarkChange[] = [];
  const beforeName = clean(input.beforeName);
  const afterName = clean(input.afterName);
  if (beforeName !== afterName) {
    changes.push({
      field: "role_name",
      from: beforeName || "none",
      to: afterName || "none",
      fromCn: beforeName || "无",
      toCn: afterName || "无",
    });
  }
  const beforeDescription = clean(input.beforeDescription);
  const afterDescription = clean(input.afterDescription);
  if (beforeDescription !== afterDescription) {
    changes.push({
      field: "role_description",
      from: beforeDescription || "none",
      to: afterDescription || "none",
      fromCn: beforeDescription || "无",
      toCn: afterDescription || "无",
    });
  }
  const permissions = permissionListChange(input.beforePermissions, input.afterPermissions);
  if (permissions) changes.push(permissions);
  return changes;
}
