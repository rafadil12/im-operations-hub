"use client";

import { useCallback } from "react";
import { useGuestForbidden } from "@/components/auth/GuestForbiddenProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";

/**
 * Blocks write actions for guest mode and shows the login prompt modal.
 * Returns true when the action may proceed (logged-in user).
 */
export function useGuestWriteGuard() {
  const { isGuest } = useRoleAccess();
  const { showGuestForbidden } = useGuestForbidden();

  return useCallback(
    (action?: () => void) => {
      if (isGuest) {
        showGuestForbidden();
        return false;
      }
      action?.();
      return true;
    },
    [isGuest, showGuestForbidden]
  );
}
