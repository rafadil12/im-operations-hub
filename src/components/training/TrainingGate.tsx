"use client";

import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import type { RoleAccess } from "@/lib/auth/access";

type Props = {
  children: ReactNode;
  allow: (access: RoleAccess) => boolean;
};

export function TrainingGate({ children, allow }: Props) {
  return (
    <AuthGate allow={allow} preset="dashboard">
      {children}
    </AuthGate>
  );
}
