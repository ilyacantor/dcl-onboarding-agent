export type MessageRole = 'AGENT' | 'STAKEHOLDER' | 'SYSTEM';

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  rich_content?: RichContent[];
  files?: FileAttachment[];
  section: string;
  confidence_updates?: Record<string, number>;
  timestamp: Date;
}

export type RichContent =
  | TableContent
  | HierarchyContent
  | ComparisonContent;

export interface TableContent {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface HierarchyContent {
  type: 'hierarchy';
  root: { name: string; children: HierarchyDisplayNode[] };
}

export interface HierarchyDisplayNode {
  name: string;
  children?: HierarchyDisplayNode[];
}

export interface ComparisonContent {
  type: 'comparison';
  dimension: string;
  systems: { system: string; value: string; is_match: boolean }[];
}

export interface FileAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  extracted_data?: Record<string, unknown>;
}

export interface SendMessageInput {
  content: string;
  files?: FileAttachment[];
}
