"use client";

import {
  Ticket,
  FolderOpen,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import SummaryCard from "./SummaryCard";
import type { KpiData } from "./types";

type Props = {
  data: KpiData;
};

export default function KpiCards({ data }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

      <SummaryCard
        title="Total Tickets"
        value={data.totalTickets.toLocaleString()}
        subtitle="All Tickets"
        icon={<Ticket size={22} />}
      />

      <SummaryCard
        title="Open Tickets"
        value={data.openTickets.toLocaleString()}
        subtitle="Waiting to Process"
        icon={<FolderOpen size={22} />}
      />

      <SummaryCard
        title="In Progress"
        value={data.inProgressTickets.toLocaleString()}
        subtitle="Being Processed"
        icon={<LoaderCircle size={22} />}
      />

      <SummaryCard
        title="Closed Today"
        value={data.closedToday.toLocaleString()}
        subtitle="Completed Today"
        icon={<CheckCircle2 size={22} />}
      />

      <SummaryCard
        title="Overdue"
        value={data.overdueTickets.toLocaleString()}
        subtitle="Need Attention"
        icon={<AlertTriangle size={22} />}
      />

      <SummaryCard
        title="Service Requests"
        value={data.serviceRequests.toLocaleString()}
        subtitle="Request Type"
        icon={<ClipboardList size={22} />}
        />
    </div>
  );
}