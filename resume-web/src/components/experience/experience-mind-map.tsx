import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import {
  buildExperienceGraph,
  getExperienceMapFitNodes,
  parseActivityNodeId,
  type ExperienceMapDisplayMode,
} from '@/lib/experience-graph';
import type { ExperienceResponse } from '@/lib/api';
import { experienceNodeTypes } from '@/components/experience/experience-map-nodes';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Props = {
  experiences: ExperienceResponse[];
  rootLabel: string;
  selectedExperienceId: string | null;
  displayMode: ExperienceMapDisplayMode;
  onSelectExperience: (id: string | null) => void;
  onOpenExperience?: (id: string) => void;
  className?: string;
};

const OVERVIEW_FIT = { padding: 0.28, minZoom: 0.82, maxZoom: 1, duration: 0 };
const DETAIL_FIT = { padding: 0.36, minZoom: 0.45, maxZoom: 1, duration: 200 };
const SELECT_FIT = { padding: 0.42, minZoom: 0.55, maxZoom: 1, duration: 0 };

function ExperienceMindMapCanvas({
  experiences,
  rootLabel,
  selectedExperienceId,
  displayMode,
  onSelectExperience,
  onOpenExperience,
}: Omit<Props, 'className'>) {
  const { fitView } = useReactFlow();
  const { theme } = useTheme();
  const backgroundDotColor = theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const lastFitKeyRef = useRef('');

  const graph = useMemo(
    () =>
      buildExperienceGraph(experiences, rootLabel, {
        displayMode,
        selectedExperienceId,
      }),
    [experiences, rootLabel, displayMode, selectedExperienceId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph.nodes, graph.edges, setNodes, setEdges]);

  const experiencesSignature = useMemo(
    () => experiences.map((e) => `${e.id}:${e.updatedAt}`).join('|'),
    [experiences],
  );

  useEffect(() => {
    if (graph.nodes.length === 0) return;

    const fitKey =
      displayMode === 'expanded'
        ? `expanded:${experiencesSignature}:${rootLabel}`
        : `compact:${experiencesSignature}:${rootLabel}:${selectedExperienceId ?? 'none'}`;

    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;

    const frame = requestAnimationFrame(() => {
      const fitTargets = getExperienceMapFitNodes(graph.nodes, displayMode, selectedExperienceId);
      const isOverview =
        displayMode === 'compact' &&
        !selectedExperienceId &&
        fitTargets.every((n) => n.data.kind !== 'activity');

      if (displayMode === 'expanded') {
        void fitView({ nodes: fitTargets, ...DETAIL_FIT });
        return;
      }

      if (selectedExperienceId) {
        void fitView({ nodes: fitTargets, ...SELECT_FIT });
        return;
      }

      void fitView({
        nodes: fitTargets.length > 0 ? fitTargets : graph.nodes,
        ...(isOverview ? OVERVIEW_FIT : DETAIL_FIT),
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [graph.nodes, displayMode, selectedExperienceId, experiencesSignature, rootLabel, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      event.stopPropagation();
      const expId = parseActivityNodeId(node.id);
      if (!expId) return;

      // detail=2: 더블클릭 두 번째 click → 상세 모달 (지연 없음)
      if (event.detail >= 2) {
        onOpenExperience?.(expId);
        return;
      }

      onSelectExperience(expId);
    },
    [onSelectExperience, onOpenExperience],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (event, node) => {
      event.stopPropagation();
      const expId = parseActivityNodeId(node.id);
      if (expId) onOpenExperience?.(expId);
    },
    [onOpenExperience],
  );

  const selectedNodeIds = useMemo(() => {
    if (!selectedExperienceId) return new Set<string>();
    return new Set([`exp-${selectedExperienceId}`]);
  }, [selectedExperienceId]);

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: selectedNodeIds.has(node.id),
      })),
    [nodes, selectedNodeIds],
  );

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      nodeTypes={experienceNodeTypes}
      defaultEdgeOptions={{
        type: 'default',
        style: { strokeWidth: 1.5, opacity: 0.45 },
        className: 'experience-map-edge',
      }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      zoomOnDoubleClick={false}
      minZoom={0.35}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color={backgroundDotColor} />
      <Controls showInteractive={false} className="experience-map-controls" />
    </ReactFlow>
  );
}

export function ExperienceMindMap({
  experiences,
  rootLabel,
  selectedExperienceId,
  displayMode,
  onSelectExperience,
  onOpenExperience,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'experience-map h-full min-h-[inherit] w-full rounded-lg border bg-muted/20',
        className,
      )}
    >
      <ReactFlowProvider>
        <ExperienceMindMapCanvas
          experiences={experiences}
          rootLabel={rootLabel}
          selectedExperienceId={selectedExperienceId}
          displayMode={displayMode}
          onSelectExperience={onSelectExperience}
          onOpenExperience={onOpenExperience}
        />
      </ReactFlowProvider>
    </div>
  );
}
