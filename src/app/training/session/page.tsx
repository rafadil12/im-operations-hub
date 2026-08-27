"use client";

import { TrainingGate } from "@/components/training/TrainingGate";
import { TrainingSessionClient } from "@/components/training/session";

export default function TrainingSessionPage() {
  return (
    <TrainingGate
      allow={(a) =>
        a.canViewTrainingSessions ||
        a.canCreateTrainingSession ||
        a.canUpdateTrainingSession
      }
    >
      <TrainingSessionClient />
    </TrainingGate>
  );
}
