export type AuthAccountPublic = {
  id: number;
  systemUserId: number;
  employeeId: string | null;
  displayName: string;
  roleName: string | null;
  roleLabel: string;
  permissions: string[];
};

export type SessionPayload = {
  systemUserId: number;
  userId: number;
  roleName: string | null;
  exp: number;
};
