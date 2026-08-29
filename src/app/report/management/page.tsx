"use client";

import { ReportGate } from "@/components/report/ReportGate";
import { ReportManagement } from "@/components/report/management";

export default function ReportManagementPage() {
  return (
    <ReportGate allow={(a) => a.canViewReportLines}>
      <ReportManagement />
    </ReportGate>
  );
}
