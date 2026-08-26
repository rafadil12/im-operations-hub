import type { TrainingCategory, TrainingLanguage } from "./types";

type TextPair = [string, string];

const TRAINING_TEXT = {
  overviewTitle: ["Training Overview", "培训总览"] as TextPair,
  overviewDesc: [
    "Sessions, participation, and attachment completeness across MES, Intelligent, and IT",
    "MES、智能物流与 IT 培训场次、参与度与附件完整度",
  ] as TextPair,
  activitiesTitle: ["Training Activities", "培训活动"] as TextPair,
  activitiesDesc: [
    "Record training sessions, participants, and materials",
    "记录培训场次、参与人员与培训资料",
  ] as TextPair,
  totalSessions: ["Total Sessions", "培训场次"] as TextPair,
  totalParticipants: ["Total Participants", "参与人次"] as TextPair,
  uniqueParticipants: ["Unique Participants", "参与人数"] as TextPair,
  attachmentRate: ["Attachment Rate", "附件完整率"] as TextPair,
  sessionsTrend: ["Sessions Trend", "培训趋势"] as TextPair,
  byCategory: ["Sessions by Category", "按类别统计"] as TextPair,
  topParticipants: ["Top Participants", "参与最多人员"] as TextPair,
  attachmentByCategory: ["Attachment Completeness", "附件完整度"] as TextPair,
  recentSessions: ["Recent Sessions", "最近培训"] as TextPair,
  withAttachment: ["With file", "有附件"] as TextPair,
  withoutAttachment: ["Missing file", "缺少附件"] as TextPair,
  sessions: ["Sessions", "场次"] as TextPair,
  participants: ["Participants", "参与人员"] as TextPair,
  date: ["Date", "日期"] as TextPair,
  topic: ["Topic", "主题"] as TextPair,
  category: ["Category", "类别"] as TextPair,
  count: ["Count", "人数"] as TextPair,
  attachment: ["Attachment", "附件"] as TextPair,
  actions: ["Actions", "操作"] as TextPair,
  addSession: ["Add Session", "新增培训"] as TextPair,
  editSession: ["Edit Session", "编辑培训"] as TextPair,
  deleteSession: ["Delete Session", "删除培训"] as TextPair,
  save: ["Save", "保存"] as TextPair,
  cancel: ["Cancel", "取消"] as TextPair,
  search: ["Search topic or participant", "搜索主题或人员"] as TextPair,
  allCategories: ["All categories", "全部类别"] as TextPair,
  noSessions: ["No training sessions yet.", "暂无培训记录。"] as TextPair,
  confirmDelete: ["Delete this training session?", "确认删除该培训记录？"] as TextPair,
  year: ["Year", "年份"] as TextPair,
  month: ["Month", "月份"] as TextPair,
  mes: ["MES", "MES"] as TextPair,
  intelligent: ["Intelligent", "智能物流"] as TextPair,
  it: ["IT", "IT"] as TextPair,
  uploadPdf: ["Upload PDF", "上传 PDF"] as TextPair,
  uploadPdfHint: ["PDF · max 100MB", "PDF · 最大 100MB"] as TextPair,
  replaceAttachment: ["Replace", "替换"] as TextPair,
  removeAttachment: ["Remove", "移除"] as TextPair,
  selectParticipants: ["Select participants", "选择参与人员"] as TextPair,
  requiredFields: ["Date, category, and topic are required.", "日期、类别和主题为必填项。"] as TextPair,
  saved: ["Session saved.", "培训已保存。"] as TextPair,
  deleted: ["Session deleted.", "培训已删除。"] as TextPair,
  viewFile: ["View file", "查看附件"] as TextPair,
  noFile: ["No file", "无附件"] as TextPair,
  filterMonth: ["Month", "月份"] as TextPair,
  filterCategory: ["Category", "类别"] as TextPair,
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

export function categoryLabel(category: TrainingCategory, language: TrainingLanguage): string {
  return trainingText(category, language);
}

export const CATEGORY_COLORS: Record<TrainingCategory, string> = {
  mes: "#6366f1",
  intelligent: "#22c55e",
  it: "#38bdf8",
};
