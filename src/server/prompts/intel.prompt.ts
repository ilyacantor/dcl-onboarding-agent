/**
 * Prompt used by the intel service when analyzing scraped public data
 * about a company. This is called during Section 0A (Universe Scan).
 *
 * Note: The actual prompt text is inline in intel.service.ts because it
 * needs dynamic interpolation of the raw scraped data. This file exports
 * helper functions for formatting intel data for the system prompt context.
 */

import type { IntelBrief } from '../types/intel.types.js';

/**
 * Format an intel brief as a readable summary for the system prompt context layer.
 */
export function formatIntelBriefForPrompt(brief: IntelBrief): string {
  const parts: string[] = [];

  parts.push(`Company: ${brief.company_overview}`);
  parts.push(`Industry: ${brief.industry}`);

  if (brief.public_structure.length > 0) {
    parts.push(`Known structure: ${brief.public_structure.join(', ')}`);
  }

  if (brief.known_systems.length > 0) {
    parts.push(`Known systems: ${brief.known_systems.join(', ')}`);
  }

  if (brief.recent_events.length > 0) {
    parts.push(`Recent events: ${brief.recent_events.join('; ')}`);
  }

  if (brief.suggested_questions.length > 0) {
    parts.push(`\nSuggested opening questions:\n${brief.suggested_questions.map((q) => `  - ${q}`).join('\n')}`);
  }

  return parts.join('\n');
}
