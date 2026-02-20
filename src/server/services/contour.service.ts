import { v4 as uuid } from 'uuid';
import type {
  ContourMap,
  HierarchyNode,
  SOREntry,
  Conflict,
  VocabularyEntry,
  PriorityQuery,
  FollowUpTask,
  UploadedArtifact,
  Provenance,
} from '../types/contour.types.js';
import type { ToolCall } from './llm.service.js';

// ── Process a tool call and return the updated contour map ──────────

export interface ToolProcessingResult {
  contourMap: ContourMap;
  displayContent: unknown | null;
  stateAction: { type: string; [key: string]: unknown } | null;
}

export function processToolCall(
  toolCall: ToolCall,
  contourMap: ContourMap,
): ToolProcessingResult {
  const map = structuredClone(contourMap);
  map.metadata.last_updated = new Date().toISOString();

  switch (toolCall.name) {
    case 'update_contour':
      return processUpdateContour(toolCall.input, map);
    case 'show_comparison':
      return { contourMap: map, displayContent: { type: 'comparison', ...toolCall.input }, stateAction: null };
    case 'show_hierarchy':
      return { contourMap: map, displayContent: { type: 'hierarchy', ...toolCall.input }, stateAction: null };
    case 'show_table':
      return { contourMap: map, displayContent: { type: 'table', ...toolCall.input }, stateAction: null };
    case 'park_item':
      return processParkItem(toolCall.input, map);
    case 'advance_section':
      return {
        contourMap: map,
        displayContent: null,
        stateAction: { type: 'ADVANCE', summary: toolCall.input.summary },
      };
    case 'process_file': {
      // File processing is handled by conversation.service before reaching here.
      // If it does arrive here, return a message indicating the file was already processed.
      const fileId = toolCall.input.file_id as string;
      const artifact = map.uploaded_artifacts.find((a) => a.id === fileId);
      if (artifact) {
        return {
          contourMap: map,
          displayContent: null,
          stateAction: null,
        };
      }
      return { contourMap: map, displayContent: null, stateAction: null };
    }
    case 'lookup_system_data':
      // Handled by conversation.service which calls the API clients directly
      return { contourMap: map, displayContent: null, stateAction: null };
    default:
      return { contourMap: map, displayContent: null, stateAction: null };
  }
}

// ── update_contour handler ──────────────────────────────────────────

function processUpdateContour(
  input: Record<string, unknown>,
  map: ContourMap,
): ToolProcessingResult {
  const dimensionType = input.dimension_type as string;
  const operation = (input.operation as string) || 'add';
  const nodeData = input.node_data as Record<string, unknown>;
  const confidence = (input.confidence as number) ?? 0.8;
  const provenance = (input.provenance as Provenance) ?? 'STAKEHOLDER_CONFIRMED';

  switch (dimensionType) {
    case 'organizational_hierarchy': {
      const node: HierarchyNode = {
        id: (nodeData.id as string) || uuid(),
        name: (nodeData.name as string) || '',
        type: (nodeData.type as HierarchyNode['type']) || 'DIVISION',
        level: (nodeData.level as number) ?? 0,
        parent_id: (nodeData.parent_id as string) || null,
        children: [],
        source_system: (nodeData.source_system as string) || 'stakeholder',
        source_field: (nodeData.source_field as string) || '',
        confidence,
        provenance,
        notes: (nodeData.notes as string) || '',
      };
      if (operation === 'add') {
        insertHierarchyNode(map.organizational_hierarchy, node);
      } else if (operation === 'update') {
        updateHierarchyNode(map.organizational_hierarchy, node);
      } else if (operation === 'remove') {
        removeHierarchyNode(map.organizational_hierarchy, node.id);
      }
      break;
    }

    case 'management_overlay': {
      const node: HierarchyNode = {
        id: (nodeData.id as string) || uuid(),
        name: (nodeData.name as string) || '',
        type: (nodeData.type as HierarchyNode['type']) || 'DIVISION',
        level: (nodeData.level as number) ?? 0,
        parent_id: (nodeData.parent_id as string) || null,
        children: [],
        source_system: (nodeData.source_system as string) || 'stakeholder',
        source_field: (nodeData.source_field as string) || '',
        confidence,
        provenance,
        notes: (nodeData.notes as string) || '',
      };
      if (operation === 'add') {
        insertHierarchyNode(map.management_overlay, node);
      } else if (operation === 'update') {
        updateHierarchyNode(map.management_overlay, node);
      }
      break;
    }

    case 'sor_authority_map': {
      const entry: SOREntry = {
        dimension: (nodeData.dimension as string) || '',
        system: (nodeData.system as string) || '',
        confidence,
        confirmed_by: (nodeData.confirmed_by as string) || null,
        conflicts: (nodeData.conflicts as string[]) || [],
        notes: (nodeData.notes as string) || '',
      };
      if (operation === 'add') {
        map.sor_authority_map.push(entry);
      } else if (operation === 'update') {
        const idx = map.sor_authority_map.findIndex(
          (e) => e.dimension === entry.dimension,
        );
        if (idx >= 0) map.sor_authority_map[idx] = entry;
        else map.sor_authority_map.push(entry);
      }
      break;
    }

    case 'conflict_register': {
      const conflict: Conflict = {
        id: (nodeData.id as string) || uuid(),
        dimension: (nodeData.dimension as string) || '',
        systems: (nodeData.systems as Conflict['systems']) || [],
        resolution: (nodeData.resolution as string) || null,
        resolved_by: (nodeData.resolved_by as string) || null,
        status: (nodeData.status as Conflict['status']) || 'OPEN',
      };
      if (operation === 'add') {
        map.conflict_register.push(conflict);
      } else if (operation === 'update') {
        const idx = map.conflict_register.findIndex((c) => c.id === conflict.id);
        if (idx >= 0) map.conflict_register[idx] = conflict;
      }
      break;
    }

    case 'vocabulary_map': {
      const entry: VocabularyEntry = {
        term: (nodeData.term as string) || '',
        meaning: (nodeData.meaning as string) || '',
        context: (nodeData.context as string) || '',
        system_equivalent: (nodeData.system_equivalent as string) || null,
      };
      map.vocabulary_map.push(entry);
      break;
    }

    case 'priority_queries': {
      const query: PriorityQuery = {
        id: (nodeData.id as string) || uuid(),
        question: (nodeData.question as string) || '',
        business_context: (nodeData.business_context as string) || '',
        frequency: (nodeData.frequency as string) || '',
        current_pain: (nodeData.current_pain as string) || '',
        priority: (nodeData.priority as number) ?? 0,
      };
      map.priority_queries.push(query);
      break;
    }
  }

  // Recalculate completeness
  map.metadata.completeness_score = calculateCompleteness(map);

  return { contourMap: map, displayContent: null, stateAction: null };
}

