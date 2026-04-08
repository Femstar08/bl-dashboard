'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { Requirement } from '@/lib/types-requirements'
import { STATUS_COLORS } from '@/lib/types-requirements'

interface RequirementsDepsProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
}

/** Simple seeded hash for deterministic Y offset */
function seededOffset(refId: string): number {
  let hash = 0
  for (let i = 0; i < refId.length; i++) {
    hash = (hash * 31 + refId.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 30) - 15
}

/** Determine if a hex colour is "light" (needs dark text) */
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

/** Darken a hex colour by a fraction (0-1) */
function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '')
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Canonical phase ordering */
const PHASE_ORDER = [
  'Phase 0', 'Phase 1', 'Phase 1.5', 'Phase 2', 'Phase 3',
  'Phase 4', 'Phase 5', 'Phase 6', 'Phase 7', 'Phase 8',
  'Phase 9', 'Phase 10', 'Phase 11', 'Phase 12',
]

function phaseIndex(phase: string): number {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx >= 0 ? idx : PHASE_ORDER.length
}

/**
 * Compute the longest chain of incomplete items (critical path) on the DAG.
 * Returns the set of edge ids on the critical path.
 */
function computeCriticalPath(
  items: Requirement[],
  refMap: Map<string, Requirement>,
): Set<string> {
  // Longest-path on a DAG via topological order + DP
  // We only consider items that are NOT Done
  const incomplete = new Set<string>()
  for (const item of items) {
    if (item.status !== 'Done') incomplete.add(item.ref_id)
  }

  // Build adjacency: dep -> dependents (forward edges)
  const dependents = new Map<string, string[]>()
  for (const item of items) {
    if (!incomplete.has(item.ref_id)) continue
    for (const dep of item.dependencies) {
      if (!incomplete.has(dep)) continue
      if (!dependents.has(dep)) dependents.set(dep, [])
      dependents.get(dep)!.push(item.ref_id)
    }
  }

  // Compute longest path from each node (memoised)
  const dist = new Map<string, number>()
  const next = new Map<string, string | null>()

  function longestFrom(node: string): number {
    if (dist.has(node)) return dist.get(node)!
    let best = 0
    let bestNext: string | null = null
    for (const child of dependents.get(node) ?? []) {
      const d = 1 + longestFrom(child)
      if (d > best) {
        best = d
        bestNext = child
      }
    }
    dist.set(node, best)
    next.set(node, bestNext)
    return best
  }

  Array.from(incomplete).forEach(refId => {
    longestFrom(refId)
  })

  // Find the starting node with the longest path
  let maxDist = 0
  let start: string | null = null
  Array.from(dist.entries()).forEach(([refId, d]) => {
    if (d > maxDist) {
      maxDist = d
      start = refId
    }
  })

  // Walk the path and collect edge ids
  const criticalEdges = new Set<string>()
  let cur: string | null = start
  while (cur) {
    const nxt: string | null = next.get(cur) ?? null
    if (nxt) {
      // Edge goes from cur (dependency) to nxt (dependent)
      criticalEdges.add(`${cur}->${nxt}`)
    }
    cur = nxt
  }

  return criticalEdges
}

function DepsGraph({ items, onSelect }: RequirementsDepsProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const refMap = new Map<string, Requirement>()
    for (const item of items) refMap.set(item.ref_id, item)

    // Determine which ref_ids participate in dependency relationships
    const participates = new Set<string>()
    for (const item of items) {
      if (item.dependencies.length > 0) {
        participates.add(item.ref_id)
        for (const dep of item.dependencies) {
          if (refMap.has(dep)) participates.add(dep)
        }
      }
    }

    // Group participating nodes by phase
    const phaseGroups = new Map<string, Requirement[]>()
    for (const item of items) {
      if (!participates.has(item.ref_id)) continue
      if (!phaseGroups.has(item.phase)) phaseGroups.set(item.phase, [])
      phaseGroups.get(item.phase)!.push(item)
    }

    // Sort phases
    const sortedPhases = Array.from(phaseGroups.keys()).sort(
      (a, b) => phaseIndex(a) - phaseIndex(b)
    )

    // Build nodes
    const nodes: Node[] = []
    for (const phase of sortedPhases) {
      const pIdx = phaseIndex(phase)
      const group = phaseGroups.get(phase)!
      group.forEach((item, i) => {
        const bg = STATUS_COLORS[item.status] ?? '#8892a8'
        const light = isLightColor(bg)
        nodes.push({
          id: item.ref_id,
          position: { x: pIdx * 200, y: i * 60 + seededOffset(item.ref_id) },
          data: { label: item.ref_id, requirement: item },
          style: {
            background: bg,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 10,
            fontWeight: 600,
            border: `1px solid ${darkenColor(bg, 0.25)}`,
            color: light ? '#1a1a2e' : '#ffffff',
          },
        })
      })
    }

    // Build edges
    const edges: Edge[] = []
    for (const item of items) {
      if (!participates.has(item.ref_id)) continue
      for (const dep of item.dependencies) {
        if (!refMap.has(dep) || !participates.has(dep)) continue
        edges.push({
          id: `${dep}->${item.ref_id}`,
          source: dep,
          target: item.ref_id,
          animated: false,
          style: { stroke: 'var(--border)', strokeWidth: 1.5 },
        })
      }
    }

    // Highlight critical path
    const criticalEdges = computeCriticalPath(items, refMap)
    for (const edge of edges) {
      if (criticalEdges.has(edge.id)) {
        edge.style = {
          stroke: 'var(--accent)',
          strokeWidth: 2,
          strokeDasharray: '4,2',
        }
      }
    }

    return { initialNodes: nodes, initialEdges: edges }
  }, [items])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div style={{ width: '100%', minHeight: 500, background: 'var(--bg-mid)', borderRadius: 8 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          const req = (node.data as { requirement: Requirement }).requirement
          onSelect(req)
        }}
        fitView
        nodesDraggable
      >
        <Background gap={16} size={1} />
        <MiniMap position="bottom-right" />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default function RequirementsDeps({ items, onSelect }: RequirementsDepsProps) {
  return (
    <ReactFlowProvider>
      <DepsGraph items={items} onSelect={onSelect} />
    </ReactFlowProvider>
  )
}
