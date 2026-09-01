export type TrainingLanguage = "en" | "cn";

export type TrainingDivision = {
  id: number;
  nameEn: string;
  nameCn: string;
};

export type TrainingParticipantName = {
  nameEn: string;
  nameCn: string;
};

export type TrainingSessionRow = {
  id: number;
  session_date: string;
  division_id: number;
  division_name_en?: string | null;
  division_name_cn?: string | null;
  topic_en: string;
  topic_cn: string;
  participant_count: number;
  attachment_original_name: string | null;
  attachment_stored_name: string | null;
  attachment_url: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  created_at?: string;
  updated_at?: string;
};

export type TrainingSessionParticipantRow = {
  id: number;
  session_id: number;
  participant_name_en: string;
  participant_name_cn: string;
};

export type TrainingParticipantMasterRow = {
  id: number;
  name_en: string;
  name_cn: string;
  is_active: number;
};

export type TrainingSession = {
  id: number;
  sessionDate: string;
  divisionId: number;
  divisionNameEn: string;
  divisionNameCn: string;
  topicEn: string;
  topicCn: string;
  participantCount: number;
  participants: TrainingParticipantName[];
  attachment: {
    originalName: string;
    url: string;
    mimeType: string | null;
    size: number | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TrainingTrendRow = {
  period: string;
  label: string;
  sessions: number;
  participants: number;
};

export type TrainingOverviewMetrics = {
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalParticipants: number;
  uniqueParticipants: number;
  totalTopics: number;
  attachmentRate: number;
  sessionsWithAttachment: number;
  byDivision: {
    divisionId: number;
    nameEn: string;
    nameCn: string;
    sessions: number;
    participants: number;
    topics: number;
  }[];
  monthlyTrend: TrainingTrendRow[];
  trendGranularity: "day" | "month";
  topParticipants: { nameEn: string; nameCn: string; sessions: number }[];
  recentSessions: TrainingSession[];
};
