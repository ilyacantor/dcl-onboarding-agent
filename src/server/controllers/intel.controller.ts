import type { Request, Response } from 'express';

// Sprint 3 stubs — pre-meeting intelligence

export async function getIntelBrief(req: Request, res: Response) {
  res.status(501).json({ error: 'Intel brief not implemented yet (Sprint 3)' });
}

export async function sendPreMeetRequest(req: Request, res: Response) {
  res.status(501).json({ error: 'Pre-meeting request not implemented yet (Sprint 3)' });
}

export async function uploadPreMeetArtifact(req: Request, res: Response) {
  res.status(501).json({ error: 'Pre-meeting upload not implemented yet (Sprint 3)' });
}
