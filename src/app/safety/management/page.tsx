"use client";

import { SafetyGate } from "@/components/safety/SafetyGate";
import { SafetyManagementClient } from "@/components/safety/management/SafetyManagementClient";

export default function SafetyManagementPage() {
  return (
    <SafetyGate
      allow={(a) =>
        a.canViewSafetySubmissions || a.canCreateSafetySubmission || a.canUpdateSafetySubmission
      }
    >
      <SafetyManagementClient />
    </SafetyGate>
  );
}
