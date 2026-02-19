import type { SessionContext } from '../prompts/system.prompt.js';
import type { ContourMap, HierarchyNode } from '../types/contour.types.js';
import type { Session as PrismaSession } from '@prisma/client';

/**
 * Builds the SessionContext object that feeds Layer 2 of the system prompt.
 * In Sprint 4 this will call AOD/AAM/DCL APIs. For now it summarizes local session state.
 */
export function buildSessionContext(
  session: PrismaSession,
  contourMap: ContourMap,
): SessionContext {
  return {
    customer_name: session.customerName,
    stakeholder_name: session.stakeholderName,
    stakeholder_role: session.stakeholderRole,
    intel_brief: session.intelBrief,
    confirmed_items_summary: summarizeConfirmedItems(contourMap),
    unresolved_items_summary: summarizeUnresolvedItems(contourMap),
    uploaded_files_summary: summarizeUploads(contourMap),
  };
}

function summarizeConfirmedItems(map: ContourMap): string {
  const parts: string[] = [];

  if (map.organizational_hierarchy.length > 0) {
    const names = flattenNames(map.organizational_hierarchy);
    parts.push(`Org structure: ${names.slice(0, 10).join(', ')}${names.length > 10 ? ` (+${names.length - 10} more)` : ''}`);
  }

  if (map.sor_authority_map.length > 0) {
    const entries = map.sor_authority_map.map((e) => `${e.dimension} → ${e.system}`);
    parts.push(`Systems of record: ${entries.join(', ')}`);
  }

  if (map.management_overlay.length > 0) {
    parts.push(`Management overlay: ${map.management_overlay.length} nodes captured`);
  }

  if (map.vocabulary_map.length > 0) {
    parts.push(`Vocabulary: ${map.vocabulary_map.map((v) => v.term).join(', ')}`);
  }

  if (map.priority_queries.length > 0) {
    parts.push(`Priority queries: ${map.priority_queries.length} captured`);
  }

  return parts.join('\n') || 'Nothing confirmed yet.';
}

function summarizeUnresolvedItems(map: ContourMap): string {
  const parts: string[] = [];

  const openConflicts = map.conflict_register.filter((c) => c.status === 'OPEN');
  if (openConflicts.length > 0) {
    parts.push(`Open conflicts: ${openConflicts.map((c) => c.dimension).join(', ')}`);
  }

  const openTasks = map.follow_up_tasks.filter((t) => t.status === 'OPEN');
  if (openTasks.length > 0) {
    parts.push(`Parked items: ${openTasks.map((t) => t.description).join('; ')}`);
  }

  return parts.join('\n') || 'No unresolved items.';
}

function summarizeUploads(map: ContourMap): string {
  if (map.uploaded_artifacts.length === 0) return '';
  return map.uploaded_artifacts
    .map((a) => `${a.filename} (${a.type})`)
    .join(', ');
}

function flattenNames(nodes: HierarchyNode[]): string[] {
  const names: string[] = [];
  for (const node of nodes) {
    names.push(node.name);
    names.push(...flattenNames(node.children));
  }
  return names;
}
