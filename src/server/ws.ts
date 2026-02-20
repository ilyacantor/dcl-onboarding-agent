import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { v4 as uuid } from 'uuid';
import { prisma } from './db/client.js';
import { handleStakeholderMessage, type FileInput } from './services/conversation.service.js';

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // Extract session ID from query string: /ws?session_id=xxx
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      ws.close(4000, 'Missing session_id query parameter');
      return;
    }

    console.log(`WebSocket connected for session ${sessionId}`);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'stakeholder_message') {
          // Send typing indicator
          ws.send(JSON.stringify({ type: 'typing', status: true }));

          const session = await prisma.session.findUnique({
            where: { id: sessionId },
          });

          if (!session) {
            ws.send(JSON.stringify({ type: 'error', error: 'Session not found' }));
            return;
          }

          // Process base64-encoded file attachments if present
          let files: FileInput[] | undefined;
          if (message.files && Array.isArray(message.files)) {
            files = message.files.map(
              (f: { filename: string; mime_type: string; data: string }) => ({
                id: uuid(),
                filename: f.filename,
                mime_type: f.mime_type,
                buffer: Buffer.from(f.data, 'base64'),
              }),
            );
          }

          const result = await handleStakeholderMessage(
            session,
            message.content,
            files,
          );

          ws.send(
            JSON.stringify({
              type: 'agent_message',
              content: result.agent_message,
              rich_content: result.rich_content,
              section: result.section,
              session_status: result.session_status,
              contour_completeness: result.contour_completeness,
            }),
          );

          ws.send(JSON.stringify({ type: 'typing', status: false }));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Failed to process message' }));
        ws.send(JSON.stringify({ type: 'typing', status: false }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket disconnected for session ${sessionId}`);
    });
  });
}
