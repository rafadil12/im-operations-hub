"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";

type SubmissionStatus = "completed" | "not_submitted" | "not_applicable" | "case_found";
type ActivityType =
  | "training"
  | "routine-meeting"
  | "hse-tuesday"
  | "ert"
  | "fire-drill"
  | "monthly-meeting"
  | "five-s"
  | "potential-hazard"
  | "hazard-case"
  | "safety-ppt"
  | "reward-finding";

type UploadKind = "image-video" | "image" | "video-excel" | "before-after" | "ppt" | "none";

type FilePreview = {
  name: string;
  type: string;
  url: string;
  size: number;
};

type UserOption = {
  id: number;
  employee_no: string | null;
  name_cn: string | null;
  name_en: string | null;
};

type SubmissionDetail = {
  date: string;
  location?: string;
  description: string;
  descriptionEn?: string;
  descriptionCn?: string;
  pic: string;
  picEn?: string;
  picCn?: string;
  fileNames?: string[];
  fileUrls?: string[];
  filePreviews?: FilePreview[];
  verifiedBy?: string;
  verifiedAt?: string;
};

type WeeklyRecord = {
  week: number;
  startDate: string;
  endDate: string;
  training: SubmissionStatus;
  routineMeeting: SubmissionStatus;
  hseTuesday: SubmissionStatus;
  ert: SubmissionStatus;
  fiveS: SubmissionStatus;
  potentialHazard: SubmissionStatus;
  trainingData?: SubmissionDetail;
  routineMeetingData?: SubmissionDetail;
  hseTuesdayData?: SubmissionDetail;
  ertData?: SubmissionDetail;
  fiveSData?: SubmissionDetail;
  potentialHazardData?: SubmissionDetail;
};

type MonthlyRewardSubmission = {
  id: number;
  detail: SubmissionDetail;
  status: SubmissionStatus;
};

type MonthlyRecord = {
  fireDrill: SubmissionStatus;
  monthlyMeeting: SubmissionStatus;
  hazardCase: SubmissionStatus;
  safetyPpt: SubmissionStatus;
  rewardFinding: SubmissionStatus;
  fireDrillData?: SubmissionDetail;
  monthlyMeetingData?: SubmissionDetail;
  hazardCaseData?: SubmissionDetail;
  safetyPptData?: SubmissionDetail;
  rewardFindingData?: SubmissionDetail;
  rewardSubmissions: MonthlyRewardSubmission[];
  rewardCount: number;
};

type WeeklyDatabaseFile = {
  id: number;
  original_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  file_group: string;
};

type WeeklyDatabaseRow = {
  id: number;
  year: number;
  month: number;
  period_type: "weekly";
  week: number;
  activity_type: string;
  status: SubmissionStatus;
  submission_date: string | null;
  pic: string | null;
  pic_en?: string | null;
  pic_cn?: string | null;
  location: string | null;
  description: string | null;
  description_en?: string | null;
  description_cn?: string | null;
  file_name: string | null;
  file_url: string | null;
  files?: WeeklyDatabaseFile[];
};

type WeeklyStatusKey =
  | "training"
  | "routineMeeting"
  | "hseTuesday"
  | "ert"
  | "fiveS"
  | "potentialHazard";

type WeeklyDataKey =
  | "trainingData"
  | "routineMeetingData"
  | "hseTuesdayData"
  | "ertData"
  | "fiveSData"
  | "potentialHazardData";

type ActivityConfig = {
  id: ActivityType;
  recordKey?: WeeklyStatusKey;
  dataKey?: WeeklyDataKey;
  title: string;
  shortTitle: string;
  description: string;
  requirement: string;
  icon: string;
  frequency: string;
  uploadKind: UploadKind;
  weekly: boolean;
};


type SafetyLanguage = "en" | "cn";

const SAFETY_TEXT = {
  management: ["Safety Management", "安全管理"],
  submissionCenter: ["Safety Submission Center", "安全提交中心"],
  overviewDescription: [
    "Monitor all weekly safety obligations, HSE meetings every Tuesday, and monthly requirements.",
    "监控所有每周安全要求、每周二HSE会议以及每月安全要求。",
  ],
  previousMonth: ["Previous month", "上个月"],
  nextMonth: ["Next month", "下个月"],
  month: ["Month", "月份"],
  monthlyOverview: ["MONTHLY OVERVIEW", "月度总览"],
  safetyProgress: ["Safety Progress", "安全进度"],
  progressDescription: [
    "Progress is calculated from all weekly obligations and monthly targets. HSE Tuesday is counted through the checklist.",
    "进度根据所有每周要求和每月目标计算。每周二HSE通过检查清单统计。",
  ],
  completedRequirements: ["Completed requirements", "已完成要求"],
  weeklyControlsSummary: ["6 weekly controls × 4 weeks + monthly targets", "每周6项要求 × 4周 + 每月目标"],
  overallCompletion: ["Overall completion", "总体完成率"],
  weekly: ["Weekly", "每周"],
  monthly: ["Monthly", "每月"],
  hazardCase: ["Hazard Case", "安全隐患/案件"],
  weeklyControls: ["6 controls every week", "每周6项要求"],
  monthlyControls: ["Fire drill, meeting, cases, PPT & rewards", "消防演练、会议、案件、PPT及奖励"],
  hazardAttention: ["A case needs attention", "存在需要关注的案件"],
  noHazardThisMonth: ["No cases this month", "本月无案件"],
  weeklyControl: ["Weekly Control", "每周控制"],
  weeklyControlDescription: [
    "Monitor all weekly safety obligations. Click a week to open the work panel below.",
    "监控所有每周安全要求。点击某一周可打开下方工作面板。",
  ],
  progress: ["Progress", "进度"],
  weekLabel: ["Week", "周"],
  week: ["Week {week}", "第{week}周"],
  uncheck: ["Uncheck", "取消检查"],
  completed: ["Completed", "已完成"],
  pending: ["Pending", "待提交"],
  completedParticipated: ["Completed / Participated", "已完成 / 已参加"],
  notSubmitted: ["Not Submitted", "未提交"],
  weekSelected: ["Week {week} selected", "已选择第{week}周"],
  activity: ["Activity", "活动"],
  weekActivity: ["Week {week} Activity", "第{week}周活动"],
  actionDescription: [
    "Upload, Update, View, and Checklist are performed here.",
    "上传、更新、查看和检查均在此处完成。",
  ],
  completedShort: ["completed", "已完成"],
  files: ["files", "个文件"],
  file: ["file", "个文件"],
  noEvidence: ["No evidence", "无证据文件"],
  checklist: ["Checklist", "检查清单"],
  attendanceRecorded: ["Attendance recorded", "已记录参加情况"],
  noEvidenceShort: ["No evidence", "无证据"],
  view: ["View", "查看"],
  update: ["Update", "更新"],
  upload: ["Upload", "上传"],
  check: ["✓ Check", "✓ 检查"],
  evidenceLibrary: ["Evidence Library", "证据文件库"],
  evidenceDescription: [
    "Files already uploaded for Week {week}.",
    "第{week}周已上传的文件。",
  ],
  attachments: ["attachments", "个附件"],
  noEvidenceTitle: ["No evidence yet", "暂无证据"],
  evidenceWillAppear: ["Files will appear after upload.", "上传后文件将显示在这里。"],
  weekSnapshot: ["Week Snapshot", "每周快照"],
  snapshotDescription: ["Summary of the selected week.", "当前所选周的摘要。"],
  lastUpload: ["Last Upload", "最后上传"],
  monthlyRequirements: ["Monthly Requirements", "每月要求"],
  monthlyRequirementsDescription: [
    "Monthly requirements: fire drill, monthly meeting, hazard cases, Safety PPT, and 2 rewarded findings.",
    "每月要求：消防演练、月度会议、安全隐患/案件、安全PPT以及2项奖励发现。",
  ],
  submitted: ["submitted", "已提交"],
  requirementRules: ["Requirement Rules", "要求规则"],
  requirementRulesDescription: [
    "Summary of upload rules according to the requirements you defined.",
    "根据你设定的要求汇总上传规则。",
  ],
  checklistOnly: ["Checklist only", "仅检查清单"],
  photoVideo: ["Photo + Video", "照片 + 视频"],
  beforeAfter: ["Before + After photos", "前后对比 照片"],
  videoExcel: ["Video + Excel", "视频 + Excel"],
  pptFile: ["PPT file", "PPT文件"],
  date: ["Date", "日期"],
  pic: ["PIC", "负责人"],
  location: ["Location", "地点"],
  description: ["Description", "描述"],
  descriptionEnglish: ["Description (English)", "描述（英文）"],
  descriptionChinese: ["Description (Chinese)", "描述（中文）"],
  describeActivityChinese: ["Describe the activity or finding in Chinese...", "请用中文描述活动或发现..."],
  attachment: ["Attachment", "附件"],
  enterPic: ["Enter PIC", "输入负责人"],
  enterLocation: ["Enter location", "输入地点"],
  describeActivity: ["Describe the activity or finding...", "描述活动或发现..."],
  clickUpload: ["Click to upload", "点击上传"],
  canUploadMany: [
    "You can upload multiple files at once (photos, videos, Excel, PPT according to the requirement).",
    "可以一次上传多个文件（照片、视频、Excel、PPT，按要求上传）。",
  ],
  uploadBeforeAfter: ["Upload 2 photos: BEFORE + AFTER", "上传2张照片：前后对比"],
  uploadVideoExcel: ["Upload video and Excel", "上传视频和Excel"],
  uploadPpt: ["Upload PPT file", "上传PPT文件"],
  cancel: ["Cancel", "取消"],
  submit: ["Submit", "提交"],
  submitting: ["Submitting...", "提交中..."],
  setGreenNoCase: ["Set GREEN · No Case", "设为绿色 · 无案件"],
  noCaseQuestion: ["No case?", "没有案件？"],
  noCaseHelp: [
    "Leave attachment empty and submit. The system will record this month as GREEN · No Case.",
    "附件留空后提交，系统将本月记录为 GREEN · 无案件。",
  ],
  hseHelp: [
    "HSE meeting every Tuesday only needs a checklist. No file upload is required.",
    "每周二HSE会议只需进行检查，不需要上传文件。",
  ],
  submissionDate: ["Submission Date", "提交日期"],
  noAttachment: ["No attachment", "无附件"],
  attachmentsTitle: ["Attachments", "附件"],
  attachmentsPreview: ["Preview uploaded photos, videos and documents.", "预览已上传的照片、视频和文档。"],
  powerpointPreviewHelp: [
    "PowerPoint preview will work automatically when the file is stored at an accessible HTTP/HTTPS URL. You can open the uploaded file now.",
    "当文件存储在可访问的 HTTP/HTTPS 地址时，PowerPoint 将自动预览。您现在可以打开已上传的文件。",
  ],
  excelPreviewHelp: [
    "Excel files are shown as document attachments. You can open the uploaded file now.",
    "Excel 文件将作为文档附件显示。您现在可以打开已上传的文件。",
  ],
  noBrowserPreview: [
    "This file type does not have an in-browser preview.",
    "此文件类型不支持浏览器内预览。",
  ],
  noPreview: ["No preview available", "暂无预览"],
  noStoredPreview: ["This submission has no stored preview files.", "此提交没有已存储的预览文件。"],
  submissionVerified: ["✓ Submission Verified", "✓ 提交已验证"],
  close: ["Close", "关闭"],
  open: ["Open", "打开"],
  image: ["Image", "图片"],
  video: ["Video", "视频"],
  pdf: ["PDF", "PDF"],
  powerpoint: ["PowerPoint", "PowerPoint"],
  excel: ["Excel", "Excel"],
  noCaseGreen: ["No Case · GREEN", "无案件 · 绿色"],
  caseFoundRed: ["CASE FOUND · RED", "发现案件 · 红色"],
  target: ["Target", "目标"],
  defaultSafetyDescription: ["Safety documentation has been submitted.", "安全资料已提交。"],
  noCaseDefault: ["No hazard finding or case was found this month.", "本月没有发现安全隐患或案件。"],
  loadingDatabase: ["Loading Safety data from database...", "正在从数据库加载安全数据..."],
  weeklyLabel: ["Weekly", "每周"],
  tuesday: ["Tuesday", "星期二"],
} as const;

function safetyText(key: keyof typeof SAFETY_TEXT, language: SafetyLanguage): string {
  const pair = SAFETY_TEXT[key];
  return pair[language === "cn" ? 1 : 0];
}

function formatSafetyText(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}

