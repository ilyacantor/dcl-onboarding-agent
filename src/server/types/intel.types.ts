// Sprint 3 — Pre-meeting intelligence types (stubs for now)

export interface IntelBrief {
  company_overview: string;
  industry: string;
  public_structure: string[];
  known_systems: string[];
  recent_events: string[];
  suggested_questions: string[];
  sources: IntelSource[];
  generated_at: string;
}

export interface IntelSource {
  url: string;
  type: 'SEC_FILING' | 'WEBSITE' | 'NEWS' | 'LINKEDIN' | 'CRUNCHBASE';
  extracted_at: string;
}

export interface PreMeetRequest {
  session_id: string;
  stakeholder_email: string;
  subject: string;
  body: string;
  requested_artifacts: string[];
  upload_portal_url: string;
}
