/**
 * AOD (Asset & Oversight Discovery) API Client
 *
 * Queries the asset inventory to discover what systems exist in the enterprise.
 * Provides system names, types, owners, and connection metadata.
 */

export interface AODSystem {
  id: string;
  name: string;
  type: 'ERP' | 'CRM' | 'HCM' | 'SCM' | 'BI' | 'GL' | 'OTHER';
  vendor: string;
  owner: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'MIGRATING';
  description: string;
  discovered_at: string;
}

export interface AODAssetInventory {
  customer_id: string;
  systems: AODSystem[];
  total_count: number;
  last_scan: string;
}

const AOD_BASE_URL = process.env.AOD_API_URL || 'http://localhost:4001';
const AOD_API_KEY = process.env.AOD_API_KEY || '';

/**
 * Fetch all discovered systems for a customer.
 */
export async function getAssetInventory(
  customerId: string,
): Promise<AODAssetInventory> {
  try {
    const response = await fetch(
      `${AOD_BASE_URL}/api/customers/${customerId}/assets`,
      {
        headers: {
          Authorization: `Bearer ${AOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.warn(`AOD API returned ${response.status} for customer ${customerId}`);
      return getEmptyInventory(customerId);
    }

    return (await response.json()) as AODAssetInventory;
  } catch (err) {
    console.warn('AOD API unavailable, returning empty inventory:', err);
    return getEmptyInventory(customerId);
  }
}

/**
 * Fetch details for a specific system.
 */
export async function getSystemDetails(
  customerId: string,
  systemId: string,
): Promise<AODSystem | null> {
  try {
    const response = await fetch(
      `${AOD_BASE_URL}/api/customers/${customerId}/assets/${systemId}`,
      {
        headers: {
          Authorization: `Bearer ${AOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as AODSystem;
  } catch {
    return null;
  }
}

function getEmptyInventory(customerId: string): AODAssetInventory {
  return {
    customer_id: customerId,
    systems: [],
    total_count: 0,
    last_scan: new Date().toISOString(),
  };
}
