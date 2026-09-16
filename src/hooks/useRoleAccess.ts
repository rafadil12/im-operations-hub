"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getRoleAccess, type RoleAccess } from "@/lib/auth/access";

export function useRoleAccess(): RoleAccess {
  const { account, guestPermissions } = useAuth();
  return useMemo(
    () => getRoleAccess(account, guestPermissions),
    [account, guestPermissions]
  );
}
