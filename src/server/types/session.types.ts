export type SessionStatus =
  | 'INTEL_GATHERING'
  | 'PREMEET_SENT'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETE';

export type SectionId = '0A' | '0B' | '1' | '2' | '3' | '4' | '5';

export type SectionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'PARKED';

export interface Session {
  id: string;
  customer_id: string;
  customer_name: string;
  stakeholder_name: string;
  stakeholder_role: string;
  status: SessionStatus;
  current_section: SectionId;
  section_status: Record<SectionId, SectionStatus>;
  intel_brief: IntelBrief | null;
  premeet_artifacts_received: string[];
  contour_map: ContourMap;
  created_at: Date;
  updated_at: Date;
}

export interface IntelBrief {
  company_overview: string;
  industry: string;
  public_structure: string[];
  known_systems: string[];
  recent_events: string[];
  suggested_questions: string[];
}

export interface CreateSessionInput {
  customer_id: string;
  customer_name: string;
  stakeholder_name: string;
  stakeholder_role: string;
}

// Re-export ContourMap here for convenience
import type { ContourMap } from './contour.types.js';
export type { ContourMap };