// ── park_item handler ───────────────────────────────────────────────

function processParkItem(
  input: Record<string, unknown>,
  map: ContourMap,
): ToolProcessingResult {
  const task: FollowUpTask = {
    id: uuid(),
    description: `${input.dimension}: ${input.question}`,
    assigned_to: (input.suggested_person as string) || null,
    section: '',
    status: 'OPEN',
    created_at: new Date().toISOString(),
  };
  map.follow_up_tasks.push(task);

  return { contourMap: map, displayContent: null, stateAction: null };
}

// ── Hierarchy helpers ───────────────────────────────────────────────

function insertHierarchyNode(tree: HierarchyNode[], node: HierarchyNode): void {
  if (!node.parent_id) {
    tree.push(node);
    return;
  }

  const parent = findNode(tree, node.parent_id);
  if (parent) {
    parent.children.push(node);
  } else {
    // Parent not found — add at root level
    tree.push(node);
  }
}

function updateHierarchyNode(tree: HierarchyNode[], node: HierarchyNode): void {
  const existing = findNode(tree, node.id);
  if (existing) {
    Object.assign(existing, { ...node, children: existing.children });
  }
}

function removeHierarchyNode(tree: HierarchyNode[], id: string): void {
  for (let i = tree.length - 1; i >= 0; i--) {
    if (tree[i].id === id) {
      tree.splice(i, 1);
      return;
    }
    removeHierarchyNode(tree[i].children, id);
  }
}

function findNode(tree: HierarchyNode[], id: string): HierarchyNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

// ── Artifact helpers ────────────────────────────────────────────────

export function addArtifact(
  contourMap: ContourMap,
  artifact: UploadedArtifact,
): ContourMap {
  const map = structuredClone(contourMap);
  map.uploaded_artifacts.push(artifact);
  map.metadata.last_updated = new Date().toISOString();
  return map;
}

// ── Completeness scoring ────────────────────────────────────────────

function calculateCompleteness(map: ContourMap): number {
  let score = 0;
  const weights = {
    hierarchy: 30,
    sor: 20,
    conflicts_resolved: 15,
    management: 15,
    vocabulary: 5,
    queries: 10,
    follow_ups: 5,
  };

  // Hierarchy: at least 5 nodes
  if (map.organizational_hierarchy.length >= 5) score += weights.hierarchy;
  else if (map.organizational_hierarchy.length > 0)
    score += weights.hierarchy * (map.organizational_hierarchy.length / 5);

  // SOR: at least 3 entries
  if (map.sor_authority_map.length >= 3) score += weights.sor;
  else if (map.sor_authority_map.length > 0)
    score += weights.sor * (map.sor_authority_map.length / 3);

  // Conflicts: resolved percentage
  const totalConflicts = map.conflict_register.length;
  if (totalConflicts === 0) {
    score += weights.conflicts_resolved;
  } else {
    const resolved = map.conflict_register.filter((c) => c.status === 'RESOLVED').length;
    score += weights.conflicts_resolved * (resolved / totalConflicts);
  }

  // Management overlay
  if (map.management_overlay.length > 0) score += weights.management;

  // Vocabulary
  if (map.vocabulary_map.length >= 3) score += weights.vocabulary;
  else if (map.vocabulary_map.length > 0)
    score += weights.vocabulary * (map.vocabulary_map.length / 3);

  // Priority queries
  if (map.priority_queries.length >= 3) score += weights.queries;
  else if (map.priority_queries.length > 0)
    score += weights.queries * (map.priority_queries.length / 3);

  // Follow-up tasks (having them documented is good)
  if (map.follow_up_tasks.length > 0) score += weights.follow_ups;

  return Math.round(score);
}
