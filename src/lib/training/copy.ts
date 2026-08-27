import type { TrainingLanguage } from "./types";

type TextPair = [string, string];

const TRAINING_TEXT = {
  overviewTitle: ["Training Overview", "培训总览"] as TextPair,
  overviewDesc: [
    "Sessions, participation, and division coverage across MES, Intelligent, and IT",
    "MES、智能物流与 IT 培训场次与参与度总览",
  ] as TextPair,
  activitiesTitle: ["Training Activities", "培训活动"] as TextPair,
  activitiesDesc: [
    "Record training sessions, participants, and materials",
    "记录培训场次、参与人员与培训资料",
  ] as TextPair,
  totalSessions: ["Total Sessions", "培训场次"] as TextPair,
  totalParticipants: ["Total Participants", "参与人次"] as TextPair,
  uniqueParticipants: ["Unique Participants", "参与人数"] as TextPair,
  totalTopics: ["Total Topics", "主题总数"] as TextPair,
  sessionsTrend: ["Sessions Trend", "培训趋势"] as TextPair,
  sessionsTrendDailyHint: [
    "Daily totals for the selected date range",
    "所选日期范围内按日统计",
  ] as TextPair,
  sessionsTrendMonthlyHint: [
    "Monthly totals for months with recorded sessions in the selected range",
    "所选范围内有培训记录的月份统计",
  ] as TextPair,
  trendNoData: ["No sessions in this period.", "该时段暂无培训记录。"] as TextPair,
  byCategory: ["Sessions by Divisions", "按部门统计"] as TextPair,
  topParticipants: ["Top Participants", "参与最多人员"] as TextPair,
  topicsByDivision: ["Training Topics by Divisions", "各部门培训主题"] as TextPair,
  recentSessions: ["Recent Sessions", "最近培训"] as TextPair,
  withAttachment: ["With file", "有附件"] as TextPair,
  withoutAttachment: ["Missing file", "缺少附件"] as TextPair,
  sessions: ["Sessions", "场次"] as TextPair,
  participants: ["Participants", "参与人次"] as TextPair,
  topics: ["Topics", "主题"] as TextPair,
  date: ["Date", "日期"] as TextPair,
  topic: ["Topic", "主题"] as TextPair,
  topicEn: ["Topic EN", "主题（英）"] as TextPair,
  topicCn: ["Topic CN", "主题（中）"] as TextPair,
  division: ["Division", "部门"] as TextPair,
  nameEn: ["Name EN", "姓名（英）"] as TextPair,
  nameCn: ["Name CN", "姓名（中）"] as TextPair,
  addParticipant: ["Add", "添加"] as TextPair,
  count: ["Count", "人数"] as TextPair,
  attachment: ["Attachment", "附件"] as TextPair,
  actions: ["Actions", "操作"] as TextPair,
  addSession: ["Add Session", "新增培训"] as TextPair,
  editSession: ["Edit Session", "编辑培训"] as TextPair,
  deleteSession: ["Delete Session", "删除培训"] as TextPair,
  save: ["Save", "保存"] as TextPair,
  cancel: ["Cancel", "取消"] as TextPair,
  search: ["Search topic or participant", "搜索主题或人员"] as TextPair,
  allDivisions: ["All divisions", "全部部门"] as TextPair,
  noSessions: ["No training sessions yet.", "暂无培训记录。"] as TextPair,
  confirmDelete: ["Delete this training session?", "确认删除该培训记录？"] as TextPair,
  year: ["Year", "年份"] as TextPair,
  month: ["Month", "月份"] as TextPair,
  uploadPdf: ["Upload PDF", "上传 PDF"] as TextPair,
  uploadPdfHint: ["PDF · max 100MB", "PDF · 最大 100MB"] as TextPair,
  replaceAttachment: ["Replace", "替换"] as TextPair,
  removeAttachment: ["Remove", "移除"] as TextPair,
  selectParticipants: ["Select participants", "选择参与人员"] as TextPair,
  requiredFields: [
    "Date, division, and at least one topic language are required.",
    "日期、部门以及至少一个主题语言为必填项。",
  ] as TextPair,
  requiredParticipantNames: [
    "Name EN and Name CN are required to add a participant.",
    "添加参与人员需填写英文名与中文名。",
  ] as TextPair,
  saved: ["Session saved.", "培训已保存。"] as TextPair,
  deleted: ["Session deleted.", "培训已删除。"] as TextPair,
  viewFile: ["View file", "查看附件"] as TextPair,
  noFile: ["No file", "无附件"] as TextPair,
  filterMonth: ["Month", "月份"] as TextPair,
  filterDivision: ["Division", "部门"] as TextPair,
  loading: ["Loading…", "加载中…"] as TextPair,
  errorLoad: ["Failed to load training data.", "加载培训数据失败。"] as TextPair,
  errorSave: ["Failed to save session.", "保存培训失败。"] as TextPair,
  errorDelete: ["Failed to delete session.", "删除培训失败。"] as TextPair,
} as const;

export type TrainingTextKey = keyof typeof TRAINING_TEXT;

export function trainingText(key: TrainingTextKey, language: TrainingLanguage): string {
  const pair = TRAINING_TEXT[key];
  return language === "cn" ? pair[1] : pair[0];
}

/** Colors keyed by known division English names; unknown → slate. */
export const DIVISION_COLORS: Record<string, string> = {
  MES: "#6366f1",
  "Intelligent Logistics": "#22c55e",
  Intelligent: "#22c55e",
  IT: "#38bdf8",
};

export function divisionColor(nameEn: string | null | undefined): string {
  const key = String(nameEn ?? "").trim();
  return DIVISION_COLORS[key] ?? "#64748b";
}

/** @deprecated Use DIVISION_COLORS / divisionColor */
export const CATEGORY_COLORS = {
  mes: DIVISION_COLORS.MES,
  intelligent: DIVISION_COLORS["Intelligent Logistics"],
  it: DIVISION_COLORS.IT,
};
