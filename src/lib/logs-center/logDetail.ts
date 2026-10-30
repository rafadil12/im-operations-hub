import { deviceLabel } from "@/lib/requestClient";
import type { RemarkChange } from "./renderRemark";

export type ActionBadgeTone = "green" | "orange" | "red" | "blue" | "purple" | "gray";

const NOUNS: Record<string, { en: string; cn: string }> = {
  activity: { en: "activity", cn: "活动" },
  category: { en: "category", cn: "类别" },
  subcategory: { en: "subcategory", cn: "子类别" },
  session: { en: "session", cn: "会话" },
  material: { en: "material", cn: "物料" },
  role: { en: "role", cn: "角色" },
  account: { en: "account", cn: "账号" },
  "goods document": { en: "goods document", cn: "物料凭证" },
  "goods receipt": { en: "goods receipt", cn: "收货" },
  "goods issue": { en: "goods issue", cn: "发货" },
  transfer: { en: "transfer", cn: "转储" },
  materials: { en: "materials", cn: "物料" },
  "unit of measure": { en: "unit of measure", cn: "计量单位" },
  type: { en: "type", cn: "类型" },
  status: { en: "status", cn: "状态" },
  permission: { en: "permission", cn: "权限" },
  "storage location": { en: "storage location", cn: "库位" },
  user: { en: "user", cn: "用户" },
  record: { en: "record", cn: "记录" },
  week: { en: "week", cn: "周" },
  project: { en: "project", cn: "项目" },
  "sub-item": { en: "sub-item", cn: "子项" },
  attachment: { en: "attachment", cn: "附件" },
  participant: { en: "participant", cn: "参与者" },
  employee: { en: "employee", cn: "员工" },
  "weekly safety report": { en: "weekly safety report", cn: "周安全报告" },
  "monthly safety report": { en: "monthly safety report", cn: "月安全报告" },
  activities: { en: "activities", cn: "活动" },
  requests: { en: "requests", cn: "请求" },
};

const FIELD_LABELS: Record<string, { en: string; cn: string }> = {
  status: { en: "status", cn: "状态" },
  type: { en: "type", cn: "类型" },
  start: { en: "start", cn: "开始时间" },
  end: { en: "end", cn: "结束时间" },
  solution: { en: "solution", cn: "解决方案" },
  description: { en: "description", cn: "描述" },
  category: { en: "category", cn: "类别" },
  subcategory: { en: "subcategory", cn: "子类别" },
  role: { en: "role", cn: "角色" },
  division: { en: "division", cn: "部门" },
  min_stock: { en: "minimum stock", cn: "最小库存" },
  name_en: { en: "English name", cn: "英文名称" },
  name_cn: { en: "Chinese name", cn: "中文名称" },
  uom: { en: "unit", cn: "单位" },
  "item category": { en: "category", cn: "类别" },
  code: { en: "code", cn: "编码" },
  brand_en: { en: "English brand", cn: "英文品牌" },
  brand_cn: { en: "Chinese brand", cn: "中文品牌" },
  model: { en: "model", cn: "型号" },
  erp_code: { en: "ERP code", cn: "ERP编码" },
  notes: { en: "notes", cn: "备注" },
  role_name: { en: "name", cn: "名称" },
  role_description: { en: "description", cn: "描述" },
  area: { en: "area", cn: "区域" },
  project_name: { en: "name", cn: "名称" },
  reporter: { en: "reporter", cn: "汇报人" },
  report_date: { en: "report date", cn: "日期" },
  cycle: { en: "cycle", cn: "周期" },
  week: { en: "week", cn: "周次" },
  year: { en: "year", cn: "年份" },
  password: { en: "password", cn: "密码" },
  change_password: { en: "password", cn: "密码" },
  image: { en: "image", cn: "图片" },
  pic: { en: "PIC", cn: "PIC" },
  lines: { en: "lines", cn: "行" },
  permissions: { en: "permissions", cn: "权限" },
};

/** Badge/filter label: older save/submit/import rows show as UPDATE. */
export function displayLogAction(action: string): string {
  const key = action.trim().toLowerCase();
  if (key === "change" || key === "save" || key === "submit" || key === "reopen" || key === "import") {
    return "update";
  }
  return key || action;
}

