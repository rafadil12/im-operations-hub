"use client";

import KpiCards from "./KpiCards";
import Highlights from "./Highlights";
import TopTechnician from "./TopTechnician";
import TopRequester from "./TopRequester";
import RecentTickets from "./RecentTickets";
import OldestTickets from "./OldestTickets";

import type { ItsmOverviewData } from "./types";

type Props = {
  data: ItsmOverviewData;
};

export default function ItsmOverview({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI */}
      <KpiCards data={data.kpi} />

      {/* Highlights */}
      <Highlights data={data.highlights} />

      {/* Ranking */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:[&>*]:min-w-0">
        <TopTechnician rows={data.topTechnicians} />
        <TopRequester rows={data.topRequesters} />
      </div>

      {/* Ticket */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:[&>*]:min-w-0">
        <RecentTickets rows={data.recentTickets} />
        <OldestTickets rows={data.oldestTickets} />
      </div>
    </div>
  );
}
