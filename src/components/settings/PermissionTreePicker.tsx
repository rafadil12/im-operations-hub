"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collectPermissionIds,
  groupPermissions,
  type PermissionRow,
  type PermissionTreeLabel,
  type PermissionTreeNode,
} from "@/lib/auth/permissionTree";
import { useLang, type Dict } from "@/lib/i18n";

type Props = {
  permissions: PermissionRow[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

function resolveLabel(t: Dict, label: PermissionTreeLabel): string {
  if (label.source === "nav") return t.nav[label.key];
  return t.settings[label.key];
}

function selectionState(ids: number[], selected: Set<number>): "all" | "some" | "none" {
  if (ids.length === 0) return "none";
  let count = 0;
  for (const id of ids) {
    if (selected.has(id)) count += 1;
  }
  if (count === 0) return "none";
  if (count === ids.length) return "all";
  return "some";
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        "inline-flex size-4 shrink-0 items-center justify-center text-text-dim transition-transform",
        open ? "rotate-90" : "",
      ].join(" ")}
    >
      ▸
    </span>
  );
}

function GroupCheckbox({
  state,
  onToggle,
}: {
  state: "all" | "some" | "none";
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "some";
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="mt-0.5"
      checked={state === "all"}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  selected,
  onToggleExpand,
  onToggleIds,
  resolve,
}: {
  node: PermissionTreeNode;
  depth: number;
  expanded: Set<string>;
  selected: Set<number>;
  onToggleExpand: (id: string) => void;
  onToggleIds: (ids: number[], select: boolean) => void;
  resolve: (label: PermissionTreeLabel) => string;
}) {
  const ids = useMemo(() => collectPermissionIds(node), [node]);
  const state = selectionState(ids, selected);
  const isOpen = expanded.has(node.id);
  const hasNested = node.children.length > 0 || node.permissions.length > 0;
  const pad = 8 + depth * 12;

  return (
    <div>
      <div
        className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1.5 text-xs hover:bg-surface-hover"
        style={{ paddingLeft: pad }}
        onClick={() => {
          if (hasNested) onToggleExpand(node.id);
        }}
      >
        <button
          type="button"
          className="mt-0.5 shrink-0 text-text-dim"
          aria-expanded={isOpen}
          onClick={(e) => {
            e.stopPropagation();
            if (hasNested) onToggleExpand(node.id);
          }}
        >
          {hasNested ? <Chevron open={isOpen} /> : <span className="inline-block size-4" />}
        </button>
        <GroupCheckbox state={state} onToggle={() => onToggleIds(ids, state !== "all")} />
        <span className="font-semibold text-text">{resolve(node.label)}</span>
        <span className="ml-auto shrink-0 text-[10px] text-text-dim">
          {ids.filter((id) => selected.has(id)).length}/{ids.length}
        </span>
      </div>

      {isOpen ? (
        <div>
          {node.permissions.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-xs hover:bg-surface-hover"
              style={{ paddingLeft: pad + 28 }}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(p.id)}
                onChange={() => onToggleIds([p.id], !selected.has(p.id))}
              />
              <span>
                <span className="font-medium text-text">{p.description?.trim() || p.code}</span>
                {p.description ? (
                  <span className="mt-0.5 block text-text-dim">{p.code}</span>
                ) : null}
              </span>
            </label>
          ))}
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggleExpand={onToggleExpand}
              onToggleIds={onToggleIds}
              resolve={resolve}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PermissionTreePicker({ permissions, selectedIds, onChange }: Props) {
  const { t } = useLang();
  const tree = useMemo(() => groupPermissions(permissions), [permissions]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const resolve = (label: PermissionTreeLabel) => resolveLabel(t, label);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleIds = (ids: number[], select: boolean) => {
    const set = new Set(selectedIds);
    for (const id of ids) {
      if (select) set.add(id);
      else set.delete(id);
    }
    onChange([...set]);
  };

  if (tree.length === 0) {
    return <p className="px-2 py-3 text-xs text-text-muted">{t.common.noData}</p>;
  }

  return (
    <div className="min-h-80 max-h-[min(36rem,60vh)] space-y-0.5 overflow-y-auto rounded-md border border-border bg-bg/30 p-2">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          selected={selected}
          onToggleExpand={toggleExpand}
          onToggleIds={toggleIds}
          resolve={resolve}
        />
      ))}
    </div>
  );
}
