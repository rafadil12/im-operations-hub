import type { ReportLanguage } from "./types";

type TextPair = [string, string];

const REPORT_TEXT = {
  overviewTitle: ["Report Overview", "周报总览"] as TextPair,
  overviewDesc: [
    "Weekly snapshot for MES, Logistics, IT, and Safety — compare against the previous week",
    "MES、智能物流、IT 与安全周报快照 — 可与上周对比",
  ] as TextPair,
  managementTitle: ["Weekly Reports", "周报管理"] as TextPair,
  managementDesc: [
    "Edit weekly report lines by year, week, and area",
    "按年、周、区域编辑周报事项",
  ] as TextPair,
  summaryTab: ["Summary", "汇总"] as TextPair,
  summaryFullView: ["Full View", "全屏查看"] as TextPair,
  summaryExitFullView: ["Exit Full View", "退出全屏"] as TextPair,
  summaryFullViewContext: ["Weekly Report — Summary", "周报 — 汇总"] as TextPair,
  showMore: ["+ {n} more", "+ {n} 项更多"] as TextPair,
  showLess: ["Show less", "收起"] as TextPair,
  exportExcel: ["Export Excel", "导出 Excel"] as TextPair,
  exportLabel: ["Export", "导出"] as TextPair,
  exporting: ["Exporting…", "导出中…"] as TextPair,
  exportSuccess: ["Export downloaded.", "导出已下载。"] as TextPair,
  exportFailed: ["Export failed.", "导出失败。"] as TextPair,
  columns: ["Columns", "列显示"] as TextPair,
  filterColumns: ["Filter Column", "筛选列"] as TextPair,
  resetColumnWidths: ["Reset column widths", "重置列宽"] as TextPair,
  totalLines: ["Report Lines", "事项总数"] as TextPair,
  avgCompletion: ["Avg Completion", "平均完成度"] as TextPair,
  submittedAreas: ["Submitted", "已提交"] as TextPair,
  draftAreas: ["Draft", "草稿"] as TextPair,
  weeklyTrend: ["Weekly Trend", "周趋势"] as TextPair,
  byArea: ["By Area", "按区域"] as TextPair,
  recentLines: ["Recent Lines", "最近事项"] as TextPair,
  year: ["Year", "年份"] as TextPair,
  week: ["Week", "周"] as TextPair,
  area: ["Area", "区域"] as TextPair,
  subItem: ["Sub-item", "子项"] as TextPair,
  target: ["Target", "考核目标"] as TextPair,
  targetEn: ["Target (EN)", "考核目标（英）"] as TextPair,
  targetCn: ["Target (CN)", "考核目标（中）"] as TextPair,
  rate: ["Completion", "完成度"] as TextPair,
  summary: ["Last Week Summary", "上周总结"] as TextPair,
  summaryEn: ["Last Week Summary (EN)", "上周总结（英）"] as TextPair,
  summaryCn: ["Last Week Summary (CN)", "上周总结（中）"] as TextPair,
  plan: ["Next Week Plan", "下周计划"] as TextPair,
  planEn: ["Next Week Plan (EN)", "下周计划（英）"] as TextPair,
  planCn: ["Next Week Plan (CN)", "下周计划（中）"] as TextPair,
  status: ["Status", "状态"] as TextPair,
  draft: ["Draft", "草稿"] as TextPair,
  submitted: ["Submitted", "已提交"] as TextPair,
  submit: ["Submit Area", "提交本区域"] as TextPair,
  reopen: ["Reopen for Edit", "重新打开编辑"] as TextPair,
  reopenConfirm: [
    "Reopen this report? It will return to draft and can be edited again.",
    "重新打开此周报？状态将变为草稿，可再次编辑。",
  ] as TextPair,
  reopenSuccess: ["Report reopened.", "周报已重新打开。"] as TextPair,
  addLine: ["Add Line", "新增事项"] as TextPair,
  addReport: ["Add Report", "新增周报"] as TextPair,
  editReport: ["Edit Week Report", "编辑周报"] as TextPair,
  addReportSubtitle: [
    "Fill in the weekly progress details below.",
    "填写以下本周进展详情。",
  ] as TextPair,
  saveWeekReport: ["Save Week Report", "保存周报"] as TextPair,
  saveWeekSuccess: ["Week report saved.", "周报已保存。"] as TextPair,
  removeLine: ["Remove", "移除"] as TextPair,
  module: ["Module", "模块"] as TextPair,
  targetPlaceholderEn: [
    "Describe the target or objective for this item…",
    "Describe the target or objective for this item…",
  ] as TextPair,
  targetPlaceholderCn: [
    "描述此项的目标…",
    "描述此项的目标…",
  ] as TextPair,
  summaryPlaceholderEn: [
    "Summarize what was accomplished last week…",
    "Summarize what was accomplished last week…",
  ] as TextPair,
  summaryPlaceholderCn: [
    "总结上周完成的工作…",
    "总结上周完成的工作…",
  ] as TextPair,
  planPlaceholderEn: [
    "What is planned for next week?",
    "What is planned for next week?",
  ] as TextPair,
  planPlaceholderCn: [
    "下周计划是什么？",
    "下周计划是什么？",
  ] as TextPair,
  required: ["This field is required.", "此字段必填。"] as TextPair,
  errorTitle: ["Error", "错误"] as TextPair,
  ok: ["OK", "确定"] as TextPair,
  enHasChinese: [
    "English fields must not contain Chinese characters.",
    "英文内容不能包含中文字符。",
  ] as TextPair,
  cnNeedsChinese: [
    "Chinese fields must include Chinese characters.",
    "中文内容必须包含中文字符。",
  ] as TextPair,
  subItemRequired: ["Sub-item is required.", "子项必选。"] as TextPair,
  maxLinesReached: ["Maximum lines reached.", "已达行数上限。"] as TextPair,
  editLine: ["Edit Line", "编辑事项"] as TextPair,
  save: ["Save", "保存"] as TextPair,
  delete: ["Delete", "删除"] as TextPair,
  actions: ["Actions", "操作"] as TextPair,
  loading: ["Loading…", "加载中…"] as TextPair,
  noLines: ["No report lines for this selection.", "当前筛选暂无周报事项。"] as TextPair,
  errorLoad: ["Failed to load report data.", "加载周报数据失败。"] as TextPair,
  submitSuccess: ["Report submitted.", "周报已提交。"] as TextPair,
  saveSuccess: ["Report line saved.", "事项已保存。"] as TextPair,
  deleteSuccess: ["Report line deleted.", "事项已删除。"] as TextPair,
  weekRange: ["Sat – Fri", "周六 – 周五"] as TextPair,
  all: ["All", "全部"] as TextPair,
  searchPlaceholder: [
    "Search sub-items, targets, summaries…",
    "搜索子项、目标、总结…",
  ] as TextPair,
  achievement: ["Achievement", "完成度"] as TextPair,
  workCompletion: ["Work Completion", "工作完成度"] as TextPair,
  onTimeRate: ["On-Time Rate", "按时率"] as TextPair,
  projectProgress: ["Project Progress", "项目进度"] as TextPair,
  reportCompletion: ["Report Completion", "周报提交率"] as TextPair,
  reportLinesKpi: ["Report Lines", "事项数"] as TextPair,
  vsPreviousWeek: ["vs prev week", "较上周"] as TextPair,
  onTarget: ["On Target", "达标"] as TextPair,
  belowTarget: ["Below Target", "未达标"] as TextPair,
  aboveTarget: ["Above Target", "超额达标"] as TextPair,
  divisionPerformance: ["Division Performance", "事业部表现"] as TextPair,
  dailyWork: ["Daily Work", "日常工作"] as TextPair,
  projectOverview: ["Project Progress", "项目进展"] as TextPair,
  safetySection: ["Safety", "安全"] as TextPair,
  attentionRequired: ["Attention Required", "需关注事项"] as TextPair,
  noAttentionRequired: ["All on track this week.", "本周一切正常。"] as TextPair,
  planned: ["Planned", "计划"] as TextPair,
  completedLabel: ["Completed", "已完成"] as TextPair,
  inProgress: ["In Progress", "进行中"] as TextPair,
  notStarted: ["Not Started", "未开始"] as TextPair,
  activeProjects: ["Active Projects", "进行中项目"] as TextPair,
  onTrack: ["On Track", "正常"] as TextPair,
  atRisk: ["At Risk", "有风险"] as TextPair,
  delayed: ["Delayed", "滞后"] as TextPair,
  noActiveProjects: ["No active projects this week.", "本周无进行中项目。"] as TextPair,
  currentWeek: ["Current Week", "本周"] as TextPair,
  targetActual: ["Target vs Actual", "目标与实际"] as TextPair,
  openFindings: ["Open Findings", "待处理项"] as TextPair,
  apply: ["Apply", "应用"] as TextPair,
  previousWeek: ["Previous week", "上一周"] as TextPair,
  nextWeek: ["Next week", "下一周"] as TextPair,
  workTrend: ["Work Completion Trend", "工作完成度趋势"] as TextPair,
  projectTrend: ["Project Progress", "项目进度"] as TextPair,
} as const;

export type ReportTextKey = keyof typeof REPORT_TEXT;

export function reportEnText(key: ReportTextKey): string {
  return REPORT_TEXT[key][0];
}

export function reportCnText(key: ReportTextKey): string {
  return REPORT_TEXT[key][1];
}

export function reportText(key: ReportTextKey, lang: ReportLanguage): string {
  const pair = REPORT_TEXT[key];
  return lang === "cn" ? pair[1] : pair[0];
}

const AREA_COLORS: Record<string, string> = {
  MES: "#3b82f6",
  LOGISTICS: "#8b5cf6",
  IT: "#22c55e",
  SAFETY: "#f97316",
};

export function areaColor(code: string): string {
  return AREA_COLORS[code.toUpperCase()] ?? "#eab308";
}
