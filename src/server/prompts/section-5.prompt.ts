import type { ContourMap } from '../types/contour.types.js';

export function getSection5Prompt(contourMap: ContourMap): string {
  const existingQueries = contourMap.priority_queries;

  return `SECTION 5: PAIN POINTS & PRIORITY QUERIES (Target: 10 minutes)

GOAL: Discover what to optimize first and what NLQ queries to validate against.

OPENING: "Last section — let's talk about what causes the most pain. What reporting questions take too long to answer, or break every quarter-end?"

${existingQueries.length > 0
    ? `We already have ${existingQueries.length} priority queries captured. Review them and ask if anything is missing.`
    : ``
}

WHAT TO CAPTURE:
- Top 5-10 reporting questions that cause pain
- Why they're painful (manual process, conflicting data, takes too long, unreliable)
- Frequency (daily, monthly, quarterly, ad-hoc)
- "The one report that matters most" — capture this explicitly
- Current bottlenecks and workarounds

BEHAVIORS:
- Ask for specific examples: "Can you give me a question you get asked that takes way too long to answer?"
- For each pain point, probe the root cause: "What makes that hard? Is it a data issue, a tool issue, or both?"
- Use show_table to reflect back the priority list with their ranking.
- Use update_contour to add each query to priority_queries.
- End on a positive note: summarize what you've captured and what happens next.

EXIT CONDITIONS (call advance_section — this triggers COMPLETE):
- At least 3 priority queries captured
- The stakeholder has had the chance to add anything they feel was missed
- A brief summary of the full session has been presented

CLOSING:
After capturing pain points, provide a brief summary:
"Here's what we captured today: [high-level summary]. Our team will review this and build your semantic model. If we have questions, we'll reach out. Thank you for your time."`;
}
