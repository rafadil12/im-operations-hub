import type { Lang } from "@/lib/types";
import type { ReportProjectHealth, ReportProjectLineStatus } from "./projectTypes";

type ProjectCopy = {
  title: string;
  desc: string;
  listTitle: string;
  add: string;
  edit: string;
  view: string;
  delete: string;
  save: string;
  cancel: string;
  empty: string;
  emptyFiltered: string;
  loadError: string;
  saveError: string;
  deleteError: string;
  deleteConfirm: string;
  deleteConfirmBody: string;
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
  progressSection: string;
  legendHealthy: string;
  legendMild: string;
  legendSerious: string;
  target: string;
  mainTask: string;
  priority: string;
  planStart: string;
  planEnd: string;
  health: string;
  status: string;
  progressRatio: string;
  pic: string;
  thisWeekProgress: string;
  nextWeekPlan: string;
  addRow: string;
  removeRow: string;
  actions: string;
  lines: string;
  healthMix: string;
  statusInProgress: string;
  statusCompleted: string;
  requiredHeader: string;
  requiredTarget: string;
  invalidProgress: string;
  weekLabel: (n: number) => string;
};

const EN: ProjectCopy = {
  title: "Projects",
  desc: "Project / department progress reports by week.",
  listTitle: "Project reports",
  add: "Add",
  edit: "Edit",
  view: "View",
  delete: "Delete",
  save: "Save",
  cancel: "Cancel",
  empty: "No project reports yet.",
  emptyFiltered: "No project reports match the filters.",
  loadError: "Failed to load project reports.",
  saveError: "Failed to save project report.",
  deleteError: "Failed to delete project report.",
  deleteConfirm: "Delete project report?",
  deleteConfirmBody: "This removes the report and all target rows. This cannot be undone.",
  year: "Year",
  week: "Week",
  allWeeks: "All weeks",
  today: "Today",
  search: "Search",
  searchHint: "Project, reporter, target…",
  reportDate: "Report date",
  projectDepartment: "Project / Department",
  reporter: "Reporter",
  cycle: "Cycle",
  progressSection: "Progress",
  legendHealthy: "Healthy",
  legendMild: "Mild",
  legendSerious: "Serious",
  target: "Target",
  mainTask: "Main task",
  priority: "Current priority",
  planStart: "Plan start",
  planEnd: "Plan end",
  health: "Health",
  status: "Status",
  progressRatio: "Progress",
  pic: "PIC",
  thisWeekProgress: "This week progress",
  nextWeekPlan: "Next week plan",
  addRow: "Add row",
  removeRow: "Remove",
  actions: "Actions",
  lines: "Targets",
  healthMix: "Health",
  statusInProgress: "In progress",
  statusCompleted: "Completed",
  requiredHeader: "Report date, project/department, reporter, and week are required.",
  requiredTarget: "Each row needs a target.",
  invalidProgress: "Progress must be between 0% and 100%.",
  weekLabel: (n) => `Week ${n}`,
};

const CN: ProjectCopy = {
  title: "项目",
  desc: "按周的项目/部门进展汇报。",
  listTitle: "项目汇报",
  add: "新增",
  edit: "编辑",
  view: "查看",
  delete: "删除",
  save: "保存",
  cancel: "取消",
  empty: "暂无项目汇报。",
  emptyFiltered: "没有符合筛选条件的项目汇报。",
  loadError: "加载项目汇报失败。",
  saveError: "保存项目汇报失败。",
  deleteError: "删除项目汇报失败。",
  deleteConfirm: "删除项目汇报？",
  deleteConfirmBody: "将删除该汇报及全部目标行，且无法恢复。",
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
  progressSection: "进展情况",
  legendHealthy: "健康",
  legendMild: "轻微",
  legendSerious: "严重",
  target: "目标",
  mainTask: "重点工作",
  priority: "当前优先级",
  planStart: "计划启动",
  planEnd: "计划完成",
  health: "健康指示",
  status: "状态",
  progressRatio: "进度比例",
  pic: "负责人",
  thisWeekProgress: "当前进展",
  nextWeekPlan: "未来计划",
  addRow: "添加行",
  removeRow: "删除",
  actions: "操作",
  lines: "目标",
  healthMix: "健康",
  statusInProgress: "进行中",
  statusCompleted: "完成",
  requiredHeader: "日期、项目/部门、汇报人和周次为必填。",
  requiredTarget: "每行需要填写目标。",
  invalidProgress: "进度须在 0%–100% 之间。",
  weekLabel: (n) => `第${n}周`,
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
