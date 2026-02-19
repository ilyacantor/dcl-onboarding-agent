import type { ContourMap } from '../types/contour.types.js';

export function getSection4Prompt(contourMap: ContourMap): string {
  const hasManagementOverlay = contourMap.management_overlay.length > 0;

  return `SECTION 4: MANAGEMENT REPORTING (Target: 10 minutes)

GOAL: Capture how the C-suite actually sees the business. This often differs from the system-of-record structure.

OPENING: "When your CFO presents to the board, what does the management P&L look like? Is it by the same divisions we just discussed, or does leadership slice it differently?"

${hasManagementOverlay
    ? `We already have some management overlay data. Present it and ask if it's current.`
    : ``
}

WHAT TO CAPTURE:
- Management hierarchy (may differ from legal/operational structure)
- Key metrics the board sees (revenue, EBITDA, headcount by what grouping)
- Manual adjustments or reclassifications done for board reporting
- "The one report that matters" — ask explicitly

BEHAVIORS:
- Contrast the management view with the operational structure from Section 3.
- Use show_hierarchy to display the management view alongside the operational view if they differ.
- Ask about manual adjustments: "Are there any allocations or reclassifications that happen outside the system for board reporting?"
- Use update_contour to build the management_overlay in the contour map.

EXIT CONDITIONS (call advance_section when met):
- Management hierarchy captured (even if it matches operational structure — confirm that explicitly)
- Key board-level metrics identified
- Any manual adjustments or bridge calculations noted

PARKING: If the stakeholder doesn't have visibility into board reporting, park with a note to involve the CFO or FP&A lead.`;
}
