"use client";

import { useEffect, useMemo, useRef } from "react";
import { OrgChart } from "d3-org-chart";
import type { ModuleCardData } from "@/data/overview";
import { divisionColor } from "@/lib/training/copy";

type OrgChartSource = NonNullable<ModuleCardData["orgChart"]>;

type FlatOrgNode = {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  kind: "company" | "division" | "person";
  accent: string;
  _expanded?: boolean;
};

type OrgChartLabels = {
  departmentManager: string;
  supervisor: string;
  lead: string;
  personel: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function orgDivisionAccent(name: string): string {
  // Match EN or CN labels after i18n translate.
  if (/logistics|物流/i.test(name)) return divisionColor("Intelligent Logistics");
  if (/^IT$|信息技术/i.test(name)) return divisionColor("IT");
  if (/^MES$/i.test(name)) return divisionColor("MES");
  return divisionColor(name);
}

function personName(person: { nameEn: string; nameCn: string }, lang: string): string {
  const full = lang === "cn" ? person.nameCn || person.nameEn : person.nameEn || person.nameCn;
  return full.trim();
}

function personInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Prefer Latin initial when present; otherwise first CJK/glyph.
  const latin = trimmed.match(/[A-Za-z]/);
  if (latin) return latin[0].toUpperCase();
  return trimmed.charAt(0).toUpperCase();
}

/** Flatten overview orgChart into d3-org-chart rows (id + parentId). */
export function mapOrgChartToFlatNodes(
  chart: OrgChartSource,
  labels: OrgChartLabels,
  lang: string
): FlatOrgNode[] {
  const rows: FlatOrgNode[] = [
    {
      id: "manager",
      parentId: null,
      name: personName(chart.leader, lang),
      role: labels.departmentManager,
      kind: "person",
      accent: "#cc271d",
      _expanded: true,
    },
  ];

  if (chart.supervisor) {
    rows.push({
      id: "supervisor",
      parentId: "manager",
      name: personName(chart.supervisor, lang),
      role: labels.supervisor,
      kind: "person",
      accent: "#f8d16d",
      _expanded: true,
    });
  }

  const divisionParentId = chart.supervisor ? "supervisor" : "manager";

  for (const division of chart.divisions) {
    const accent = orgDivisionAccent(division.name);
    const divisionId = `division:${division.name}`;
    const people = division.people ?? [];
    const count = division.personnelCount || people.length;

    rows.push({
      id: divisionId,
      parentId: divisionParentId,
      name: division.name,
      role: String(count),
      kind: "division",
      accent,
      _expanded: true,
    });

    const [lead, ...reports] = people;
    if (!lead) continue;

    const leadId = `person:${division.name}:lead`;
    rows.push({
      id: leadId,
      parentId: divisionId,
      name: personName(lead, lang),
      role: labels.lead,
      kind: "person",
      accent,
      _expanded: true,
    });

    reports.forEach((person, index) => {
      rows.push({
        id: `person:${division.name}:${index}`,
        parentId: leadId,
        name: personName(person, lang),
        role: labels.personel,
        kind: "person",
        accent,
        _expanded: true,
      });
    });
  }

  return rows;
}

function nodeHeightFor(kind: FlatOrgNode["kind"]): number {
  if (kind === "company") return 40;
  if (kind === "division") return 36;
  return 52;
}

function nodeWidthFor(kind: FlatOrgNode["kind"]): number {
  // Fixed layout slot = visual card width (ellipsis handles long EN/CN names).
  if (kind === "company") return 200;
  if (kind === "division") return 150;
  return 180;
}