const ACTIVITY_CN: Record<ActivityType, Partial<Pick<ActivityConfig, "title" | "shortTitle" | "description" | "requirement" | "frequency">>> = {
  training: {
    title: "安全培训记录",
    shortTitle: "培训",
    description: "每周进行一次安全培训并提交相关记录。",
    requirement: "每周1次",
    frequency: "每周",
  },
  "routine-meeting": {
    title: "BBS行为观察",
    shortTitle: "BBS",
    description: "每周进行一次BBS行为观察，并提交照片和视频资料。",
    requirement: "每周1次",
    frequency: "每周",
  },
  "hse-tuesday": {
    title: "HSE例会",
    shortTitle: "HSE周二",
    description: "每周二召开HSE例会。",
    requirement: "每周二",
    frequency: "星期二",
  },
  ert: {
    title: "ERT报告",
    shortTitle: "ERT",
    description: "每周提交一次ERT报告，包括视频和Excel文件。",
    requirement: "每周1次",
    frequency: "每周",
  },
  "five-s": {
    title: "5S",
    shortTitle: "5S",
    description: "每周提交一次改善前后的现场照片。",
    requirement: "每周1次",
    frequency: "每周",
  },
  "potential-hazard": {
    title: "潜在危险",
    shortTitle: "潜在危险",
    description: "每周提交一次潜在危险改善前后的照片。",
    requirement: "每周1次",
    frequency: "每周",
  },
  "fire-drill": {
    title: "消防演练",
    shortTitle: "消防演练",
    description: "每月进行一次消防演练。",
    requirement: "每月1次",
    frequency: "每月",
  },
  "monthly-meeting": {
    title: "月度会议",
    shortTitle: "月度会议",
    description: "月度安全会议并提交照片和视频资料。",
    requirement: "每月1次",
    frequency: "每月",
  },
  "hazard-case": {
    title: "安全隐患 / 案件",
    shortTitle: "安全案件",
    description: "如果本月发现案件，状态显示为红色；如果没有案件，则保持绿色。",
    requirement: "每月监控",
    frequency: "每月",
  },
  "safety-ppt": {
    title: "安全PPT",
    shortTitle: "安全PPT",
    description: "每月提交一次安全PPT。",
    requirement: "每月1次",
    frequency: "每月",
  },
  "reward-finding": {
    title: "奖励发现",
    shortTitle: "奖励",
    description: "每月目标为2项奖励发现，并提交改善前后的照片。",
    requirement: "每月2次",
    frequency: "每月",
  },
};

function localizeActivity(activity: ActivityConfig, language: SafetyLanguage): ActivityConfig {
  if (language !== "cn") return activity;
  return { ...activity, ...ACTIVITY_CN[activity.id] };
}


const WEEKLY_ACTIVITIES: ActivityConfig[] = [
  {
  id: "training",
  recordKey: "training",
  dataKey: "trainingData",
  title: "Safety Training Records",
  shortTitle: "Training",
  description: "Documentation of safety training conducted once a week.",
  requirement: "1x / week",
  frequency: "Weekly",
  icon: "🎓",
  uploadKind: "image-video",
  weekly: true,
},

{
  id: "hse-tuesday",
  recordKey: "hseTuesday",
  dataKey: "hseTuesdayData",
  title: "Regular HSE Meeting",
  shortTitle: "HSE Meeting",
  description: "Regular HSE meeting held every Tuesday.",
  requirement: "Every Tuesday",
  frequency: "Tuesday",
  icon: "☑️",
  uploadKind: "image",
  weekly: true,
},

{
  id: "ert",
  recordKey: "ert",
  dataKey: "ertData",
  title: "ERT Report",
  shortTitle: "ERT",
  description: "ERT report submitted once a week with video and Excel file documentation.",
  requirement: "1x / week",
  frequency: "Weekly",
  icon: "🚨",
  uploadKind: "video-excel",
  weekly: true,
},

{
  id: "five-s",
  recordKey: "fiveS",
  dataKey: "fiveSData",
  title: "5S",
  shortTitle: "5S",
  description: "Documentation of before-and-after conditions once a week.",
  requirement: "1x / week",
  frequency: "Weekly",
  icon: "🧹",
  uploadKind: "before-after",
  weekly: true,
},

{
  id: "potential-hazard",
  recordKey: "potentialHazard",
  dataKey: "potentialHazardData",
  title: "Potential Hazards",
  shortTitle: "Potential Hazards",
  description: "Documentation of potential hazards before and after corrective actions once a week.",
  requirement: "1x / week",
  frequency: "Weekly",
  icon: "⚠️",
  uploadKind: "before-after",
  weekly: true,
},

{
  id: "routine-meeting",
  recordKey: "routineMeeting",
  dataKey: "routineMeetingData",
  title: "BBS Behavior Observation",
  shortTitle: "BBS",
  description: "BBS behavior observation conducted once a week with photo and video documentation.",
  requirement: "1x / week",
  frequency: "Weekly",
  icon: "👀",
  uploadKind: "image-video",
  weekly: true,
},
];

const MONTHLY_ACTIVITIES: ActivityConfig[] = [
  {
  id: "fire-drill",
  title: "Fire Drill Simulation",
  shortTitle: "Fire Drill",
  description: "Fire drill simulation conducted once a month.",
  requirement: "1x / month",
  frequency: "Monthly",
  icon: "🔥",
  uploadKind: "image-video",
  weekly: false,
},

{
  id: "monthly-meeting",
  title: "Monthly Safety Meeting",
  shortTitle: "Monthly Meeting",
  description: "Monthly safety meeting with photo and video documentation.",
  requirement: "1x / month",
  frequency: "Monthly",
  icon: "👥",
  uploadKind: "image-video",
  weekly: false,
},

{
  id: "hazard-case",
  title: "Hazard Finding / Case",
  shortTitle: "Hazard Case",
  description: "If a case occurs during the month, the status turns red. If there are no cases, the status remains green.",
  requirement: "Monthly Monitoring",
  frequency: "Monthly",
  icon: "🛑",
  uploadKind: "image-video",
  weekly: false,
},

{
  id: "safety-ppt",
  title: "Safety PPT",
  shortTitle: "Safety PPT",
  description: "Safety presentation conducted once a month.",
  requirement: "1x / month",
  frequency: "Monthly",
  icon: "📊",
  uploadKind: "ppt",
  weekly: false,
},

{
  id: "reward-finding",
  title: "Reward-Based Finding",
  shortTitle: "Reward Finding",
  description: "Target of two reward-based findings each month with before-and-after photos.",
  requirement: "2x / month",
  frequency: "Monthly",
  icon: "🏆",
  uploadKind: "before-after",
  weekly: false,
},
];

const INITIAL_MONTHLY_RECORD: MonthlyRecord = {
  fireDrill: "not_submitted",
  monthlyMeeting: "not_submitted",
  hazardCase: "not_applicable",
  safetyPpt: "not_submitted",
  rewardFinding: "not_submitted",
  rewardSubmissions: [],
  rewardCount: 0,
};

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "border-success/20 bg-success/10 text-success" },
  not_submitted: { label: "Not Submitted", className: "border-danger/20 bg-danger/10 text-danger" },
  not_applicable: { label: "No Case", className: "border-success/20 bg-success/10 text-success" },
  case_found: { label: "Case Found", className: "border-danger/30 bg-danger/10 text-danger" },
};


function getSafetyStatusLabel(status: SubmissionStatus, language: SafetyLanguage): string {
  const labels: Record<SubmissionStatus, [string, string]> = {
    completed: ["Completed", "已完成"],
    not_submitted: ["Not Submitted", "未提交"],
    not_applicable: ["No Case", "无案件"],
    case_found: ["Case Found", "发现案件"],
  };
  return labels[status][language === "cn" ? 1 : 0];
}

function getActivityRecordKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.recordKey;
}

function getActivityDataKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.dataKey;
}

function formatDate(
  value: string,
  language: "en" | "cn",
) {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00`,
  );

  return date.toLocaleDateString(
    language === "cn"
      ? "zh-CN"
      : "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function convertDisplayDateToInput(value: string) {
  if (!value) return "2026-08-18";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "2026-08-18";
  return date.toISOString().slice(0, 10);
}

function uiActivityToDatabaseActivity(
  activityType: ActivityType,
): string {
  const map: Record<string, string> = {
    // WEEKLY
    training: "training",
    "routine-meeting": "routine_meeting",
    "hse-tuesday": "hse_tuesday",
    ert: "ert",
    "five-s": "five_s",
    "potential-hazard": "potential_hazard",

    // MONTHLY - HARUS SAMA DENGAN DATABASE
    "monthly-meeting": "monthly_meeting",
    "fire-drill": "fire_drill",
    "hazard-case": "safety_case",
    "safety-ppt": "monthly_ppt",
    "reward-finding": "reward_finding",
  };

  return map[activityType] ?? activityType;
}

function databaseActivityToUiActivity(
  activityType: string,
): ActivityType {
  const map: Record<string, ActivityType> = {
    routine_meeting: "routine-meeting",
    hse_tuesday: "hse-tuesday",
    five_s: "five-s",
    potential_hazard: "potential-hazard",
  };

  return map[activityType] ?? (activityType as ActivityType);
}


function getCompletedCount(
  record: WeeklyRecord,
): number {
  return WEEKLY_ACTIVITIES.filter((activity) => {
    const status =
      record[
        activity.recordKey!
      ] as SubmissionStatus;

    return (
      status === "completed" ||
      status === "not_applicable"
    );
  }).length;
}

function getWeekFileCount(
  record: WeeklyRecord,
): number {
  return WEEKLY_ACTIVITIES.reduce(
    (total, activity) => {
      const detail =
        record[
          activity.dataKey!
        ] as SubmissionDetail | undefined;

      return (
        total +
        (detail?.filePreviews?.length ??
          detail?.fileNames?.length ??
          0)
      );
    },
    0,
  );
}


type WeekEvidenceItem = {
  activity: ActivityConfig;
  detail: SubmissionDetail;
  file: FilePreview;
};

function getActivityFileTypes(
  detail: SubmissionDetail | undefined, language: SafetyLanguage = "en",
): string {
  if (!detail) return "—";

  const files = detail.filePreviews ?? [];

  const kinds = Array.from(
  new Set(
    files.map((file) =>
      getReadableFileKind(
        getPreviewKind(
          file.name,
          file.type,
        ),
        language,
      ),
    ),
  ),
);
  return kinds.join(" • ");
}

function getWeekEvidence(
  record: WeeklyRecord,
): WeekEvidenceItem[] {
  const result: WeekEvidenceItem[] = [];

  for (const activity of WEEKLY_ACTIVITIES) {
    const detail = record[
      activity.dataKey!
    ] as SubmissionDetail | undefined;

    if (!detail?.filePreviews?.length) {
      continue;
    }

    for (const file of detail.filePreviews) {
      result.push({
        activity,
        detail,
        file,
      });
    }
  }

  return result;
}

type MonthlyEvidenceItem = {
  activity: ActivityConfig;
  detail: SubmissionDetail;
  file: FilePreview;
  /** For Reward Finding, this identifies which of the 2 submissions owns the file. */
  submissionId?: number;
  submissionNumber?: number;
  sourceLabel?: string;
};

function getMonthlyEvidence(record: MonthlyRecord): MonthlyEvidenceItem[] {
  const result: MonthlyEvidenceItem[] = [];

  // Monthly activities biasa hanya punya 1 submission per bulan.
  const dataByActivity: Record<
    ActivityType,
    SubmissionDetail | undefined
  > = {
    "fire-drill": record.fireDrillData,
    "monthly-meeting": record.monthlyMeetingData,
    "hazard-case": record.hazardCaseData,
    "safety-ppt": record.safetyPptData,
    "reward-finding": undefined,
    training: undefined,
    "routine-meeting": undefined,
    "hse-tuesday": undefined,
    ert: undefined,
    "five-s": undefined,
    "potential-hazard": undefined,
  };

  for (const activity of MONTHLY_ACTIVITIES) {
    if (activity.id === "reward-finding") continue;

    const detail = dataByActivity[activity.id];
    if (!detail?.filePreviews?.length) continue;

    for (const file of detail.filePreviews) {
      const kind = getPreviewKind(file.name, file.type);
      if (kind !== "image" && kind !== "ppt") continue;
      result.push({
        activity,
        detail,
        file,
        sourceLabel: activity.shortTitle,
      });
    }
  }

  // Reward Finding adalah pengecualian: maksimal 2 submission.
  // PENTING: semua submission dibaca, bukan hanya rewardFindingData/latestReward.
  const rewardActivity = MONTHLY_ACTIVITIES.find(
    (activity) => activity.id === "reward-finding",
  );

  if (rewardActivity) {
    const submissions = [...record.rewardSubmissions].sort(
      (a, b) => a.id - b.id,
    );

    submissions.forEach((submission, submissionIndex) => {
      const detail = submission.detail;
      if (!detail?.filePreviews?.length) return;

      const submissionNumber = submissionIndex + 1;
      const sourceLabel =
        `Reward Finding #${submissionNumber}`;

      for (const file of detail.filePreviews) {
        const kind = getPreviewKind(file.name, file.type);
        if (kind !== "image" && kind !== "ppt") continue;

        result.push({
          activity: rewardActivity,
          detail,
          file,
          submissionId: submission.id,
          submissionNumber,
          sourceLabel,
        });
      }
    });
  }

  return result;
}

