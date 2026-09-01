"use client";

import type { ModuleCardData } from "@/data/overview";
import { DefaultBody } from "./bodies/DefaultBody";
import { SafetyBody } from "./bodies/SafetyBody";
import { SparepartBody } from "./bodies/SparepartBody";
import { OrganizationBody } from "./bodies/OrganizationBody";
import { ReportBody } from "./bodies/ReportBody";
import { TrainingBody } from "./bodies/TrainingBody";

export function CardBody({ data, expanded }: { data: ModuleCardData; expanded: boolean }) {
  switch (data.layout) {
    case "safety":
      return <SafetyBody data={data} expanded={expanded} />;

    case "sparepart":
      return <SparepartBody data={data} expanded={expanded} />;

    case "organization":
      return <OrganizationBody data={data} />;

    case "report":
      return <ReportBody data={data} expanded={expanded} />;

    case "training":
      return <TrainingBody data={data} expanded={expanded} />;

    default:
      return <DefaultBody data={data} expanded={expanded} />;
  }
}
