"use client";

import { ReportGate } from "@/components/report/ReportGate";
import { ReportManagement } from "@/components/report/management";

export default function ReportReportsPage() {
  return (
    <ReportGate allow={(a) => a.canViewReportLines}>
      <ReportManagement mode="reports" />
    </ReportGate>
  );
}
