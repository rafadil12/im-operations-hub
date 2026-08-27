"use client";

import { TrainingGate } from "@/components/training/TrainingGate";
import { TrainingOverview } from "@/components/training/overview";

export default function TrainingOverviewPage() {
  return (
    <TrainingGate allow={(a) => a.canViewTrainingOverview}>
      <TrainingOverview />
    </TrainingGate>
  );
}
