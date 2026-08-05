"use client";

import {
  Building2,
  UserRound,
  Clock3,
  Timer,
} from "lucide-react";

import SummaryCard from "./SummaryCard";
import type { HighlightData } from "./types";

type Props = {
  data: HighlightData;
};

export default function Highlights({ data }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">

      <SummaryCard
        title="Highest Priority Group"
        value={data.highestPriorityGroup}
        subtitle="Most Active Support Group"
        icon={<Building2 size={22} />}
      />

      <SummaryCard
        title="Busiest Technician"
        value={data.busiestTechnician}
        subtitle="Highest Assigned Tickets"
        icon={<UserRound size={22} />}
      />

      <SummaryCard
        title="Oldest Open Ticket"
        value={data.oldestOpenTicket}
        subtitle="Longest Pending Ticket"
        icon={<Clock3 size={22} />}
      />

      <SummaryCard
        title="Incidents"
        value={data.averageResolutionTime}
        subtitle="Non-Service Request Tickets"
        icon={<Timer size={22} />}
      />

    </div>
  );
}