"use client";

import {
  Building2,
  UserRound,
  Timer,
} from "lucide-react";

import { useLang } from "@/lib/i18n";
import SummaryCard from "./SummaryCard";
import type { HighlightData } from "./types";

type Props = {
  data: HighlightData;
};

export default function Highlights({ data }: Props) {
  const { t } = useLang();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title={t.itsm.highestPriorityGroup}
        value={data.highestPriorityGroup}
        subtitle={t.itsm.mostActiveSupportGroup}
        icon={<Building2 size={22} />}
        badge={`${(data.highestPriorityGroupTickets ?? 0).toLocaleString()} ${t.itsm.tickets} (${data.highestPriorityGroupPercent ?? 0}%)`}
      />

      <SummaryCard
        title={t.itsm.busiestTechnician}
        value={data.busiestTechnician}
        subtitle={t.itsm.highestAssignedTickets}
        icon={<UserRound size={22} />}
        badge={`${data.busiestTechnicianTickets.toLocaleString()} ${t.itsm.tickets} (${data.busiestTechnicianPercent}%)`}
      />

      <SummaryCard
        title={t.itsm.topRequester}
        value={data.topRequester}
        subtitle={t.itsm.mostSubmittedTickets}
        icon={<UserRound size={22} />}
        color="orange"
        badge={`${data.topRequesterTickets.toLocaleString()} ${t.itsm.tickets} (${data.topRequesterPercent}%)`}
      />

      <SummaryCard
        title={t.itsm.incidents}
        value={data.incidentCount.toLocaleString()}
        subtitle={t.itsm.nonServiceRequestTickets}
        icon={<Timer size={22} />}
        badge={`${data.incidentCount.toLocaleString()} ${t.itsm.tickets} (${data.incidentPercent}%)`}
      />
    </div>
  );
}
