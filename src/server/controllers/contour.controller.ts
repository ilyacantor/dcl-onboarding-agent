import type { Request, Response } from 'express';
import { prisma } from '../db/client.js';
import type { ContourMap } from '../types/contour.types.js';
import { exportContourMap } from '../clients/dcl.client.js';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export async function getContourMap(req: Request, res: Response) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const contourMap: ContourMap = JSON.parse(session.contourMap);
    res.json(contourMap);
  } catch (err) {
    console.error('Failed to get contour map:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function approveContourMap(req: Request, res: Response) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status !== 'COMPLETE') {
      res.status(400).json({ error: 'Session must be complete before approval' });
      return;
    }

    const contourMap: ContourMap = JSON.parse(session.contourMap);
    const { reviewer_name, reviewer_notes } = req.body || {};

    contourMap.metadata.version = '1.0-approved';
    contourMap.metadata.last_updated = new Date().toISOString();

    await prisma.session.update({
      where: { id: paramId(req) },
      data: { contourMap: JSON.stringify(contourMap) },
    });

    res.json({
      status: 'approved',
      reviewer: reviewer_name || 'FDE',
      notes: reviewer_notes || null,
      contour_map: contourMap,
    });
  } catch (err) {
    console.error('Failed to approve contour map:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/sessions/:id/contour/export
 * Export the approved contour map to DCL for graph building.
 */
export async function exportToDCL(req: Request, res: Response) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const contourMap: ContourMap = JSON.parse(session.contourMap);

    if (!contourMap.metadata.version.includes('approved')) {
      res.status(400).json({
        error: 'Contour map must be approved before export. Call POST /contour/approve first.',
      });
      return;
    }

    const result = await exportContourMap(session.customerId, contourMap);

    res.json(result);
  } catch (err) {
    console.error('Failed to export contour map:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFollowUps(req: Request, res: Response) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const contourMap: ContourMap = JSON.parse(session.contourMap);
    res.json(contourMap.follow_up_tasks);
  } catch (err) {
    console.error('Failed to get follow-ups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
