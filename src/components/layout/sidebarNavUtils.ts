import type { NavChild, NavItem } from "./sidebarConfig";

export function isChildActive(pathname: string, child: NavChild): boolean {
  if (child.children?.length) {
    return child.children.some((nested) => isChildActive(pathname, nested));
  }

  if (!child.href) return false;

  // Halaman utama module harus exact match.
  // Contoh:
  // /safety         -> aktif hanya di /safety
  // /safety/management -> tidak membuat /safety ikut aktif
  if (child.href === "/itsm" || child.href === "/sparepart" || child.href === "/safety" || child.href === "/training") {
    return pathname === child.href;
  }

  // Daily Operation Configuration
  if (child.href === "/daily-operation/configuration/users") {
    return pathname.startsWith("/daily-operation/configuration");
  }

  // Settings
  if (child.href.startsWith("/settings/")) {
    return pathname === child.href || pathname.startsWith(`${child.href}/`);
  }

  // Menu lain:
  // aktif jika URL sama persis atau berada di bawah URL tersebut.
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

export function flattenNavLeaves(children: NavChild[]): NavChild[] {
  const leaves: NavChild[] = [];
  for (const child of children) {
    if (child.children?.length) {
      leaves.push(...flattenNavLeaves(child.children));
    } else {
      leaves.push(child);
    }
  }
  return leaves;
}

export function isSparepartLeafVisible(
  childId: string,
  access: {
    canViewSparepartStock: boolean;
    canPostSparepartDocument: boolean;
    canViewSparepartDocuments: boolean;
    canViewSparepartMaterials: boolean;
    canManageSparepartLocations: boolean;
  }
) {
  if (childId === "stock") return access.canViewSparepartStock;
  if (childId === "post") return access.canPostSparepartDocument;
  if (childId === "documents") return access.canViewSparepartDocuments;
  if (childId === "materials") return access.canViewSparepartMaterials;
  if (childId === "locations") return access.canManageSparepartLocations;
  return true;
}

export function isParentActive(pathname: string, item: NavItem) {
  if (item.children?.length) {
    return item.children.some((child) => isChildActive(pathname, child));
  }
  if (item.href === "/") return pathname === "/";
  if (item.href) return pathname.startsWith(item.href);
  return false;
}
