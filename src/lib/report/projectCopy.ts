import type { Lang } from "@/lib/types";
import type { ReportProjectHealth, ReportProjectLineStatus } from "./projectTypes";

type ProjectCopy = {
  title: string;
  desc: string;
  listTitle: string;
  add: string;
  addTitle: string;
  edit: string;
  editTitle: string;
  view: string;
  viewTitle: string;
  delete: string;
  save: string;
  saveDraft: string;
  saveChanges: string;
  submit: string;
  cancel: string;
  empty: string;
  emptyFiltered: string;
  loadError: string;
  saveError: string;
  deleteError: string;
  deleteConfirm: string;
  deleteConfirmBody: string;
  saved: string;
  deleted: string;
  year: string;
  week: string;
  allWeeks: string;
  today: string;
  search: string;
  searchHint: string;
  reportDate: string;
  projectDepartment: string;
  reporter: string;
  cycle: string;
  reportInformation: string;
  projectTargets: string;
  weeklyUpdate: string;
  statusHealth: string;
  progressSection: string;
  legendHealthy: string;
  legendMild: string;
  legendSerious: string;
  target: string;
  mainTask: string;
  priority: string;
  planStart: string;
  planEnd: string;
  plannedSchedule: string;
  health: string;
  status: string;
  progressRatio: string;
  pic: string;
  thisWeekProgress: string;
  nextWeekPlan: string;
  addRow: string;
  addTarget: string;
  removeRow: string;
  actions: string;
  lines: string;
  healthMix: string;
  statusInProgress: string;
  statusCompleted: string;
  statusDraft: string;
  statusSubmitted: string;
  attachments: string;
  uploadAttachment: string;
  uploadHint: string;
  noAttachments: string;
  removeAttachment: string;
  attachmentTooLarge: string;
  attachmentInvalidType: string;
  attachmentMaxReached: string;
  updatedBy: string;
  showingCount: (from: number, to: number, total: number) => string;
  requiredHeader: string;
  requiredTarget: string;
  invalidProgress: string;
  weekLabel: (n: number) => string;
  weekShort: (n: number) => string;
};

const EN: ProjectCopy = {
  title: "Projects",
  desc: "Project / department progress reports by week.",
  listTitle: "Project reports",
  add: "Add",
  addTitle: "Add Project Report",
  edit: "Edit",
  editTitle: "Edit Project Report",
  view: "View",
  viewTitle: "Project Report Details",
  delete: "Delete",
  save: "Save",
  saveDraft: "Save Draft",
  saveChanges: "Save Changes",
  submit: "Submit",
  cancel: "Cancel",
  empty: "No project reports yet.",
  emptyFiltered: "No project reports match the filters.",
  loadError: "Failed to load project reports.",
  saveError: "Failed to save project report.",
  deleteError: "Failed to delete project report.",
  deleteConfirm: "Delete project report?",
  deleteConfirmBody: "This removes the report and all target rows. This cannot be undone.",
  saved: "Saved",
  deleted: "Deleted",
  year: "Year",
  week: "Week",
  allWeeks: "All weeks",
  today: "Today",
  search: "Search",
  searchHint: "Project, reporter, target…",
  reportDate: "Report Date",
  projectDepartment: "Project / Department",
  reporter: "Reporter",
  cycle: "Cycle",
  reportInformation: "Report Information",
  projectTargets: "Project Targets",
  weeklyUpdate: "Weekly Update",
  statusHealth: "Status & Health",
  progressSection: "Progress",
  legendHealthy: "Healthy",
  legendMild: "Watch",
  legendSerious: "Critical",
  target: "Target",
  mainTask: "Main task",
  priority: "Current priority",
  planStart: "Plan start",
  planEnd: "Plan end",
  plannedSchedule: "Plan",
  health: "Health",
  status: "Status",
  progressRatio: "Progress",
  pic: "PIC",
  thisWeekProgress: "This Week Progress",
  nextWeekPlan: "Next Week Plan",
  addRow: "Add row",
  addTarget: "Add Target",
  removeRow: "Remove",
  actions: "Actions",
  lines: "Targets",
  healthMix: "Health",
  statusInProgress: "In Progress",
  statusCompleted: "Completed",
  statusDraft: "Draft",
  statusSubmitted: "Submitted",
  attachments: "Attachments",
  uploadAttachment: "Drop files here or click to upload",
  uploadHint: "PDF, DOC, XLS, PNG, JPG · max 10 MB · up to 5 files",
  noAttachments: "No attachments.",
  removeAttachment: "Remove",
  attachmentTooLarge: "File exceeds the 10 MB limit.",
  attachmentInvalidType: "Unsupported file type. Allowed: PPT, Excel, PDF, PNG, JPEG.",
  attachmentMaxReached: "Maximum 5 attachments per report.",
  updatedBy: "Updated by",
  showingCount: (from, to, total) =>
    total === 0 ? "Showing 0 projects" : `Showing ${from}–${to} of ${total} projects`,
  requiredHeader: "Report date, project/department, reporter, and week are required.",
  requiredTarget: "Each row needs a target.",
  invalidProgress: "Progress must be between 0% and 100%.",
  weekLabel: (n) => `Week ${n}`,
  weekShort: (n) => `W${n}`,
};

