"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getRoleAccess, type RoleAccess } from "@/lib/auth/access";

export function useRoleAccess(): RoleAccess {
  const { account } = useAuth();
  return useMemo(() => getRoleAccess(account), [account]);
}
