import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { handleStakeholderMessage, type FileInput } from '../services/conversation.service.js';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Missing required field: content' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status === 'COMPLETE') {
      res.status(400).json({ error: 'Session is already complete' });
      return;
    }

    // Process uploaded files from multer
    let files: FileInput[] | undefined;
    const multerFiles = (req as any).files as Express.Multer.File[] | undefined;
    if (multerFiles && multerFiles.length > 0) {
      files = multerFiles.map((f) => ({
        id: uuid(),
        filename: f.originalname,
        mime_type: f.mimetype,
        buffer: f.buffer,
      }));
    }

    const result = await handleStakeholderMessage(session, content, files);

    res.json(result);
  } catch (err) {
    console.error('Failed to send message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMessages(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    res.json(
      messages.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        role: m.role,
        content: m.content,
        rich_content: m.richContent ? JSON.parse(m.richContent) : null,
        files: m.files ? JSON.parse(m.files) : null,
        section: m.section,
        timestamp: m.timestamp,
      })),
    );
  } catch (err) {
    console.error('Failed to get messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
