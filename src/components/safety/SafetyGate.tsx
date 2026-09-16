"use client";

import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import type { RoleAccess } from "@/lib/auth/access";

type Props = {
  children: ReactNode;
  allow: (access: RoleAccess) => boolean;
};

/** Client gate for safety pages — shows a soft message when denied. */
export function SafetyGate({ children, allow }: Props) {
  return (
    <AuthGate allow={allow} preset="dashboard">
      {children}
    </AuthGate>
  );
}