export function actionBadgeTone(action: string): ActionBadgeTone {
  switch (displayLogAction(action)) {
    case "create":
    case "login":
      return "green";
    case "update":
      return "orange";
    case "delete":
    case "reverse":
      return "red";
    case "post":
      return "blue";
    case "logout":
    default:
      return "gray";
  }
}

export function actionBadgeClass(tone: ActionBadgeTone): string {
  switch (tone) {
    case "green":
      return "bg-success/15 text-success";
    case "orange":
      return "bg-warning/15 text-warning";
    case "red":
      return "bg-danger/15 text-danger";
    case "blue":
      return "bg-accent/15 text-accent";
    case "purple":
      return "bg-violet-500/15 text-violet-500";
    case "gray":
    default:
      return "bg-surface-hover text-text-muted";
  }
}

export function formatLogEventId(id: number, createdAt: string): string {
  const date =
    /^(\d{4}-\d{2}-\d{2})/.exec(createdAt.trim())?.[1]?.replaceAll("-", "") ?? "00000000";
  return `LOG-${date}-${String(id).padStart(6, "0")}`;
}

/** Capitalize each word. Existing codes such as DTR00001 stay unchanged. */
function toTitleCase(value: string): string {
  return value.replace(/[A-Za-z]+(?:-[A-Za-z]+)*/g, (word) =>
    word
      .split("-")
      .map((part) => {
        if (part.length > 1 && part === part.toUpperCase()) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("-")
  );
}

export function formatLogTarget(
  objectType: string | null | undefined,
  objectRef: string | null | undefined,
  lang: "en" | "cn"
): string {
  const type = objectType?.trim() || "";
  const ref = objectRef?.trim() || "";
  if (!type && !ref) return "-";
  const noun = type ? (NOUNS[type]?.[lang] ?? type) : "";
  const text = noun && ref ? `${noun} ${ref}` : noun || ref || "-";
  if (text === "-" || lang === "cn") return text;
  return toTitleCase(text);
}

function fieldLabel(field: string, lang: "en" | "cn"): string {
  return FIELD_LABELS[field]?.[lang] ?? field;
}

function changeValue(change: RemarkChange, side: "from" | "to", lang: "en" | "cn"): string {
  if (side === "from") {
    return (lang === "cn" ? change.fromCn?.trim() || change.from : change.from)?.trim() || "-";
  }
  return (lang === "cn" ? change.toCn?.trim() || change.to : change.to)?.trim() || "-";
}

export function formatChangeLines(
  changes: RemarkChange[] | null | undefined,
  lang: "en" | "cn",
  action?: string | null
): { before: string[]; after: string[] } {
  if (!changes?.length) {
    return { before: ["-"], after: ["-"] };
  }
  const isDelete = displayLogAction(action ?? "") === "delete";
  const before: string[] = [];
  const after: string[] = [];
  for (const change of changes) {
    const result = change.field === "result" ? change.to?.trim().toLowerCase() : "";
    if (result === "saved" || result === "submitted" || result === "reopened" || result === "imported") {
      continue;
    }
    const label = fieldLabel(change.field, lang);
    if (isDelete) {
      // Delete remarks store the removed value in `to` for the sentence;
      // show that snapshot as Before, and leave After empty.
      const from = changeValue(change, "from", lang);
      const to = changeValue(change, "to", lang);
      before.push(`${label}: ${from !== "-" ? from : to}`);
      after.push(`${label}: -`);
      continue;
    }
    before.push(`${label}: ${changeValue(change, "from", lang)}`);
    after.push(`${label}: ${changeValue(change, "to", lang)}`);
  }
  return {
    before: before.length ? before : ["-"],
    after: after.length ? after : ["-"],
  };
}

export function formatLogDevice(userAgent: string | null | undefined): string {
  return deviceLabel(userAgent);
}

export function formatLogIp(ipAddress: string | null | undefined): string {
  const value = ipAddress?.trim();
  return value || "-";
}
