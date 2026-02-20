import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { gatherIntelligence } from '../services/intel.service.js';
import { generatePreMeetRequest, sendPreMeetEmail } from '../services/premeet.service.js';
import { processFile } from '../services/file.service.js';
import type { IntelBrief } from '../types/intel.types.js';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

/**
 * GET /api/sessions/:id/intel
 * Returns the intel brief for a session. If not yet generated, triggers generation.
 */
export async function getIntelBrief(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // If brief already exists, return it
    if (session.intelBrief) {
      res.json(JSON.parse(session.intelBrief));
      return;
    }

    // Generate intel brief
    const brief = await gatherIntelligence(
      session.customerName,
      session.customerId,
    );

    // Store the brief
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        intelBrief: JSON.stringify(brief),
        status: 'PREMEET_SENT', // Move to next phase
      },
    });

    res.json(brief);
  } catch (err) {
    console.error('Failed to get intel brief:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/sessions/:id/premeet/send
 * Generate and send a pre-meeting request email.
 */
export async function sendPreMeetRequest(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);
    const { stakeholder_email } = req.body;

    if (!stakeholder_email) {
      res.status(400).json({ error: 'Missing required field: stakeholder_email' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const intelBrief: IntelBrief | null = session.intelBrief
      ? JSON.parse(session.intelBrief)
      : null;

    const portalBaseUrl =
      process.env.PORTAL_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    const request = await generatePreMeetRequest(
      sessionId,
      session.customerName,
      session.stakeholderName,
      session.stakeholderRole,
      stakeholder_email,
      intelBrief,
      portalBaseUrl,
    );

    // Attempt to send the email
    const emailResult = await sendPreMeetEmail(request);

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'PREMEET_SENT' },
    });

    res.json({
      request,
      email_sent: emailResult.sent,
      email_message_id: emailResult.messageId,
      email_error: emailResult.error,
    });
  } catch (err) {
    console.error('Failed to send pre-meet request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/sessions/:id/premeet/upload
 * Handle pre-meeting file uploads (anonymous portal).
 * Files are processed and stored as artifacts on the session.
 */
export async function uploadPreMeetArtifact(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const multerFiles = (req as any).files as Express.Multer.File[] | undefined;
    if (!multerFiles || multerFiles.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const contourMap = JSON.parse(session.contourMap);
    const received: string[] = JSON.parse(session.premeetArtifactsReceived);
    const results = [];

    for (const file of multerFiles) {
      const result = await processFile(
        file.originalname,
        file.buffer,
        file.mimetype,
      );

      // Add to contour map artifacts
      contourMap.uploaded_artifacts.push({
        id: uuid(),
        filename: file.originalname,
        type: file.mimetype,
        extracted_data: result.extracted_data,
        section: '0B',
        uploaded_at: new Date().toISOString(),
      });

      received.push(file.originalname);
      results.push({
        filename: file.originalname,
        summary: result.summary,
      });
    }

    // Update session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        contourMap: JSON.stringify(contourMap),
        premeetArtifactsReceived: JSON.stringify(received),
      },
    });

    res.json({ uploaded: results });
  } catch (err) {
    console.error('Failed to upload pre-meet artifact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/sessions/:id/start
 * Mark session as ready and advance to Section 1 for the interview.
 */
export async function startInterview(req: Request, res: Response) {
  try {
    const sessionId = paramId(req);
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const sectionStatus = JSON.parse(session.sectionStatus);
    sectionStatus['0A'] = 'COMPLETE';
    sectionStatus['0B'] = 'COMPLETE';
    sectionStatus['1'] = 'IN_PROGRESS';

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        currentSection: '1',
        sectionStatus: JSON.stringify(sectionStatus),
      },
    });

    res.json({ status: 'IN_PROGRESS', current_section: '1' });
  } catch (err) {
    console.error('Failed to start interview:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
