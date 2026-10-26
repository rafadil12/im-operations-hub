export type RemarkChange = {
  field: string;
  from?: string | null;
  to?: string | null;
  fromCn?: string | null;
  toCn?: string | null;
};

export type RemarkLink = {
  type: string;
  ref: string;
  detailEn?: string | null;
  detailCn?: string | null;
};

export type RemarkEvent = {
  action: string;
  summary: string;
  objectType?: string | null;
  objectRef?: string | null;
  changes?: RemarkChange[] | null;
  links?: RemarkLink[] | null;
};

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
};

const VERBS: Record<string, { en: string; cn: string }> = {
  create: { en: "Created", cn: "已创建" },
  update: { en: "Updated", cn: "已更新" },
  delete: { en: "Deleted", cn: "已删除" },
  post: { en: "Posted", cn: "已过账" },
  reverse: { en: "Reversed", cn: "已冲销" },
  import: { en: "Imported", cn: "已导入" },
  save: { en: "Saved", cn: "已保存" },
  submit: { en: "Submitted", cn: "已提交" },
  reopen: { en: "Reopened", cn: "已重新打开" },
};

const FIELDS: Record<string, { en: string; cn: string; mode: "from-to" | "updated" }> = {
  status: { en: "status", cn: "状态", mode: "from-to" },
  type: { en: "type", cn: "类型", mode: "from-to" },
  start: { en: "start", cn: "开始时间", mode: "from-to" },
  end: { en: "end", cn: "结束时间", mode: "from-to" },
  solution: { en: "solution", cn: "解决方案", mode: "updated" },
  description: { en: "description", cn: "描述", mode: "updated" },
  category: { en: "category", cn: "类别", mode: "from-to" },
  subcategory: { en: "subcategory", cn: "子类别", mode: "from-to" },
  role: { en: "role", cn: "角色", mode: "from-to" },
  division: { en: "division", cn: "部门", mode: "from-to" },
  min_stock: { en: "minimum stock", cn: "最小库存", mode: "from-to" },
  name_en: { en: "English name", cn: "英文名称", mode: "from-to" },
  name_cn: { en: "Chinese name", cn: "中文名称", mode: "from-to" },
  uom: { en: "unit", cn: "单位", mode: "from-to" },
  "item category": { en: "category", cn: "类别", mode: "from-to" },
  code: { en: "code", cn: "编码", mode: "from-to" },
  brand_en: { en: "English brand", cn: "英文品牌", mode: "from-to" },
  brand_cn: { en: "Chinese brand", cn: "中文品牌", mode: "from-to" },
  model: { en: "model", cn: "型号", mode: "from-to" },
  erp_code: { en: "ERP code", cn: "ERP编码", mode: "from-to" },
  notes: { en: "notes", cn: "备注", mode: "updated" },
  role_name: { en: "name", cn: "名称", mode: "from-to" },
  role_description: { en: "description", cn: "描述", mode: "from-to" },
  area: { en: "area", cn: "区域", mode: "from-to" },
  project_name: { en: "name", cn: "名称", mode: "from-to" },
  reporter: { en: "reporter", cn: "汇报人", mode: "from-to" },
  report_date: { en: "report date", cn: "日期", mode: "from-to" },
  cycle: { en: "cycle", cn: "周期", mode: "from-to" },
  week: { en: "week", cn: "周次", mode: "from-to" },
  year: { en: "year", cn: "年份", mode: "from-to" },
};

