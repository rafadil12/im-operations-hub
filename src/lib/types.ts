export type Lang = "en" | "cn";

export const STATUS_VALUES = [
  "进行中 In Progress",
  "待处理 Pending",
  "已完成 Completed",
] as const;

export type StatusValue = (typeof STATUS_VALUES)[number];

export const TYPE_VALUES = [
  "问题 Problem",
  "变更请求 Change_Request",
  "维护 Maintenance",
  "任务Task",
  "权限申请 Access_Request",
] as const;

export type TypeValue = string;

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

export type Masters = {
  divisions: Division[];
  categories: Category[];
  subcategories: Subcategory[];
  users: User[];
};

export type MesData = {
  id: number;
  user_id: number | null;
  division_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  description: string | null;
  solution: string | null;
  type: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
};

export type MesDataRow = MesData & {
  pic: string | null;
  division: string | null;
  category: string | null;
  subcategory: string | null;
};

export type MesDataInput = {
  user_id: number | null;
  division_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  description: string | null;
  solution: string | null;
  type: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
};

export type CountItem = {
  label: string;
  count: number;
};

export type TrendItem = {
  date: string;
  count: number;
};

export type TopPicItem = {
  name: string;
  count: number;
};

export type NamedCount = {
  name_en: string | null;
  name_cn: string | null;
  count: number;
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
  byStatus: CountItem[];
  byCategory: NamedCount[];
  bySubcategory: NamedCount[];
  byDivision: NamedCount[];
  byType: CountItem[];
  trend: TrendItem[];
  topPic: TopPicItem[];
  userRanking: UserRankItem[];
  durationPerDivision: DurationPoint[];
  avgDurationMinutes: number;
};
