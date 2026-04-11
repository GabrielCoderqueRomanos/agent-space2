import type { WsMessage } from '@agent-space/shared';
import { config } from '../config';

type WsListener = (msg: WsMessage) => void;

/**
 * WebSocket client with automatic reconnection and typed message dispatch.
 */
export class WsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners: Map<string, WsListener[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Current connection state — exposed for the HUD. */
  connected = false;
  onStatusChange?: (connected: boolean) => void;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  on(event: 'message', listener: WsListener) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.onStatusChange?.(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WsMessage;
          for (const l of this.listeners.get('message') ?? []) l(msg);
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.onStatusChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, config.WS_RECONNECT_DELAY_MS);
  }
}
