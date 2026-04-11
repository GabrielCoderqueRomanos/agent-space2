import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { Hud } from './hud/Hud';
import './hud/hud.css';

const HUD_WIDTH = 280;

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#050510',
  scene: [GameScene],
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width:  window.innerWidth - HUD_WIDTH,
    height: window.innerHeight,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
});

game.events.once('ready', () => {
  const hud = new Hud(game.events);
  hud.setupEvents();
});
