/**
 * Phaser 3 сцена: тонкий оркестратор
 * Логика вынесена в миксины: SceneBackground, SceneEntities, SceneFX
 */
import Phaser from 'phaser';
import { installBackground } from './scene/SceneBackground.js';
import { installEntities }   from './scene/SceneEntities.js';
import { installFX }         from './scene/SceneFX.js';

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.gameState = data.state;
    this.combat    = data.combat;
  }

  preload() {
    this.load.atlas('sprites', '/sprites/atlas.png', '/sprites/atlas.json');
    for (const key of ['bg_01_10','bg_11_20','bg_21_30','bg_31_40','bg_41_50',
                       'bg_51_60','bg_61_70','bg_71_80','bg_81_90','bg_91_100']) {
      this.load.image(key, `/backgrounds/${key}.jpg`);
    }
    for (const key of ['ground_01_10','ground_11_20','ground_21_30','ground_31_40','ground_41_50',
                       'ground_51_60','ground_61_70','ground_71_80','ground_81_90','ground_91_100']) {
      this.load.image(key, `/backgrounds/${key}.png`);
    }
  }

  _hasSprite(key) {
    return this.textures.get('sprites').has(key);
  }

  create() {
    this.mobVisuals = new Map();
    this._cachedMaxHp = this.gameState.getStats().maxHp;

    this._createBackground();
    this._createArena();
    this._createPlayer();
    this._createOverlayUI();

    this.combat.register({
      onWaveSpawn:     (d) => this._onWaveSpawn(d),
      onMobDeath:      (d) => this._onMobDeath(d),
      onPlayerAttack:  (d) => this._onPlayerAttack(d),
      onPlayerHit:     (d) => this._onPlayerHit(d),
      onPlayerDeath:   ()  => this._onPlayerDeath(),
      onRespawn:       ()  => this._onRespawn(),
      onThornsReflect: (d) => this._onThornsReflect(d),
      onMobRegen:      (d) => this._onMobRegen(d),
      onShieldBreak:   (d) => this._onShieldBreak(d),
      onSkillUsed:     (d) => this._onSkillUsed(d),
      onMobDot:        (d) => this._onMobDot(d),
    });

    this.gameState.on('player:classChanged', () => this._updatePlayerVisual());
    this.gameState.on('player:statsChanged', () => { this._cachedMaxHp = this.gameState.getStats().maxHp; });
    this.gameState.on('player:hpChanged',    () => this._updatePlayerHpBar());
    this.gameState.on('combat:waveStarted',  (d) => { this._showWaveBanner(d); this._updateBackground(d.wave); });
  }

  update() {
    for (const [, v] of this.mobVisuals) {
      const spd = v.mob.data.speed;
      if (v.container.x > v.targetX + 1) {
        v.container.x -= (spd / 1000) * 16;
      }
    }
  }
}

// Установка миксинов на прототип — методы доступны через this в сцене
installFX(GameScene.prototype);
installBackground(GameScene.prototype);
installEntities(GameScene.prototype);
