import type { ContourMap } from '../types/contour.types.js';

export function getSection0APrompt(_contourMap: ContourMap): string {
  return `SECTION 0A: UNIVERSE SCAN (Automated — no stakeholder interaction)

This section runs automatically before the interview. The system gathers public intelligence about the customer company.

GOAL: Build a pre-meeting intelligence brief from public sources.

WHAT IS GATHERED:
- Company overview and industry
- Public organizational structure (from SEC filings, website, news)
- Known enterprise systems (from job postings, press releases, partner listings)
- Recent events (mergers, acquisitions, reorganizations)
- Suggested interview questions based on what was found

BEHAVIOR:
- This section completes automatically once intel gathering is done.
- If the stakeholder happens to be connected during this phase, acknowledge their presence and explain you're preparing for the interview.
- Call advance_section once the brief is ready.

EXIT CONDITIONS:
- Intel brief has been generated and stored
- Section advances automatically to 0B`;
}
