export type AuthAccountPublic = {
  id: number;
  systemUserId: number;
  employeeId: string | null;
  displayName: string;
  roleName: string | null;
  roleLabel: string;
  permissions: string[];
  /** Bumped on password change/reset; must match cookie sessionVersion. */
  sessionVersion: number;
};

export type SessionPayload = {
  systemUserId: number;
  userId: number;
  roleName: string | null;
  sessionVersion: number;
  exp: number;
};
