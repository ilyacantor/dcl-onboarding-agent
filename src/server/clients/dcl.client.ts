/**
 * DCL (Data Connectivity Layer) API Client
 *
 * Exports the completed contour map to DCL to build the semantic graph.
 * Also queries existing graph data for context during interviews.
 */

import type { ContourMap } from '../types/contour.types.js';

export interface DCLExportResult {
  success: boolean;
  graph_id: string | null;
  nodes_created: number;
  edges_created: number;
  warnings: string[];
  error: string | null;
}

export interface DCLGraphSummary {
  customer_id: string;
  node_count: number;
  edge_count: number;
  dimensions_mapped: string[];
  last_updated: string;
  version: string;
}

export interface DCLDimensionData {
  dimension: string;
  values: { id: string; name: string; parent_id: string | null }[];
  source_system: string;
  last_synced: string;
}

const DCL_BASE_URL = process.env.DCL_API_URL || 'http://localhost:4003';
const DCL_API_KEY = process.env.DCL_API_KEY || '';

/**
 * Export a completed contour map to DCL for graph building.
 */
export async function exportContourMap(
  customerId: string,
  contourMap: ContourMap,
): Promise<DCLExportResult> {
  try {
    const response = await fetch(
      `${DCL_BASE_URL}/api/customers/${customerId}/contour`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DCL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contour_map: contourMap,
          exported_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        graph_id: null,
        nodes_created: 0,
        edges_created: 0,
        warnings: [],
        error: `DCL API returned ${response.status}: ${errorText}`,
      };
    }

    return (await response.json()) as DCLExportResult;
  } catch (err) {
    return {
      success: false,
      graph_id: null,
      nodes_created: 0,
      edges_created: 0,
      warnings: [],
      error: err instanceof Error ? err.message : 'DCL API unavailable',
    };
  }
}

/**
 * Fetch the existing graph summary for a customer (if one exists).
 */
export async function getGraphSummary(
  customerId: string,
): Promise<DCLGraphSummary | null> {
  try {
    const response = await fetch(
      `${DCL_BASE_URL}/api/customers/${customerId}/graph`,
      {
        headers: {
          Authorization: `Bearer ${DCL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as DCLGraphSummary;
  } catch {
    return null;
  }
}

/**
 * Fetch dimension data from an existing graph (for cross-referencing during interviews).
 */
export async function getDimensionData(
  customerId: string,
  dimension: string,
): Promise<DCLDimensionData | null> {
  try {
    const response = await fetch(
      `${DCL_BASE_URL}/api/customers/${customerId}/dimensions/${encodeURIComponent(dimension)}`,
      {
        headers: {
          Authorization: `Bearer ${DCL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as DCLDimensionData;
  } catch {
    return null;
  }
}
