import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { router } from './routes.js';
import { attachWss } from './ws.js';

const app = express();

app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(express.json());
app.use(router);

const httpServer = createServer(app);
attachWss(httpServer);

httpServer.listen(config.PORT, () => {
  console.log(`[server] Listening on http://localhost:${config.PORT}`);
});
