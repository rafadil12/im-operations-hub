export type AuthAccountPublic = {
  id: number;
  email: string;
  employeeId: string | null;
  displayName: string;
  roleLabel: string;
};

export type AuthAccountRow = {
  id: number;
  email: string;
  employee_id: string | null;
  password_hash: string;
  display_name: string;
  role_label: string;
  is_active: number;
};

export type SessionPayload = {
  sub: number;
  email: string;
  displayName: string;
  roleLabel: string;
};

export const AUTH_COOKIE_NAME = "im_ops_session";
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 8; // 8 hours
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 days
