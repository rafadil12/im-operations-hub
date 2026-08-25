import type {
  ActivityConfig,
  ActivityType,
  MonthlyRecord,
  SafetyLanguage,
  SubmissionStatus,
} from "./types";

export const ACTIVITY_CN: Record<
  ActivityType,
  Partial<
    Pick<ActivityConfig, "title" | "shortTitle" | "description" | "requirement" | "frequency">
  >
> = {
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

export function localizeActivity(
  activity: ActivityConfig,
  language: SafetyLanguage
): ActivityConfig {
  if (language !== "cn") return activity;
  return { ...activity, ...ACTIVITY_CN[activity.id] };
}

export const WEEKLY_ACTIVITIES: ActivityConfig[] = [
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
    description:
      "Documentation of potential hazards before and after corrective actions once a week.",
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
    description:
      "BBS behavior observation conducted once a week with photo and video documentation.",
    requirement: "1x / week",
    frequency: "Weekly",
    icon: "👀",
    uploadKind: "image-video",
    weekly: true,
  },
];

export const MONTHLY_ACTIVITIES: ActivityConfig[] = [
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
    description:
      "If a case occurs during the month, the status turns red. If there are no cases, the status remains green.",
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

export const INITIAL_MONTHLY_RECORD: MonthlyRecord = {
  fireDrill: "not_submitted",
  monthlyMeeting: "not_submitted",
  hazardCase: "not_applicable",
  safetyPpt: "not_submitted",
  rewardFinding: "not_submitted",
  rewardSubmissions: [],
  rewardCount: 0,
};

export const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "border-success/20 bg-success/10 text-success" },
  not_submitted: { label: "Not Submitted", className: "border-danger/20 bg-danger/10 text-danger" },
  not_applicable: { label: "No Case", className: "border-success/20 bg-success/10 text-success" },
  case_found: { label: "Case Found", className: "border-danger/30 bg-danger/10 text-danger" },
};

export function getSafetyStatusLabel(status: SubmissionStatus, language: SafetyLanguage): string {
  const labels: Record<SubmissionStatus, [string, string]> = {
    completed: ["Completed", "已完成"],
    not_submitted: ["Not Submitted", "未提交"],
    not_applicable: ["No Case", "无案件"],
    case_found: ["Case Found", "发现案件"],
  };
  return labels[status][language === "cn" ? 1 : 0];
}

export function getActivityRecordKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.recordKey;
}

export function getActivityDataKey(activity: ActivityType) {
  const config = [...WEEKLY_ACTIVITIES, ...MONTHLY_ACTIVITIES].find((item) => item.id === activity);
  return config?.dataKey;
}