function text(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function changePhrase(change: RemarkChange, lang: "en" | "cn"): string | null {
  if (change.field === "password") {
    return lang === "cn" ? "密码已重置" : "password reset";
  }
  if (change.field === "change_password") {
    return lang === "cn" ? "修改密码" : "Change Password";
  }
  if (change.field === "lines" || change.field === "permissions") {
    const detail = lang === "cn" ? text(change.toCn, text(change.to, "")) : text(change.to, "");
    return detail || null;
  }
  if (change.field === "image") {
    if (change.to === "removed") return lang === "cn" ? "图片已删除" : "image removed";
    return lang === "cn" ? "图片已更新" : "image updated";
  }
  if (change.field === "pic") {
    return lang === "cn" ? "已取消 PIC 分配" : "unassigned as PIC";
  }
  const meta = FIELDS[change.field];
  if (!meta) return null;
  if (
    change.field === "role" ||
    change.field === "division" ||
    change.field === "category" ||
    change.field === "area"
  ) {
    const meta = FIELDS[change.field];
    const valueTo = lang === "cn" ? text(change.toCn, text(change.to, "")) : text(change.to, "");
    const valueFrom = lang === "cn" ? text(change.fromCn, text(change.from, "")) : text(change.from, "");
    if (meta && valueTo && !valueFrom) return lang === "cn" ? `${meta.cn} ${valueTo}` : `${meta.en} ${valueTo}`;
  }
  if (meta.mode === "updated") {
    return lang === "cn" ? `${meta.cn}已更新` : `${meta.en} updated`;
  }
  const from = lang === "cn" ? text(change.fromCn, text(change.from, "")) : text(change.from, "");
  const to = lang === "cn" ? text(change.toCn, text(change.to, "")) : text(change.to, "");
  if (!from || !to || from === to) return null;
  return lang === "cn" ? `${meta.cn}从${from}改为${to}` : `${meta.en} from ${from} to ${to}`;
}

function linkPhrase(link: RemarkLink, lang: "en" | "cn"): string {
  const detail = lang === "cn" ? text(link.detailCn, text(link.detailEn, "")) : text(link.detailEn, "");
  const colon = lang === "cn" ? "：" : ": ";
  if (link.type === "goods_issue") {
    const head = lang === "cn" ? `并过账发货 ${link.ref}` : `and posted goods issue ${link.ref}`;
    return detail ? `${head}${colon}${detail}` : head;
  }
  if (link.type === "reversal_of") {
    return lang === "cn" ? `原凭证 ${link.ref}` : `of ${link.ref}`;
  }
  const head = lang === "cn" ? `并关联 ${link.ref}` : `and linked ${link.ref}`;
  return detail ? `${head}${colon}${detail}` : head;
}

function weekSentence(event: RemarkEvent, lang: "en" | "cn"): string {
  const week = event.objectRef?.trim() || "";
  const areaChange = event.changes?.find((change) => change.field === "name");
  const area = areaChange
    ? lang === "cn"
      ? text(areaChange.toCn, text(areaChange.to, ""))
      : text(areaChange.to, text(areaChange.toCn, ""))
    : "";
  const verb = VERBS[event.action]?.[lang] ?? VERBS.update[lang];
  const place = lang === "cn" ? `第${week}周${area ? ` ${area}` : ""}` : `week ${week}${area ? ` ${area}` : ""}`;
  const gap = lang === "cn" ? "" : " ";
  let sentence = `${verb}${gap}${place}`;
  const details = (event.changes ?? [])
    .filter((change) => change.field !== "name")
    .map((change) => changePhrase(change, lang))
    .filter((phrase): phrase is string => Boolean(phrase));
  if (details.length) {
    const colon = lang === "cn" ? "：" : ": ";
    const comma = lang === "cn" ? "，" : ", ";
    sentence += `${colon}${details.join(comma)}`;
  }
  return sentence;
}

function attachmentSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  const file = event.objectRef?.trim();
  const parent = event.links?.[0];
  if (!file || !parent) return null;
  if (parent.type === "week") {
    const week = parent.ref.trim();
    const area = lang === "cn" ? text(parent.detailCn, text(parent.detailEn, "")) : text(parent.detailEn, text(parent.detailCn, ""));
    const place = lang === "cn" ? `第${week}周${area ? ` ${area}` : ""}` : `week ${week}${area ? ` ${area}` : ""}`;
    if (event.action === "delete") {
      return lang === "cn" ? `已删除附件 ${file}，${place}` : `Removed attachment ${file} from ${place}`;
    }
    return lang === "cn" ? `已添加附件 ${file} 到${place}` : `Added attachment ${file} to ${place}`;
  }
  if (parent.type === "project") {
    const name = parent.ref.trim();
    if (!name) return null;
    if (event.action === "delete") {
      return lang === "cn" ? `已删除附件 ${file}，项目 ${name}` : `Removed attachment ${file} from project ${name}`;
    }
    return lang === "cn" ? `已添加附件 ${file} 到项目 ${name}` : `Added attachment ${file} to project ${name}`;
  }
  return null;
}

function safetySentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  const weekly = event.objectType === "weekly safety report";
  const monthly = event.objectType === "monthly safety report";
  if (!weekly && !monthly) return null;

  const verb =
    event.action === "delete"
      ? lang === "cn"
        ? "已删除"
        : "Removed"
      : event.action === "update"
        ? lang === "cn"
          ? "已更新"
          : "Updated"
        : lang === "cn"
          ? "已提交"
          : "Submitted";
  const noun = weekly
    ? lang === "cn"
      ? "周安全报告"
      : "weekly safety report"
    : lang === "cn"
      ? "月安全报告"
      : "monthly safety report";
  const activityChange = event.changes?.find((change) => change.field === "name");
  const activity = activityChange
    ? lang === "cn"
      ? text(activityChange.toCn, text(activityChange.to, ""))
      : text(activityChange.to, text(activityChange.toCn, ""))
    : "";
  const periodChange = event.changes?.find((change) => change.field === "period");
  const period = periodChange
    ? lang === "cn"
      ? text(periodChange.toCn, text(periodChange.to, ""))
      : text(periodChange.to, text(periodChange.toCn, ""))
    : "";
  const week = event.objectRef?.trim() || "";
  const place =
    weekly && week
      ? lang === "cn"
        ? `${period} 第${week}周`
        : `week ${week} of ${period}`
      : period;
  const gap = lang === "cn" ? "" : " ";
  let sentence = lang === "cn" ? `${verb}${noun}，${place}` : `${verb}${gap}${noun}, ${place}`;
  const details = (event.changes ?? [])
    .filter((change) => change.field !== "name" && change.field !== "period")
    .map((change) => changePhrase(change, lang))
    .filter((phrase): phrase is string => Boolean(phrase));
  const tail = [activity, ...details].filter(Boolean);
  if (tail.length) {
    const colon = lang === "cn" ? "：" : ": ";
    const comma = lang === "cn" ? "，" : ", ";
    sentence += `${colon}${tail.join(comma)}`;
  }
  return sentence;
}

function trainingSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "training session") return null;
  const verb = VERBS[event.action]?.[lang] ?? VERBS.update[lang];
  const name = event.changes?.find((change) => change.field === "name");
  const topic = name
    ? lang === "cn"
      ? text(name.toCn, text(name.to, ""))
      : text(name.to, text(name.toCn, ""))
    : "";
  const gap = lang === "cn" ? "" : " ";
  const noun = lang === "cn" ? "培训" : "session";
  let sentence = topic ? `${verb}${gap}${noun} ${topic}` : `${verb}${gap}${noun}`;
  const details = (event.changes ?? [])
    .filter((change) => change.field !== "name")
    .map((change) => changePhrase(change, lang))
    .filter((phrase): phrase is string => Boolean(phrase));
  if (details.length) {
    const colon = lang === "cn" ? "：" : ": ";
    const comma = lang === "cn" ? "，" : ", ";
    sentence += `${colon}${details.join(comma)}`;
  }
  return sentence;
}

function requestCountPhrase(count: number, lang: "en" | "cn"): string {
  if (lang === "cn") return `${count} 个请求`;
  return count === 1 ? "1 request" : `${count} requests`;
}

