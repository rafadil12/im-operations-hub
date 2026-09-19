export type ReportProjectHealth = "healthy" | "mild" | "serious";
export type ReportProjectLineStatus = "in_progress" | "completed";

export type ReportProjectLine = {
  id: number | null;
  sortOrder: number;
  target: string;
  mainTask: string;
  currentPriority: string;
  planStart: string | null;
  planEnd: string | null;
  health: ReportProjectHealth;
  lineStatus: ReportProjectLineStatus;
  progressRatio: number | null;
  pic: string;
  thisWeekProgress: string;
  nextWeekPlan: string;
};

export type ReportProjectReport = {
  id: number;
  reportDate: string;
  projectDepartment: string;
  reporterName: string;
  cycleLabel: string;
  year: number;
  weekNumber: number;
  lineCount: number;
  healthCounts: {
    healthy: number;
    mild: number;
    serious: number;
  };
  lines: ReportProjectLine[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReportProjectReportRow = {
  id: number;
  report_date: string;
  project_department: string;
  reporter_name: string;
  cycle_label: string;
  year: number;
  week_number: number;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  line_count?: number | string | null;
  healthy_count?: number | string | null;
  mild_count?: number | string | null;
  serious_count?: number | string | null;
};

export type ReportProjectLineRow = {
  id: number;
  report_id: number;
  sort_order: number;
  target: string;
  main_task: string | null;
  current_priority: string | null;
  plan_start: string | null;
  plan_end: string | null;
  health: ReportProjectHealth;
  line_status: ReportProjectLineStatus;
  progress_ratio: number | string | null;
  pic: string | null;
  this_week_progress: string | null;
  next_week_plan: string | null;
};

export type ReportProjectLineInput = {
  target: string;
  mainTask?: string | null;
  currentPriority?: string | null;
  planStart?: string | null;
  planEnd?: string | null;
  health: ReportProjectHealth;
  lineStatus: ReportProjectLineStatus;
  progressRatio?: number | null;
  pic?: string | null;
  thisWeekProgress?: string | null;
  nextWeekPlan?: string | null;
};

export type ReportProjectPayload = {
  reportDate: string;
  projectDepartment: string;
  reporterName: string;
  cycleLabel: string;
  year: number;
  weekNumber: number;
  lines: ReportProjectLineInput[];
};
