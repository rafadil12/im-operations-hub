export type SafetyLanguage = "en" | "cn";

export type SubmissionStatus = "completed" | "not_submitted" | "not_applicable" | "case_found";
export type ActivityType =
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

export type UploadKind = "image-video" | "image" | "video-excel" | "before-after" | "ppt" | "none";

export type FilePreview = {
  name: string;
  type: string;
  url: string;
  size: number;
};

export type UserOption = {
  id: number;
  employee_no: string | null;
  name_cn: string | null;
  name_en: string | null;
};

export type SubmissionDetail = {
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

export type WeeklyRecord = {
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

export type MonthlyRewardSubmission = {
  id: number;
  detail: SubmissionDetail;
  status: SubmissionStatus;
};

export type MonthlyRecord = {
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

export type WeeklyDatabaseFile = {
  id: number;
  original_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  file_group: string;
};

export type WeeklyDatabaseRow = {
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

export type MonthlyDatabaseRow = {
  id: number;
  year: number;
  month: number;
  period_type: "monthly";
  week: number | null;
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
  verified_by?: string | null;
  verified_at?: string | null;
  files?: WeeklyDatabaseFile[];
};

export type WeeklyStatusKey =
  "training" | "routineMeeting" | "hseTuesday" | "ert" | "fiveS" | "potentialHazard";

export type WeeklyDataKey =
  | "trainingData"
  | "routineMeetingData"
  | "hseTuesdayData"
  | "ertData"
  | "fiveSData"
  | "potentialHazardData";

export type ActivityConfig = {
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

export type WeekEvidenceItem = {
  activity: ActivityConfig;
  detail: SubmissionDetail;
  file: FilePreview;
};

export type MonthlyEvidenceItem = {
  activity: ActivityConfig;
  detail: SubmissionDetail;
  file: FilePreview;
  /** For Reward Finding, this identifies which of the 2 submissions owns the file. */
  submissionId?: number;
  submissionNumber?: number;
  sourceLabel?: string;
};

export type SafetyStatus = "completed" | "not_submitted" | "not_applicable" | "case_found";

export type SafetyRow = {
  id: number;
  year?: number;
  month?: number;
  week?: number | null;
  activity_type?: string;
  status?: SafetyStatus | string;
  submission_date?: string | null;
  pic?: string | null;
  pic_en?: string | null;
  pic_cn?: string | null;
  location?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_cn?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  files?: unknown[];
};

export type ApiResponse = {
  success?: boolean;
  data?: SafetyRow[];
  error?: string;
  message?: string;
};
