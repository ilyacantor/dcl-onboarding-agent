import type { Session as PrismaSession } from '@prisma/client';
import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.js';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { chat, continueWithToolResults, type ConversationMessage, type ToolCall } from './llm.service.js';
import { reduceState, type ConversationState } from './state.service.js';
import { processToolCall, addArtifact } from './contour.service.js';
import { processFile as parseFile } from './file.service.js';
import { buildSessionContext, fetchLiveSystemData } from './context.service.js';
import { getAssetInventory } from '../clients/aod.client.js';
import { getTopology } from '../clients/aam.client.js';
import { getGraphSummary, getDimensionData } from '../clients/dcl.client.js';
import type { ContourMap, UploadedArtifact } from '../types/contour.types.js';
import type { SectionId } from '../types/session.types.js';

const MAX_TOOL_ROUNDS = 10;

export interface FileInput {
  id: string;
  filename: string;
  mime_type: string;
  buffer: Buffer;
}

export interface ConversationResult {
  agent_message: string;
  rich_content: unknown[];
  section: string;
  session_status: string;
  contour_completeness: number;
}

/**
 * Handles an incoming stakeholder message:
 * 1. Load conversation history
 * 2. If files are attached, parse them and add to contour map
 * 3. Send to LLM with context
 * 4. Process any tool calls (loop until text response)
 * 5. Update state and contour map
 * 6. Persist everything
 */
export async function handleStakeholderMessage(
  session: PrismaSession,
  content: string,
  files?: FileInput[],
): Promise<ConversationResult> {
  let contourMap: ContourMap = JSON.parse(session.contourMap);
  let currentSection = session.currentSection as SectionId;
  let sectionStatus = JSON.parse(session.sectionStatus);
  let sessionStatus = session.status;

  // 1. Load conversation history from DB
  const dbMessages = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'asc' },
  });

  const conversationHistory: ConversationMessage[] = dbMessages.map((m) => ({
    role: m.role === 'STAKEHOLDER' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }));

  // 2. Parse files if present
  let fileContext = '';
  if (files && files.length > 0) {
    const fileSummaries: string[] = [];

    for (const file of files) {
      const result = await parseFile(file.filename, file.buffer, file.mime_type);

      // Add artifact to contour map
      const artifact: UploadedArtifact = {
        id: file.id,
        filename: file.filename,
        type: file.mime_type,
        extracted_data: result.extracted_data,
        section: currentSection,
        uploaded_at: new Date().toISOString(),
      };
      contourMap = addArtifact(contourMap, artifact);

      fileSummaries.push(
        `[Uploaded file: "${file.filename}" (ID: ${file.id})]\n${result.summary}\n\nExtracted data: ${JSON.stringify(result.extracted_data, null, 2)}`,
      );
    }

    fileContext = '\n\n' + fileSummaries.join('\n\n');
  }

  // 3. Build user message (text + file context)
  const userContent = content + fileContext;
  conversationHistory.push({ role: 'user', content: userContent });

  // Persist stakeholder message
  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: 'STAKEHOLDER',
      content,
      files: files
        ? JSON.stringify(
            files.map((f) => ({
              id: f.id,
              filename: f.filename,
              mime_type: f.mime_type,
              size: f.buffer.length,
            })),
          )
        : null,
      section: currentSection,
    },
  });

  // 4. Build context and call LLM
  const context = buildSessionContext(
    { ...session, contourMap: JSON.stringify(contourMap) } as PrismaSession,
    contourMap,
  );
  let response = await chat(conversationHistory, currentSection, context, contourMap);

  // 5. Process tool calls in a loop
  const richContent: unknown[] = [];
  let rounds = 0;

  while (response.tool_calls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolResults: ToolResultBlockParam[] = [];

    for (const toolCall of response.tool_calls) {
      // Handle process_file tool specially
      if (toolCall.name === 'process_file') {
        const fileId = toolCall.input.file_id as string;
        const artifact = contourMap.uploaded_artifacts.find((a) => a.id === fileId);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: artifact
            ? JSON.stringify({
                success: true,
                filename: artifact.filename,
                extracted_data: artifact.extracted_data,
              })
            : JSON.stringify({ success: false, error: 'File not found' }),
        });
        continue;
      }

      // Handle lookup_system_data tool — query AOD/AAM/DCL APIs
      if (toolCall.name === 'lookup_system_data') {
        const queryType = toolCall.input.query_type as string;
        const customerId = session.customerId;
        let lookupResult: unknown;

        try {
          switch (queryType) {
            case 'systems':
              lookupResult = await getAssetInventory(customerId);
              break;
            case 'connections':
              lookupResult = await getTopology(customerId);
              break;
            case 'graph_summary':
              lookupResult = await getGraphSummary(customerId);
              break;
            case 'dimension_data': {
              const dim = (toolCall.input.dimension as string) || '';
              lookupResult = await getDimensionData(customerId, dim);
              break;
            }
            default:
              lookupResult = { error: `Unknown query type: ${queryType}` };
          }
        } catch (err) {
          lookupResult = {
            error: err instanceof Error ? err.message : 'Lookup failed',
          };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(lookupResult ?? { data: null }),
        });
        continue;
      }

      const result = processToolCall(toolCall, contourMap);
      contourMap = result.contourMap;

      if (result.displayContent) {
        richContent.push(result.displayContent);
      }

      // Handle state transitions
      if (result.stateAction) {
        const state: ConversationState = {
          status: sessionStatus as ConversationState['status'],
          current_section: currentSection,
          section_status: sectionStatus,
        };
        const newState = reduceState(state, result.stateAction as any);
        currentSection = newState.current_section;
        sectionStatus = newState.section_status;
        sessionStatus = newState.status;
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify({ success: true }),
      });
    }

    // Build the assistant message with tool_use blocks for proper conversation flow
    const assistantContent: any[] = [];
    if (response.text) {
      assistantContent.push({ type: 'text', text: response.text });
    }
    for (const tc of response.tool_calls) {
      assistantContent.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }
    conversationHistory.push({ role: 'assistant', content: assistantContent });

    // Continue with tool results
    const updatedContext = buildSessionContext(
      { ...session, contourMap: JSON.stringify(contourMap) } as PrismaSession,
      contourMap,
    );
    response = await continueWithToolResults(
      conversationHistory,
      toolResults,
      currentSection,
      updatedContext,
      contourMap,
    );
  }

  // 6. Persist agent response
  const agentText = response.text || '(No response text)';

  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: 'AGENT',
      content: agentText,
      richContent: richContent.length > 0 ? JSON.stringify(richContent) : null,
      section: currentSection,
    },
  });

  // 7. Update session state
  await prisma.session.update({
    where: { id: session.id },
    data: {
      contourMap: JSON.stringify(contourMap),
      currentSection,
      sectionStatus: JSON.stringify(sectionStatus),
      status: sessionStatus,
    },
  });

  return {
    agent_message: agentText,
    rich_content: richContent,
    section: currentSection,
    session_status: sessionStatus,
    contour_completeness: contourMap.metadata.completeness_score,
  };
}
