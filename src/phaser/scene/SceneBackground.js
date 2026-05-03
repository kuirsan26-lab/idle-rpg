/**
 * Mixin: фон, арена, оверлейный UI сцены
 * Устанавливается на GameScene.prototype
 */

const SCENE_W  = 620;
const SCENE_H  = 480;
const GROUND_Y = 310;

const BG_KEYS = [
  'bg_01_10','bg_11_20','bg_21_30','bg_31_40','bg_41_50',
  'bg_51_60','bg_61_70','bg_71_80','bg_81_90','bg_91_100',
];
const GROUND_KEYS = [
  'ground_01_10','ground_11_20','ground_21_30','ground_31_40','ground_41_50',
  'ground_51_60','ground_61_70','ground_71_80','ground_81_90','ground_91_100',
];

export function installBackground(proto) {
  proto._bgKey = function(wave) {
    return BG_KEYS[Math.min(Math.ceil(wave / 10), 10) - 1];
  };

  proto._groundKey = function(wave) {
    return GROUND_KEYS[Math.min(Math.ceil(wave / 10), 10) - 1];
  };

  proto._updateBackground = function(wave) {
    const bgKey     = this._bgKey(wave);
    const groundKey = this._groundKey(wave);
    if (this._bgImage && this.textures.exists(bgKey)) {
      this.tweens.add({
        targets: this._bgImage, alpha: 0, duration: 600,
        onComplete: () => {
          this._bgImage.setTexture(bgKey).setAlpha(0);
          this.tweens.add({ targets: this._bgImage, alpha: 1, duration: 800 });
        },
      });
    }
    if (this._groundImage && this.textures.exists(groundKey)) {
      this.tweens.add({
        targets: this._groundImage, alpha: 0, duration: 600,
        onComplete: () => {
          this._groundImage.setTexture(groundKey).setAlpha(0);
          this.tweens.add({ targets: this._groundImage, alpha: 1, duration: 800 });
        },
      });
    }
  };

  proto._createBackground = function() {
    const firstKey = this._bgKey(this.gameState?.currentWave ?? 1);
    const hasBg    = this.textures.exists(firstKey);

    if (hasBg) {
      this._bgImage = this.add.image(0, 0, firstKey).setOrigin(0).setDepth(0);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x06060f, 0x06060f, 0x0c0820, 0x0c0820, 1);
      g.fillRect(0, 0, SCENE_W, GROUND_Y);
      g.fillStyle(0xeeeedd, 0.25); g.fillCircle(520, 55, 38);
      g.fillStyle(0x06060f, 0.6);  g.fillCircle(535, 48, 36);
      const stars = this.add.graphics();
      stars.fillStyle(0xffffff, 1);
      for (let i = 0; i < 80; i++) {
        stars.fillCircle(
          Math.random() * SCENE_W,
          Math.random() * (GROUND_Y - 40),
          Math.random() < 0.15 ? 1.5 : 0.8,
        );
      }
      const mtn = this.add.graphics();
      mtn.fillStyle(0x0a0618, 1);
      mtn.fillPoints(
        [[0,190],[80,120],[180,160],[280,100],[360,145],[450,115],[540,150],[620,180],[620,GROUND_Y],[0,GROUND_Y]]
          .map(([x,y]) => ({ x, y })), true,
      );
      const hills = this.add.graphics();
      hills.fillStyle(0x0d0a1e, 1);
      hills.fillPoints(
        [[0,230],[100,185],[200,220],[320,175],[430,205],[530,180],[620,210],[620,GROUND_Y],[0,GROUND_Y]]
          .map(([x,y]) => ({ x, y })), true,
      );
    }

    const groundKey = this._groundKey(this.gameState?.currentWave ?? 1);
    const hasGround = this.textures.exists(groundKey);
    if (hasGround) {
      this._groundImage = this.add.image(0, GROUND_Y - 45, groundKey)
        .setOrigin(0, 0).setDepth(1);
    } else {
      const ground = this.add.graphics().setDepth(1);
      ground.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x0d0820, 0x0d0820, hasBg ? 0.75 : 1);
      ground.fillRect(0, GROUND_Y, SCENE_W, SCENE_H - GROUND_Y);
      if (!hasBg) {
        ground.lineStyle(2, 0x3a2060, 0.9);
        ground.lineBetween(0, GROUND_Y, SCENE_W, GROUND_Y);
        ground.lineStyle(1, 0x6040aa, 0.3);
        ground.lineBetween(0, GROUND_Y - 1, SCENE_W, GROUND_Y - 1);
      }
    }

    for (let i = 0; i < 4; i++) {
      const fog = this.add.graphics();
      fog.fillStyle(0x200840, 0.06 - i * 0.01);
      fog.fillEllipse(100 + i * 140, GROUND_Y + 5, 200, 20);
    }
  };

  proto._createArena = function() {
    const playerZone = this.add.graphics().setDepth(2);
    playerZone.fillStyle(0x002233, 0.15);
    playerZone.fillRect(0, 80, 200, GROUND_Y - 80);
    playerZone.lineStyle(1, 0x004466, 0.25);
    playerZone.strokeRect(0, 80, 200, GROUND_Y - 80);

    const divider = this.add.graphics().setDepth(2);
    divider.lineStyle(1, 0x3a2060, 0.5);
    divider.lineBetween(210, 60, 210, GROUND_Y);

    this.add.text(105, 70, '— ГЕРОЙ —', {
      fontSize: '9px', fill: '#335577', fontFamily: 'Segoe UI', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(420, 70, '— ВРАГИ —', {
      fontSize: '9px', fill: '#553322', fontFamily: 'Segoe UI', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(2);

    this._createTorch(195, GROUND_Y - 5);
    this._createTorch(215, GROUND_Y - 5);
  };

  proto._createTorch = function(x, y) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x8844aa, 0.8);
    g.fillRect(x - 1, y - 20, 3, 20);
    const flame = this.add.graphics().setDepth(2);
    flame.fillStyle(0xff8822, 0.9);
    flame.fillTriangle(x, y - 25, x - 4, y - 20, x + 4, y - 20);
    this.tweens.add({
      targets: flame, scaleX: 0.7, scaleY: 1.3,
      duration: 250 + Math.random() * 150, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
  };

  proto._createOverlayUI = function() {
    this.waveBanner = this.add.text(SCENE_W / 2, 20, '', {
      fontSize: '17px', fill: '#ffdd44', fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.deathOverlay = this.add.rectangle(0, 0, SCENE_W, SCENE_H, 0x000000, 0)
      .setOrigin(0).setDepth(20);
    this.deathText = this.add.text(SCENE_W / 2, SCENE_H / 2 - 24, '💀  ВЫ ПОГИБЛИ', {
      fontSize: '26px', fill: '#ff4444', fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(21);
    this.respawnText = this.add.text(SCENE_W / 2, SCENE_H / 2 + 16, 'Возрождение через 3с...', {
      fontSize: '14px', fill: '#aaaaaa', fontFamily: 'Segoe UI',
    }).setOrigin(0.5).setAlpha(0).setDepth(21);

    this._respawnCountdown = 3;
  };

  proto._showWaveBanner = function({ wave, isBoss }) {
    const txt = isBoss ? `👑 ВОЛНА ${wave}  —  БОСС!` : `⚔  Волна ${wave}`;
    this.waveBanner.setText(txt).setAlpha(1).setY(20);
    this.tweens.killTweensOf(this.waveBanner);
    this.tweens.add({
      targets: this.waveBanner, alpha: 0, y: 8,
      duration: 1800, delay: 1400, ease: 'Power2',
    });
  };
}
