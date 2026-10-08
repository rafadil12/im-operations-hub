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
  "unit of measure": { en: "unit of measure", cn: "计量单位" },
  type: { en: "type", cn: "类型" },
  status: { en: "status", cn: "状态" },
  permission: { en: "permission", cn: "权限" },
  "storage location": { en: "storage location", cn: "库位" },
  user: { en: "user", cn: "用户" },
  record: { en: "record", cn: "记录" },
};

const VERBS: Record<string, { en: string; cn: string }> = {
  create: { en: "Created", cn: "已创建" },
  update: { en: "Updated", cn: "已更新" },
  delete: { en: "Deleted", cn: "已删除" },
};

const FIELDS: Record<string, { en: string; cn: string; mode: "from-to" | "updated" }> = {
  status: { en: "status", cn: "状态", mode: "from-to" },
  type: { en: "type", cn: "类型", mode: "from-to" },
  start: { en: "start", cn: "开始时间", mode: "from-to" },
  end: { en: "end", cn: "结束时间", mode: "from-to" },
  solution: { en: "solution", cn: "解决方案", mode: "updated" },
  description: { en: "description", cn: "描述", mode: "updated" },
};

function text(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function changePhrase(change: RemarkChange, lang: "en" | "cn"): string | null {
  const meta = FIELDS[change.field];
  if (!meta) return null;
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
  const head = lang === "cn" ? `并关联 ${link.ref}` : `and linked ${link.ref}`;
  return detail ? `${head}${colon}${detail}` : head;
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
  if (!event.objectType) return event.summary;

  const noun = NOUNS[event.objectType]?.[lang] ?? event.objectType;
  const verb = VERBS[event.action]?.[lang] ?? VERBS.update[lang];
  const ref = event.objectRef?.trim();
  const gap = lang === "cn" ? "" : " ";
  let sentence = ref ? `${verb}${gap}${noun} ${ref}` : `${verb}${gap}${noun}`;

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
