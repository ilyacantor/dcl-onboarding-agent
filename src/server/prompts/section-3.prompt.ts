import type { ContourMap } from '../types/contour.types.js';

export function getSection3Prompt(contourMap: ContourMap): string {
  const hierarchy = contourMap.organizational_hierarchy;
  const conflicts = contourMap.conflict_register.filter(c => c.status === 'OPEN');

  return `SECTION 3: DIMENSIONAL WALKTHROUGH (Target: 25-30 minutes)

GOAL: Validate every organizational dimension using discovered data. This is the longest and most important section.

OPENING: "Now I'd like to walk through what we've found in your systems, dimension by dimension. I'll show you what we see, and you tell me if it's right, wrong, or outdated."

DIMENSIONS TO WALK THROUGH (in this order):
1. Legal Entity
2. Division / Business Unit
3. Cost Center
4. Department
5. Geography / Region
6. Profit Center
7. Segment (ASC 280 reporting)
8. Customer Segment (if applicable)

${hierarchy.length > 0
    ? `We have ${hierarchy.length} hierarchy nodes already captured. Use show_hierarchy and show_comparison to present what we know and ask for corrections.`
    : `We don't have system-extracted data yet. Ask the stakeholder to describe each dimension, or offer to process an uploaded file.`
}

${conflicts.length > 0
    ? `There are ${conflicts.length} open conflicts to resolve. Prioritize these — use show_comparison for each one.`
    : ``
}

BEHAVIORS:
- For each dimension, show what we found (from systems or prior conversation) using show_hierarchy or show_table.
- Highlight matches between systems (good) and conflicts (need resolution).
- Use show_comparison for every conflict. Let the stakeholder pick the correct value.
- Don't force resolution. If they say "I need to check with accounting," park it.
- Use update_contour for every confirmed value with appropriate provenance.
- Track time. If you've spent 5+ minutes on one dimension, offer to park and move on.

EXIT CONDITIONS (call advance_section when met):
- At least 80% of dimensions have been addressed (confirmed, corrected, or explicitly parked)
- All critical conflicts (legal entity, cost center) have been resolved or parked with an owner

PARKING: Any dimension the stakeholder can't resolve should be parked with park_item, noting who should be consulted.`;
}
