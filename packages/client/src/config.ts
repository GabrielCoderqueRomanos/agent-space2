/** Centralised configuration for the client package. */
export const config = {
  SERVER_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',

  // Map tile size in pixels
  TILE_SIZE: 32,

  // Agent sprite dimensions
  SPRITE_W: 24,
  SPRITE_H: 32,

  // Walking speed (pixels/second)
  AGENT_SPEED: 80,

  // Social dialogue
  DIALOGUE_INTERVAL_MIN_MS: 8_000,
  DIALOGUE_INTERVAL_MAX_MS: 15_000,
  DIALOGUE_DURATION_MS: 2_500,
  ARRIVAL_BUBBLE_DURATION_MS: 1_000,

  // WebSocket reconnect
  WS_RECONNECT_DELAY_MS: 3_000,
};

/** Predefined social dialogue pool. */
export const DIALOGUE_POOL = [
  'Procesando...',
  '¿Ves esto?',
  'ACK',
  'sync OK',
  'error en chunk 3',
  'task done ✓',
  'awaiting input',
  'pipeline clear',
  'checksum OK',
  'reticulating...',
  'null pointer?',
  'retrying...',
  'heap overflow!',
  '42',
  'signal received',
];

/** Short arrival reactions */
export const ARRIVAL_POOL = ['!', '+', 'hey!', 'o/', 'sup?'];
