import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { setupRoutes } from './routes.js';
import { setupWebSocket } from './ws.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

setupRoutes(app);
setupWebSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`DCL Onboarding Agent running on port ${PORT}`);
});
