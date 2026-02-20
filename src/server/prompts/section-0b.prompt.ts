import type { ContourMap } from '../types/contour.types.js';

export function getSection0BPrompt(_contourMap: ContourMap): string {
  return `SECTION 0B: PRE-MEETING REQUEST (Automated — email to stakeholder)

This section handles sending a pre-meeting preparation request to the stakeholder.

GOAL: Send a professional email requesting helpful documents before the interview.

WHAT IS REQUESTED:
- Chart of accounts or cost center listing
- Organizational chart or reporting structure
- List of key enterprise systems
- Any recent restructuring documentation

BEHAVIOR:
- The pre-meeting email is generated and sent automatically.
- If the stakeholder uploads documents via the portal, they will be processed and available as context for the interview.
- This section advances automatically once the email is sent.
- If the stakeholder is already connected and wants to begin, skip ahead to Section 1.

EXIT CONDITIONS:
- Pre-meeting request has been sent (or skipped if stakeholder is already present)
- Any pre-uploaded documents have been processed
- Section advances to 1 (Business Overview)`;
}