function requestImportSentence(event: RemarkEvent, lang: "en" | "cn"): string {
  const imported = Number(event.objectRef?.trim() || "0");
  const updatedRaw = event.changes?.find((change) => change.field === "updated")?.to;
  const updated = Number(updatedRaw ?? "0");
  const newCount = Number.isFinite(imported) && imported > 0 ? imported : 0;
  const updatedCount = Number.isFinite(updated) && updated > 0 ? updated : 0;
  const importedPhrase =
    newCount > 0
      ? lang === "cn"
        ? `已导入 ${requestCountPhrase(newCount, lang)}`
        : `Imported ${requestCountPhrase(newCount, lang)}`
      : "";
  const updatedPhrase =
    updatedCount > 0
      ? lang === "cn"
        ? `已更新 ${requestCountPhrase(updatedCount, lang)}`
        : `Updated ${requestCountPhrase(updatedCount, lang)}`
      : "";
  if (importedPhrase && updatedPhrase) {
    return lang === "cn" ? `${importedPhrase}，${updatedPhrase}` : `${importedPhrase}, ${updatedPhrase.toLowerCase()}`;
  }
  return importedPhrase || updatedPhrase;
}

function sessionSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "session") return null;
  const result = event.changes?.find((change) => change.field === "result")?.to;
  if (event.action === "logout" || result === "signed_out") {
    return lang === "cn" ? "已退出" : "Signed out";
  }
  if (result === "failed") return lang === "cn" ? "登录失败" : "Sign-in failed";
  if (result === "inactive") {
    return lang === "cn" ? "登录被拒绝：账号未激活" : "Sign-in rejected: account inactive";
  }
  if (result === "signed_in" || event.action === "login") {
    return lang === "cn" ? "已登录" : "Signed in";
  }
  return null;
}

export function parseRemarkList<T>(value: unknown): T[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function renderRemark(event: RemarkEvent, lang: "en" | "cn"): string {
  const session = sessionSentence(event, lang);
  if (session) return session;
  if (event.objectType === "week") return weekSentence(event, lang);
  const safety = safetySentence(event, lang);
  if (safety) return safety;
  const training = trainingSentence(event, lang);
  if (training) return training;
  if (event.objectType === "attachment") {
    const attachment = attachmentSentence(event, lang);
    if (attachment) return attachment;
  }
  if (
    event.action === "import" &&
    (event.objectType === "materials" || event.objectType === "activities" || event.objectType === "requests")
  ) {
    if (event.objectType === "requests") return requestImportSentence(event, lang);
    const count = event.objectRef?.trim() || "0";
    if (event.objectType === "activities") {
      return lang === "cn" ? `已导入 ${count} 个活动` : `Imported ${count} activities`;
    }
    return lang === "cn" ? `已导入 ${count} 个物料` : `Imported ${count} materials`;
  }
  if (!event.objectType) return event.summary;

  const noun = NOUNS[event.objectType]?.[lang] ?? event.objectType;
  const verb = VERBS[event.action]?.[lang] ?? VERBS.update[lang];
  const ref = event.objectRef?.trim();
  const name = event.changes?.find((change) => change.field === "name");
  const nameLabel = name
    ? lang === "cn"
      ? text(name.toCn, text(name.to, ""))
      : text(name.to, text(name.toCn, ""))
    : "";
  const who = [ref, nameLabel].filter(Boolean).join(" ");
  const gap = lang === "cn" ? "" : " ";
  let sentence = who ? `${verb}${gap}${noun} ${who}` : `${verb}${gap}${noun}`;

  const changes = (event.changes ?? [])
    .map((change) => changePhrase(change, lang))
    .filter((phrase): phrase is string => Boolean(phrase));
  const links = (event.links ?? []).map((link) => linkPhrase(link, lang));
  const colon = lang === "cn" ? "：" : ": ";
  const comma = lang === "cn" ? "，" : ", ";

  if (changes.length && links.length) {
    sentence += `${colon}${changes.join(comma)}${comma}${links.join(comma)}`;
  } else if (changes.length) {
    sentence += `${colon}${changes.join(comma)}`;
  } else if (links.length) {
    sentence += ` ${links.join(comma)}`;
  }
  return sentence;
}