function nodeHtml(data: FlatOrgNode): string {
  const name = escapeHtml(data.name);
  const role = escapeHtml(data.role);
  const accent = escapeHtml(data.accent);
  const initial = escapeHtml(personInitial(data.name));
  const width = nodeWidthFor(data.kind);
  const height = nodeHeightFor(data.kind);
  // Explicit px + overflow keeps CN glyphs from expanding past the d3 layout slot.
  const shell = `width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;padding:4px 6px;box-sizing:border-box;overflow:hidden;`;

  if (data.kind === "company") {
    return `
      <div style="${shell}">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;background:color-mix(in srgb, var(--bg, #f8fafc) 60%, transparent);padding:0 12px;text-align:center;box-sizing:border-box;overflow:hidden;">
          <div title="${name}" style="width:100%;font-size:11px;font-weight:600;line-height:1.2;color:var(--text, #0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
        </div>
      </div>`;
  }

  if (data.kind === "division") {
    return `
      <div style="${shell}">
        <div style="display:flex;width:100%;height:100%;align-items:center;gap:6px;border-radius:8px;padding:0 10px;color:#fff;background:${accent};box-shadow:0 1px 2px rgba(15,23,42,0.12);box-sizing:border-box;overflow:hidden;">
          <span title="${name}" style="min-width:0;flex:1 1 0%;font-size:10px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
          <span style="display:inline-flex;min-width:16px;height:16px;flex:0 0 auto;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,0.2);padding:0 6px;font-size:9px;font-weight:600;line-height:1;">${role}</span>
        </div>
      </div>`;
  }

  return `
    <div style="${shell}">
      <div style="display:flex;width:100%;height:100%;align-items:center;gap:8px;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;background:color-mix(in srgb,rgb(255, 255, 255) 40%, var(--surface, #ffffff));padding:0 10px 0 8px;box-sizing:border-box;overflow:hidden;">
        <span style="display:inline-flex;width:24px;height:24px;flex:0 0 auto;align-items:center;justify-content:center;border-radius:999px;background:${accent};color:#fff;font-size:10px;font-weight:600;line-height:1;">${initial}</span>
        <div style="min-width:0;flex:1 1 0%;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;overflow:hidden;">
          <div title="${name}" style="width:100%;font-size:10px;font-weight:600;line-height:1.2;color:var(--text, #0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
          <div title="${role}" style="width:100%;font-size:9px;line-height:1.2;color:var(--text-muted, #64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${role}</div>
        </div>
      </div>
    </div>`;
}

type OrgChartViewProps = {
  chart: OrgChartSource;
  labels: OrgChartLabels;
  lang: string;
  /** When true, fill parent height (expand modal) instead of enforcing min-height. */
  fill?: boolean;
};

type LayoutNode = { x: number; y: number; width: number; height: number };

type ZoomTransform = {
  k: number;
  x: number;
  y: number;
  invertX(value: number): number;
  invertY(value: number): number;
  translate(x: number, y: number): ZoomTransform;
  scale(k: number): ZoomTransform;
};

type ViewportExtent = [[number, number], [number, number]];

type OrgChartZoom = {
  scaleExtent(extent: [number, number]): OrgChartZoom;
  constrain(
    constrain: (
      transform: ZoomTransform,
      extent: ViewportExtent,
      translateExtent: ViewportExtent
    ) => ZoomTransform
  ): OrgChartZoom;
};

type OrgChartRuntime = {
  getChartState(): {
    root?: { descendants(): LayoutNode[] };
    layout: string;
    layoutBindings: Record<
      string,
      {
        nodeLeftX(node: LayoutNode): number;
        nodeRightX(node: LayoutNode): number;
        nodeTopY(node: LayoutNode): number;
        nodeBottomY(node: LayoutNode): number;
      }
    >;
    svgWidth: number;
    svgHeight: number;
    zoomBehavior: OrgChartZoom | null;
  };
};

/** Hard cap so a small tree in a large card cannot be magnified into a single glyph. */
const ORG_CHART_MAX_ZOOM = 2.5;
/**
 * At maximum zoom the svg still shows this fraction of the tree on each axis,
 * so a pan lands on a section of the chart rather than an empty gap.
 */
const ORG_CHART_MIN_VIEW_FRACTION = 0.45;
/** Padding `.fit()` adds around the tree before choosing the resting scale. */
const ORG_CHART_FIT_PADDING = 50;

function moveZoomTo(transform: ZoomTransform, k: number, x: number, y: number): ZoomTransform {
  const shifted = transform.translate((x - transform.x) / transform.k, (y - transform.y) / transform.k);
  const scaleBy = k / shifted.k;
  return scaleBy === 1 ? shifted : shifted.scale(scaleBy);
}

/**
 * Keep the viewport inside the tree rectangle. Same rule d3-zoom uses for
 * `translateExtent`: pan recenters when the tree is smaller than the svg,
 * and stops at the tree edge once zoomed in.
 */
function constrainToTree(
  transform: ZoomTransform,
  extent: ViewportExtent,
  tree: { minX: number; minY: number; maxX: number; maxY: number }
): ZoomTransform {
  const dx0 = transform.invertX(extent[0][0]) - tree.minX;
  const dx1 = transform.invertX(extent[1][0]) - tree.maxX;
  const dy0 = transform.invertY(extent[0][1]) - tree.minY;
  const dy1 = transform.invertY(extent[1][1]) - tree.maxY;
  return transform.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
  );
}

