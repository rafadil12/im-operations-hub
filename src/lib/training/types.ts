export type TrainingLanguage = "en" | "cn";

export const TRAINING_CATEGORIES = ["mes", "intelligent", "it"] as const;

export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export type TrainingSessionRow = {
  id: number;
  session_date: string;
  category: TrainingCategory;
  topic: string;
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
  participant_name: string;
};

export type TrainingParticipantMasterRow = {
  id: number;
  name: string;
  is_active: number;
};

export type TrainingSession = {
  id: number;
  sessionDate: string;
  category: TrainingCategory;
  topic: string;
  participantCount: number;
  participants: string[];
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
  byCategory: { category: TrainingCategory; sessions: number; participants: number; topics: number }[];
  monthlyTrend: TrainingTrendRow[];
  trendGranularity: "day" | "month";
  topParticipants: { name: string; sessions: number }[];
  recentSessions: TrainingSession[];
};
