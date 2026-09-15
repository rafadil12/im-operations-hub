"use client";

import {
  Ticket,
  FolderOpen,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import { useLang } from "@/lib/i18n";
import SummaryCard from "./SummaryCard";
import type { KpiData } from "./types";

type Props = {
  data: KpiData;
};

export default function KpiCards({ data }: Props) {
  const { t } = useLang();

  return (
    <section aria-label="ITSM KPI overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* TOTAL */}
        <SummaryCard
          title={t.itsm.totalTickets}
          value={data.totalTickets.toLocaleString()}
          subtitle={t.itsm.allTickets}
          icon={<Ticket size={20} />}
          color="blue"
          change={Math.abs(data.totalChange)}
          trend={data.totalChange > 0 ? "up" : data.totalChange < 0 ? "down" : "flat"}
        />

        {/* OPEN */}
        <SummaryCard
          title={t.itsm.openTickets}
          value={data.openTickets.toLocaleString()}
          subtitle={t.itsm.waitingToProcess}
          icon={<FolderOpen size={20} />}
          color="orange"
        />

        {/* IN PROGRESS */}
        <SummaryCard
          title={t.itsm.inProgress}
          value={data.inProgressTickets.toLocaleString()}
          subtitle={t.itsm.beingProcessed}
          icon={<LoaderCircle size={20} />}
          color="purple"
        />

        {/* CLOSED TODAY */}
        <SummaryCard
          title={t.itsm.closedToday}
          value={data.closedToday.toLocaleString()}
          subtitle={t.itsm.completedToday}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />

        {/* OVERDUE */}
        <SummaryCard
          title={t.itsm.overdue}
          value={data.overdueTickets.toLocaleString()}
          subtitle={t.itsm.needAttention}
          icon={<AlertTriangle size={20} />}
          color="red"
        />

        {/* SERVICE REQUEST */}
        <SummaryCard
          title={t.itsm.serviceRequests}
          value={data.serviceRequests.toLocaleString()}
          subtitle={t.itsm.requestType}
          icon={<ClipboardList size={20} />}
          color="cyan"
          change={Math.abs(data.serviceChange)}
          trend={
            data.serviceChange > 0
              ? "up"
              : data.serviceChange < 0
                ? "down"
                : "flat"
          }
        />
      </div>
    </section>
  );
}
