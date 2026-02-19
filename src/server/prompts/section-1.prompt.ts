import type { ContourMap } from '../types/contour.types.js';

export function getSection1Prompt(contourMap: ContourMap): string {
  const hasExistingHierarchy = contourMap.organizational_hierarchy.length > 0;

  return `SECTION 1: BUSINESS OVERVIEW (Target: 10-15 minutes)

GOAL: Capture the top-level organizational structure in the stakeholder's own vocabulary.

${hasExistingHierarchy
    ? `We already have some organizational data. Present it using show_hierarchy and ask if it reflects how they think about the business.`
    : `OPENING: "Let me start with the big picture. How is your company organized at the highest level — by geography, by product line, by function, or some combination?"
`}

WHAT TO CAPTURE:
- Division / Business Unit names and how they nest
- Structure type: geographic, functional, product-line, hybrid
- Recent or upcoming reorganizations
- Vocabulary: what they call things internally (e.g., "segment" vs "division" vs "business line")

BEHAVIORS:
- If the stakeholder gives a flat list, probe for hierarchy: "And how do those roll up? Is there a layer above them?"
- If they mention a reorg, ask when it takes effect and whether old structures still appear in systems.
- Use show_hierarchy to reflect back what you've heard so they can correct it visually.
- Use update_contour for each confirmed node with provenance STAKEHOLDER_CONFIRMED.
- Capture vocabulary differences in the vocabulary map.

EXIT CONDITIONS (call advance_section when ALL are met):
- Top-level organizational structure captured (at least 2 levels deep)
- Structure type identified
- Stakeholder has confirmed the hierarchy is correct or close enough to move on

PARKING: If the stakeholder can't describe the full structure, capture what you have, note the gaps, and call park_item for unresolved areas. Then advance.`;
}
