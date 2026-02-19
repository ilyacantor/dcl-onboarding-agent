import type { Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { createEmptyContourMap } from '../types/contour.types.js';
import { createInitialState } from '../services/state.service.js';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export async function createSession(req: Request, res: Response) {
  try {
    const { customer_id, customer_name, stakeholder_name, stakeholder_role } = req.body;

    if (!customer_id || !customer_name || !stakeholder_name || !stakeholder_role) {
      res.status(400).json({ error: 'Missing required fields: customer_id, customer_name, stakeholder_name, stakeholder_role' });
      return;
    }

    const initialState = createInitialState();
    const contourMap = createEmptyContourMap();

    const session = await prisma.session.create({
      data: {
        customerId: customer_id,
        customerName: customer_name,
        stakeholderName: stakeholder_name,
        stakeholderRole: stakeholder_role,
        status: initialState.status,
        currentSection: initialState.current_section,
        sectionStatus: JSON.stringify(initialState.section_status),
        contourMap: JSON.stringify(contourMap),
      },
    });

    res.status(201).json(formatSession(session));
  } catch (err) {
    console.error('Failed to create session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSession(req: Request, res: Response) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(formatSession(session));
  } catch (err) {
    console.error('Failed to get session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listSessions(_req: Request, res: Response) {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(sessions.map(formatSession));
  } catch (err) {
    console.error('Failed to list sessions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function formatSession(session: {
  id: string;
  customerId: string;
  customerName: string;
  stakeholderName: string;
  stakeholderRole: string;
  status: string;
  currentSection: string;
  sectionStatus: string;
  contourMap: string;
  intelBrief: string | null;
  premeetArtifactsReceived: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    customer_id: session.customerId,
    customer_name: session.customerName,
    stakeholder_name: session.stakeholderName,
    stakeholder_role: session.stakeholderRole,
    status: session.status,
    current_section: session.currentSection,
    section_status: JSON.parse(session.sectionStatus),
    contour_map_summary: {
      completeness_score: JSON.parse(session.contourMap).metadata?.completeness_score ?? 0,
    },
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}
