import type { SessionContext } from '../prompts/system.prompt.js';
import type { ContourMap, HierarchyNode } from '../types/contour.types.js';
import type { Session as PrismaSession } from '@prisma/client';
import type { IntelBrief } from '../types/intel.types.js';
import { getAssetInventory, type AODAssetInventory } from '../clients/aod.client.js';
import { getTopology, type AAMTopology } from '../clients/aam.client.js';
import { getGraphSummary, type DCLGraphSummary } from '../clients/dcl.client.js';
import { formatIntelBriefForPrompt } from '../prompts/intel.prompt.js';

// Cache live data per session to avoid repeated API calls within the same conversation round
const liveDataCache = new Map<
  string,
  { data: LiveSystemData; fetchedAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface LiveSystemData {
  aod: AODAssetInventory | null;
  aam: AAMTopology | null;
  dcl: DCLGraphSummary | null;
}

/**
 * Builds the SessionContext object that feeds Layer 2 of the system prompt.
 * Fetches live data from AOD/AAM/DCL APIs when available.
 */
export function buildSessionContext(
  session: PrismaSession,
  contourMap: ContourMap,
): SessionContext {
  // Format intel brief if present
  let intelBriefText: string | null = null;
  if (session.intelBrief) {
    try {
      const brief: IntelBrief = JSON.parse(session.intelBrief);
      intelBriefText = formatIntelBriefForPrompt(brief);
    } catch {
      intelBriefText = session.intelBrief;
    }
  }

  return {
    customer_name: session.customerName,
    stakeholder_name: session.stakeholderName,
    stakeholder_role: session.stakeholderRole,
    intel_brief: intelBriefText,
    confirmed_items_summary: summarizeConfirmedItems(contourMap),
    unresolved_items_summary: summarizeUnresolvedItems(contourMap),
    uploaded_files_summary: summarizeUploads(contourMap),
  };
}

/**
 * Fetch live system data from AOD/AAM/DCL.
 * Results are cached for 5 minutes per session.
 */
export async function fetchLiveSystemData(
  customerId: string,
): Promise<LiveSystemData> {
  const cached = liveDataCache.get(customerId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // Fetch all three in parallel — each gracefully returns null/empty on failure
  const [aod, aam, dcl] = await Promise.all([
    getAssetInventory(customerId),
    getTopology(customerId),
    getGraphSummary(customerId),
  ]);

  const data: LiveSystemData = { aod, aam, dcl };
  liveDataCache.set(customerId, { data, fetchedAt: Date.now() });
  return data;
}

/**
 * Format live system data as context text for the system prompt.
 */
export function formatLiveDataForPrompt(data: LiveSystemData): string {
  const parts: string[] = [];

  if (data.aod && data.aod.systems.length > 0) {
    const systems = data.aod.systems
      .map(
        (s) =>
          `${s.name} (${s.type}, ${s.vendor}) — ${s.status}`,
      )
      .join('\n  ');
    parts.push(`DISCOVERED SYSTEMS (from AOD scan):\n  ${systems}`);
  }

  if (data.aam && data.aam.connections.length > 0) {
    const connections = data.aam.connections
      .slice(0, 15)
      .map(
        (c) =>
          `${c.source_system} → ${c.target_system} (${c.data_type}, ${c.frequency})`,
      )
      .join('\n  ');
    parts.push(
      `SYSTEM CONNECTIONS (from AAM topology):\n  ${connections}${data.aam.connections.length > 15 ? `\n  ... and ${data.aam.connections.length - 15} more` : ''}`,
    );
  }

  if (data.dcl) {
    parts.push(
      `EXISTING GRAPH (from DCL):\n  ${data.dcl.node_count} nodes, ${data.dcl.edge_count} edges\n  Dimensions: ${data.dcl.dimensions_mapped.join(', ')}`,
    );
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

function summarizeConfirmedItems(map: ContourMap): string {
  const parts: string[] = [];

  if (map.organizational_hierarchy.length > 0) {
    const names = flattenNames(map.organizational_hierarchy);
    parts.push(
      `Org structure: ${names.slice(0, 10).join(', ')}${names.length > 10 ? ` (+${names.length - 10} more)` : ''}`,
    );
  }

  if (map.sor_authority_map.length > 0) {
    const entries = map.sor_authority_map.map(
      (e) => `${e.dimension} → ${e.system}`,
    );
    parts.push(`Systems of record: ${entries.join(', ')}`);
  }

  if (map.management_overlay.length > 0) {
    parts.push(
      `Management overlay: ${map.management_overlay.length} nodes captured`,
    );
  }

  if (map.vocabulary_map.length > 0) {
    parts.push(
      `Vocabulary: ${map.vocabulary_map.map((v) => v.term).join(', ')}`,
    );
  }

  if (map.priority_queries.length > 0) {
    parts.push(`Priority queries: ${map.priority_queries.length} captured`);
  }

  return parts.join('\n') || 'Nothing confirmed yet.';
}

function summarizeUnresolvedItems(map: ContourMap): string {
  const parts: string[] = [];

  const openConflicts = map.conflict_register.filter(
    (c) => c.status === 'OPEN',
  );
  if (openConflicts.length > 0) {
    parts.push(
      `Open conflicts: ${openConflicts.map((c) => c.dimension).join(', ')}`,
    );
  }

  const openTasks = map.follow_up_tasks.filter((t) => t.status === 'OPEN');
  if (openTasks.length > 0) {
    parts.push(
      `Parked items: ${openTasks.map((t) => t.description).join('; ')}`,
    );
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
