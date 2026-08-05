export interface KpiData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  closedToday: number;
  overdueTickets: number;
  serviceRequests: number;
}

export interface HighlightData {
  highestPriorityGroup: string;
  busiestTechnician: string;
  oldestOpenTicket: string;
  averageResolutionTime: string;
}

export interface TechnicianRanking {
  technician: string;
  totalTickets: number;
}

export interface RequesterRanking {
  requester: string;
  totalTickets: number;
}

export interface RecentTicket {
  requestId: string;
  subject: string;
  requester: string;
  technician: string;
  status: string;
  createdDate: string;
}

export interface OldestTicket {
  requestId: string;
  subject: string;
  technician: string;
  daysOpen: number;
}

export interface ItsmOverviewData {
  kpi: KpiData;
  highlights: HighlightData;
  topTechnicians: TechnicianRanking[];
  topRequesters: RequesterRanking[];
  recentTickets: RecentTicket[];
  oldestTickets: OldestTicket[];
}