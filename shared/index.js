/**
 * Runtime JavaScript exports for the shared package.
 * Used by the server (plain Node.js).
 * TypeScript consumers import from types.ts via the Vite alias.
 */

/** @type {Record<string, string>} */
export const STATUS_TO_ZONE = {
  spawned: 'bridge',
  working: 'engine_room',
  waiting: 'bridge',
  done:    'hangar',
  error:   'alert_bay',
};
