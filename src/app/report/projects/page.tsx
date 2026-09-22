"use client";

import { ReportGate } from "@/components/report/ReportGate";
import { ReportProjectsClient } from "@/components/report/projects";

export default function ReportProjectsPage() {
  return (
    <ReportGate allow={(a) => a.canViewReportProjects}>
      <ReportProjectsClient />
    </ReportGate>
  );
}
