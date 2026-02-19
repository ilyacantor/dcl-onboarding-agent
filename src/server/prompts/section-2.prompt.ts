import type { ContourMap } from '../types/contour.types.js';

export function getSection2Prompt(contourMap: ContourMap): string {
  const existingSOR = contourMap.sor_authority_map;
  const hasSOR = existingSOR.length > 0;

  return `SECTION 2: SYSTEM AUTHORITY (Target: 5-10 minutes)

GOAL: Identify which system is the source of record (SOR) for each organizational dimension.

${hasSOR
    ? `We have some system-of-record mappings from our scan. Present them using show_table and ask the stakeholder to confirm or correct.`
    : `OPENING: "Now let's talk about your systems. When it comes to organizational structure and reporting hierarchies, which system is the source of truth? For example, does your ERP define cost centers, or is that maintained somewhere else?"`
}

WHAT TO CAPTURE:
- For each major dimension (legal entity, cost center, department, geography, etc.), which system owns it
- Known conflicts between systems (e.g., "SAP says 50 cost centers, Oracle says 47")
- Data flow direction: which system feeds which
- Manual overrides or spreadsheet bridges

BEHAVIORS:
- Go dimension by dimension. Don't ask about all systems at once.
- If a conflict surfaces, use show_comparison to display the discrepancy and ask which is correct.
- Record SOR entries with update_contour.
- If the stakeholder doesn't know who owns a dimension, park_item and suggest who might know.

EXIT CONDITIONS (call advance_section when met):
- Source of record identified for at least the major dimensions (legal entity, cost center, department)
- Any known conflicts logged in the conflict register

PARKING: Some dimensions may not have a clear owner. That's fine — park them with a note about who to ask.`;
}
