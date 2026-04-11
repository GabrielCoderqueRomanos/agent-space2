import Phaser from 'phaser';
import type { AgentState, AgentZone, AgentStatus } from '@agent-space/shared';
import { config, DIALOGUE_POOL, ARRIVAL_POOL } from '../config';
import { randomInZone } from './mapData';

type AnimState = 'idle' | 'walking' | 'working' | 'resting' | 'alert' | 'reawakening';

/** Per-status post-FX configuration */
const FX_CONFIG: Record<AgentStatus, {
  glowColor?: number; glowOuter?: number; glowInner?: number;
  bloomStrength?: number;
  chromAb?: boolean;
  tint?: number;
}> = {
  spawned:  { glowColor: 0x22aaff, glowOuter: 2,   glowInner: 0.5 },
  working:  { glowColor: 0xff8800, glowOuter: 3,   glowInner: 1,   bloomStrength: 0.8 },
  waiting:  { glowColor: 0x4466cc, glowOuter: 1.5, glowInner: 0.3 },
  done:     { tint: 0x667788 },
  error:    { glowColor: 0xff1133, glowOuter: 4,   glowInner: 1.5, chromAb: true },
};

export class AgentSprite {
  readonly agentId: string;

  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private nameLabel: Phaser.GameObjects.Text;
  private bubbleGroup: Phaser.GameObjects.Group;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private currentState: AgentState;
  private isMoving: boolean = false;
  private dialogueTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    state: AgentState,
    tileToWorld: (tx: number, ty: number) => { x: number; y: number },
  ) {
    this.agentId = state.agentId;
    this.scene   = scene;
    this.currentState = state;
    this.bubbleGroup  = scene.add.group();

    const { tx, ty } = randomInZone('bridge');
    const { x, y }   = tileToWorld(tx, ty);

    this.sprite = scene.add.image(x, y, 'agent', 'idle').setDepth(10);

    this.nameLabel = scene.add.text(x, y - 22, state.name, {
      fontSize:        '8px',
      color:           '#88ddff',
      stroke:          '#000000',
      strokeThickness: 3,
      fontFamily:      'monospace',
    }).setOrigin(0.5, 1).setDepth(20);

    this.spawnEffect(x, y);
    this.scheduleDialogue();
    this.applyState(state, tileToWorld);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  updateState(
    state: AgentState,
    tileToWorld: (tx: number, ty: number) => { x: number; y: number },
  ) {
    const prevZone = this.currentState.zone;
    this.currentState = state;
    this.applyState(state, tileToWorld, prevZone !== state.zone);
  }

  reawaken(tileToWorld: (tx: number, ty: number) => { x: number; y: number }) {
    this.playAnim('reawakening');
    this.scene.tweens.add({
      targets:  this.sprite,
      scaleX:   1.5,
      scaleY:   1.5,
      alpha:    0.3,
      duration: 120,
      yoyo:     true,
      repeat:   4,
      onComplete: () => {
        this.sprite.setScale(1).setAlpha(1);
        this.applyState(this.currentState, tileToWorld);
      },
    });
  }

  showArrivalBubble() {
    const text = ARRIVAL_POOL[Math.floor(Math.random() * ARRIVAL_POOL.length)];
    this.showBubble(text, config.ARRIVAL_BUBBLE_DURATION_MS, 0x22aaff);
  }

  showRandomDialogue() {
    const text = DIALOGUE_POOL[Math.floor(Math.random() * DIALOGUE_POOL.length)];
    this.showBubble(text, config.DIALOGUE_DURATION_MS);
  }

  get zone(): AgentZone  { return this.currentState.zone; }
  get status(): AgentStatus { return this.currentState.status; }
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  destroy() {
    this.dialogueTimer?.remove();
    this.bubbleGroup.destroy(true);
    this.nameLabel.destroy();
    this.particles?.destroy();
    this.sprite.destroy();
  }

  update() {
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 18);
    // Sync working-state particles position
    if (this.particles) {
      this.particles.setPosition(this.sprite.x, this.sprite.y - 8);
    }
  }

  // ─── State application ───────────────────────────────────────────────────

  private applyState(
    state: AgentState,
    tileToWorld: (tx: number, ty: number) => { x: number; y: number },
    zoneChanged = false,
  ) {
    this.applyFx(state.status);

    if (zoneChanged || !this.isMoving) {
      const { tx, ty } = randomInZone(state.zone);
      const { x, y }   = tileToWorld(tx, ty);
      this.moveTo(x, y);
    } else {
      this.playAnim(this.idleAnimForStatus(state.status));
    }
  }

  private idleAnimForStatus(status: AgentStatus): AnimState {
    switch (status) {
      case 'working': return 'working';
      case 'done':    return 'resting';
      case 'error':   return 'alert';
      default:        return 'idle';
    }
  }

  // ─── Movement ────────────────────────────────────────────────────────────

  private moveTo(x: number, y: number) {
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
    if (dist < 4) {
      this.playAnim(this.idleAnimForStatus(this.currentState.status));
      return;
    }

    this.isMoving = true;
    this.playAnim('walking');
    this.sprite.setFlipX(x < this.sprite.x);

    this.scene.tweens.add({
      targets:  this.sprite,
      x,
      y,
      duration: (dist / config.AGENT_SPEED) * 1000,
      ease:     'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.playAnim(this.idleAnimForStatus(this.currentState.status));
      },
    });

    if (this.currentState.status === 'error') {
      this.scene.events.emit('agent_error_move', this);
    }
  }

  // ─── Animation & particles ───────────────────────────────────────────────

  private playAnim(anim: AnimState) {
    this.sprite.setTexture('agent', anim);

    if (anim === 'working') {
      this.startWorkingParticles();
    } else {
      this.stopParticles();
    }
  }

  private startWorkingParticles() {
    if (this.particles) return;
    this.particles = this.scene.add.particles(
      this.sprite.x,
      this.sprite.y - 8,
      'spark_particle',
      {
        speed:    { min: 15, max: 50 },
        angle:    { min: -150, max: -30 },
        scale:    { start: 1,   end: 0 },
        alpha:    { start: 0.9, end: 0 },
        lifespan: 500,
        frequency: 120,
        tint:     [0xff8800, 0xffcc00, 0xff4400],
        quantity:  1,
      },
    );
    this.particles.setDepth(14);
  }

  private stopParticles() {
    if (this.particles) {
      this.particles.destroy();
      this.particles = null;
    }
  }

  // ─── Post-FX ─────────────────────────────────────────────────────────────

  private applyFx(status: AgentStatus) {
    this.sprite.postFX.clear();
    this.sprite.clearTint();

    const fx = FX_CONFIG[status];
    if (!fx) return;

    if (fx.tint !== undefined) {
      this.sprite.setTint(fx.tint);
      return;
    }
    if (fx.chromAb) {
      this.sprite.postFX.addColorMatrix().saturate(3);
    }
    if (fx.bloomStrength) {
      this.sprite.postFX.addBloom(0xffffff, 1, 1, fx.bloomStrength);
    }
    if (fx.glowColor !== undefined) {
      this.sprite.postFX.addGlow(fx.glowColor, fx.glowOuter ?? 2, fx.glowInner ?? 0.5);
    }
  }

  // ─── Spawn effect ─────────────────────────────────────────────────────────

  private spawnEffect(x: number, y: number) {
    const emitter = this.scene.add.particles(x, y, 'glow_particle', {
      speed:    { min: 40, max: 100 },
      scale:    { start: 0.8, end: 0 },
      alpha:    { start: 1,   end: 0 },
      lifespan: 600,
      quantity: 16,
      tint:     [0x00ffaa, 0x22aaff, 0xffffff],
    });
    emitter.setDepth(16);
    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  // ─── Speech bubbles ──────────────────────────────────────────────────────

  private showBubble(text: string, duration: number, borderColor = 0x00ffaa) {
    this.bubbleGroup.clear(true, true);

    const bx = this.sprite.x + 10;
    const by = this.sprite.y - 42;
    const tw = text.length * 5.5 + 10;
    const th = 14;

    const bg = this.scene.add.graphics().setDepth(30);
    bg.fillStyle(0x001a2a, 0.95);
    bg.fillRoundedRect(bx - 2, by - 2, tw, th, 3);
    bg.lineStyle(1, borderColor, 0.9);
    bg.strokeRoundedRect(bx - 2, by - 2, tw, th, 3);

    // Tail
    bg.fillStyle(0x001a2a, 0.95);
    bg.fillTriangle(bx + 2, by + th - 2, bx + 7, by + th - 2, bx + 4, by + th + 4);

    const label = this.scene.add.text(bx + 3, by + 1, text, {
      fontSize:   '7px',
      color:      '#99eedd',
      fontFamily: 'monospace',
    }).setDepth(31);

    this.bubbleGroup.add(bg);
    this.bubbleGroup.add(label);

    this.scene.time.delayedCall(duration, () => this.bubbleGroup.clear(true, true));
  }

  private scheduleDialogue() {
    const delay =
      config.DIALOGUE_INTERVAL_MIN_MS +
      Math.random() * (config.DIALOGUE_INTERVAL_MAX_MS - config.DIALOGUE_INTERVAL_MIN_MS);

    this.dialogueTimer = this.scene.time.delayedCall(delay, () => {
      this.showRandomDialogue();
      this.scheduleDialogue();
    });
  }
}
