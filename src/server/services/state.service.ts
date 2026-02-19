import type { SectionId, SectionStatus, SessionStatus } from '../types/session.types.js';

// ── Section ordering ────────────────────────────────────────────────
const SECTION_ORDER: SectionId[] = ['0A', '0B', '1', '2', '3', '4', '5'];

// ── Actions the LLM (or system) can dispatch ────────────────────────
export type StateAction =
  | { type: 'ADVANCE' }
  | { type: 'JUMP'; target: SectionId }
  | { type: 'PARK' }
  | { type: 'RESUME'; target: SectionId }
  | { type: 'PAUSE' }
  | { type: 'COMPLETE' };

// ── Conversation state (mirrors session fields) ─────────────────────
export interface ConversationState {
  status: SessionStatus;
  current_section: SectionId;
  section_status: Record<SectionId, SectionStatus>;
}

// ── Default initial state ───────────────────────────────────────────
export function createInitialState(): ConversationState {
  return {
    status: 'IN_PROGRESS',
    current_section: '1',
    section_status: {
      '0A': 'NOT_STARTED',
      '0B': 'NOT_STARTED',
      '1': 'IN_PROGRESS',
      '2': 'NOT_STARTED',
      '3': 'NOT_STARTED',
      '4': 'NOT_STARTED',
      '5': 'NOT_STARTED',
    },
  };
}

// ── Pure reducer — deterministic state transitions ──────────────────
export function reduceState(
  state: ConversationState,
  action: StateAction,
): ConversationState {
  const next = structuredClone(state);

  switch (action.type) {
    case 'ADVANCE': {
      // Mark current section complete
      next.section_status[next.current_section] = 'COMPLETE';

      // Find next section that isn't complete
      const currentIdx = SECTION_ORDER.indexOf(next.current_section);
      const nextSection = SECTION_ORDER.slice(currentIdx + 1).find(
        (s) => next.section_status[s] !== 'COMPLETE',
      );

      if (nextSection) {
        next.current_section = nextSection;
        next.section_status[nextSection] = 'IN_PROGRESS';
      } else {
        // All sections done
        next.status = 'COMPLETE';
      }
      break;
    }

    case 'JUMP': {
      if (action.target === next.current_section) break;

      // Don't mark current as complete — it's being interrupted
      if (next.section_status[next.current_section] === 'IN_PROGRESS') {
        // Leave it IN_PROGRESS so we can come back
      }
      next.current_section = action.target;
      if (next.section_status[action.target] === 'NOT_STARTED') {
        next.section_status[action.target] = 'IN_PROGRESS';
      }
      break;
    }

    case 'PARK': {
      next.section_status[next.current_section] = 'PARKED';

      // Move to next unfinished section
      const currentIdx = SECTION_ORDER.indexOf(next.current_section);
      const nextSection = SECTION_ORDER.slice(currentIdx + 1).find(
        (s) => next.section_status[s] !== 'COMPLETE',
      );

      if (nextSection) {
        next.current_section = nextSection;
        next.section_status[nextSection] = 'IN_PROGRESS';
      }
      break;
    }

    case 'RESUME': {
      if (next.section_status[action.target] !== 'PARKED') break;
      next.current_section = action.target;
      next.section_status[action.target] = 'IN_PROGRESS';
      break;
    }

    case 'PAUSE': {
      next.status = 'PAUSED';
      break;
    }

    case 'COMPLETE': {
      next.section_status[next.current_section] = 'COMPLETE';
      next.status = 'COMPLETE';
      break;
    }
  }

  return next;
}

// ── Helpers ─────────────────────────────────────────────────────────
export function getNextSection(current: SectionId): SectionId | null {
  const idx = SECTION_ORDER.indexOf(current);
  return idx < SECTION_ORDER.length - 1 ? SECTION_ORDER[idx + 1] : null;
}

export function getSectionIndex(section: SectionId): number {
  return SECTION_ORDER.indexOf(section);
}

export function getCompletionPercentage(
  sectionStatus: Record<SectionId, SectionStatus>,
): number {
  const interviewSections: SectionId[] = ['1', '2', '3', '4', '5'];
  const completed = interviewSections.filter(
    (s) => sectionStatus[s] === 'COMPLETE',
  ).length;
  return Math.round((completed / interviewSections.length) * 100);
}
