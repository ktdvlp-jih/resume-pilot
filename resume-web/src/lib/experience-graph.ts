import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { ExperienceResponse } from '@/lib/api';

export type ExperienceNodeKind = 'root' | 'year' | 'activity';

export type ExperienceMapDisplayMode = 'compact' | 'expanded';

export type ExperienceFlowNodeData = {
  kind: ExperienceNodeKind;
  label: string;
  yearKey?: string;
  experienceId?: string;
  experience?: ExperienceResponse;
  expanded?: boolean;
};

const NODE_SIZES: Record<Exclude<ExperienceNodeKind, 'activity'>, { width: number; height: number }> = {
  root: { width: 200, height: 52 },
  year: { width: 120, height: 44 },
};

const COMPACT_ACTIVITY = { width: 220, height: 64 };

const UNKNOWN_YEAR = 'unknown';

export function experienceYearKey(exp: ExperienceResponse): string {
  const raw = exp.startDate?.trim() || exp.endDate?.trim();
  if (!raw) return UNKNOWN_YEAR;
  const year = raw.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : UNKNOWN_YEAR;
}

export function isActivityNodeExpanded(
  experienceId: string,
  displayMode: ExperienceMapDisplayMode,
  selectedExperienceId?: string | null,
): boolean {
  if (displayMode === 'expanded') return true;
  return selectedExperienceId === experienceId;
}

/** dagre 배치용 — 펼친 노드는 내용 길이에 따라 높이 산정 */
export function estimateActivityNodeSize(exp: ExperienceResponse): { width: number; height: number } {
  const width = 288;
  let height = 56;

  if (exp.role?.trim()) height += 22;

  const desc = (exp.description ?? '').trim();
  if (desc) {
    height += Math.min(78, 22 + Math.ceil(desc.length / 34) * 15);
  }

  const result = (exp.result ?? '').trim();
  if (result) {
    height += Math.min(48, 20 + Math.ceil(result.length / 34) * 15);
  }

  const skillCount = exp.skills?.filter((s) => s.trim()).length ?? 0;
  if (skillCount > 0) height += 34;

  return { width, height: Math.min(Math.max(height, COMPACT_ACTIVITY.height), 292) };
}

function getNodeSize(node: Node<ExperienceFlowNodeData>): { width: number; height: number } {
  if (node.data.kind === 'activity') {
    if (node.data.expanded && node.data.experience) {
      return estimateActivityNodeSize(node.data.experience);
    }
    return COMPACT_ACTIVITY;
  }
  return NODE_SIZES[node.data.kind];
}

function hasExpandedActivities(nodes: Node<ExperienceFlowNodeData>[]): boolean {
  return nodes.some((n) => n.data.kind === 'activity' && n.data.expanded);
}

export function buildExperienceGraph(
  experiences: ExperienceResponse[],
  rootLabel: string,
  options: {
    displayMode?: ExperienceMapDisplayMode;
    selectedExperienceId?: string | null;
  } = {},
): { nodes: Node<ExperienceFlowNodeData>[]; edges: Edge[]; byExperienceId: Map<string, ExperienceResponse> } {
  const displayMode = options.displayMode ?? 'compact';
  const selectedExperienceId = options.selectedExperienceId ?? null;

  const byExperienceId = new Map<string, ExperienceResponse>();
  for (const exp of experiences) {
    byExperienceId.set(exp.id, exp);
  }

  const nodes: Node<ExperienceFlowNodeData>[] = [
    {
      id: 'root',
      type: 'experienceRoot',
      position: { x: 0, y: 0 },
      data: { kind: 'root', label: rootLabel },
      selectable: false,
      draggable: false,
    },
  ];
  const edges: Edge[] = [];

  const byYear = new Map<string, ExperienceResponse[]>();
  for (const exp of experiences) {
    const key = experienceYearKey(exp);
    const list = byYear.get(key) ?? [];
    list.push(exp);
    byYear.set(key, list);
  }

  const yearKeys = Array.from(byYear.keys()).sort((a, b) => {
    if (a === UNKNOWN_YEAR) return 1;
    if (b === UNKNOWN_YEAR) return -1;
    return b.localeCompare(a);
  });

  for (const yearKey of yearKeys) {
    const yearId = `year-${yearKey}`;
    nodes.push({
      id: yearId,
      type: 'experienceYear',
      position: { x: 0, y: 0 },
      data: { kind: 'year', label: yearKey === UNKNOWN_YEAR ? '—' : `${yearKey}`, yearKey },
      selectable: false,
      draggable: false,
    });
    edges.push({ id: `e-root-${yearId}`, source: 'root', target: yearId });

    const items = [...(byYear.get(yearKey) ?? [])].sort((a, b) =>
      (b.startDate ?? '').localeCompare(a.startDate ?? ''),
    );

    for (const exp of items) {
      const actId = `exp-${exp.id}`;
      const expanded = isActivityNodeExpanded(exp.id, displayMode, selectedExperienceId);
      nodes.push({
        id: actId,
        type: 'experienceActivity',
        position: { x: 0, y: 0 },
        data: {
          kind: 'activity',
          label: exp.title,
          experienceId: exp.id,
          experience: exp,
          expanded,
        },
      });
      edges.push({ id: `e-${yearId}-${actId}`, source: yearId, target: actId });
    }
  }

  return { nodes: layoutExperienceNodes(nodes, edges), edges, byExperienceId };
}

export function layoutExperienceNodes(
  nodes: Node<ExperienceFlowNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR',
): Node<ExperienceFlowNodeData>[] {
  const expandedLayout = hasExpandedActivities(nodes);
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: expandedLayout ? 52 : 36,
    ranksep: expandedLayout ? 128 : 88,
  });

  for (const node of nodes) {
    const size = getNodeSize(node);
    graph.setNode(node.id, { width: size.width, height: size.height });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const pos = graph.node(node.id);
    const size = getNodeSize(node);
    return {
      ...node,
      position: {
        x: pos.x - size.width / 2,
        y: pos.y - size.height / 2,
      },
    };
  });
}

export function aggregateSkillCounts(
  experiences: ExperienceResponse[],
  selectedExperienceId?: string | null,
): { name: string; count: number }[] {
  const source =
    selectedExperienceId != null
      ? experiences.filter((e) => e.id === selectedExperienceId)
      : experiences;
  const counts = new Map<string, number>();
  for (const exp of source) {
    for (const skill of exp.skills ?? []) {
      const name = skill.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function parseActivityNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith('exp-')) return null;
  return nodeId.slice(4);
}

/** 초기 뷰: 루트·연도만 (경험 노드까지 fit하면 과도하게 축소됨) */
export function getExperienceMapOverviewNodes(
  nodes: Node<ExperienceFlowNodeData>[],
): Node<ExperienceFlowNodeData>[] {
  return nodes.filter((n) => n.data.kind === 'root' || n.data.kind === 'year');
}

/** 전체 펼침·선택 노드 fit 대상 */
export function getExperienceMapFitNodes(
  nodes: Node<ExperienceFlowNodeData>[],
  displayMode: ExperienceMapDisplayMode,
  selectedExperienceId: string | null,
): Node<ExperienceFlowNodeData>[] {
  if (displayMode === 'expanded') {
    return nodes;
  }
  if (selectedExperienceId) {
    const selected = nodes.find((n) => n.id === `exp-${selectedExperienceId}`);
    if (selected) return [selected];
  }
  return getExperienceMapOverviewNodes(nodes);
}
