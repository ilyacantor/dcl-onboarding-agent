/**
 * AAM (Application Architecture Manager) API Client
 *
 * Queries the fabric topology to discover how systems connect —
 * data flows, integrations, and interface mappings.
 */

export interface AAMConnection {
  id: string;
  source_system: string;
  target_system: string;
  data_type: string;
  direction: 'UNIDIRECTIONAL' | 'BIDIRECTIONAL';
  frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  protocol: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}

export interface AAMTopology {
  customer_id: string;
  connections: AAMConnection[];
  total_connections: number;
  last_updated: string;
}

export interface AAMFieldMapping {
  source_system: string;
  source_field: string;
  target_system: string;
  target_field: string;
  transformation: string | null;
}

const AAM_BASE_URL = process.env.AAM_API_URL || 'http://localhost:4002';
const AAM_API_KEY = process.env.AAM_API_KEY || '';

/**
 * Fetch the full connection topology for a customer.
 */
export async function getTopology(
  customerId: string,
): Promise<AAMTopology> {
  try {
    const response = await fetch(
      `${AAM_BASE_URL}/api/customers/${customerId}/topology`,
      {
        headers: {
          Authorization: `Bearer ${AAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.warn(`AAM API returned ${response.status} for customer ${customerId}`);
      return getEmptyTopology(customerId);
    }

    return (await response.json()) as AAMTopology;
  } catch (err) {
    console.warn('AAM API unavailable, returning empty topology:', err);
    return getEmptyTopology(customerId);
  }
}

/**
 * Fetch field mappings between two systems.
 */
export async function getFieldMappings(
  customerId: string,
  sourceSystem: string,
  targetSystem: string,
): Promise<AAMFieldMapping[]> {
  try {
    const response = await fetch(
      `${AAM_BASE_URL}/api/customers/${customerId}/mappings?source=${encodeURIComponent(sourceSystem)}&target=${encodeURIComponent(targetSystem)}`,
      {
        headers: {
          Authorization: `Bearer ${AAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) return [];
    return (await response.json()) as AAMFieldMapping[];
  } catch {
    return [];
  }
}

function getEmptyTopology(customerId: string): AAMTopology {
  return {
    customer_id: customerId,
    connections: [],
    total_connections: 0,
    last_updated: new Date().toISOString(),
  };
}
