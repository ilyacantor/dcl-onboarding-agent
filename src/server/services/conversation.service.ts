import type { Session as PrismaSession } from '@prisma/client';
import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.js';
import { prisma } from '../db/client.js';
import { chat, continueWithToolResults, type ConversationMessage, type ToolCall } from './llm.service.js';
import { reduceState, type ConversationState } from './state.service.js';
import { processToolCall } from './contour.service.js';
import { buildSessionContext } from './context.service.js';
import type { ContourMap } from '../types/contour.types.js';
import type { SectionId } from '../types/session.types.js';

const MAX_TOOL_ROUNDS = 10;

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
 * 2. Send to LLM with context
 * 3. Process any tool calls (loop until text response)
 * 4. Update state and contour map
 * 5. Persist everything
 */
export async function handleStakeholderMessage(
  session: PrismaSession,
  content: string,
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

  // 2. Add the new stakeholder message
  conversationHistory.push({ role: 'user', content });

  // Persist stakeholder message
  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: 'STAKEHOLDER',
      content,
      section: currentSection,
    },
  });

  // 3. Build context and call LLM
  const context = buildSessionContext(session, contourMap);
  let response = await chat(conversationHistory, currentSection, context, contourMap);

  // 4. Process tool calls in a loop
  const richContent: unknown[] = [];
  let rounds = 0;

  while (response.tool_calls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolResults: ToolResultBlockParam[] = [];

    for (const toolCall of response.tool_calls) {
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

  // 5. Persist agent response
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

  // 6. Update session state
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
