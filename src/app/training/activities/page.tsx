"use client";

import { TrainingGate } from "@/components/training/TrainingGate";
import { TrainingActivitiesClient } from "@/components/training/activities";

export default function TrainingActivitiesPage() {
  return (
    <TrainingGate
      allow={(a) =>
        a.canViewTrainingSessions ||
        a.canCreateTrainingSession ||
        a.canUpdateTrainingSession
      }
    >
      <TrainingActivitiesClient />
    </TrainingGate>
  );
}
