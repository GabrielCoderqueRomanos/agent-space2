import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { router } from './routes.js';
import { managerRouter } from './manager.js';
import { attachWss } from './ws.js';
import { initStore } from './store.js';

initStore();

const app = express();

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
app.use(express.json());
app.use(router);
app.use('/api/v1', managerRouter);

const httpServer = createServer(app);
attachWss(httpServer);

httpServer.listen(config.PORT, () => {
  console.log(`[server] Listening on http://localhost:${config.PORT}`);
});
