import type { NamedCount, TrendComparison } from "./shared";

export type RequesterCount = {
  name: string;
  count: number;
};

export type TechnicianCount = {
  name: string;
  count: number;
};

export type ItsmAnalysisResult = {
  total: number;

  openTickets: number;
  closedTickets: number;
  activeUsers: number;
  avgTicketsPerDay: number;

  byStatus: NamedCount[];
  byGroup: NamedCount[];
  technicianRanking: TechnicianCount[];
  requesterRanking: RequesterCount[];
  byPriority: NamedCount[];
  byRequestType: NamedCount[];

  trend: TrendComparison;
};

export type ItsmAnalysisResponse = {
  result: ItsmAnalysisResult;
};

export type ItsmRequest = {
  request_id: number;
  subject: string;
  requester: string;
  technician: string;
  due_by_date: string | null;
  status: string;
  created_date: string;
  site: string | null;
  priority: string | null;
  group_name: string | null;
  is_service_request: boolean;
};