/**
 * Zoom-out and drag stop at the fitted frame. The resting scale matches
 * `.fit()`, and at that scale the tree cannot move. Zoom-in can pan only
 * inside the tree, so the chart cannot be dragged off the card.
 */
function limitOrgChartNavigation(instance: OrgChart): void {
  const state = (instance as unknown as OrgChartRuntime).getChartState();
  const { root, layout, layoutBindings, svgWidth, svgHeight, zoomBehavior } = state;
  const nodes = root?.descendants() ?? [];
  const box = layoutBindings[layout];
  if (!zoomBehavior || !box || svgWidth <= 0 || svgHeight <= 0 || nodes.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const x0 = node.x + box.nodeLeftX(node);
    const x1 = node.x + box.nodeRightX(node);
    const y0 = node.y + box.nodeTopY(node);
    const y1 = node.y + box.nodeBottomY(node);
    if (![x0, x1, y0, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) continue;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, y0);
    maxY = Math.max(maxY, y1);
  }
  if (![minX, maxX, minY, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) return;

  const paddedWidth = maxX - minX + ORG_CHART_FIT_PADDING * 2;
  const paddedHeight = maxY - minY + ORG_CHART_FIT_PADDING * 2;
  const fittedScale = Math.min(
    ORG_CHART_MAX_ZOOM,
    0.9 / Math.max(paddedWidth / svgWidth, paddedHeight / svgHeight)
  );
  if (!Number.isFinite(fittedScale) || fittedScale <= 0) return;

  const fitX = svgWidth / 2 - fittedScale * ((minX + maxX) / 2);
  const fitY = svgHeight / 2 - fittedScale * ((minY + maxY) / 2);
  const tree = { minX, minY, maxX, maxY };
  const maxZoom = Math.max(
    fittedScale,
    Math.min(
      ORG_CHART_MAX_ZOOM,
      svgWidth / ((maxX - minX) * ORG_CHART_MIN_VIEW_FRACTION),
      svgHeight / ((maxY - minY) * ORG_CHART_MIN_VIEW_FRACTION)
    )
  );

  zoomBehavior.scaleExtent([fittedScale, maxZoom]).constrain(
    (transform, extent) => {
      if (transform.k <= fittedScale * 1.001) {
        return moveZoomTo(transform, fittedScale, fitX, fitY);
      }
      return constrainToTree(transform, extent, tree);
    }
  );
}

export function OrgChartView({ chart, labels, lang, fill = false }: OrgChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<InstanceType<typeof OrgChart> | null>(null);

  const data = useMemo(
    () => mapOrgChartToFlatNodes(chart, labels, lang),
    [chart, labels, lang]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = chartRef.current ?? new OrgChart();
    chartRef.current = instance;

    const paint = () => {
      const width = Math.max(el.clientWidth, 320);
      const height = Math.max(el.clientHeight, 360);

      instance
        .container(el)
        .data(data)
        .layout("left")
        .svgWidth(width)
        .svgHeight(height)
        .nodeWidth((d) => nodeWidthFor((d.data as FlatOrgNode).kind))
        .nodeHeight((d) => nodeHeightFor((d.data as FlatOrgNode).kind))
        .childrenMargin(() => 20)
        .siblingsMargin(() => 14)
        .compactMarginBetween(() => 16)
        .compactMarginPair(() => 24)
        .compact(false)
        .initialExpandLevel(99)
        .nodeContent((d) => nodeHtml(d.data as FlatOrgNode))
        // Tree is always fully expanded — hide default +/- count buttons.
        .buttonContent(() => "")
        .nodeButtonWidth(() => 0)
        .nodeButtonHeight(() => 0)
        .nodeButtonX(() => 0)
        .nodeButtonY(() => 0)
        .linkUpdate(function () {
          // Default d3-org-chart stroke (#E4E2E9, 1px) is too faint on light theme.
          this.setAttribute("stroke", "var(--text-muted)");
          this.setAttribute("stroke-width", "2");
          this.setAttribute("fill", "none");
        })
        .render()
        .expandAll();

      // Floor zoom and pan on the fitted frame so the tree cannot be
      // minimized or dragged out of the card. Recomputed on each resize.
      limitOrgChartNavigation(instance);
      instance.fit();
    };

    // Wait one frame so flex parent has a real size.
    const frame = window.requestAnimationFrame(paint);

    let resizeTimer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(paint, 80);
    });
    observer.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      el.innerHTML = "";
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={[
        "h-full w-full overflow-hidden",
        fill ? "min-h-0" : "min-h-[24rem]",
      ].join(" ")}
    />
  );
}
