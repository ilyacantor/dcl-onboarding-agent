/**
 * Prompt templates for generating pre-meeting requests.
 *
 * Note: The actual prompt text is inline in premeet.service.ts because it
 * needs dynamic interpolation of session data. This file exports helper
 * functions for formatting pre-meeting artifacts for the system prompt.
 */

/**
 * Format received pre-meeting artifacts as context for the system prompt.
 */
export function formatPreMeetArtifacts(
  artifacts: string[],
): string {
  if (artifacts.length === 0) return '';
  return `Pre-meeting artifacts received: ${artifacts.join(', ')}`;
}

/**
 * List of standard artifact types we request during pre-meeting.
 */
export const STANDARD_ARTIFACT_TYPES = [
  'Chart of Accounts',
  'Cost Center Listing',
  'Organizational Chart',
  'System Inventory',
  'GL Account Structure',
  'Reporting Hierarchy',
  'Recent Reorg Documentation',
] as const;
