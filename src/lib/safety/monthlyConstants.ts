import type { RowDataPacket } from "mysql2/promise";

/** DB activity_type values for monthly submissions — must match database / frontend. */
export const MONTHLY_ACTIVITIES = [
  "monthly_meeting",
  "fire_drill",
  "safety_case",
  "monthly_ppt",
  "reward_finding",
] as const;

export type MonthlyActivity = (typeof MONTHLY_ACTIVITIES)[number];

export type MonthlyStatus = "completed" | "not_applicable" | "case_found" | "not_submitted";

export type MonthlyRow = RowDataPacket & {
  id: number;
  year: number;
  month: number;
  period_type: "monthly";
  week: number | null;
  activity_type: string;
  status: string;
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
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};
