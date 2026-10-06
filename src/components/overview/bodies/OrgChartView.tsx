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
  if (/logistics/i.test(name)) return divisionColor("Intelligent Logistics");
  return divisionColor(name);
}

function personName(person: { nameEn: string; nameCn: string }, lang: string): string {
  const full = lang === "cn" ? person.nameCn || person.nameEn : person.nameEn || person.nameCn;
  return full.trim();
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
      name: chart.leader,
      role: labels.departmentManager,
      kind: "person",
      accent: "#f97316",
      _expanded: true,
    },
  ];

  for (const division of chart.divisions) {
    const accent = orgDivisionAccent(division.name);
    const divisionId = `division:${division.name}`;
    const people = division.people ?? [];
    const count = division.personnelCount || people.length;

    rows.push({
      id: divisionId,
      parentId: "manager",
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

function nodeHtml(data: FlatOrgNode): string {
  const name = escapeHtml(data.name);
  const role = escapeHtml(data.role);
  const accent = escapeHtml(data.accent);
  const initial = escapeHtml(data.name.trim().charAt(0).toUpperCase() || "?");

  if (data.kind === "company") {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:6px 12px;box-sizing:border-box;">
        <div style="width:100%;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;background:color-mix(in srgb, var(--bg, #f8fafc) 60%, transparent);padding:8px 12px;text-align:center;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--text, #0f172a);">${name}</div>
        </div>
      </div>`;
  }

  if (data.kind === "division") {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:4px 8px;box-sizing:border-box;">
        <div style="display:inline-flex;align-items:center;gap:8px;border-radius:8px;padding:8px 16px;color:#fff;background:${accent};box-shadow:0 1px 2px rgba(15,23,42,0.12);">
          <span style="font-size:10px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">${name}</span>
          <span style="display:inline-flex;min-width:16px;height:16px;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,0.2);padding:0 6px;font-size:9px;font-weight:600;">${role}</span>
        </div>
      </div>`;
  }

  return `
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:4px 8px;box-sizing:border-box;">
      <div style="display:inline-flex;max-width:100%;align-items:center;gap:8px;border:1px solid var(--border-subtle, #e2e8f0);border-radius:8px;background:color-mix(in srgb, var(--bg, #f8fafc) 60%, transparent);padding:8px 14px 8px 8px;">
        <span style="display:inline-flex;width:24px;height:24px;flex-shrink:0;align-items:center;justify-content:center;border-radius:999px;background:${accent};color:#fff;font-size:10px;font-weight:600;">${initial}</span>
        <div style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--text, #0f172a);white-space:nowrap;">${name}</div>
          <div style="font-size:9px;color:var(--text-muted, #64748b);">${role}</div>
        </div>
      </div>
    </div>`;
}

function nodeHeightFor(kind: FlatOrgNode["kind"]): number {
  if (kind === "company") return 40;
  if (kind === "division") return 36;
  return 52;
}

function nodeWidthFor(kind: FlatOrgNode["kind"]): number {
  if (kind === "company") return 220;
  if (kind === "division") return 180;
  return 200;
}

type OrgChartViewProps = {
  chart: OrgChartSource;
  labels: OrgChartLabels;
  lang: string;
};

export function OrgChartView({ chart, labels, lang }: OrgChartViewProps) {
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
        .childrenMargin(() => 40)
        .siblingsMargin(() => 14)
        .compactMarginBetween(() => 16)
        .compactMarginPair(() => 24)
        .compact(false)
        .initialExpandLevel(99)
        .nodeContent((d) => nodeHtml(d.data as FlatOrgNode))
        .linkUpdate(function () {
          // Default d3-org-chart stroke (#E4E2E9, 1px) is too faint on light theme.
          this.setAttribute("stroke", "var(--text-muted)");
          this.setAttribute("stroke-width", "2");
          this.setAttribute("fill", "none");
        })
        .render()
        .expandAll()
        .fit();
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

  return <div ref={containerRef} className="h-full min-h-[24rem] w-full overflow-hidden" />;
}
