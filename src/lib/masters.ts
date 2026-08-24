import { query } from "@/lib/db";
import { PROTECTED_ACCOUNT_EMPLOYEE_NO } from "@/lib/auth/access";
import type {
  Category,
  Division,
  Masters,
  MesStatus,
  MesType,
  Subcategory,
  User,
} from "@/lib/types";

export async function loadMasters(): Promise<Masters> {
  const [divisions, categories, subcategories, users, types, statuses] =
    await Promise.all([
      query<Division[]>(
        "SELECT id, name_cn, name_en FROM divisions ORDER BY id",
      ),
      query<Category[]>(
        "SELECT id, name_cn, name_en, division_id FROM categories ORDER BY name_en",
      ),
      query<Subcategory[]>(
        "SELECT id, category_id, name_cn, name_en FROM subcategories ORDER BY name_en",
      ),
      query<User[]>(
        `SELECT u.id, u.name_cn, u.name_en, u.division_id
         FROM users u
         INNER JOIN system_users su ON su.user_id = u.id
         WHERE su.is_daily_operation_pic = 1
           AND su.is_active = 1
           AND UPPER(COALESCE(u.employee_no, '')) <> ?
         ORDER BY u.name_en`,
        [PROTECTED_ACCOUNT_EMPLOYEE_NO],
      ),
      query<MesType[]>("SELECT id, name_cn, name_en FROM mes_type ORDER BY id"),
      query<MesStatus[]>(
        "SELECT id, name_cn, name_en FROM mes_status ORDER BY id",
      ),
    ]);

  return {
    divisions,
    categories,
    subcategories,
    users,
    types,
    statuses,
  };
}
