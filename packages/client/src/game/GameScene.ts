import Phaser from 'phaser';
import type { AgentState, WsMessage } from '@agent-space/shared';
import { TextureFactory } from './TextureFactory';
import { AgentSprite }    from './AgentSprite';
import { Starfield }      from './Starfield';
import { CrtPipeline }    from './CrtPipeline';
import { ShipRenderer }    from './ShipRenderer';
import { ZoneAnimations }  from './ZoneAnimations';
import { TilesetGenerator } from './TilesetGenerator';
import { ShipTilemap }      from './ShipTilemap';
import { MAP_COLS, MAP_ROWS } from './mapData';
import { config }         from '../config';
import { WsClient }       from '../ws/WsClient';

export class GameScene extends Phaser.Scene {
  private agents: Map<string, AgentSprite> = new Map();
  private wsClient!: WsClient;

  constructor() { super({ key: 'GameScene' }); }

  // ─── Phaser lifecycle ────────────────────────────────────────────────────

  preload() {
    new TextureFactory(this).createAll();
    TilesetGenerator.generate(this);
  }

  create() {
    // ── Register & apply CRT pipeline ──────────────────────────────────
    const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (renderer.pipelines) {
      renderer.pipelines.addPostPipeline('CrtPipeline', CrtPipeline);
      this.cameras.main.setPostPipeline(CrtPipeline);
    }

    // ── Starfield (behind everything) ───────────────────────────────────
    new Starfield(this);

    // ── Ship ────────────────────────────────────────────────────────────
    new ShipRenderer(this);
    new ShipTilemap(this);
    new ZoneAnimations(this);

    // ── WebSocket ───────────────────────────────────────────────────────
    this.wsClient = new WsClient(config.WS_URL);
    this.wsClient.on('message', (msg: WsMessage) => this.handleWsMessage(msg));

    // ── Camera: ship floats in space — fit to screen with letterbox ─────
    const S    = config.TILE_SIZE;
    const mapW = MAP_COLS * S;
    const mapH = MAP_ROWS * S;

    const scaleX = this.scale.width  / mapW;
    const scaleY = this.scale.height / mapH;
    // Math.min → ship fits fully on screen, starfield visible around it
    const zoom   = Math.min(scaleX, scaleY) * 0.92;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(-mapW, -mapH, mapW * 3, mapH * 3);
    this.cameras.main.centerOn(mapW / 2, mapH / 2);

    // Re-centre on resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const newZoom = Math.min(
        gameSize.width  / mapW,
        gameSize.height / mapH,
      ) * 0.92;
      this.cameras.main.setZoom(newZoom);
      this.cameras.main.centerOn(mapW / 2, mapH / 2);
    });

    // ── Input ────────────────────────────────────────────────────────────
    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd    = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.events.on('update', () => {
      const cam   = this.cameras.main;
      const speed = 5 / cam.zoom;
      if (cursors.left.isDown  || wasd['A'].isDown) cam.scrollX -= speed;
      if (cursors.right.isDown || wasd['D'].isDown) cam.scrollX += speed;
      if (cursors.up.isDown    || wasd['W'].isDown) cam.scrollY -= speed;
      if (cursors.down.isDown  || wasd['S'].isDown) cam.scrollY += speed;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.zoom  = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.25, 4);
    });

    // ── Social events ────────────────────────────────────────────────────
    this.events.on('agent_error_move', (a: AgentSprite) => this.repelNeighbours(a));

    // ── Expose WS client to HUD ──────────────────────────────────────────
    this.game.events.emit('ws_client_ready', this.wsClient);
  }

  update() {
    for (const agent of this.agents.values()) agent.update();
  }

  // ─── WS handling ─────────────────────────────────────────────────────────

  private handleWsMessage(msg: WsMessage) {
    switch (msg.event) {
      case 'state_sync': {
        for (const s of msg.payload as AgentState[]) this.spawnOrUpdate(s, false);
        break;
      }
      case 'agent_spawned': {
        const s = msg.payload as AgentState;
        this.spawnOrUpdate(s, true);
        this.notifyHud('spawn', s);
        break;
      }
      case 'agent_updated': {
        const s = msg.payload as AgentState;
        this.spawnOrUpdate(s, false);
        this.notifyHud('update', s);
        break;
      }
      case 'agent_reawakened': {
        const s  = msg.payload as AgentState;
        const ex = this.agents.get(s.agentId);
        if (ex) {
          ex.updateState(s, this.tileToWorld.bind(this));
          ex.reawaken(this.tileToWorld.bind(this));
        } else {
          this.spawnOrUpdate(s, true);
        }
        this.notifyHud('reawaken', s);
        break;
      }
      case 'agent_removed': {
        const { agentId } = msg.payload as { agentId: string };
        this.removeAgent(agentId);
        this.notifyHud('remove', { agentId } as AgentState);
        break;
      }
    }
  }

  // ─── Agent management ────────────────────────────────────────────────────

  private spawnOrUpdate(state: AgentState, isNew: boolean) {
    if (this.agents.has(state.agentId)) {
      this.agents.get(state.agentId)!.updateState(state, this.tileToWorld.bind(this));
    } else {
      const sprite = new AgentSprite(this, state, this.tileToWorld.bind(this));
      this.agents.set(state.agentId, sprite);
      if (isNew) this.greetNeighbours(sprite);
    }
  }

  private removeAgent(agentId: string) {
    const sprite = this.agents.get(agentId);
    if (sprite) { sprite.destroy(); this.agents.delete(agentId); }
  }

  // ─── Social ──────────────────────────────────────────────────────────────

  private greetNeighbours(newAgent: AgentSprite) {
    for (const other of this.agents.values()) {
      if (other.agentId === newAgent.agentId) continue;
      if (other.zone === newAgent.zone) {
        this.time.delayedCall(300 + Math.random() * 400, () => other.showArrivalBubble());
      }
    }
  }

  private repelNeighbours(errorAgent: AgentSprite) {
    for (const other of this.agents.values()) {
      if (other.agentId === errorAgent.agentId) continue;
      const dist = Phaser.Math.Distance.Between(errorAgent.x, errorAgent.y, other.x, other.y);
      if (dist < 60) {
        const angle = Phaser.Math.Angle.Between(errorAgent.x, errorAgent.y, other.x, other.y);
        this.tweens.add({
          targets:  other,
          x:        other.x + Math.cos(angle) * 28,
          y:        other.y + Math.sin(angle) * 28,
          duration: 250,
          ease:     'Power2',
        });
      }
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    const S = config.TILE_SIZE;
    return { x: tx * S + S / 2, y: ty * S + S / 2 };
  }

  private notifyHud(type: string, state: Partial<AgentState> & { agentId: string }) {
    this.game.events.emit('hud_event', { type, state });
  }
}
