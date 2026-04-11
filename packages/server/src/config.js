/** Centralised configuration for the server package. */
export const config = {
  PORT: 3000,
  CLIENT_ORIGIN: 'http://localhost:5173',
  MAX_AWAKE_AGENTS: 10,
  WS_HEARTBEAT_INTERVAL_MS: 30_000,
};
