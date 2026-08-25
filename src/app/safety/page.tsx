"use client";

import { SafetyGate } from "@/components/safety/SafetyGate";
import { SafetyOverview } from "@/components/safety/overview";

export default function SafetyOverviewPage() {
  return (
    <SafetyGate allow={(a) => a.canViewSafetyOverview}>
      <SafetyOverview />
    </SafetyGate>
  );
}
