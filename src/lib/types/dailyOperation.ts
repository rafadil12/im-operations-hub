import type { NamedCount, TopPicItem, TrendItem } from "./shared";

export type Division = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type Category = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export type Subcategory = {
  id: number;
  category_id: number | null;
  name_cn: string | null;
  name_en: string | null;
};

export type User = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
  division_id: number | null;
};

export type MesType = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type MesStatus = {
  id: number;
  name_cn: string | null;
  name_en: string | null;
};

export type Masters = {
  divisions: Division[];
  categories: Category[];
  subcategories: Subcategory[];
  users: User[];
  types: MesType[];
  statuses: MesStatus[];
};

export type MesData = {
  id: number;
  user_id: number;
  division_id: number;
  category_id: number;
  subcategory_id: number;
  description_cn: string;
  description_en: string | null;
  solution_cn: string | null;
  solution_en: string | null;
  type_id: number;
  status_id: number;
  start_time: string;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MesDataRow = MesData & {
  pic_en: string | null;
  pic_cn: string | null;
  division_en: string | null;
  division_cn: string | null;
  category_en: string | null;
  category_cn: string | null;
  subcategory_en: string | null;
  subcategory_cn: string | null;
  type_en: string | null;
  type_cn: string | null;
  status_en: string | null;
  status_cn: string | null;
};

export type MesDataInput = {
  user_id: number;
  division_id: number;
  category_id: number;
  subcategory_id: number;
  description_cn: string;
  description_en: string;
  solution_cn: string;
  solution_en: string;
  type_id: number;
  status_id: number;
  start_time: string;
  end_time: string;
};

export type UserRankItem = {
  name_en: string | null;
  name_cn: string | null;
  division: string | null;
  count: number;
};

export type DurationPoint = {
  division: string | null;
  duration_hours: number;
};

export type AnalysisResult = {
  total: number;
  totalUsers: number;
  avgTasks: number;
  byStatus: NamedCount[];
  byCategory: NamedCount[];
  bySubcategory: NamedCount[];
  byDivision: NamedCount[];
  byType: NamedCount[];
  trend: TrendItem[];
  topPic: TopPicItem[];
  userRanking: UserRankItem[];
  durationPerDivision: DurationPoint[];
  avgDurationMinutes: number;
};