function getMonthlyEvidenceCount(record: MonthlyRecord): number {
  return getMonthlyEvidence(record).length;
}

/**
 * The card only has 6 preview slots. Keep the full evidence array untouched,
 * but make sure Reward Finding #1 and #2 are not hidden behind other files.
 */
function getMonthlyEvidencePreviewItems(
  evidence: MonthlyEvidenceItem[],
): MonthlyEvidenceItem[] {
  if (evidence.length <= 6) return evidence;

  const selected: MonthlyEvidenceItem[] = [];
  const used = new Set<MonthlyEvidenceItem>();

  // Guarantee at least one visible preview from each Reward Finding submission.
  const rewardSubmissionNumbers = [1, 2];
  for (const number of rewardSubmissionNumbers) {
    const item = evidence.find(
      (entry) => entry.submissionNumber === number,
    );

    if (item && !used.has(item)) {
      selected.push(item);
      used.add(item);
    }
  }

  // Fill the remaining preview slots in the normal Monthly evidence order.
  for (const item of evidence) {
    if (selected.length >= 6) break;
    if (used.has(item)) continue;
    selected.push(item);
    used.add(item);
  }

  return selected;
}

function getWeekImageCount(
  record: WeeklyRecord,
): number {
  return getWeekEvidence(record).filter(
    ({ file }) =>
      getPreviewKind(file.name, file.type) === "image",
  ).length;
}

function getWeekVideoCount(
  record: WeeklyRecord,
): number {
  return getWeekEvidence(record).filter(
    ({ file }) =>
      getPreviewKind(file.name, file.type) === "video",
  ).length;
}

function getWeekDocumentCount(
  record: WeeklyRecord,
): number {
  return getWeekEvidence(record).filter(
    ({ file }) => {
      const kind = getPreviewKind(file.name, file.type);

      return (
        kind === "excel" ||
        kind === "ppt" ||
        kind === "pdf"
      );
    },
  ).length;
}

function getWeekOtherCount(
  record: WeeklyRecord,
): number {
  return getWeekEvidence(record).filter(
    ({ file }) =>
      getPreviewKind(file.name, file.type) === "other",
  ).length;
}

function getLastSubmissionDate(
  record: WeeklyRecord,
): string {
  const dates = WEEKLY_ACTIVITIES.map(
    (activity) => {
      const detail = record[
        activity.dataKey!
      ] as SubmissionDetail | undefined;

      return detail?.date;
    },
  ).filter(
    (date): date is string => Boolean(date),
  );

  return dates.length > 0
    ? dates.sort().at(-1) ?? "—"
    : "—";
}

