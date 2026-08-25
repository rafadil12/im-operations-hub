import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/auth/access";
import {
  groupPermissions,
  PERMISSION_TREE,
  type PermissionTreeDef,
} from "@/lib/auth/permissionTree";

function collectCodes(def: PermissionTreeDef): string[] {
  const own = def.codes ?? [];
  const nested = (def.children ?? []).flatMap(collectCodes);
  return [...own, ...nested];
}

function findNode(nodes: PermissionTreeDef[], id: string): PermissionTreeDef | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children ?? [], id);
    if (nested) return nested;
  }
  return undefined;
}

describe("PERMISSION_TREE", () => {
  it("covers every catalog permission so none fall under Other", () => {
    const claimed = new Set(PERMISSION_TREE.flatMap(collectCodes));
    const catalog = Object.values(PERMISSIONS);
    expect([...claimed].sort()).toEqual([...catalog].sort());

    const rows = catalog.map((code, i) => ({
      id: i + 1,
      code,
      description: code,
    }));
    const tree = groupPermissions(rows);
    expect(tree.some((n) => n.id === "other")).toBe(false);
  });

  it("nests sparepart pages under Sparepart Management like the sidebar", () => {
    const overview = findNode(PERMISSION_TREE, "sparepart-overview");
    expect(overview?.codes).toEqual([PERMISSIONS.sparepartOverviewView]);

    const management = findNode(PERMISSION_TREE, "sparepart-management");
    expect(management?.label).toEqual({
      source: "nav",
      key: "sparepartManagement",
    });
    expect(management?.children?.map((c) => c.id)).toEqual([
      "sparepart-stock",
      "sparepart-post",
      "sparepart-documents",
      "sparepart-materials",
      "sparepart-locations",
    ]);
  });

  it("places safety overview and management under Safety", () => {
    const safety = findNode(PERMISSION_TREE, "safety");
    expect(safety?.children?.map((c) => c.id)).toEqual(["safety-overview", "safety-management"]);
    expect(findNode(PERMISSION_TREE, "safety-overview")?.codes).toEqual([
      PERMISSIONS.safetyOverviewView,
    ]);
    expect(findNode(PERMISSION_TREE, "safety-management")?.codes).toEqual([
      PERMISSIONS.safetySubmissionRead,
      PERMISSIONS.safetySubmissionCreate,
      PERMISSIONS.safetySubmissionUpdate,
      PERMISSIONS.safetySubmissionDelete,
    ]);
  });

  it("uses Daily Operation sidebar labels", () => {
    expect(findNode(PERMISSION_TREE, "daily-management")?.label).toEqual({
      source: "nav",
      key: "management",
    });
    expect(findNode(PERMISSION_TREE, "daily-analysis")?.label).toEqual({
      source: "nav",
      key: "analysis",
    });
  });
});
