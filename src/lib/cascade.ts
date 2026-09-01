import type { Category, Masters, Subcategory, User } from "@/lib/types";

export function categoriesForDivision(masters: Masters, divisionId: number | null): Category[] {
  if (!divisionId) return masters.categories;
  return masters.categories.filter((c) => c.division_id === divisionId);
}

export function subcategoriesForCategory(
  masters: Masters,
  categoryId: number | null
): Subcategory[] {
  if (!categoryId) return [];
  return masters.subcategories.filter((s) => s.category_id === categoryId);
}

export function usersForDivision(masters: Masters, divisionId: number | null): User[] {
  if (!divisionId) return masters.users;
  return masters.users.filter((u) => u.division_id === divisionId);
}
