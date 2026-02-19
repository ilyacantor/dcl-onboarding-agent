import type { Express } from 'express';
import * as sessionCtrl from './controllers/session.controller.js';
import * as messageCtrl from './controllers/message.controller.js';
import * as contourCtrl from './controllers/contour.controller.js';

export function setupRoutes(app: Express): void {
  // Session management
  app.post('/api/sessions', sessionCtrl.createSession);
  app.get('/api/sessions', sessionCtrl.listSessions);
  app.get('/api/sessions/:id', sessionCtrl.getSession);

  // Messages (HTTP fallback — primary is WebSocket)
  app.post('/api/sessions/:id/messages', messageCtrl.sendMessage);
  app.get('/api/sessions/:id/messages', messageCtrl.getMessages);

  // Contour map
  app.get('/api/sessions/:id/contour', contourCtrl.getContourMap);
  app.post('/api/sessions/:id/contour/approve', contourCtrl.approveContourMap);

  // Follow-ups
  app.get('/api/sessions/:id/followups', contourCtrl.getFollowUps);

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'dcl-onboarding-agent' });
  });
}