export default function SafetyManagementPage() {
  const { t } = useLang();
  const safetyLanguage: SafetyLanguage = t.safety.management === "安全管理" ? "cn" : "en";
  const [records, setRecords] = useState<WeeklyRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecord>(INITIAL_MONTHLY_RECORD);
  const [selectedWeek, setSelectedWeek] = useState(4);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedMonthlySubmissionId, setSelectedMonthlySubmissionId] = useState<number | null>(null);
  const [viewDetail, setViewDetail] = useState<{ title: string; detail: SubmissionDetail; status: SubmissionStatus } | null>(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);
  const [showMonthlyEvidenceGallery, setShowMonthlyEvidenceGallery] = useState(false);
  const [selectedMonthlyEvidenceIndex, setSelectedMonthlyEvidenceIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionCn, setDescriptionCn] = useState("");
  const description = descriptionEn;
  const [location, setLocation] = useState("");
  const [pic, setPic] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bulan aktif untuk seluruh dashboard.
  const initialDate = new Date();
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [safetyPoints, setSafetyPoints] = useState(0);

  const safetyPointsStorageKey = `safety-points-${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(safetyPointsStorageKey);
      setSafetyPoints(saved !== null ? Number(saved) || 0 : 0);
    } catch (error) {
      console.error("LOAD SAFETY POINTS ERROR:", error);
      setSafetyPoints(0);
    }
  }, [safetyPointsStorageKey]);

  function handleSafetyPointsChange(value: string) {
    const nextValue = Math.max(0, Number(value) || 0);
    setSafetyPoints(nextValue);

    try {
      window.localStorage.setItem(
        safetyPointsStorageKey,
        String(nextValue),
      );
    } catch (error) {
      console.error("SAVE SAFETY POINTS ERROR:", error);
    }
  }

  const monthLabel = new Date(
    selectedYear,
    selectedMonth - 1,
    1,
  ).toLocaleDateString(safetyLanguage === "cn" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
  });

  function changeMonth(offset: number) {
    const next = new Date(
      selectedYear,
      selectedMonth - 1 + offset,
      1,
    );

    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth() + 1);
    setSelectedWeek(1);
    setSelectedActivity(null);
    setShowUploadModal(false);
    setViewDetail(null);
  }

  const weeklyTotal = records.length * WEEKLY_ACTIVITIES.length;
  const weeklyCompleted = useMemo(
    () => records.reduce((sum, r) => sum + WEEKLY_ACTIVITIES.filter((a) => r[a.recordKey!] === "completed").length, 0),
    [records],
  );
  const weeklyPending = weeklyTotal - weeklyCompleted;
  const monthlyTargets = 1 + 1 + 1 + 1 + 2;
  const monthlyDone =
    (monthly.fireDrill === "completed" ? 1 : 0) +
    (monthly.monthlyMeeting === "completed" ? 1 : 0) +
    (monthly.hazardCase === "case_found"
      ? -1
      : monthly.hazardCase === "not_applicable"
        ? 1
        : 0) +
    (monthly.safetyPpt === "completed" ? 1 : 0) +
    Math.min(monthly.rewardCount, 2);
  const overallTarget = weeklyTotal + monthlyTargets;
  const overallDone = weeklyCompleted + monthlyDone;
  const overallRate = overallTarget ? Math.round((overallDone / overallTarget) * 100) : 0;
  const selectedWeekRecord = records.find((r) => r.week === selectedWeek) ?? null;
  const evidenceForGallery = selectedWeekRecord ? getWeekEvidence(selectedWeekRecord) : [];
  const monthlyEvidenceForGallery = getMonthlyEvidence(monthly);
  const hazardCaseActive = monthly.hazardCase === "case_found";

  const loadWeeklyData = useCallback(async () => {
    try {
      setLoading(true);

      const year = selectedYear;
      const month = selectedMonth;

      const response = await fetch(
        `/api/safety/weekly?year=${year}&month=${month}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load weekly safety data.",
        );
      }

      const rows: WeeklyDatabaseRow[] = result.data ?? [];

      // Database is the SINGLE source of truth.
      // The four week rows below are only the display structure;
      // every status/detail comes from safety_submissions.
      const weeks: WeeklyRecord[] = Array.from(
        { length: 4 },
        (_, index) => {
          const week = index + 1;
          const startDay = index * 7 + 1;
          const lastDay = new Date(year, month, 0).getDate();
          const endDay = Math.min(startDay + 6, lastDay);

          const record: WeeklyRecord = {
            week,
            startDate: new Date(
              year,
              month - 1,
              startDay,
            ).toLocaleDateString(safetyLanguage === "cn" ? "zh-CN": "en-GB", {
              day: "2-digit",
              month: "short",
            }),
            endDate: new Date(
              year,
              month - 1,
              endDay,
            ).toLocaleDateString(safetyLanguage === "cn"? "zh-CN": "en-GB", {
              day: "2-digit",
              month: "short",
            }),
            training: "not_submitted",
            routineMeeting: "not_submitted",
            hseTuesday: "not_submitted",
            ert: "not_submitted",
            fiveS: "not_submitted",
            potentialHazard: "not_submitted",
          };

          const weekRows = rows.filter(
            (row) => Number(row.week) === week,
          );

          for (const row of weekRows) {
            const uiActivity = databaseActivityToUiActivity(
              row.activity_type,
            );

            const activity = WEEKLY_ACTIVITIES.find(
              (item) => item.id === uiActivity,
            );

            if (!activity?.recordKey) continue;

            // Status comes directly from MySQL.
            record[activity.recordKey] = row.status;

            if (activity.dataKey) {
              const databaseFiles = row.files ?? [];

              const filePreviews: FilePreview[] =
                databaseFiles.length > 0
                  ? databaseFiles.map((file) => ({
                      name: file.original_name,
                      type:
                        file.mime_type ||
                        getFileMimeType(file.original_name),
                      url: file.file_url,
                      size: Number(file.file_size) || 0,
                    }))
                  : row.file_url
                    ? [
                        {
                          name:
                            row.file_name ??
                            "Attachment",
                          type: getFileMimeType(
                            row.file_name ?? "",
                          ),
                          url: row.file_url,
                          size: 0,
                        },
                      ]
                    : [];

              record[activity.dataKey] = {
                date: row.submission_date
                  ? formatDate(row.submission_date, safetyLanguage,)
                  : "—",
                location: row.location ?? undefined,
                description:
                  row.description_en ||
                  row.description_cn ||
                  row.description ||
                  "Dokumentasi safety telah diinput.",
                descriptionEn:
                  row.description_en ||
                  row.description ||
                  "",
                descriptionCn:
                  row.description_cn ||
                  row.description ||
                  "",
                pic:
                  safetyLanguage === "cn"
                    ? row.pic_cn || row.pic_en || row.pic || "—"
                    : row.pic_en || row.pic_cn || row.pic || "—",
                picEn: row.pic_en || row.pic || "",
                picCn: row.pic_cn || row.pic_en || row.pic || "",
                fileNames: filePreviews.map(
                  (file) => file.name,
                ),
                fileUrls: filePreviews.map(
                  (file) => file.url,
                ),
                filePreviews,
              };
            }
          }

          return record;
        },
      );

      setRecords(weeks);
    } catch (error) {
      console.error(
        "Failed to load weekly safety data:",
        error,
      );

      setRecords([]);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data safety dari database.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth,safetyLanguage]);
  const loadMonthlyData = useCallback(async () => {
  try {
    const year = selectedYear;
    const month = selectedMonth;

    const response = await fetch(
      `/api/safety/monthly?year=${year}&month=${month}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          "Gagal mengambil data Monthly dari database.",
      );
    }

    const rows =
      result.data ?? [];

    /*
     * Default Monthly.
     * Tidak menggunakan dummy data.
     */
    const next: MonthlyRecord = {
      fireDrill: "not_submitted",
      monthlyMeeting: "not_submitted",
      hazardCase: "not_applicable",
      safetyPpt: "not_submitted",
      rewardFinding: "not_submitted",

      fireDrillData: undefined,
      monthlyMeetingData: undefined,
      hazardCaseData: undefined,
      safetyPptData: undefined,
      rewardFindingData: undefined,
      rewardSubmissions: [],

      rewardCount: 0,
    };

    /*
     * Ambil record terbaru untuk
     * setiap activity.
     */
    const latestByActivity =
      new Map<string, any>();

    for (const row of rows) {
      const old =
        latestByActivity.get(
          row.activity_type,
        );

      if (
        !old ||
        Number(row.id) >
          Number(old.id)
      ) {
        latestByActivity.set(
          row.activity_type,
          row,
        );
      }
    }

    /*
     * Buat detail submission
     */
    const buildDetail = (
      row: any,
    ): SubmissionDetail => {
      const files =
        Array.isArray(row.files)
          ? row.files
          : [];

      const previews: FilePreview[] =
        files.length > 0
          ? files.map(
              (file: any) => ({
                name:
                  file.original_name ||
                  file.name ||
                  "Attachment",

                type:
                  file.mime_type ||
                  getFileMimeType(
                    file.original_name ||
                      file.name ||
                      "",
                  ),

                url:
                  file.file_url ||
                  file.url ||
                  "",

                size:
                  Number(
                    file.file_size ||
                      file.size ||
                      0,
                  ),
              }),
            )
          : row.file_url
            ? [
                {
                  name:
                    row.file_name ||
                    "Attachment",

                  type:
                    getFileMimeType(
                      row.file_name ||
                        "",
                    ),

                  url:
                    row.file_url,

                  size: 0,
                },
              ]
            : [];

      return {
        date:
          row.submission_date
            ? formatDate(
                row.submission_date, safetyLanguage,
              )
            : "—",

        location:
          row.location ||
          undefined,

        description:
          row.description_en ||
          row.description_cn ||
          row.description ||
          "Dokumentasi safety telah diinput.",

        descriptionEn:
          row.description_en ||
          row.description ||
          "",

        descriptionCn:
          row.description_cn ||
          row.description ||
          "",

        pic:
          safetyLanguage === "cn"
            ? row.pic_cn || row.pic_en || row.pic || "—"
            : row.pic_en || row.pic_cn || row.pic || "—",

        picEn:
          row.pic_en ||
          row.pic ||
          "",

        picCn:
          row.pic_cn ||
          row.pic_en ||
          row.pic ||
          "",

        fileNames:
          previews.map(
            (file) =>
              file.name,
          ),

        fileUrls:
          previews.map(
            (file) =>
              file.url,
          ),

        filePreviews:
          previews,

        verifiedBy:
          row.verified_by ||
          undefined,

        verifiedAt:
          row.verified_at ||
          undefined,
      };
    };

    /*
     * FIRE DRILL
     */
    const fireDrill =
      latestByActivity.get(
        "fire_drill",
      );

    if (fireDrill) {
      next.fireDrill =
        fireDrill.status;

      next.fireDrillData =
        buildDetail(
          fireDrill,
        );
    }

    /*
     * MONTHLY MEETING
     */
    const monthlyMeeting =
      latestByActivity.get(
        "monthly_meeting",
      );

    if (monthlyMeeting) {
      next.monthlyMeeting =
        monthlyMeeting.status;

      next.monthlyMeetingData =
        buildDetail(
          monthlyMeeting,
        );
    }

    /*
     * SAFETY CASE
     */
    const safetyCase =
      latestByActivity.get(
        "safety_case",
      );

    if (safetyCase) {
      next.hazardCase =
        safetyCase.status;

      next.hazardCaseData =
        buildDetail(
          safetyCase,
        );
    }

    /*
     * MONTHLY PPT
     */
    const monthlyPpt =
      latestByActivity.get(
        "monthly_ppt",
      );

    if (monthlyPpt) {
      next.safetyPpt =
        monthlyPpt.status;

      next.safetyPptData =
        buildDetail(
          monthlyPpt,
        );
    }

    /*
     * REWARD FINDING
     *
     * Maksimal 2 record per bulan.
     */
    const rewardRows =
      rows
        .filter(
          (row: any) =>
            row.activity_type ===
            "reward_finding",
        )
        .sort(
          (a: any, b: any) =>
            Number(a.id) -
            Number(b.id),
        );

    next.rewardCount =
      rewardRows.filter(
        (row: any) =>
          row.status ===
          "completed",
      ).length;

    next.rewardSubmissions = rewardRows.map((row: any) => ({
      id: Number(row.id),
      status: row.status as SubmissionStatus,
      detail: buildDetail(row),
    }));

    const latestReward =
      rewardRows[
        rewardRows.length - 1
      ];

    if (latestReward) {
      next.rewardFinding =
        latestReward.status;

      next.rewardFindingData =
        buildDetail(
          latestReward,
        );
    }

    /*
     * Simpan hasil database
     */
    setMonthly(next);
  } catch (error) {
    console.error(
      "LOAD MONTHLY DATA ERROR:",
      error,
    );

    /*
     * Jangan membuat dummy data.
     * Kalau API gagal, state tidak
     * dipalsukan.
     */
  }
}, [selectedYear, selectedMonth,safetyLanguage]);

  useEffect(() => {
    void loadWeeklyData();
    void loadMonthlyData();
  }, [loadWeeklyData, loadMonthlyData]);
    useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);

        const response = await fetch("/api/safety/users", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil data user.",
          );
        }

        setUsers(result.data ?? []);
      } catch (error) {
        console.error("LOAD USERS ERROR:", error);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    if (!showUploadModal) {
      setDate(
        `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
      );
    }
  }, [selectedYear, selectedMonth, showUploadModal]);

  function resetForm() {
    setSelectedMonthlySubmissionId(null);
    setFileNames([]);
    setFilePreviews([]);
    setDescriptionEn("");
    setDescriptionCn("");
    setLocation("");
    setPic("");
    setDate(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
    );
  }

  function openUpload(week: number, activity: ActivityType) {
    const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((a) => a.id === activity);
    if (!config) return;
    resetForm();
    setSelectedWeek(week);
    setSelectedActivity(activity);
    const record = records.find((r) => r.week === week);
    const dataKey = config.dataKey;
    const existing = dataKey ? record?.[dataKey] : undefined;
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescriptionEn(detail.descriptionEn ?? detail.description ?? "");
      setDescriptionCn(detail.descriptionCn ?? detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(
        safetyLanguage === "cn"
          ? detail.picCn || detail.picEn || detail.pic || ""
          : detail.picEn || detail.picCn || detail.pic || "",
      );
      setDate(detail.date ? convertDisplayDateToInput(detail.date) : "2026-08-18");
    }
    setShowUploadModal(true);
  }

  function openMonthlyUpload(activity: ActivityType, submissionId?: number) {
    const config = MONTHLY_ACTIVITIES.find((a) => a.id === activity);
    if (!config) return;
    resetForm();
    setSelectedActivity(activity);
    setSelectedMonthlySubmissionId(
      activity === "reward-finding" ? submissionId ?? null : null,
    );
    const dataKey =
      config.id === "fire-drill"
        ? "fireDrillData"
        : config.id === "monthly-meeting"
          ? "monthlyMeetingData"
          : config.id === "hazard-case"
            ? "hazardCaseData"
            : config.id === "safety-ppt"
              ? "safetyPptData"
              : "rewardFindingData";
    const rewardSubmission =
      activity === "reward-finding" && submissionId
        ? monthly.rewardSubmissions.find(
            (submission) => submission.id === submissionId,
          )
        : undefined;

    const existing =
      rewardSubmission?.detail ??
      monthly[dataKey as keyof MonthlyRecord];
    if (existing && typeof existing === "object") {
      const detail = existing as SubmissionDetail;
      setFileNames(detail.fileNames ?? []);
      setFilePreviews(detail.filePreviews ?? []);
      setDescriptionEn(detail.descriptionEn ?? detail.description ?? "");
      setDescriptionCn(detail.descriptionCn ?? detail.description ?? "");
      setLocation(detail.location ?? "");
      setPic(
        safetyLanguage === "cn"
          ? detail.picCn || detail.picEn || detail.pic || ""
          : detail.picEn || detail.picCn || detail.pic || "",
      );
      setDate(detail.date ? convertDisplayDateToInput(detail.date) : "2026-08-18");
    }
    setShowUploadModal(true);
  }

  function openView(title: string, detail: SubmissionDetail, status: SubmissionStatus) {
    setViewDetail({ title, detail, status });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    const previews: FilePreview[] = files.map((file) => ({
      name: file.name,
      type: file.type || getFileMimeType(file.name),
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setFileNames(files.map((file) => file.name));
    setFilePreviews(previews);
  }

  async function toggleHse(week: number) {
    const current = records.find(
      (record) => record.week === week,
    );

    if (!current) return;

    const nextStatus =
      current.hseTuesday === "completed"
        ? "not_submitted"
        : "completed";

    try {
      const formData = new FormData();

      formData.append(
        "activityType",
        "hse_tuesday",
      );
      formData.append(
        "year",
        String(selectedYear),
      );
      formData.append(
        "month",
        String(selectedMonth),
      );
      formData.append(
        "week",
        String(week),
      );
      formData.append(
        "submissionDate",
        new Date().toISOString().slice(0, 10),
      );
      formData.append(
        "status",
        nextStatus,
      );

      const response = await fetch(
        "/api/safety/weekly",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to update HSE checklist.",
        );
      }

      await loadWeeklyData();
    } catch (error) {
      console.error(
        "HSE CHECKLIST ERROR:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan checklist HSE.",
      );
    }
  }

  async function handleSubmit() {
    if (!selectedActivity) return;

    const config = [
      ...WEEKLY_ACTIVITIES,
      ...MONTHLY_ACTIVITIES,
    ].find((a) => a.id === selectedActivity);

    if (!config) return;

    const isMonthly = !config.weekly;
    const isHazardCase =
      isMonthly && selectedActivity === "hazard-case";

    const isCaseFound =
      isHazardCase && fileNames.length > 0;

    // Weekly membutuhkan week. Monthly tidak.
    if (!isMonthly && !selectedWeek) return;

    // Semua aktivitas tetap wajib upload sesuai requirement,
    // kecuali Safety Case karena No Case boleh submit tanpa file.
    if (
      !isHazardCase &&
      config.uploadKind !== "none" &&
      fileNames.length === 0
    ) {
      alert("Silakan pilih file terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      const databaseActivity =
        uiActivityToDatabaseActivity(selectedActivity);

      formData.append("activityType", databaseActivity);
      formData.append("year", String(selectedYear));
      formData.append("month", String(selectedMonth));
      formData.append("submissionDate", date);

      // PIC disimpan dalam 3 bentuk: legacy, English, dan Chinese.
      // Nilai select tetap memakai name_en sebagai value agar update lama tetap kompatibel.
      const selectedUser = users.find((user) => {
        const nameEn = user.name_en?.trim() || "";
        const nameCn = user.name_cn?.trim() || "";
        return pic === nameEn || pic === nameCn;
      });

      const picEn = selectedUser?.name_en?.trim() || pic;
      const picCn = selectedUser?.name_cn?.trim() || selectedUser?.name_en?.trim() || pic;

      formData.append("pic", picEn);
      formData.append("pic_en", picEn);
      formData.append("pic_cn", picCn);
      formData.append("location", location);
      formData.append("description_en", descriptionEn);
      formData.append("description_cn", descriptionCn);
      formData.append("description", descriptionEn || descriptionCn);
      formData.append("fileGroup", "general");

      // Safety Case:
      // - tanpa evidence = No Case = GREEN
      // - dengan evidence = Case Found = RED
      // Aktivitas lain tetap Completed.
      const submitStatus: SubmissionStatus =
        isHazardCase
          ? isCaseFound
            ? "case_found"
            : "not_applicable"
          : "completed";

      formData.append("status", submitStatus);

      if (
        isMonthly &&
        selectedActivity === "reward-finding" &&
        selectedMonthlySubmissionId !== null
      ) {
        formData.append(
          "submissionId",
          String(selectedMonthlySubmissionId),
        );
      }

      // Hanya Weekly yang mengirim week.
      if (!isMonthly && selectedWeek) {
        formData.append("week", String(selectedWeek));
      }

      // Ambil file asli dari input upload.
      const fileInput =
        document.querySelector<HTMLInputElement>(
          'input[type="file"][data-safety-upload="true"]',
        );

      if (fileInput?.files) {
        for (const file of Array.from(fileInput.files)) {
          formData.append("files", file);
        }
      }

      const apiUrl = isMonthly
        ? "/api/safety/monthly"
        : "/api/safety/weekly";

      console.log("SAFETY SUBMIT", {
        apiUrl,
        selectedActivity,
        databaseActivity,
        isMonthly,
        status: submitStatus,
        isCaseFound,
        fileCount: fileNames.length,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Upload safety gagal.",
        );
      }

      // Setelah submit, selalu baca ulang dari database.
      if (isMonthly) {
        await loadMonthlyData();
      } else {
        await loadWeeklyData();
      }

      resetForm();
      setShowUploadModal(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error("SAFETY UPLOAD ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Upload safety gagal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const allActivities = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">{safetyText("management", safetyLanguage)}</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">{safetyText("submissionCenter", safetyLanguage)}</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">{safetyText("overviewDescription", safetyLanguage)}</p>
        </div>
        <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-xl text-text-muted transition hover:bg-surface-hover hover:text-text"
            aria-label={safetyText("previousMonth", safetyLanguage)}
          >
            ‹
          </button>
          <div className="min-w-[150px] px-3 text-center">
            <p className="text-[9px] font-medium uppercase tracking-wide text-text-dim">{safetyText("month", safetyLanguage)}</p>
            <p className="mt-0.5 text-sm font-semibold text-text">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-xl text-text-muted transition hover:bg-surface-hover hover:text-text"
            aria-label={safetyText("nextMonth", safetyLanguage)}
          >
            ›
          </button>
        </div>
      </header>

      {loading && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-accent">
          {safetyText("loadingDatabase", safetyLanguage)}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1fr_330px]">
          <div className="p-6 md:p-7">
            <span className="rounded-md bg-accent/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-accent">{monthLabel.toUpperCase()}</span>
            <div className="mt-5 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">{safetyText("monthlyOverview", safetyLanguage)}</span></div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">{safetyText("safetyProgress", safetyLanguage)}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">{safetyText("progressDescription", safetyLanguage)}</p>
            <div className="mt-8 flex items-end gap-4"><div className="flex items-end"><span className="text-5xl font-semibold leading-none text-text md:text-6xl">{overallDone}</span><span className="mb-1.5 ml-2 text-lg font-medium text-text-dim">/ {overallTarget}</span></div><div className="pb-1.5"><p className="text-[10px] font-medium text-text-muted">{safetyText("completedRequirements", safetyLanguage)}</p><p className="mt-1 text-[9px] text-text-dim">{safetyText("weeklyControlsSummary", safetyLanguage)}</p></div></div>
            <div className="mt-8 max-w-3xl"><div className="mb-2 flex items-end justify-between"><div><p className="text-[10px] font-medium text-text-muted">{safetyText("overallCompletion", safetyLanguage)}</p><p className="mt-1 text-[9px] text-text-dim">{weeklyCompleted}/{weeklyTotal} weekly · {monthlyDone}/{monthlyTargets} monthly</p></div><span className="text-xl font-semibold text-accent">{overallRate}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${overallRate}%` }} /></div></div>
            <div className="mt-6 flex flex-wrap gap-2"><StatusPill label={safetyText("completed", safetyLanguage)} value={weeklyCompleted + monthlyDone} tone="success" /><StatusPill label={safetyText("pending", safetyLanguage)} value={weeklyPending + (monthlyTargets - monthlyDone)} tone="danger" /></div>
          </div>
          <div className="border-t border-border-subtle bg-bg/20 lg:border-l lg:border-t-0"><div className="grid h-full grid-rows-3"><ProgressStatus label={safetyText("weekly", safetyLanguage)} description={safetyText("weeklyControlsSummary", safetyLanguage)} value={weeklyCompleted} total={weeklyTotal} tone="success" /><ProgressStatus label={safetyText("monthly", safetyLanguage)} description={safetyText("monthlyControls", safetyLanguage)} value={monthlyDone} total={monthlyTargets} tone="warning" /><ProgressStatus label={safetyText("hazardCase", safetyLanguage)} description={hazardCaseActive ? safetyText("hazardAttention", safetyLanguage) : safetyText("noHazardThisMonth", safetyLanguage)} value={hazardCaseActive ? 1 : 0} total={1} tone={hazardCaseActive ? "danger" : "success"} /></div></div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">
              {safetyText("weeklyControl", safetyLanguage)}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {safetyText("weeklyControlDescription", safetyLanguage)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
              {weeklyCompleted} {safetyText("completed", safetyLanguage)}
            </span>
            <span className="rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
              {weeklyPending} {safetyText("pending", safetyLanguage)}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle bg-bg/30">
                <div className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                  {safetyText("weekLabel", safetyLanguage)}
                </div>

                {WEEKLY_ACTIVITIES.map((rawActivity) => { const activity = localizeActivity(rawActivity, safetyLanguage); return (
                  <div
                    key={activity.id}
                    className="border-l border-border-subtle px-3 py-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{activity.icon}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                        {activity.shortTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-[8px] text-text-dim">
                      {activity.frequency}
                    </p>
                  </div>
                ); })}

                <div className="border-l border-border-subtle px-3 py-3 text-center text-[9px] font-semibold uppercase tracking-wide text-text-dim">
                  {safetyText("progress", safetyLanguage)}
                </div>
              </div>

              {records.map((record) => {
                const done = getCompletedCount(record);
                const rate = Math.round(
                  (done / WEEKLY_ACTIVITIES.length) * 100,
                );
                const isSelected =
                  selectedWeek === record.week;

                return (
                  <button
                    key={record.week}
                    type="button"
                    onClick={() =>
                      setSelectedWeek(record.week)
                    }
                    className={`grid w-full cursor-pointer grid-cols-[145px_repeat(6,1fr)_90px] border-b border-border-subtle text-left last:border-b-0 transition-colors ${
                      isSelected
                        ? "bg-accent/[0.055]"
                        : "hover:bg-bg/30"
                    }`}
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex size-7 items-center justify-center rounded-md text-[10px] font-semibold ${
                            isSelected
                              ? "bg-accent text-white"
                              : "bg-bg text-text-muted"
                          }`}
                        >
                          W{record.week}
                        </span>

                        <div>
                          <p className="text-xs font-semibold text-text">
                            {formatSafetyText(safetyText("week", safetyLanguage), { week: String(record.week) })}
                          </p>
                          <p className="mt-0.5 text-[9px] text-text-dim">
                            {record.startDate} – {record.endDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {WEEKLY_ACTIVITIES.map((rawActivity) => { const activity = localizeActivity(rawActivity, safetyLanguage); return (
                      <div
                        key={activity.id}
                        className="flex items-center border-l border-border-subtle px-3 py-3"
                      >
                        <StatusMonitorCell
                          language={safetyLanguage}
                          status={
                            record[
                              activity.recordKey!
                            ] as SubmissionStatus
                          }
                          checklist={false}
                        />
                      </div>
                    ); })}

                    <div className="flex flex-col items-center justify-center border-l border-border-subtle px-3 py-4">
                      <span className="text-xs font-semibold text-text">
                        {done}/6
                      </span>
                      <div className="mt-2 h-1 w-12 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{
                            width: `${rate}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-4 text-[9px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            {safetyText("completedParticipated", safetyLanguage)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-danger" />
            {safetyText("notSubmitted", safetyLanguage)}
          </span>
          <span className="ml-auto">
            {formatSafetyText(safetyText("weekSelected", safetyLanguage), { week: String(selectedWeek) })}
          </span>
        </div>
      </section>

      {selectedWeekRecord && (
        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent px-2 py-1 text-[9px] font-semibold text-white">
                  WEEK {selectedWeekRecord.week}
                </span>
                <span className="text-[10px] text-text-dim">
                  {selectedWeekRecord.startDate} –{" "}
                  {selectedWeekRecord.endDate}
                </span>
              </div>

              <h2 className="mt-2 text-base font-semibold text-text">
                {formatSafetyText(safetyText("weekActivity", safetyLanguage), { week: String(selectedWeekRecord.week) })}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {safetyText("actionDescription", safetyLanguage)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[9px] font-semibold text-success">
                {getCompletedCount(selectedWeekRecord)} / 6 {safetyText("completedShort", safetyLanguage)}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="divide-y divide-border-subtle">
              {WEEKLY_ACTIVITIES.map((rawActivity) => {
                const activity = localizeActivity(rawActivity, safetyLanguage);
                const status =
                  selectedWeekRecord[
                    activity.recordKey!
                  ] as SubmissionStatus;

                const detail =
                  selectedWeekRecord[
                    activity.dataKey!
                  ] as SubmissionDetail | undefined;

                const fileCount =
                  detail?.filePreviews?.length ??
                  detail?.fileNames?.length ??
                  0;

                const isCompleted =
                  status === "completed" ||
                  status === "not_applicable";

                const isHse =
                  activity.id === "hse-tuesday";

                return (
                  <div
                    key={activity.id}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(280px,1.5fr)_170px_150px_190px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-base">
                        {activity.icon}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-[9px] text-text-dim">
                          {activity.frequency}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                          isCompleted
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        <span>
                          {isCompleted ? "✓" : "!"}
                        </span>
                        {isHse && isCompleted
                          ? safetyText("completedParticipated", safetyLanguage)
                          : getSafetyStatusLabel(status, safetyLanguage)}
                      </span>

                      <p className="mt-1 text-[9px] text-text-dim">
                        {detail?.date ?? safetyText("notSubmitted", safetyLanguage)}
                      </p>
                    </div>

                    <div>
                      {fileCount > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-text">
                            {fileCount}{" "}
                            {fileCount === 1
                              ? safetyText("file", safetyLanguage)
                              : safetyText("files", safetyLanguage)}
                          </p>
                          <p className="mt-1 text-[9px] text-text-dim">
                            {getActivityFileTypes(detail)}
                          </p>
                        </div>
                      ) : isHse && isCompleted ? (
                        <div>
                          <p className="text-xs font-semibold text-text">
                            {safetyText("checklist", safetyLanguage)}
                          </p>
                          <p className="mt-1 text-[9px] text-text-dim">
                            {safetyText("attendanceRecorded", safetyLanguage)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-dim">
                          {safetyText("noEvidenceShort", safetyLanguage)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                      {detail && (
                        <button
                          type="button"
                          onClick={() =>
                            openView(
                              activity.title,
                              detail,
                              status,
                            )
                          }
                          className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[9px] font-medium text-text transition hover:bg-bg/40"
                        >
                          {safetyText("view", safetyLanguage)}
                        </button>
                      )}

                      {isHse ? (
                        <button
                          type="button"
                          onClick={() =>
                            openUpload(
                              selectedWeekRecord.week,
                              "hse-tuesday",
                            )
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-[9px] font-semibold ${
                            isCompleted
                              ? "border border-border text-text hover:bg-bg/40"
                              : "bg-accent text-white hover:opacity-90"
                          }`}
                        >
                          {isCompleted
                            ? safetyText(
                                "update",
                                safetyLanguage,
                              )
                            : `+ ${safetyText(
                                "upload",
                                safetyLanguage,
                              )}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openUpload(
                              selectedWeekRecord.week,
                              activity.id,
                            )
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-[9px] font-semibold ${
                            isCompleted
                              ? "border border-border text-text hover:bg-bg/40"
                              : "bg-accent text-white hover:opacity-90"
                          }`}
                        >
                          {isCompleted
                            ? safetyText("update", safetyLanguage)
                            : `+ ${safetyText("upload", safetyLanguage)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {safetyText("evidenceLibrary", safetyLanguage)}
                  </h3>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {formatSafetyText(safetyText("evidenceDescription", safetyLanguage), { week: String(selectedWeekRecord.week) })}
                  </p>
                </div>

                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[9px] font-medium text-accent">
                  {getWeekFileCount(selectedWeekRecord)}{" "}
                  {safetyText("attachments", safetyLanguage)}
                </span>
              </div>

              <div className="mt-4">
                {(() => {
                  const evidence = getWeekEvidence(
                    selectedWeekRecord,
                  );

                  if (evidence.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                        <div className="text-xl">📂</div>
                        <p className="mt-2 text-xs font-medium text-text">
                          {safetyText("noEvidenceTitle", safetyLanguage)}
                        </p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          {safetyText("evidenceWillAppear", safetyLanguage)}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {evidence
                        .slice(0, 6)
                        .map((item, index) => {
                          const kind =
                            getPreviewKind(
                              item.file.name,
                              item.file.type,
                            );

                          return (
                            <button
                              type="button"
                              key={`${item.activity.id}-${item.file.name}-${index}`}
                              onClick={() => {
                                setSelectedEvidenceIndex(index);
                                setShowEvidenceGallery(true);
                              }}
                              className="group block w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-bg/20 text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                              <div className="relative flex h-24 items-center justify-center overflow-hidden bg-bg/40">
                                {kind === "image" ? (
                                  <img
                                    src={item.file.url}
                                    alt={item.file.name}
                                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-125"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 text-xl transition-transform duration-300 group-hover:scale-110">
                                    <span>{getFileIcon(kind)}</span>
                                    <span className="text-[8px] font-medium uppercase text-text-muted">
                                      {getReadableFileKind(kind, safetyLanguage)}
                                    </span>
                                  </div>
                                )}

                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
                                  <span className="rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-semibold text-slate-800 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                                    {safetyLanguage === "cn" ? "放大查看" : "View larger"}
                                  </span>
                                </div>

                                <span className="absolute left-2 top-2 rounded-md bg-surface/90 px-2 py-1 text-[8px] font-medium text-text shadow-sm">
                                  {item.activity.shortTitle}
                                </span>
                              </div>

                              <div className="p-2.5">
                                <p
                                  className="truncate text-[9px] font-semibold text-text"
                                  title={
                                    item.file.name
                                  }
                                >
                                  {item.file.name}
                                </p>
                                <p className="mt-1 text-[8px] text-text-dim">
                                  {
                                    item.detail
                                      .date
                                  }{" "}
                                  •{" "}
                                  {getReadableFileKind(kind, safetyLanguage)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-text">
                {safetyText("weekSnapshot", safetyLanguage)}
              </h3>
              <p className="mt-1 text-[10px] text-text-muted">
                {safetyText("snapshotDescription", safetyLanguage)}
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
                  <span className="text-[10px] text-text-muted">
                    {safetyText("completed", safetyLanguage)}
                  </span>
                  <span className="text-sm font-semibold text-success">
                    {getCompletedCount(
                      selectedWeekRecord,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
                  <span className="text-[10px] text-text-muted">
                    {safetyText("pending", safetyLanguage)}
                  </span>
                  <span className="text-sm font-semibold text-danger">
                    {6 -
                      getCompletedCount(
                        selectedWeekRecord,
                      )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
                  <span className="text-[10px] text-text-muted">
                    {safetyText("attachments", safetyLanguage)}
                  </span>
                  <span className="text-sm font-semibold text-text">
                    {getWeekFileCount(
                      selectedWeekRecord,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-3">
                  <span className="text-[10px] text-text-muted">
                    {safetyText("lastUpload", safetyLanguage)}
                  </span>
                  <span className="max-w-[130px] truncate text-[10px] font-semibold text-text">
                    {getLastSubmissionDate(
                      selectedWeekRecord,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      {showEvidenceGallery && evidenceForGallery.length > 0 && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowEvidenceGallery(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {evidenceForGallery[selectedEvidenceIndex]?.file.name}
                </p>
                <p className="mt-1 text-[10px] text-text-dim">
                  {selectedEvidenceIndex + 1} / {evidenceForGallery.length}
                  {" • "}
                  {evidenceForGallery[selectedEvidenceIndex]?.activity.shortTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEvidenceGallery(false)}
                className="ml-4 rounded-lg px-3 py-1.5 text-xl leading-none text-text-dim hover:bg-surface-hover hover:text-text"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-bg/20 p-4">
              <div className="flex min-h-[55vh] items-center justify-center">
                {(() => {
                  const current = evidenceForGallery[selectedEvidenceIndex];
                  if (!current) return null;

                  const currentKind = getPreviewKind(
                    current.file.name,
                    current.file.type,
                  );

                  if (currentKind === "image") {
                    return (
                      <img
                        src={current.file.url}
                        alt={current.file.name}
                        className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-2xl"
                      />
                    );
                  }

                  if (currentKind === "video") {
                    return (
                      <video
                        src={current.file.url}
                        controls
                        autoPlay
                        className="max-h-[68vh] max-w-full rounded-lg bg-black object-contain shadow-2xl"
                      />
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                      <div className="text-6xl">{getFileIcon(currentKind)}</div>
                      <p className="text-sm font-semibold text-text">
                        {current.file.name}
                      </p>
                      <p className="text-xs text-text-dim">
                        {getReadableFileKind(currentKind, safetyLanguage)}
                      </p>
                      <a
                        href={current.file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text hover:bg-surface-hover"
                      >
                        {safetyText("open", safetyLanguage)}
                      </a>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {evidenceForGallery.map((galleryItem, galleryIndex) => {
                  const galleryKind = getPreviewKind(
                    galleryItem.file.name,
                    galleryItem.file.type,
                  );

                  return (
                    <button
                      key={`${galleryItem.activity.id}-${galleryItem.file.name}-gallery-${galleryIndex}`}
                      type="button"
                      onClick={() => setSelectedEvidenceIndex(galleryIndex)}
                      className={`relative h-16 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                        galleryIndex === selectedEvidenceIndex
                          ? "border-accent ring-2 ring-accent/30"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {galleryKind === "image" ? (
                        <img
                          src={galleryItem.file.url}
                          alt={galleryItem.file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg/50 text-xl">
                          {getFileIcon(galleryKind)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}


      <section><div className="mb-3"><h2 className="text-base font-semibold text-text">{safetyText("monthlyRequirements", safetyLanguage)}</h2><p className="mt-1 text-xs text-text-muted">{safetyText("monthlyRequirementsDescription", safetyLanguage)}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MONTHLY_ACTIVITIES.map((rawActivity) => {
          const activity = localizeActivity(rawActivity, safetyLanguage);
          const status =
            activity.id === "fire-drill"
              ? monthly.fireDrill
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeeting
                : activity.id === "hazard-case"
                  ? monthly.hazardCase
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPpt
                    : monthly.rewardFinding;

          const detail =
            activity.id === "fire-drill"
              ? monthly.fireDrillData
              : activity.id === "monthly-meeting"
                ? monthly.monthlyMeetingData
                : activity.id === "hazard-case"
                  ? monthly.hazardCaseData
                  : activity.id === "safety-ppt"
                    ? monthly.safetyPptData
                    : monthly.rewardFindingData;
          const rewardLabel = activity.id === "reward-finding" ? `${monthly.rewardCount}/2 ${safetyText("submitted", safetyLanguage)}` : activity.requirement;
          if (activity.id === "reward-finding") {
            return (
              <MonthlyRewardFindingCard
                key={activity.id}
                language={safetyLanguage}
                activity={activity}
                submissions={monthly.rewardSubmissions}
                rewardLabel={rewardLabel}
                onView={(submission) =>
                  openView(
                    `${activity.title} #${submission.id}`,
                    submission.detail,
                    submission.status,
                  )
                }
                onUploadNew={() => openMonthlyUpload(activity.id)}
                onUpdate={(submissionId) =>
                  openMonthlyUpload(activity.id, submissionId)
                }
              />
            );
          }

          return (
            <MonthlyRequirementCard
              key={activity.id}
              language={safetyLanguage}
              activity={activity}
              status={status}
              rewardLabel={rewardLabel}
              hasDetail={Boolean(detail)}
              hazardCase={activity.id === "hazard-case"}
              onView={() =>
                detail && openView(activity.title, detail, status)
              }
              onUpload={() => openMonthlyUpload(activity.id)}
            />
          );
        })}

        <div className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">📚</div>
            <span className="rounded-md border border-border px-2 py-1 text-[9px] font-medium text-text-muted">
              {getMonthlyEvidenceCount(monthly)} {safetyText("attachments", safetyLanguage)}
            </span>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-text">
            {safetyText("evidenceLibrary", safetyLanguage)}
          </h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {safetyLanguage === "cn"
              ? "查看本月所有已上传的图片和PPT文件。"
              : "View all images and PPT files uploaded this month."}
          </p>

          {monthlyEvidenceForGallery.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {getMonthlyEvidencePreviewItems(monthlyEvidenceForGallery).map((item) => {
                const kind = getPreviewKind(item.file.name, item.file.type);
                const fullIndex = monthlyEvidenceForGallery.findIndex(
                  (entry) =>
                    entry === item ||
                    (entry.file.url === item.file.url &&
                      entry.file.name === item.file.name &&
                      entry.submissionId === item.submissionId),
                );

                return (
                  <button
                    key={`monthly-evidence-${item.activity.id}-${item.file.name}-${item.submissionId ?? "single"}`}
                    type="button"
                    onClick={() => {
                      setSelectedMonthlyEvidenceIndex(
                        fullIndex >= 0 ? fullIndex : 0,
                      );
                      setShowMonthlyEvidenceGallery(true);
                    }}
                    className="group relative h-20 cursor-pointer overflow-hidden rounded-lg border border-border bg-bg/40 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
                    title={item.file.name}
                  >
                    {kind === "image" ? (
                      <img
                        src={item.file.url}
                        alt={item.file.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-bg/50 text-lg">
                        <span>{getFileIcon(kind)}</span>
                        <span className="max-w-full truncate px-1 text-[7px] font-medium text-text-muted">
                          {getReadableFileKind(kind, safetyLanguage)}
                        </span>
                      </div>
                    )}
                    <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/55 px-1.5 py-0.5 text-[7px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {item.sourceLabel ? `${item.sourceLabel} • ${item.file.name}` : item.file.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <div className="text-xl">📂</div>
              <p className="mt-2 text-[10px] font-medium text-text">
                {safetyText("noEvidenceTitle", safetyLanguage)}
              </p>
              <p className="mt-1 text-[9px] text-text-muted">
                {safetyText("evidenceWillAppear", safetyLanguage)}
              </p>
            </div>
          )}

          {monthlyEvidenceForGallery.length > 6 && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonthlyEvidenceIndex(0);
                setShowMonthlyEvidenceGallery(true);
              }}
              className="mt-3 w-full cursor-pointer rounded-lg border border-border px-3 py-2 text-[9px] font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              {safetyLanguage === "cn"
                ? `查看全部 ${monthlyEvidenceForGallery.length} 个附件`
                : `View all ${monthlyEvidenceForGallery.length} attachments`}
            </button>
          )}
        </div>
      </div></section>

      {showMonthlyEvidenceGallery && monthlyEvidenceForGallery.length > 0 && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowMonthlyEvidenceGallery(false)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {monthlyEvidenceForGallery[selectedMonthlyEvidenceIndex]?.file.name}
                </p>
                <p className="mt-1 text-[10px] text-text-dim">
                  {selectedMonthlyEvidenceIndex + 1} / {monthlyEvidenceForGallery.length}
                  {" • "}
                  {monthlyEvidenceForGallery[selectedMonthlyEvidenceIndex]
                    ? (monthlyEvidenceForGallery[selectedMonthlyEvidenceIndex].sourceLabel ||
                      localizeActivity(
                        monthlyEvidenceForGallery[selectedMonthlyEvidenceIndex].activity,
                        safetyLanguage,
                      ).shortTitle)
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyEvidenceGallery(false)}
                className="ml-4 cursor-pointer rounded-lg px-3 py-1.5 text-xl leading-none text-text-dim hover:bg-surface-hover hover:text-text"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-bg/20 p-4">
              {(() => {
                const current = monthlyEvidenceForGallery[selectedMonthlyEvidenceIndex];
                if (!current) return null;
                const currentKind = getPreviewKind(current.file.name, current.file.type);

                if (currentKind === "image") {
                  return (
                    <div className="flex min-h-[55vh] items-center justify-center">
                      <img
                        src={current.file.url}
                        alt={current.file.name}
                        className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-2xl"
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 p-10 text-center">
                    <div className="text-6xl">{getFileIcon(currentKind)}</div>
                    <p className="text-sm font-semibold text-text">{current.file.name}</p>
                    <p className="text-xs text-text-dim">{getReadableFileKind(currentKind, safetyLanguage)}</p>
                    <a
                      href={current.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text hover:bg-surface-hover"
                    >
                      {safetyText("open", safetyLanguage)}
                    </a>
                  </div>
                );
              })()}

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {monthlyEvidenceForGallery.map((item, index) => {
                  const kind = getPreviewKind(item.file.name, item.file.type);
                  return (
                    <button
                      key={`monthly-gallery-${item.activity.id}-${item.submissionId ?? "single"}-${item.file.name}-${index}`}
                      type="button"
                      onClick={() => setSelectedMonthlyEvidenceIndex(index)}
                      className={`relative h-16 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                        index === selectedMonthlyEvidenceIndex
                          ? "border-accent ring-2 ring-accent/30"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {kind === "image" ? (
                        <img src={item.file.url} alt={item.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg/50 text-xl">
                          {getFileIcon(kind)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-text">
            {safetyText("requirementRules", safetyLanguage)}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {safetyText("requirementRulesDescription", safetyLanguage)}
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {/* Manual monthly Safety Points card */}
          <div className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm">
            <div className="flex h-full items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base">
                🎯
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text">
                  {safetyLanguage === "cn" ? "安全积分" : "Safety Points"}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {safetyLanguage === "cn" ? "本月" : "This Month"}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={safetyPoints}
                    onChange={(event) =>
                      handleSafetyPointsChange(event.target.value)
                    }
                    className="h-8 w-28 rounded-md border border-border bg-bg px-2 text-sm font-semibold text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    aria-label={
                      safetyLanguage === "cn"
                        ? "本月安全积分"
                        : "This month's safety points"
                    }
                  />

                  <span className="shrink-0 text-[10px] font-medium text-text-muted">
                    {safetyLanguage === "cn" ? "分" : "pts"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {allActivities.map((rawActivity) => {
            const a = localizeActivity(rawActivity, safetyLanguage);

            return (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm"
              >
                <div className="flex h-full items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base">
                    {a.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text">
                      {a.title}
                    </p>
                    <p className="mt-1 text-[10px] text-text-muted">
                      {a.requirement}
                    </p>
                    <p className="mt-1 text-[9px] text-text-dim">
                      {a.uploadKind === "none"
                        ? safetyText("checklistOnly", safetyLanguage)
                        : a.uploadKind === "before-after"
                          ? safetyText("beforeAfter", safetyLanguage)
                          : a.uploadKind === "image-video"
                            ? safetyText("photoVideo", safetyLanguage)
                            : a.uploadKind === "video-excel"
                              ? safetyText("videoExcel", safetyLanguage)
                              : safetyText("pptFile", safetyLanguage)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showUploadModal && selectedActivity && (
        <UploadModal
          language={safetyLanguage}
          activity={localizeActivity(
            [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find(
              (a) => a.id === selectedActivity,
            )!,
            safetyLanguage,
          )}
          date={date}
          location={location}
          descriptionEn={descriptionEn}
          descriptionCn={descriptionCn}
          pic={pic}
          users={users}
          loadingUsers={loadingUsers}
          fileNames={fileNames}
          filePreviews={filePreviews}
          submitting={submitting}
          setDate={setDate}
          setLocation={setLocation}
          setDescriptionEn={setDescriptionEn}
          setDescriptionCn={setDescriptionCn}
          setPic={setPic}
          onFileChange={handleFileChange}
          onClose={() => {
            if (!submitting) {
              setShowUploadModal(false);
              setSelectedActivity(null);
            }
          }}
          onSubmit={handleSubmit}
        />
      )}
      {viewDetail && <ViewSubmissionModal language={safetyLanguage} title={viewDetail.title} status={viewDetail.status} detail={viewDetail.detail} onClose={() => setViewDetail(null)} />}
    </div>
  );
}

function StatusMonitorCell({
  language,
  status,
  checklist = false,
}: {
  language: SafetyLanguage;
  status: SubmissionStatus;
  checklist?: boolean;
}) {
  const completed =
    status === "completed" ||
    status === "not_applicable";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${
          completed
            ? "border-success/20 bg-success/10 text-success"
            : "border-danger/20 bg-danger/10 text-danger"
        }`}
      >
        {completed ? "✓" : "!"}
      </span>

      <span
        className={`text-[10px] font-semibold ${
          completed
            ? "text-success"
            : "text-danger"
        }`}
      >
        {getSafetyStatusLabel(status, language)}
      </span>
    </div>
  );
}

function StatusCell({
  language,
  status,
  hasDetail,
  onView,
  onAction,
  checklist = false,
}: {
  language: SafetyLanguage;
  status: SubmissionStatus;
  hasDetail: boolean;
  onView: () => void;
  onAction: () => void;
  checklist?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const completed =
    status === "completed" || status === "not_applicable";

  const actionLabel = checklist
    ? status === "completed"
      ? safetyText("uncheck", language)
      : safetyText("check", language)
    : status === "not_submitted"
      ? safetyText("upload", language)
      : safetyText("update", language);

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${config.className}`}
        >
          {completed ? "✓" : "!"}
        </span>

        <div className="min-w-0">
          <p
            className={`text-xs font-semibold ${
              completed ? "text-success" : "text-danger"
            }`}
          >
            {checklist && status === "completed"
              ? safetyText("completedParticipated", language)
              : getSafetyStatusLabel(status, language)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-9">
        {hasDetail && (
          <button
            type="button"
            onClick={onView}
            className="cursor-pointer text-[10px] font-medium text-accent hover:underline"
          >
            {safetyText("view", language)}
          </button>
        )}

        <button
          type="button"
          onClick={onAction}
          className={`cursor-pointer text-[10px] font-medium ${
            checklist
              ? "text-accent hover:underline"
              : status === "not_submitted"
                ? "text-accent hover:underline"
                : "text-text-muted hover:text-text"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
function ActivitySubmissionCard({
  language,
  activity,
  status,
  hasDetail,
  onView,
  onUpload,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  status: SubmissionStatus;
  hasDetail: boolean;
  onView: () => void;
  onUpload: () => void;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        status === "completed" || status === "not_applicable"
          ? "border-success/20 bg-success/[0.025]"
          : "border-danger/20 bg-danger/[0.025]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-lg">
          {activity.icon}
        </div>

        <span
          className={`rounded-md border px-2 py-1 text-[9px] font-medium ${config.className}`}
        >
          {getSafetyStatusLabel(status, language)}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">
        {activity.title}
      </h3>

      <p className="mt-1 min-h-[36px] text-xs leading-5 text-text-muted">
        {activity.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-[9px] text-text-dim">
          {activity.requirement}
        </span>

        <div className="flex items-center gap-2">
          {hasDetail && (
            <button
              type="button"
              onClick={onView}
              className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
            >
              {safetyText("view", language)}
            </button>
          )}

          <button
            type="button"
            onClick={onUpload}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-medium ${
              status === "not_submitted"
                ? "bg-accent text-white"
                : "border border-border text-text-muted hover:bg-surface-hover"
            }`}
          >
            {status === "not_submitted"
              ? `+ ${safetyText("upload", language)}`
              : safetyText("update", language)}
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthlyRewardFindingCard({
  language,
  activity,
  submissions,
  rewardLabel,
  onView,
  onUploadNew,
  onUpdate,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  submissions: MonthlyRewardSubmission[];
  rewardLabel: string;
  onView: (submission: MonthlyRewardSubmission) => void;
  onUploadNew: () => void;
  onUpdate: (submissionId: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const isFull = submissions.length >= 2;
  const safeIndex = submissions.length > 0
    ? Math.min(currentIndex, submissions.length - 1)
    : 0;
  const currentSubmission = submissions[safeIndex];

  function goTo(index: number) {
    if (submissions.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, submissions.length - 1));
    setCurrentIndex(nextIndex);
  }

  function goPrevious() {
    goTo(safeIndex - 1);
  }

  function goNext() {
    goTo(safeIndex + 1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = endX - touchStartX;

    if (Math.abs(distance) >= 40) {
      if (distance < 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    setTouchStartX(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">
          {activity.icon}
        </div>
        <span className="rounded-md border border-border px-2 py-1 text-[9px] font-medium text-text-muted">
          {rewardLabel}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">{activity.title}</h3>
      <p className="mt-1 text-xs leading-5 text-text-muted">
        {activity.description}
      </p>

      {currentSubmission ? (
        <div className="mt-3">
          <div
            className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg/30 p-3 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-text">
                  {language === "cn"
                    ? `提交 ${safeIndex + 1}`
                    : `Submission ${safeIndex + 1}`}
                </p>
                <p className="mt-0.5 text-[9px] text-text-dim">
                  {currentSubmission.detail.filePreviews?.length ?? 0}{" "}
                  {(currentSubmission.detail.filePreviews?.length ?? 0) === 1
                    ? safetyText("file", language)
                    : safetyText("files", language)}
                </p>
              </div>

              {submissions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goPrevious}
                    disabled={safeIndex === 0}
                    aria-label={language === "cn" ? "上一个提交" : "Previous submission"}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border text-sm text-text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="min-w-10 text-center text-[9px] font-semibold text-text-muted">
                    {safeIndex + 1} / {submissions.length}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safeIndex === submissions.length - 1}
                    aria-label={language === "cn" ? "下一个提交" : "Next submission"}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-border text-sm text-text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(currentSubmission.detail.filePreviews ?? []).slice(0, 2).map((file, fileIndex) => {
                const kind = getPreviewKind(file.name, file.type);
                return (
                  <div
                    key={`${currentSubmission.id}-${file.name}-${fileIndex}`}
                    className="relative h-24 overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    {kind === "image" ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-muted">
                        <span className="text-2xl">{getFileIcon(kind)}</span>
                        <span className="max-w-full truncate px-2 text-[8px]">
                          {file.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[8px] text-text-dim">
              {language === "cn"
                ? "左右滑动切换提交"
                : "Swipe left or right to switch submissions"}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onView(currentSubmission)}
                className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
              >
                {safetyText("view", language)}
              </button>
              <button
                type="button"
                onClick={() => onUpdate(currentSubmission.id)}
                className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-semibold text-text hover:bg-surface-hover"
              >
                {safetyText("update", language)}
              </button>
            </div>
          </div>

          {submissions.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {submissions.map((submission, index) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={
                    language === "cn"
                      ? `选择提交 ${index + 1}`
                      : `Select submission ${index + 1}`
                  }
                  className={`size-2 cursor-pointer rounded-full transition-all ${
                    index === safeIndex
                      ? "w-5 bg-accent"
                      : "bg-border hover:bg-accent/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-[10px] text-text-dim">
          {language === "cn"
            ? "本月还没有奖励发现提交。"
            : "No reward finding submission yet this month."}
        </div>
      )}

      {!isFull && (
        <button
          type="button"
          onClick={onUploadNew}
          className="mt-3 w-full cursor-pointer rounded-md bg-accent px-3 py-2 text-[10px] font-semibold text-white hover:opacity-90"
        >
          + {safetyText("upload", language)}
        </button>
      )}
    </div>
  );
}

function MonthlyRequirementCard({
  language,
  activity,
  status,
  rewardLabel,
  hasDetail,
  hazardCase,
  onView,
  onUpload,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  status: SubmissionStatus;
  rewardLabel: string;
  hasDetail: boolean;
  hazardCase?: boolean;
  onView: () => void;
  onUpload: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const isGreen =
    status === "completed" ||
    status === "not_applicable";
  const isSafetyCase = hazardCase === true;
  const isCaseFound =
    isSafetyCase && status === "case_found";

  const safetyCasePoint =
    isCaseFound
      ? -1
      : status === "not_applicable"
        ? 1
        : 0;

  const actionLabel = isSafetyCase
    ? language === "cn"
      ? "报告 / 清除案件"
      : "Report / Clear Case"
    : isGreen && hasDetail
      ? safetyText("update", language)
      : `+ ${safetyText("upload", language)}`;

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isSafetyCase
          ? isCaseFound
            ? "border-danger/30 bg-danger/[0.035]"
            : "border-success/20 bg-success/[0.025]"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex size-11 items-center justify-center rounded-xl text-xl ${
            isSafetyCase
              ? isCaseFound
                ? "bg-danger/10"
                : "bg-success/10"
              : "bg-accent/10"
          }`}
        >
          {activity.icon}
        </div>

        <span
          className={`rounded-md border px-2 py-1 text-[9px] font-medium ${
            isSafetyCase
              ? isCaseFound
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-success/20 bg-success/10 text-success"
              : config.className
          }`}
        >
          {isSafetyCase
            ? isCaseFound
              ? safetyText("caseFoundRed", language)
              : safetyText("noCaseGreen", language)
            : getSafetyStatusLabel(status, language)}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-text">
        {activity.title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-text-muted">
        {activity.description}
      </p>

      <div
        className={`mt-3 rounded-lg border px-3 py-2 ${
          isSafetyCase
            ? isCaseFound
              ? "border-danger/20 bg-danger/5"
              : "border-success/20 bg-success/5"
            : "border-border-subtle bg-bg/30"
        }`}
      >
        <p className="text-[9px] uppercase tracking-wide text-text-dim">
          {isSafetyCase
            ? language === "cn"
              ? "本月积分"
              : "Monthly Point"
            : safetyText("target", language)}
        </p>

        {isSafetyCase ? (
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-lg font-bold ${
                isCaseFound ? "text-danger" : "text-success"
              }`}
            >
              {safetyCasePoint > 0
                ? `+${safetyCasePoint}`
                : safetyCasePoint}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                isCaseFound ? "text-danger" : "text-success"
              }`}
            >
              {isCaseFound
                ? safetyText("caseFoundRed", language)
                : safetyText("noCaseGreen", language)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs font-medium text-text">
            {rewardLabel}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {hasDetail && (
          <button
            type="button"
            onClick={onView}
            className="flex-1 cursor-pointer rounded-md border border-border px-3 py-2 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("view", language)}
          </button>
        )}

        <button
          type="button"
          onClick={onUpload}
          className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-[10px] font-medium ${
            isSafetyCase
              ? isCaseFound
                ? "bg-danger text-white hover:opacity-90"
                : "bg-success text-white hover:opacity-90"
              : isGreen && hasDetail
                ? "border border-border text-text-muted hover:bg-surface-hover"
                : "bg-accent text-white hover:opacity-90"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function UploadModal({
  language,
  activity,
  date,
  location,
  descriptionEn,
  descriptionCn,
  pic,
  users,
  loadingUsers,
  fileNames,
  filePreviews,
  submitting,
  setDate,
  setLocation,
  setDescriptionEn,
  setDescriptionCn,
  setPic,
  onFileChange,
  onClose,
  onSubmit,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  date: string;
  location: string;
  descriptionEn: string;
  descriptionCn: string;
  pic: string;
  users: UserOption[];
  loadingUsers: boolean;
  fileNames: string[];
  filePreviews: FilePreview[];
  submitting: boolean;
  setDate: (v: string) => void;
  setLocation: (v: string) => void;
  setDescriptionEn: (v: string) => void;
  setDescriptionCn: (v: string) => void;
  setPic: (v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const accept = activity.uploadKind === "ppt" ? ".ppt,.pptx" : activity.uploadKind === "video-excel" ? ".mp4,.mov,.avi,.xlsx,.xls" : activity.uploadKind === "before-after" ? ".jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi";
  const uploadText =
    activity.uploadKind === "none"
      ? safetyText("checklist", language)
      : activity.uploadKind === "before-after"
        ? safetyText("uploadBeforeAfter", language)
        : activity.uploadKind === "image-video"
          ? safetyText("canUploadMany", language)
          : activity.uploadKind === "video-excel"
            ? safetyText("uploadVideoExcel", language)
            : safetyText("uploadPpt", language);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"><div className="flex items-start justify-between border-b border-border-subtle p-5"><div className="flex items-start gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">{activity.icon}</div><div><h2 className="text-base font-semibold text-text">{activity.title}</h2><p className="mt-1 text-xs text-text-muted">{activity.requirement} · {uploadText}</p></div></div><button type="button" onClick={onClose} disabled={submitting} className="cursor-pointer text-xl text-text-dim">×</button></div><div className="max-h-[70vh] space-y-4 overflow-y-auto p-5"><div className="grid gap-4 md:grid-cols-2"><FormField label={safetyText("date", language)}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></FormField><FormField label={safetyText("pic", language)}>
  <select
    value={pic}
    onChange={(e) => setPic(e.target.value)}
    disabled={loadingUsers}
    className={inputClass}
  >
    <option value="">
      {loadingUsers
        ? "Loading PIC..."
        : safetyText("enterPic", language)}
    </option>

    {users.map((user) => {
      const employeeNo = user.employee_no?.trim() || "";
      const nameEn = user.name_en?.trim() || "";
      const nameCn = user.name_cn?.trim() || "";

      const displayName =
      language === "cn"
        ? nameCn || nameEn || "Tanpa Nama"
        : nameEn || nameCn || "Tanpa Nama";

      return (
        <option
          key={user.id}
          value={nameEn || nameCn}
        >
          {employeeNo
            ? `${employeeNo} - ${displayName}`
            : displayName}
        </option>
      );
    })}
  </select>
</FormField></div>{activity.id !== "hazard-case" && <FormField label={safetyText("location", language)}><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={safetyText("enterLocation", language)} className={inputClass} /></FormField>}<div className="grid gap-4 md:grid-cols-2">
<FormField label={safetyText("descriptionEnglish", language)}>
<textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder={activity.id === "hazard-case" ? "Describe the case details. Leave both descriptions empty if there is no case." : safetyText("describeActivity", language)} rows={4} className={`${inputClass} resize-none`} />
</FormField>
<FormField label={safetyText("descriptionChinese", language)}>
<textarea value={descriptionCn} onChange={(e) => setDescriptionCn(e.target.value)} placeholder={activity.id === "hazard-case" ? "请描述案件详情。如果没有案件，请将两个描述都留空。" : safetyText("describeActivityChinese", language)} rows={4} className={`${inputClass} resize-none`} />
</FormField>
</div>{activity.uploadKind !== "none" && <FormField label={safetyText("attachment", language)}><label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/30 px-4 py-8 text-center hover:border-accent/60 hover:bg-accent/5"><div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-lg">↑</div><span className="mt-3 text-xs font-medium text-text">{safetyText("clickUpload", language)}</span><span className="mt-1 text-[10px] text-text-dim">{uploadText}</span><input data-safety-upload="true" type="file" multiple className="hidden" accept={accept} onChange={onFileChange} /></label>{filePreviews.length > 0 && (
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
    {filePreviews.map((file) => {
      const kind = getPreviewKind(file.name, file.type);

      return (
        <div
          key={`${file.name}-${file.url}`}
          className="overflow-hidden rounded-xl border border-border-subtle bg-bg/30"
        >
          {kind === "image" ? (
            <img
              src={file.url}
              alt={file.name}
              className="h-32 w-full object-cover"
            />
          ) : kind === "video" ? (
            <video
              src={file.url}
              controls
              className="h-32 w-full bg-black object-contain"
            />
          ) : (
            <div className="flex h-32 items-center justify-center bg-bg/50">
              <div className="text-center">
                <div className="text-3xl">{getFileIcon(kind)}</div>
                <p className="mt-2 text-[10px] font-medium text-text">
                  {getFileTypeLabel(kind, language)}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
            <span className="shrink-0 text-xs text-success">✓</span>
            <p className="truncate text-[10px] font-medium text-text">
              {file.name}
            </p>
          </div>
        </div>
      );
    })}
  </div>
)}</FormField>}{activity.id === "hazard-case" && <div className="rounded-lg border border-success/20 bg-success/5 p-3"><p className="text-[10px] font-medium text-success">{safetyText("noCaseQuestion", language)}</p><p className="mt-1 text-[9px] leading-4 text-text-muted">{safetyText("noCaseHelp", language)}</p></div>}{activity.id === "hse-tuesday" && <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-muted">{safetyText("hseHelp", language)}</div>}</div><div className="flex justify-end gap-2 border-t border-border-subtle p-5"><button type="button" onClick={onClose} disabled={submitting} className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted">{safetyText("cancel", language)}</button><button type="button" onClick={onSubmit} disabled={submitting} className="cursor-pointer rounded-md bg-accent px-5 py-2 text-xs font-medium text-white disabled:opacity-50">{submitting ? safetyText("submitting", language) : activity.id === "hazard-case" && fileNames.length === 0 ? safetyText("setGreenNoCase", language) : safetyText("submit", language)}</button></div></div></div>;
}

function ViewSubmissionModal({
  language,
  title,
  status,
  detail,
  onClose,
}: {
  language: SafetyLanguage;
  title: string;
  status: SubmissionStatus;
  detail: SubmissionDetail;
  onClose: () => void;
}) {
  const files = detail.filePreviews ?? [];

  const fileCountLabel =
    files.length === 1
      ? safetyText("file", language)
      : safetyText("files", language);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border-subtle p-5">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>

            <span
              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-medium ${
                STATUS_CONFIG[status].className
              }`}
            >
              {status === "not_applicable"
                ? safetyText("noCaseGreen", language)
                : status === "case_found"
                  ? safetyText("caseFoundRed", language)
                  : getSafetyStatusLabel(status, language)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-2xl leading-none text-text-dim hover:text-text"
            aria-label={safetyText("close", language)}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Metadata */}
          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem
              label={safetyText("submissionDate", language)}
              value={detail.date}
            />

            <DetailItem
              label={safetyText("pic", language)}
              value={
                language === "cn"
                  ? detail.picCn || detail.picEn || detail.pic || "—"
                  : detail.picEn || detail.picCn || detail.pic || "—"
              }
            />

            <DetailItem
              label={safetyText("location", language)}
              value={detail.location ?? "—"}
            />

            <DetailItem
              label={safetyText("attachment", language)}
              value={
                detail.fileNames?.length
                  ? `${detail.fileNames.length} ${fileCountLabel}`
                  : safetyText("noAttachment", language)
              }
            />
          </div>

          {/* Description */}
          <div className="mt-4 rounded-xl border border-border-subtle bg-bg/30 p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">
              {safetyText("description", language)}
            </p>

            <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-text-muted">
              {language === "cn"
                ? detail.descriptionCn || detail.descriptionEn || detail.description
                : detail.descriptionEn || detail.descriptionCn || detail.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">
                  {safetyText("attachmentsTitle", language)}
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  {safetyText("attachmentsPreview", language)}
                </p>
              </div>

              <span className="rounded-md bg-accent/10 px-2 py-1 text-[9px] font-medium text-accent">
                {files.length} {fileCountLabel}
              </span>
            </div>

            {files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg/30 p-8 text-center">
                <div className="text-3xl">📎</div>

                <p className="mt-2 text-xs font-medium text-text">
                  {safetyText("noPreview", language)}
                </p>

                <p className="mt-1 text-[10px] text-text-dim">
                  {safetyText("noStoredPreview", language)}
                </p>

                {detail.fileNames?.length ? (
                  <div className="mt-4 space-y-2 text-left">
                    {detail.fileNames.map((name) => (
                      <div
                        key={name}
                        className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {files.map((file) => (
                  <AttachmentPreview
                    language={language}
                    key={`${file.name}-${file.url}`}
                    file={file}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verified */}
          {status === "completed" && (
            <div className="mt-5 rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-success">
              {safetyText("submissionVerified", language)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-border-subtle p-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("close", language)}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({
  language,
  file,
}: {
  language: SafetyLanguage;
  file: FilePreview;
}) {
  const kind = getPreviewKind(file.name, file.type);
  const canOfficePreview =
    (kind === "ppt" || kind === "excel") &&
    /^https?:\/\//i.test(file.url);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg/20">
      {/* Preview */}
      <div className="min-h-[220px] bg-bg/40">
        {kind === "image" ? (
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[420px] min-h-[220px] w-full object-contain"
          />
        ) : kind === "video" ? (
          <video
            src={file.url}
            controls
            playsInline
            className="max-h-[420px] min-h-[220px] w-full bg-black object-contain"
          />
        ) : kind === "pdf" ? (
          <iframe
            src={file.url}
            title={file.name}
            className="h-[420px] w-full bg-white"
          />
        ) : canOfficePreview ? (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              file.url,
            )}`}
            title={file.name}
            className="h-[420px] w-full bg-white"
          />
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
              {getFileIcon(kind)}
            </div>

            <p className="mt-4 text-sm font-semibold text-text">
              {getFileTypeLabel(kind, language)}
            </p>

            <p className="mt-1 max-w-sm text-[10px] leading-5 text-text-dim">
              {kind === "ppt"
                ? safetyText("powerpointPreviewHelp", language)
                : kind === "excel"
                  ? safetyText("excelPreviewHelp", language)
                  : safetyText("noBrowserPreview", language)}
            </p>
          </div>
        )}
      </div>

      {/* File information */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">
              {file.name}
            </p>

            <p className="mt-1 text-[9px] text-text-dim">
              {getFileTypeLabel(kind, language)} · {formatFileSize(file.size)}
            </p>
          </div>

          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[10px] font-medium text-text-muted hover:bg-surface-hover"
          >
            {safetyText("open", language)}
          </a>
        </div>
      </div>
    </div>
  );
}

function getPreviewKind(
  name: string,
  mimeType?: string,
): "image" | "video" | "pdf" | "ppt" | "excel" | "other" {
  const lowerName = name.toLowerCase();
  const type = (mimeType ?? "").toLowerCase();

  if (
    type.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)
  ) {
    return "image";
  }

  if (
    type.startsWith("video/") ||
    /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)
  ) {
    return "video";
  }

  if (
    type === "application/pdf" ||
    lowerName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    type.includes("presentation") ||
    /\.(ppt|pptx)$/i.test(lowerName)
  ) {
    return "ppt";
  }

  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    /\.(xls|xlsx|csv)$/i.test(lowerName)
  ) {
    return "excel";
  }

  return "other";
}

function getFileMimeType(name: string): string {
  const lowerName = name.toLowerCase();

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)) {
    return "image/*";
  }

  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(lowerName)) {
    return "video/*";
  }

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (/\.(ppt|pptx)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (/\.(xls|xlsx|csv)$/i.test(lowerName)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/octet-stream";
}

function getFileIcon(
  kind: ReturnType<typeof getPreviewKind>,
): string {
  switch (kind) {
    case "image":
      return "🖼️";
    case "video":
      return "🎬";
    case "pdf":
      return "📄";
    case "ppt":
      return "📊";
    case "excel":
      return "📗";
    default:
      return "📎";
  }
}

function getFileTypeLabel(
  kind: ReturnType<typeof getPreviewKind>,
  language: SafetyLanguage = "en",
): string {
  switch (kind) {
    case "image":
      return safetyText("image", language);
    case "video":
      return safetyText("video", language);
    case "pdf":
      return safetyText("pdf", language);
    case "ppt":
      return safetyText("powerpoint", language);
    case "excel":
      return safetyText("excel", language);
    default:
      return language === "cn" ? "文件" : "File";
  }
}

function getReadableFileKind(
  kind: ReturnType<typeof getPreviewKind>,
  language: SafetyLanguage = "en",
): string {
  switch (kind) {
    case "image":
      return safetyText("image", language);
    case "video":
      return safetyText("video", language);
    case "excel":
      return safetyText("excel", language);
    case "ppt":
      return safetyText("powerpoint", language);
    case "pdf":
      return safetyText("pdf", language);
    default:
      return language === "cn" ? "文件" : "File";
  }
}

function formatFileSize(size: number): string {
  if (!size) return "—";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailItem({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border-subtle bg-bg/30 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">{label}</p><p className="mt-1.5 truncate text-xs font-medium text-text">{value}</p></div>; }
function StatusPill({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" }) { const c = { success: "bg-success/10 border-success/20 text-success", warning: "bg-warning/10 border-warning/20 text-warning", danger: "bg-danger/10 border-danger/20 text-danger" }[tone]; return <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${c}`}><span className="text-[10px] font-medium">{label}</span><span className="text-xs font-semibold">{value}</span></div>; }
function ProgressStatus({ label, description, value, total, tone }: { label: string; description: string; value: number; total: number; tone: "success" | "warning" | "danger" }) { const c = { success: "text-success bg-success/[0.025]", warning: "text-warning bg-warning/[0.025]", danger: "text-danger bg-danger/[0.025]" }[tone]; const pct = total ? Math.round((value / total) * 100) : 0; return <div className={`flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-5 last:border-b-0 ${c}`}><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-dim">{label}</p><p className="mt-1 text-[10px] text-text-muted">{description}</p></div><div className="text-right"><p className="text-2xl font-semibold leading-none">{value}</p><p className="mt-1 text-[9px] text-text-dim">{pct}%</p></div></div>; }
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1.5 block text-xs font-medium text-text">{label}</label>{children}</div>; }

const inputClass = "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-xs text-text outline-none placeholder:text-text-dim focus:border-accent";
