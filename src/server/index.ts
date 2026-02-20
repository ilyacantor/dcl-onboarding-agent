import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { setupRoutes } from './routes.js';
import { setupWebSocket } from './ws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

setupRoutes(app);
setupWebSocket(server);

// Serve built client in production
const clientDist = join(__dirname, '../../dist/client');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for unmatched routes
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`DCL Onboarding Agent running on port ${PORT}`);
});