const CN: ProjectCopy = {
  title: "项目",
  desc: "按周的项目/部门进展汇报。",
  listTitle: "项目汇报",
  add: "新增",
  addTitle: "新增项目汇报",
  edit: "编辑",
  editTitle: "编辑项目汇报",
  view: "查看",
  viewTitle: "项目汇报详情",
  delete: "删除",
  save: "保存",
  saveDraft: "保存草稿",
  saveChanges: "保存更改",
  submit: "提交",
  cancel: "取消",
  empty: "暂无项目汇报。",
  emptyFiltered: "没有符合筛选条件的项目汇报。",
  loadError: "加载项目汇报失败。",
  saveError: "保存项目汇报失败。",
  deleteError: "删除项目汇报失败。",
  deleteConfirm: "删除项目汇报？",
  deleteConfirmBody: "将删除该汇报及全部目标行，且无法恢复。",
  saved: "已保存",
  deleted: "已删除",
  year: "年份",
  week: "周次",
  allWeeks: "全部周次",
  today: "今天",
  search: "搜索",
  searchHint: "项目、汇报人、目标…",
  reportDate: "日期",
  projectDepartment: "项目\\部门",
  reporter: "汇报人",
  cycle: "周期",
  reportInformation: "汇报信息",
  projectTargets: "项目目标",
  weeklyUpdate: "周更新",
  statusHealth: "状态与健康",
  progressSection: "进展情况",
  legendHealthy: "健康",
  legendMild: "轻微",
  legendSerious: "严重",
  target: "目标",
  mainTask: "重点工作",
  priority: "当前优先级",
  planStart: "计划启动",
  planEnd: "计划完成",
  plannedSchedule: "计划",
  health: "健康指示",
  status: "状态",
  progressRatio: "进度比例",
  pic: "负责人",
  thisWeekProgress: "当前进展",
  nextWeekPlan: "未来计划",
  addRow: "添加行",
  addTarget: "添加目标",
  removeRow: "删除",
  actions: "操作",
  lines: "目标",
  healthMix: "健康",
  statusInProgress: "进行中",
  statusCompleted: "完成",
  statusDraft: "草稿",
  statusSubmitted: "已提交",
  attachments: "附件",
  uploadAttachment: "拖放文件或点击上传",
  uploadHint: "PDF、DOC、XLS、PNG、JPG · 最大 10 MB · 最多 5 个文件",
  noAttachments: "暂无附件。",
  removeAttachment: "移除",
  attachmentTooLarge: "文件超过 10 MB 限制。",
  attachmentInvalidType: "不支持的文件类型。允许：PPT、Excel、PDF、PNG、JPEG。",
  attachmentMaxReached: "每个汇报最多 5 个附件。",
  updatedBy: "更新人",
  showingCount: (from, to, total) =>
    total === 0 ? "显示 0 个项目" : `显示 ${from}–${to} / 共 ${total} 个项目`,
  requiredHeader: "日期、项目/部门、汇报人和周次为必填。",
  requiredTarget: "每行需要填写目标。",
  invalidProgress: "进度须在 0%–100% 之间。",
  weekLabel: (n) => `第${n}周`,
  weekShort: (n) => `W${n}`,
};

export function projectText(lang: Lang): ProjectCopy {
  return lang === "cn" ? CN : EN;
}

export function healthLabel(health: ReportProjectHealth, lang: Lang): string {
  const t = projectText(lang);
  if (health === "mild") return t.legendMild;
  if (health === "serious") return t.legendSerious;
  return t.legendHealthy;
}

export function lineStatusLabel(status: ReportProjectLineStatus, lang: Lang): string {
  const t = projectText(lang);
  return status === "completed" ? t.statusCompleted : t.statusInProgress;
}

export const HEALTH_DOT_CLASS: Record<ReportProjectHealth, string> = {
  healthy: "bg-emerald-500",
  mild: "bg-amber-400",
  serious: "bg-rose-500",
};

export const HEALTH_BADGE_CLASS: Record<ReportProjectHealth, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  mild: "bg-amber-400/10 text-amber-700 border-amber-400/30",
  serious: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

/** Worst health across counts: serious > mild > healthy. */
export function worstHealthFromCounts(counts: {
  healthy: number;
  mild: number;
  serious: number;
}): ReportProjectHealth | null {
  if (counts.serious > 0) return "serious";
  if (counts.mild > 0) return "mild";
  if (counts.healthy > 0) return "healthy";
  return null;
}
