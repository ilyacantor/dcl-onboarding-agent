import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolResultBlockParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js';
import type { SectionId } from '../types/session.types.js';
import type { ContourMap } from '../types/contour.types.js';
import { composeSystemPrompt, type SessionContext } from '../prompts/system.prompt.js';

// ── Anthropic client ────────────────────────────────────────────────
const anthropic = new Anthropic();

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4096;

// ── Tool definitions ────────────────────────────────────────────────
const TOOLS: Tool[] = [
  {
    name: 'update_contour',
    description:
      'Add or modify a node in the Enterprise Contour Map. Use this whenever the stakeholder confirms organizational data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dimension_type: {
          type: 'string',
          enum: [
            'organizational_hierarchy',
            'sor_authority_map',
            'conflict_register',
            'management_overlay',
            'vocabulary_map',
            'priority_queries',
          ],
          description: 'Which section of the contour map to update',
        },
        operation: {
          type: 'string',
          enum: ['add', 'update', 'remove'],
          description: 'What to do with the node',
        },
        node_data: {
          type: 'object',
          description: 'The data for the node (shape depends on dimension_type)',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence score (0-1)',
        },
        provenance: {
          type: 'string',
          enum: [
            'PUBLIC_FILING',
            'SYSTEM_EXTRACTED',
            'STAKEHOLDER_CONFIRMED',
            'STAKEHOLDER_FILE',
            'INFERRED',
            'UNVERIFIED',
          ],
          description: 'Source of this data',
        },
      },
      required: ['dimension_type', 'operation', 'node_data'],
    },
  },
  {
    name: 'show_comparison',
    description:
      'Display a side-by-side comparison of values from different systems for a given dimension. Use when there are conflicts to resolve.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dimension: {
          type: 'string',
          description: 'The dimension being compared (e.g., "Cost Centers")',
        },
        systems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              system: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['system', 'value'],
          },
          description: 'The system values to compare',
        },
      },
      required: ['dimension', 'systems'],
    },
  },
  {
    name: 'show_hierarchy',
    description:
      'Display an organizational tree view. Use to present or confirm hierarchical structures.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Title for the hierarchy display',
        },
        root: {
          type: 'object',
          description:
            'Root node with name and children array. Each child has name and optional children.',
        },
      },
      required: ['title', 'root'],
    },
  },
  {
    name: 'show_table',
    description:
      'Display a data table. Use for tabular data like SOR mappings, priority queries, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Title for the table',
        },
        headers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column headers',
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'Table rows',
        },
      },
      required: ['title', 'headers', 'rows'],
    },
  },
  {
    name: 'park_item',
    description:
      'Mark an unresolved topic to revisit later. Use when the stakeholder cannot answer or needs to check with someone else.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dimension: {
          type: 'string',
          description: 'The dimension or topic being parked',
        },
        question: {
          type: 'string',
          description: 'The unresolved question',
        },
        suggested_person: {
          type: 'string',
          description: 'Who might be able to answer this',
        },
      },
      required: ['dimension', 'question'],
    },
  },
  {
    name: 'advance_section',
    description:
      'Complete the current section and move to the next one. Call this when exit conditions for the current section are met.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Brief summary of what was captured in this section',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'process_file',
    description:
      'Process an uploaded file to extract structured data. Use when a stakeholder uploads a file and you need to analyze its contents.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: {
          type: 'string',
          description: 'The ID of the uploaded file to process',
        },
        analysis_focus: {
          type: 'string',
          description:
            'Optional focus area for analysis (e.g., "organizational hierarchy", "cost centers", "system mappings")',
        },
      },
      required: ['file_id'],
    },
  },
  {
    name: 'lookup_system_data',
    description:
      'Query AOD/AAM/DCL APIs for specific data about the customer\'s systems, connections, or existing graph. Use when you need to cross-reference what the stakeholder says with discovered system data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query_type: {
          type: 'string',
          enum: ['systems', 'connections', 'dimension_data', 'graph_summary'],
          description: 'What type of data to look up',
        },
        system_name: {
          type: 'string',
          description: 'Optional system name to filter by',
        },
        dimension: {
          type: 'string',
          description: 'Optional dimension name for dimension_data queries',
        },
      },
      required: ['query_type'],
    },
  },
];

// ── Message type for conversation history ───────────────────────────
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlockParam[];
}

// ── Tool result from processing ─────────────────────────────────────
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  text: string;
  tool_calls: ToolCall[];
  stop_reason: string | null;
}

// ── Send a message and get a response ───────────────────────────────
export async function chat(
  messages: ConversationMessage[],
  section: SectionId,
  context: SessionContext,
  contourMap: ContourMap,
): Promise<LLMResponse> {
  const systemPrompt = composeSystemPrompt(section, context, contourMap);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools: TOOLS,
    messages: messages as MessageParam[],
  });

  const text: string[] = [];
  const toolCalls: ToolCall[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      text.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    text: text.join('\n'),
    tool_calls: toolCalls,
    stop_reason: response.stop_reason,
  };
}

// ── Continue after tool results ─────────────────────────────────────
export async function continueWithToolResults(
  messages: ConversationMessage[],
  toolResults: ToolResultBlockParam[],
  section: SectionId,
  context: SessionContext,
  contourMap: ContourMap,
): Promise<LLMResponse> {
  // Append tool results as a user message
  const messagesWithResults: ConversationMessage[] = [
    ...messages,
    { role: 'user', content: toolResults as ContentBlockParam[] },
  ];

  return chat(messagesWithResults, section, context, contourMap);
}
