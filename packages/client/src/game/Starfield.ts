import Phaser from 'phaser';
import { MAP_COLS, MAP_ROWS } from './mapData';

interface Star { x: number; y: number; r: number; alpha: number; twinkleSpeed: number }

/**
 * Draws a static deep-space background behind the map:
 *  – 280 stars with varying size and brightness
 *  – Three colour-tinted nebula blobs (blue, purple, teal)
 *  – Slow individual star twinkle via tweens
 */
export class Starfield {
  private gfx: Phaser.GameObjects.Graphics;
  private starObjects: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    // Extend well beyond map bounds so no black gaps appear at any zoom/pan
    const W = MAP_COLS * 32 * 2;
    const H = MAP_ROWS * 32 * 2;
    const ox = -(MAP_COLS * 32) / 2;   // offset to keep map centred inside the field
    const oy = -(MAP_ROWS * 32) / 2;

    // ── Nebula blobs ────────────────────────────────────────────────────────
    const nebula = scene.add.graphics().setDepth(-30);
    nebula.setPosition(ox, oy);
    this.drawNebula(nebula, W * 0.25, H * 0.30, 260, 0x0a1a55, 0.18);
    this.drawNebula(nebula, W * 0.75, H * 0.65, 200, 0x1a0a44, 0.15);
    this.drawNebula(nebula, W * 0.50, H * 0.50, 300, 0x001a22, 0.10);
    this.drawNebula(nebula, W * 0.10, H * 0.80, 180, 0x0a1a33, 0.12);
    this.drawNebula(nebula, W * 0.90, H * 0.15, 220, 0x1a0a33, 0.12);

    // ── Static star dots ────────────────────────────────────────────────────
    this.gfx = scene.add.graphics().setDepth(-20);
    this.gfx.setPosition(ox, oy);

    const stars = this.generateStars(420, W, H);

    for (const s of stars) {
      this.gfx.fillStyle(0xffffff, s.alpha);
      if (s.r <= 0.5) {
        this.gfx.fillRect(s.x, s.y, 1, 1);
      } else {
        this.gfx.fillCircle(s.x, s.y, s.r);
      }
    }

    // ── Twinkle a subset of brighter stars ──────────────────────────────────
    const twinklers = stars.filter(s => s.r >= 1).slice(0, 50);
    for (const s of twinklers) {
      const dot = scene.add.graphics().setDepth(-19);
      dot.setPosition(ox, oy);
      dot.fillStyle(0xffffff, s.alpha);
      dot.fillCircle(s.x, s.y, s.r);
      this.starObjects.push(dot);

      scene.tweens.add({
        targets: dot,
        alpha: { from: s.alpha, to: s.alpha * 0.3 },
        duration: 800 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 3000,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private drawNebula(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    color: number,
    maxAlpha: number,
  ) {
    const steps = 8;
    for (let i = steps; i >= 1; i--) {
      const frac  = i / steps;
      const alpha = maxAlpha * (1 - frac) * 1.5;
      gfx.fillStyle(color, Math.min(alpha, maxAlpha));
      gfx.fillCircle(cx, cy, r * frac);
    }
  }

  private generateStars(count: number, W: number, H: number): Star[] {
    const rng = this.seededRng(42);
    return Array.from({ length: count }, () => ({
      x:            Math.floor(rng() * W),
      y:            Math.floor(rng() * H),
      r:            rng() < 0.6 ? 0.5 : rng() < 0.85 ? 1 : rng() < 0.96 ? 1.5 : 2,
      alpha:        0.2 + rng() * 0.7,
      twinkleSpeed: 500 + rng() * 2500,
    }));
  }

  /** Simple seeded LCG pseudo-random number generator (0–1). */
  private seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }
}
