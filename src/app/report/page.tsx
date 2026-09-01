"use client";

import { ReportGate } from "@/components/report/ReportGate";
import { ReportOverview } from "@/components/report/overview";

export default function ReportOverviewPage() {
  return (
    <ReportGate allow={(a) => a.canViewReportOverview}>
      <ReportOverview />
    </ReportGate>
  );
}
