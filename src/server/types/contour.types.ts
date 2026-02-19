export interface ContourMap {
  organizational_hierarchy: HierarchyNode[];
  sor_authority_map: SOREntry[];
  conflict_register: Conflict[];
  management_overlay: HierarchyNode[];
  vocabulary_map: VocabularyEntry[];
  priority_queries: PriorityQuery[];
  follow_up_tasks: FollowUpTask[];
  raw_transcript: TranscriptEntry[];
  uploaded_artifacts: UploadedArtifact[];
  metadata: ContourMetadata;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  level: number;
  parent_id: string | null;
  children: HierarchyNode[];
  source_system: string;
  source_field: string;
  confidence: number;
  provenance: Provenance;
  notes: string;
}

export type HierarchyNodeType =
  | 'LEGAL_ENTITY'
  | 'DIVISION'
  | 'DEPARTMENT'
  | 'COST_CENTER'
  | 'PROFIT_CENTER'
  | 'REGION'
  | 'SEGMENT';

export type Provenance =
  | 'PUBLIC_FILING'
  | 'SYSTEM_EXTRACTED'
  | 'STAKEHOLDER_CONFIRMED'
  | 'STAKEHOLDER_FILE'
  | 'INFERRED'
  | 'UNVERIFIED';

export interface SOREntry {
  dimension: string;
  system: string;
  confidence: number;
  confirmed_by: string | null;
  conflicts: string[];
  notes: string;
}

export interface Conflict {
  id: string;
  dimension: string;
  systems: { system: string; value: string }[];
  resolution: string | null;
  resolved_by: string | null;
  status: 'OPEN' | 'RESOLVED' | 'PARKED';
}

export interface VocabularyEntry {
  term: string;
  meaning: string;
  context: string;
  system_equivalent: string | null;
}

export interface PriorityQuery {
  id: string;
  question: string;
  business_context: string;
  frequency: string;
  current_pain: string;
  priority: number;
}

export interface FollowUpTask {
  id: string;
  description: string;
  assigned_to: string | null;
  section: string;
  status: 'OPEN' | 'COMPLETE';
  created_at: string;
}

export interface TranscriptEntry {
  role: string;
  content: string;
  section: string;
  timestamp: string;
}

export interface UploadedArtifact {
  id: string;
  filename: string;
  type: string;
  extracted_data: Record<string, unknown>;
  section: string;
  uploaded_at: string;
}

export interface ContourMetadata {
  version: string;
  created: string;
  last_updated: string;
  completeness_score: number;
}

export function createEmptyContourMap(): ContourMap {
  const now = new Date().toISOString();
  return {
    organizational_hierarchy: [],
    sor_authority_map: [],
    conflict_register: [],
    management_overlay: [],
    vocabulary_map: [],
    priority_queries: [],
    follow_up_tasks: [],
    raw_transcript: [],
    uploaded_artifacts: [],
    metadata: {
      version: '0.1',
      created: now,
      last_updated: now,
      completeness_score: 0,
    },
  };
}
