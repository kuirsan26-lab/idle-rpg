/**
 * Phaser 3 сцена: отрисовка боя
 * ИСПРАВЛЕНО: init теперь получает данные правильно (scene.add вместо auto-start)
 */
import Phaser from 'phaser';
import { BRANCH_HEX } from '../data/classes.js';

const SCENE_W  = 620;
const SCENE_H  = 480;
const PLAYER_X = 100;
const GROUND_Y = 310; // Y земли
const PLAYER_Y = GROUND_Y - 20;

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.gameState = data.state;
    this.combat    = data.combat;
  }

  preload() {
    // Мобы
    for (const id of ['slime','goblin','skeleton','orc','troll','dragonling','demon','lich','dragon','archdemon']) {
      this.load.image(`mob_${id}`, `/sprites/${id}.png`);
    }
    // Боссы
    for (const id of ['boss_slime_king','boss_goblin_chief','boss_bone_king','boss_orc_warlord',
                      'boss_troll_ancient','boss_fire_dragon','boss_demon_lord','boss_lich_king',
                      'boss_dragon_ancient','boss_chaos_lord']) {
      this.load.image(`mob_${id}`, `/sprites/${id}.png`);
    }
    // Герои
    for (const branch of ['novice','warrior','rogue','archer','mage']) {
      this.load.image(`hero_${branch}`, `/sprites/hero_${branch}.png`);
    }
    // Фоны
    for (const key of ['bg_01_10','bg_11_20','bg_21_30','bg_31_40','bg_41_50',
                       'bg_51_60','bg_61_70','bg_71_80','bg_81_90','bg_91_100']) {
      this.load.image(key, `/backgrounds/${key}.jpg`);
    }
  }

  create() {
    this.mobVisuals = new Map();

    this._createBackground();
    this._createArena();
    this._createPlayer();
    this._createOverlayUI();

    // Callbacks боевой системы
    this.combat.register({
      onWaveSpawn:    (d) => this._onWaveSpawn(d),
      onMobDeath:     (d) => this._onMobDeath(d),
      onPlayerAttack: (d) => this._onPlayerAttack(d),
      onPlayerHit:    (d) => this._onPlayerHit(d),
      onPlayerDeath:  ()  => this._onPlayerDeath(),
      onRespawn:      ()  => this._onRespawn(),
    });

    this.gameState.on('classChanged', () => this._updatePlayerVisual());
    this.gameState.on('hpChanged',   () => this._updatePlayerHpBar());
    this.gameState.on('waveStarted', (d) => { this._showWaveBanner(d); this._updateBackground(d.wave); });
  }

  // ─────────────────────────────────────────────────────── ФОНЫ И АРЕНА ───────

  _bgKey(wave) {
    const tier = Math.min(Math.ceil(wave / 10), 10);
    return ['bg_01_10','bg_11_20','bg_21_30','bg_31_40','bg_41_50',
            'bg_51_60','bg_61_70','bg_71_80','bg_81_90','bg_91_100'][tier - 1];
  }

  _updateBackground(wave) {
    const key = this._bgKey(wave);
    if (!this.textures.exists(key)) return;
    if (this._bgImage) {
      this.tweens.add({ targets: this._bgImage, alpha: 0, duration: 600,
        onComplete: () => {
          this._bgImage.setTexture(key).setAlpha(0);
          this.tweens.add({ targets: this._bgImage, alpha: 1, duration: 800 });
        }
      });
    }
  }

  _createBackground() {
    const firstKey = this._bgKey(this.gameState?.currentWave ?? 1);
    const hasBg    = this.textures.exists(firstKey);

    if (hasBg) {
      // Спрайтовый фон на depth 0
      this._bgImage = this.add.image(0, 0, firstKey).setOrigin(0).setDepth(0);
    } else {
      // Процедурный фон (fallback)
      const g = this.add.graphics();
      g.fillGradientStyle(0x06060f, 0x06060f, 0x0c0820, 0x0c0820, 1);
      g.fillRect(0, 0, SCENE_W, GROUND_Y);
      g.fillStyle(0xeeeedd, 0.25); g.fillCircle(520, 55, 38);
      g.fillStyle(0x06060f, 0.6);  g.fillCircle(535, 48, 36);
      const stars = this.add.graphics();
      stars.fillStyle(0xffffff, 1);
      for (let i = 0; i < 80; i++) {
        stars.fillCircle(Math.random() * SCENE_W, Math.random() * (GROUND_Y - 40),
          Math.random() < 0.15 ? 1.5 : 0.8);
      }
      const mtn = this.add.graphics();
      mtn.fillStyle(0x0a0618, 1);
      mtn.fillPoints([[0,190],[80,120],[180,160],[280,100],[360,145],[450,115],[540,150],[620,180],[620,GROUND_Y],[0,GROUND_Y]].map(([x,y])=>({x,y})),true);
      const hills = this.add.graphics();
      hills.fillStyle(0x0d0a1e, 1);
      hills.fillPoints([[0,230],[100,185],[200,220],[320,175],[430,205],[530,180],[620,210],[620,GROUND_Y],[0,GROUND_Y]].map(([x,y])=>({x,y})),true);
    }

    // Полоска земли поверх фона (depth 1)
    const ground = this.add.graphics().setDepth(1);
    ground.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x0d0820, 0x0d0820, hasBg ? 0.75 : 1);
    ground.fillRect(0, GROUND_Y, SCENE_W, SCENE_H - GROUND_Y);

    // Линия земли — светящаяся
    ground.lineStyle(2, 0x3a2060, 0.9);
    ground.lineBetween(0, GROUND_Y, SCENE_W, GROUND_Y);
    ground.lineStyle(1, 0x6040aa, 0.3);
    ground.lineBetween(0, GROUND_Y - 1, SCENE_W, GROUND_Y - 1);

    // Туман у земли
    for (let i = 0; i < 4; i++) {
      const fog = this.add.graphics();
      fog.fillStyle(0x200840, 0.06 - i * 0.01);
      fog.fillEllipse(100 + i * 140, GROUND_Y + 5, 200, 20);
    }
  }

  _createArena() {
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

    // Декоративные факелы
    this._createTorch(195, GROUND_Y - 5);
    this._createTorch(215, GROUND_Y - 5);
  }

  _createTorch(x, y) {
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
  }

  // ─────────────────────────────────────────────────────────── ИГРОК ──────────

  _createPlayer() {
    this.playerContainer = this.add.container(PLAYER_X, PLAYER_Y);

    this.playerShadow = this.add.ellipse(0, 24, 44, 10, 0x000000, 0.4);
    this.playerBody   = this._buildPlayerSprite();

    // HP бар под персонажем
    const hpBg   = this.add.rectangle(0, 40, 52, 7, 0x111111);
    hpBg.setStrokeStyle(1, 0x333333);
    this.playerHpFill = this.add.rectangle(-26, 40, 52, 7, 0x44dd44);
    this.playerHpFill.setOrigin(0, 0.5);

    this.playerContainer.add([this.playerShadow, this.playerBody, hpBg, this.playerHpFill]);

    // Имя класса
    this.playerLabel = this.add.text(PLAYER_X, PLAYER_Y - 52, '', {
      fontSize: '11px', fill: '#99aacc',
      fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this._updatePlayerLabel();

    // Дыхание
    this.tweens.add({
      targets: this.playerContainer, y: PLAYER_Y - 4,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _buildPlayerSprite() {
    const branch = this._getBranch();
    const key    = `hero_${branch}`;
    if (this.textures.exists(key)) {
      const spr = this.add.image(0, 0, key);
      spr.setScale(70 / spr.height).setOrigin(0.5, 1).setY(24);
      return spr;
    }
    const gfx = this.add.graphics();
    this._drawPlayerBodyGfx(gfx);
    return gfx;
  }

  _drawPlayerBody() {
    if (this.playerBody?.type === 'Image') {
      const branch = this._getBranch();
      const key    = `hero_${branch}`;
      if (this.textures.exists(key)) {
        this.playerBody.setTexture(key);
        return;
      }
    }
    if (this.playerBody?.type === 'Graphics') {
      this._drawPlayerBodyGfx(this.playerBody);
    }
  }

  _drawPlayerBodyGfx(gfx) {
    gfx.clear();
    const branch = this._getBranch();
    const color  = BRANCH_HEX[branch] ?? 0xaaaaaa;
    const light  = this._lighten(color, 70);
    const dark   = this._darken(color, 60);

    // Тело
    this.playerBody.fillStyle(color, 1);
    this.playerBody.fillRect(-13, -26, 26, 28);
    this.playerBody.fillStyle(light, 0.4);
    this.playerBody.fillRect(-13, -26, 13, 12);
    // Голова
    this.playerBody.fillStyle(this._lighten(color, 50), 1);
    this.playerBody.fillCircle(0, -35, 13);
    // Глаза
    this.playerBody.fillStyle(0x000000, 0.85);
    this.playerBody.fillCircle(-5, -36, 3);
    this.playerBody.fillCircle(5, -36, 3);
    this.playerBody.fillStyle(0xffffff, 0.7);
    this.playerBody.fillCircle(-4, -37, 1.2);
    this.playerBody.fillCircle(6, -37, 1.2);
    // Ноги
    this.playerBody.fillStyle(dark, 1);
    this.playerBody.fillRect(-12, 2, 11, 16);
    this.playerBody.fillRect(1, 2, 11, 16);

    this._drawWeapon(branch, color);
  }

  _drawWeapon(branch, color) {
    const g = this.playerBody;
    if (branch === 'warrior') {
      // Меч + щит
      g.fillStyle(0xcccccc, 1);
      g.fillRect(15, -32, 5, 34);
      g.fillRect(12, -16, 11, 4);
      g.fillStyle(0x8866aa, 0.8);
      g.fillRect(-22, -28, 8, 22);
    } else if (branch === 'archer') {
      // Лук
      g.lineStyle(3, 0x886633, 1);
      g.strokeEllipse(20, -10, 10, 40);
      g.lineStyle(1, 0xddddaa, 0.8);
      g.lineBetween(20, -30, 20, 10);
    } else if (branch === 'rogue') {
      // Два кинжала
      g.fillStyle(0xaaaacc, 1);
      g.fillRect(15, -28, 4, 22);
      g.fillRect(-19, -28, 4, 22);
      g.fillStyle(0xddaa44, 0.9);
      g.fillRect(15, -22, 4, 4);
      g.fillRect(-19, -22, 4, 4);
    } else if (branch === 'mage') {
      // Магический посох
      g.fillStyle(0x6633aa, 1);
      g.fillRect(15, -44, 5, 56);
      // Кристалл
      g.fillStyle(this._lighten(color, 40), 1);
      g.fillTriangle(17, -52, 12, -44, 22, -44);
      // Свечение
      g.fillStyle(0xaa66ff, 0.3);
      g.fillCircle(17, -50, 10);
    }
  }

  _getBranch() {
    const id = this.gameState?.currentClass ?? 'novice';
    const cls = window._classMap?.get(id);
    if (cls?.branch) return cls.branch;
    // Fallback по префиксу ID
    for (const [prefix, branch] of [
      ['warrior','warrior'],['berserker','warrior'],['paladin','warrior'],['destroyer','warrior'],
      ['bloodthirst','warrior'],['crusader','warrior'],['inquisitor','warrior'],['devastator','warrior'],
      ['thunderer','warrior'],['vampire','warrior'],['bloodlord','warrior'],['faith','warrior'],
      ['light_knight','warrior'],['dark_judge','warrior'],['witch_hunter','warrior'],
      ['rogue','rogue'],['assassin','rogue'],['thief','rogue'],['ninja','rogue'],
      ['mercenary','rogue'],['pickpocket','rogue'],['bandit','rogue'],['shadow','rogue'],
      ['ghost','rogue'],['gladiator','rogue'],['bounty','rogue'],['swindler','rogue'],
      ['adventurer','rogue'],['outlaw','rogue'],['pirate','rogue'],
      ['archer','archer'],['ranger','archer'],['sniper','archer'],['eagle_eye','archer'],
      ['dark_shot','archer'],['forest_guard','archer'],['tracker','archer'],['marksman','archer'],
      ['crossbow','archer'],['poison_arrow','archer'],['shadow_archer','archer'],['green_guardian','archer'],
      ['beast','archer'],['monster_hunter','archer'],['forest_spirit','archer'],
      ['mage','mage'],['druid','mage'],['alchemist','mage'],['archdruid','mage'],
      ['shaman','mage'],['potion','mage'],['bombardier','mage'],['nature','mage'],
      ['voice','mage'],['spirit','mage'],['brew','mage'],['apothecary','mage'],
      ['pyro','mage'],['explosive','mage'],
    ]) {
      if (id.startsWith(prefix)) return branch;
    }
    return 'novice';
  }

  _updatePlayerVisual() {
    this._drawPlayerBody();
    this._updatePlayerLabel();
  }

  _updatePlayerLabel() {
    const cls = window._classMap?.get(this.gameState?.currentClass);
    this.playerLabel?.setText(cls?.name ?? 'Новичок');
  }

  _updatePlayerHpBar() {
    if (!this.gameState) return;
    const stats = this.gameState.getStats();
    const pct   = Math.max(0, this.gameState.currentHp / stats.maxHp);
    const color = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xffaa00 : 0xdd2222;
    if (!this.playerHpFill) return;
    this.playerHpFill.setFillStyle(color);
    this.playerHpFill.setSize(52 * pct, 7);
    this.playerHpFill.x = -26;
  }

  // ──────────────────────────────────────────────────── UI ПОВЕРХ СЦЕНЫ ───────

  _createOverlayUI() {
    // Баннер волны (вверху по центру)
    this.waveBanner = this.add.text(SCENE_W / 2, 20, '', {
      fontSize: '17px', fill: '#ffdd44', fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Оверлей смерти
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
  }

  _showWaveBanner({ wave, isBoss }) {
    const txt = isBoss ? `👑 ВОЛНА ${wave}  —  БОСС!` : `⚔  Волна ${wave}`;
    this.waveBanner.setText(txt).setAlpha(1).setY(20);
    this.tweens.killTweensOf(this.waveBanner);
    this.tweens.add({
      targets: this.waveBanner, alpha: 0, y: 8,
      duration: 1800, delay: 1400, ease: 'Power2',
    });
  }

  // ─────────────────────────────────────────────────────────── МОБЫ ──────────

  _createMobVisual(mob, index, total) {
    const spacing = Math.min(80, (SCENE_H - 120) / Math.max(total, 1));
    const offsetY = (index - (total - 1) / 2) * spacing * 0.55;
    const startX  = SCENE_W + 80;
    const targetX = SCENE_W - 100 - (index % 3) * 35;
    const y       = PLAYER_Y + offsetY;

    const container = this.add.container(startX, y);

    const shadow = this.add.ellipse(0, 26, 40, 9, 0x000000, 0.4);
    const body   = this._createMobBody(mob.data);

    // HP бар
    const hpBg = this.add.rectangle(0, -44, 50, 6, 0x111111);
    hpBg.setStrokeStyle(1, 0x222222);
    const hpFill = this.add.rectangle(-25, -44, 50, 6,
      mob.data.isBoss ? 0xff5500 : 0xdd2222);
    hpFill.setOrigin(0, 0.5);

    // Имя
    const nameStyle = mob.data.isBoss
      ? { fontSize: '11px', fill: '#ffaa44', stroke: '#000', strokeThickness: 2, fontStyle: 'bold' }
      : { fontSize: '10px', fill: '#cc8866', stroke: '#000', strokeThickness: 2 };
    const nameText = this.add.text(0, -56, mob.data.name, { fontFamily: 'Segoe UI', ...nameStyle })
      .setOrigin(0.5);

    container.add([shadow, body, hpBg, hpFill, nameText]);

    // Появление
    this.tweens.add({
      targets: container, x: targetX,
      duration: 550 + index * 70, ease: 'Back.easeOut',
    });
    // Покачивание
    this.tweens.add({
      targets: container, y: y - 5,
      duration: 1700 + Math.random() * 500, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: index * 180,
    });

    this.mobVisuals.set(mob.id, { container, body, hpFill, mob, targetX, baseY: y });
  }

  // Спрайты для мобов: mob_id → texture key
  _MOB_SPRITES = {
    slime: 'mob_slime', goblin: 'mob_goblin', skeleton: 'mob_skeleton',
    orc: 'mob_orc', troll: 'mob_troll', dragonling: 'mob_dragonling',
    demon: 'mob_demon', lich: 'mob_lich', dragon: 'mob_dragon', archdemon: 'mob_archdemon',
    boss_slime_king: 'mob_boss_slime_king', boss_goblin_chief: 'mob_boss_goblin_chief',
    boss_bone_king: 'mob_boss_bone_king', boss_orc_warlord: 'mob_boss_orc_warlord',
    boss_troll_ancient: 'mob_boss_troll_ancient', boss_fire_dragon: 'mob_boss_fire_dragon',
    boss_demon_lord: 'mob_boss_demon_lord', boss_lich_king: 'mob_boss_lich_king',
    boss_dragon_ancient: 'mob_boss_dragon_ancient', boss_chaos_lord: 'mob_boss_chaos_lord',
  };

  /** Создаёт визуальное тело моба: спрайт если есть, иначе Graphics */
  _createMobBody(data) {
    const key = this._MOB_SPRITES[data.id];
    if (key && this.textures.exists(key)) {
      const sprite = this.add.image(0, 0, key);
      // Масштаб: вписываем в ~70px высоту, ставим ноги на y=24
      const scale = 70 / sprite.height;
      sprite.setScale(scale).setOrigin(0.5, 1).setY(24);
      return sprite;
    }
    const gfx = this.add.graphics();
    this._drawMobBody(gfx, data);
    return gfx;
  }

  _drawMobBody(gfx, data) {
    gfx.clear();
    const c      = data.color;
    const light  = this._lighten(c, 60);
    const dark   = this._darken(c, 50);

    if (data.isBoss) {
      const r = 26;
      gfx.fillStyle(c, 1);
      gfx.fillCircle(0, 0, r);
      gfx.fillStyle(light, 0.5);
      gfx.fillCircle(-8, -10, r * 0.45);
      gfx.fillStyle(dark, 0.6);
      gfx.fillCircle(8, 8, r * 0.5);
      // Корона
      gfx.fillStyle(0xffd700, 1);
      for (let i = -2; i <= 2; i++) {
        const cx = i * 9;
        gfx.fillTriangle(cx - 5, -r, cx, -r - 10 + Math.abs(i) * 3, cx + 5, -r);
      }
      gfx.fillRect(-22, -r - 1, 44, 8);
      // Глаза
      gfx.fillStyle(0xff2200, 1);
      gfx.fillCircle(-9, -4, 5);
      gfx.fillCircle(9, -4, 5);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(-8, -5, 2);
      gfx.fillCircle(10, -5, 2);
      return;
    }

    switch (data.shape) {
      case 'circle':
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 0, 18);
        gfx.fillStyle(light, 0.45);
        gfx.fillCircle(-6, -6, 7);
        gfx.fillStyle(0x000000, 0.75);
        gfx.fillCircle(-6, -2, 3.5);
        gfx.fillCircle(6, -2, 3.5);
        break;
      case 'rect':
        gfx.fillStyle(c, 1);
        gfx.fillRect(-15, -22, 30, 30);
        gfx.fillStyle(light, 0.4);
        gfx.fillRect(-15, -22, 15, 11);
        gfx.fillStyle(this._lighten(light, 30), 1);
        gfx.fillRect(-10, -34, 20, 14);
        gfx.fillStyle(0x000000, 0.8);
        gfx.fillRect(-7, -30, 5, 5);
        gfx.fillRect(2, -30, 5, 5);
        break;
      default: // diamond
        gfx.fillStyle(c, 1);
        gfx.fillTriangle(0, -25, -18, 2, 18, 2);
        gfx.fillTriangle(0, 25, -18, 2, 18, 2);
        gfx.fillStyle(light, 0.45);
        gfx.fillTriangle(0, -25, -9, -7, 9, -7);
        gfx.fillStyle(0x000000, 0.75);
        gfx.fillCircle(-5, -6, 3);
        gfx.fillCircle(5, -6, 3);
    }
  }

  _updateMobHpBar(visual) {
    const pct = Math.max(0, visual.mob.hp / visual.mob.data.maxHp);
    visual.hpFill.setSize(50 * pct, 6);
    visual.hpFill.x = -25;
  }

  // ─────────────────────────────────────────────────── CALLBACKS COMBAT ───────

  _onWaveSpawn({ mobs }) {
    for (const [, v] of this.mobVisuals) v.container.destroy();
    this.mobVisuals.clear();
    mobs.forEach((mob, i) => this._createMobVisual(mob, i, mobs.length));
  }

  _onPlayerAttack({ mob, damage, isCrit }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;

    this._updateMobHpBar(v);

    // Вспышка тела (работает и для спрайта и для Graphics)
    this.tweens.add({ targets: v.body, alpha: 0.25, duration: 55, yoyo: true });

    // Отлёт моба
    const ox = v.container.x;
    this.tweens.add({
      targets: v.container, x: ox + (isCrit ? 28 : 14),
      duration: 75, yoyo: true, ease: 'Power2',
    });

    // Рывок игрока
    this.tweens.add({
      targets: this.playerContainer, x: PLAYER_X + 18,
      duration: 70, yoyo: true,
    });

    this._spawnDmgText(v.container.x, v.container.y - 55,
      isCrit ? `💥 ${damage}!` : `${damage}`,
      isCrit ? '#ff7755' : '#ffffff',
      isCrit ? '17px' : '13px');

    this._drawAttackFX(v.container.x, v.container.y, isCrit);
  }

  _onMobDeath({ mob, xpGained, goldGained }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;

    this._spawnDmgText(v.container.x, v.container.y - 40,
      `+${this._fmt(goldGained)}g  +${this._fmt(xpGained)}xp`, '#ffd700', '11px');

    this._spawnDeathParticles(v.container.x, v.container.y, mob.data.color);

    this.tweens.add({
      targets: v.container, alpha: 0, scaleX: 0.1, scaleY: 0.1, y: v.container.y + 35,
      duration: 380, ease: 'Power3',
      onComplete: () => { v.container.destroy(); this.mobVisuals.delete(mob.id); },
    });
  }

  _onPlayerHit({ damage }) {
    // Красная вспышка экрана
    const flash = this.add.rectangle(0, 0, SCENE_W, SCENE_H, 0xff0000, 0.15).setOrigin(0).setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });

    this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, `-${damage}`, '#ff5555', '13px');
    this._updatePlayerHpBar();
  }

  _onPlayerDeath() {
    this.deathOverlay.setAlpha(0.55).setDepth(20);
    this.deathText.setAlpha(1);
    this.respawnText.setAlpha(1);
    this.playerContainer.setAlpha(0.35);

    this.tweens.add({
      targets: this.playerContainer, angle: 88,
      duration: 550, ease: 'Power2',
    });

    this._respawnCountdown = 3;
    this.respawnText.setText('Возрождение через 3с...');
    this._respawnInterval = setInterval(() => {
      this._respawnCountdown--;
      if (this._respawnCountdown <= 0) {
        clearInterval(this._respawnInterval);
        this.respawnText.setText('Возрождение...');
      } else {
        this.respawnText.setText(`Возрождение через ${this._respawnCountdown}с...`);
      }
    }, 1000);
  }

  _onRespawn() {
    clearInterval(this._respawnInterval);
    this.deathOverlay.setAlpha(0);
    this.deathText.setAlpha(0);
    this.respawnText.setAlpha(0);
    this.playerContainer.setAlpha(1).setAngle(0);
    this._updatePlayerHpBar();
  }

  // ─────────────────────────────────────────────────────────── ЭФФЕКТЫ ────────

  _spawnDmgText(x, y, text, color, fontSize) {
    const t = this.add.text(x, y, text, {
      fontSize, fill: color,
      fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0,
      duration: 950, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  _drawAttackFX(tx, ty, isCrit) {
    const branch = this._getBranch();
    const line   = this.add.graphics().setDepth(12);

    if (branch === 'archer') {
      line.lineStyle(isCrit ? 3 : 2, 0x99ff55, 0.9);
      line.lineBetween(PLAYER_X + 22, PLAYER_Y - 10, tx - 18, ty);
    } else if (branch === 'mage') {
      line.lineStyle(isCrit ? 5 : 3, 0xaa55ff, 0.85);
      line.lineBetween(PLAYER_X + 20, PLAYER_Y - 10, tx - 18, ty);
      if (isCrit) {
        line.lineStyle(2, 0xdd99ff, 0.5);
        line.lineBetween(PLAYER_X + 20, PLAYER_Y - 5, tx - 18, ty - 6);
        line.lineBetween(PLAYER_X + 20, PLAYER_Y - 15, tx - 18, ty + 6);
      }
    } else {
      line.lineStyle(isCrit ? 4 : 2, isCrit ? 0xff8844 : 0xffffff, 0.75);
      line.beginPath();
      line.arc(PLAYER_X + 20, PLAYER_Y, 65, -0.6, 0.6, false);
      line.strokePath();
    }

    this.tweens.add({
      targets: line, alpha: 0, duration: 200,
      onComplete: () => line.destroy(),
    });
  }

  _spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const p = this.add.circle(x, y, 4 + Math.random() * 3, color, 0.95).setDepth(25);
      const angle = (i / 10) * Math.PI * 2;
      const dist  = 45 + Math.random() * 35;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 25,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 450 + Math.random() * 200, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────── ХЕЛПЕРЫ ────────

  _lighten(hex, amount = 60) {
    const r = Math.min(255, ((hex >> 16) & 0xff) + amount);
    const g = Math.min(255, ((hex >> 8)  & 0xff) + amount);
    const b = Math.min(255, (hex & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  }
  _darken(hex, amount = 60) {
    const r = Math.max(0, ((hex >> 16) & 0xff) - amount);
    const g = Math.max(0, ((hex >> 8)  & 0xff) - amount);
    const b = Math.max(0, (hex & 0xff) - amount);
    return (r << 16) | (g << 8) | b;
  }
  _fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }

  update() {
    // Плавное движение мобов к своей позиции
    for (const [, v] of this.mobVisuals) {
      const spd = v.mob.data.speed;
      if (v.container.x > v.targetX + 1) {
        v.container.x -= (spd / 1000) * 16;
      }
    }
  }
}
