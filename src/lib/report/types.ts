export type ReportLanguage = "en" | "cn";

export type ReportArea = {
  id: number;
  code: string;
  nameEn: string;
  nameCn: string;
  sortOrder: number;
};

export type ReportSubItem = {
  id: number;
  areaId: number;
  nameEn: string;
  nameCn: string;
  sortOrder: number;
};

export type ReportWeek = {
  id: number;
  year: number;
  weekNumber: number;
  label: string;
  startsOn: string;
  endsOn: string;
  reportDueOn: string;
};

export type ReportSubmissionStatus = "draft" | "submitted";

export type ReportWeekSubmission = {
  id: number;
  weekId: number;
  areaId: number;
  status: ReportSubmissionStatus;
  submittedAt: string | null;
  submittedBySystemUserId?: number | null;
  submittedByLabel?: string | null;
};

export type ReportLine = {
  id: number;
  weekId: number;
  areaId: number;
  subItemId: number | null;
  subItemNameEn: string | null;
  subItemNameCn: string | null;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn: string | null;
  planCn: string | null;
  sortOrder: number;
  year?: number;
  weekNumber?: number;
  submissionStatus?: "draft" | "submitted" | null;
};

export type ReportLineRow = {
  id: number;
  week_id: number;
  area_id: number;
  sub_item_id: number | null;
  sub_item_name_en: string | null;
  sub_item_name_cn: string | null;
  work_target_en: string;
  work_target_cn: string;
  weekly_completion_rate: string | number | null;
  summary_en: string;
  summary_cn: string;
  plan_en: string | null;
  plan_cn: string | null;
  sort_order: number;
  year?: number;
  week_number?: number;
  area_code?: string;
  area_name_en?: string;
  area_name_cn?: string;
  submission_status?: ReportSubmissionStatus | null;
};

export type ReportAreaMetrics = {
  areaId: number;
  code: string;
  nameEn: string;
  nameCn: string;
  lineCount: number;
  avgCompletionRate: number;
  submittedWeeks: number;
};

export type ReportKpiSnapshot = {
  value: number;
  previousValue: number | null;
  delta: number | null;
};

export type ReportDivisionMetrics = {
  areaId: number;
  code: string;
  nameEn: string;
  nameCn: string;
  workCompletionRate: number;
  projectProgressRate: number | null;
  lineCount: number;
  submissionStatus: ReportSubmissionStatus | null;
};

export type ReportDailyWorkMetrics = {
  planned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
};

export type ReportProjectItem = {
  id: number;
  areaCode: string;
  nameEn: string;
  nameCn: string;
  progressRate: number;
  status: "on_track" | "at_risk" | "delayed";
};

export type ReportProjectMetrics = {
  activeCount: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  overallProgress: number | null;
  items: ReportProjectItem[];
};

export type ReportSafetyMetrics = {
  lineCount: number;
  avgCompletionRate: number;
  submissionStatus: ReportSubmissionStatus | null;
  openFindings: number;
};

export type ReportAttentionItem = {
  severity: "critical" | "warning" | "info";
  messageEn: string;
  messageCn: string;
};

export type ReportTrendRow = {
  label: string;
  year: number;
  weekNumber: number;
  avgRate: number;
  workCompletionRate: number;
  projectProgressRate: number | null;
  lineCount: number;
};

export type ReportOverviewMetrics = {
  year: number;
  weekNumber: number;
  weekLabel: string;
  weekStartsOn: string;
  weekEndsOn: string;
  achievement: ReportKpiSnapshot;
  workCompletion: ReportKpiSnapshot;
  projectProgress: ReportKpiSnapshot | null;
  onTimeRate: ReportKpiSnapshot;
  reportCompletion: ReportKpiSnapshot;
  reportLineCount: ReportKpiSnapshot;
  currentWeekStatus: "on_target" | "below_target" | "above_target";
  /** Legacy + dashboard card fields (scoped to selected week). */
  totalLines: number;
  totalWeeks: number;
  avgCompletionRate: number;
  submittedCount: number;
  draftCount: number;
  byArea: ReportAreaMetrics[];
  weeklyTrend: ReportTrendRow[];
  divisions: ReportDivisionMetrics[];
  dailyWork: ReportDailyWorkMetrics;
  projects: ReportProjectMetrics;
  safety: ReportSafetyMetrics;
  attention: ReportAttentionItem[];
  recentLines: ReportLine[];
};

export type ReportLineInput = {
  weekId: number;
  areaId: number;
  subItemId?: number | null;
  workTargetEn: string;
  workTargetCn: string;
  weeklyCompletionRate?: number | null;
  summaryEn: string;
  summaryCn: string;
  planEn?: string | null;
  planCn?: string | null;
  sortOrder?: number;
};
