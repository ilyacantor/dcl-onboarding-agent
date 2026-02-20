import type { Express } from 'express';
import multer from 'multer';
import * as sessionCtrl from './controllers/session.controller.js';
import * as messageCtrl from './controllers/message.controller.js';
import * as contourCtrl from './controllers/contour.controller.js';
import * as intelCtrl from './controllers/intel.controller.js';

// Multer: store files in memory (we pass buffers to parsers)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false); // silently skip unsupported types
    }
  },
});

export function setupRoutes(app: Express): void {
  // Session management
  app.post('/api/sessions', sessionCtrl.createSession);
  app.get('/api/sessions', sessionCtrl.listSessions);
  app.get('/api/sessions/:id', sessionCtrl.getSession);

  // Intel & Pre-meeting (Sprint 3)
  app.get('/api/sessions/:id/intel', intelCtrl.getIntelBrief);
  app.post('/api/sessions/:id/premeet/send', intelCtrl.sendPreMeetRequest);
  app.post(
    '/api/sessions/:id/premeet/upload',
    upload.array('files', 10),
    intelCtrl.uploadPreMeetArtifact,
  );
  app.post('/api/sessions/:id/start', intelCtrl.startInterview);

  // Messages (HTTP fallback — primary is WebSocket)
  app.post(
    '/api/sessions/:id/messages',
    upload.array('files', 10),
    messageCtrl.sendMessage,
  );
  app.get('/api/sessions/:id/messages', messageCtrl.getMessages);

  // Contour map
  app.get('/api/sessions/:id/contour', contourCtrl.getContourMap);
  app.post('/api/sessions/:id/contour/approve', contourCtrl.approveContourMap);
  app.post('/api/sessions/:id/contour/export', contourCtrl.exportToDCL);

  // Follow-ups
  app.get('/api/sessions/:id/followups', contourCtrl.getFollowUps);

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'dcl-onboarding-agent' });
  });
}
