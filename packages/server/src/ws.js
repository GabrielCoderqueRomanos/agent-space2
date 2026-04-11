import { WebSocketServer } from 'ws';
import { agents } from './state.js';
import { config } from './config.js';

/** @type {WebSocketServer} */
let wss;

/**
 * Attach a WebSocket server to an existing HTTP server.
 * @param {import('http').Server} httpServer
 */
export function attachWss(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    // Send current state to the new client
    send(socket, 'state_sync', Array.from(agents.values()));

    socket.on('error', (err) => {
      console.error('[ws] client error', err.message);
    });
  });

  // Heartbeat to detect dead connections
  const interval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.ping();
      }
    }
  }, config.WS_HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(interval));

  console.log('[ws] WebSocket server attached');
}

/**
 * Broadcast a message to all connected clients.
 * @param {string} event
 * @param {object | object[]} payload
 */
export function broadcast(event, payload) {
  if (!wss) return;
  const message = JSON.stringify({ event, payload });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Send a message to a single socket.
 * @param {import('ws').WebSocket} socket
 * @param {string} event
 * @param {object | object[]} payload
 */
function send(socket, event, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ event, payload }));
  }
}
