export interface KpiData {
  totalTickets: number;
  totalChange: number;

  openTickets: number;
  inProgressTickets: number;
  closedToday: number;
  overdueTickets: number;
  serviceRequests: number;
  serviceChange: number;
}

export interface HighlightData {
  highestPriorityGroup: string;
  highestPriorityGroupTickets: number;
  highestPriorityGroupPercent: number;

  busiestTechnician: string;
  busiestTechnicianTickets: number;
  busiestTechnicianPercent: number;

  oldestOpenTicket: string;
  oldestOpenDays: number;

  incidentCount: number;
  incidentPercent: number;
  topRequester: string;
  topRequesterTickets: number;
  topRequesterPercent: number;
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
