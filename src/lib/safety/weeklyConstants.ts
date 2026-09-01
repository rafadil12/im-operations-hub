/** DB activity_type values for weekly submissions. */
export const WEEKLY_ACTIVITY_TYPES = [
  "training",
  "routine_meeting",
  "hse_tuesday",
  "ert",
  "five_s",
  "potential_hazard",
] as const;

export type WeeklyActivityType = (typeof WEEKLY_ACTIVITY_TYPES)[number];

export type WeeklyDatabaseRow = {
  id: number;
  year: number;
  month: number;
  period_type: "weekly";
  week: number;
  activity_type: string;
  status: "completed" | "not_submitted" | "not_applicable" | "case_found";
  submission_date: string | null;
  pic: string | null;
  pic_en: string | null;
  pic_cn: string | null;
  location: string | null;
  description: string | null;
  description_en: string | null;
  description_cn: string | null;
  file_name: string | null;
  file_url: string | null;
};

export type WeeklyDatabaseFile = {
  id: number;
  submission_id: number;
  original_name: string;
  stored_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  file_group: string;
};

export function isWeeklyActivityType(value: string): value is WeeklyActivityType {
  return WEEKLY_ACTIVITY_TYPES.includes(value as WeeklyActivityType);
}
