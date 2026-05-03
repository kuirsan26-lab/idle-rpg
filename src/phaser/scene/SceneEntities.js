/**
 * Mixin: визуалы игрока и мобов
 * Устанавливается на GameScene.prototype
 */
import { BRANCH_HEX } from '../../data/classes.js';
import { FLAG_ICONS } from '../../data/mobs.js';

const SCENE_H  = 480;
const PLAYER_X = 100;
const GROUND_Y = 310;
const PLAYER_Y = GROUND_Y - 5;

const MOB_SPRITES = {
  slime: 'mob_slime', goblin: 'mob_goblin', skeleton: 'mob_skeleton',
  orc: 'mob_orc', troll: 'mob_troll', dragonling: 'mob_dragonling',
  demon: 'mob_demon', lich: 'mob_lich', dragon: 'mob_dragon', archdemon: 'mob_archdemon',
  boss_slime_king:     'mob_boss_slime_king',  boss_goblin_chief: 'mob_boss_goblin_chief',
  boss_bone_king:      'mob_boss_bone_king',   boss_orc_warlord:  'mob_boss_orc_warlord',
  boss_troll_ancient:  'mob_boss_troll_ancient', boss_fire_dragon: 'mob_boss_fire_dragon',
  boss_demon_lord:     'mob_boss_demon_lord',  boss_lich_king:    'mob_boss_lich_king',
  boss_dragon_ancient: 'mob_boss_dragon_ancient', boss_chaos_lord: 'mob_boss_chaos_lord',
};

const BRANCH_PREFIXES = [
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
  ['crossbow','archer'],['poison_arrow','archer'],['shadow_archer','archer'],
  ['green_guardian','archer'],['beast','archer'],['monster_hunter','archer'],['forest_spirit','archer'],
  ['mage','mage'],['druid','mage'],['alchemist','mage'],['archdruid','mage'],
  ['shaman','mage'],['potion','mage'],['bombardier','mage'],['nature','mage'],
  ['voice','mage'],['spirit','mage'],['brew','mage'],['apothecary','mage'],
  ['pyro','mage'],['explosive','mage'],
];

export function installEntities(proto) {
  // ── Игрок ────────────────────────────────────────────────────────────────────

  proto._createPlayer = function() {
    this.playerContainer = this.add.container(PLAYER_X, PLAYER_Y).setDepth(3);
    this.playerShadow    = this.add.ellipse(0, 24, 44, 10, 0x000000, 0.4);
    this.playerBody      = this._buildPlayerSprite();

    const hpBg = this.add.rectangle(0, 40, 52, 7, 0x111111);
    hpBg.setStrokeStyle(1, 0x333333);
    this.playerHpFill = this.add.rectangle(-26, 40, 52, 7, 0x44dd44);
    this.playerHpFill.setOrigin(0, 0.5);

    this.playerContainer.add([this.playerShadow, this.playerBody, hpBg, this.playerHpFill]);

    this.playerLabel = this.add.text(PLAYER_X, PLAYER_Y - 52, '', {
      fontSize: '11px', fill: '#99aacc',
      fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(3);
    this._updatePlayerLabel();

    this.tweens.add({
      targets: this.playerContainer, y: PLAYER_Y - 4,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  };

  proto._buildPlayerSprite = function() {
    const branch = this._getBranch();
    const key    = `hero_${branch}`;
    if (this._hasSprite(key)) {
      const spr = this.add.image(0, 0, 'sprites', key);
      spr.setScale(70 / spr.height).setOrigin(0.5, 1).setY(24);
      return spr;
    }
    const gfx = this.add.graphics();
    this._drawPlayerBodyGfx(gfx);
    return gfx;
  };

  proto._drawPlayerBody = function() {
    if (this.playerBody?.type === 'Image') {
      const key = `hero_${this._getBranch()}`;
      if (this._hasSprite(key)) { this.playerBody.setTexture('sprites', key); return; }
    }
    if (this.playerBody?.type === 'Graphics') {
      this._drawPlayerBodyGfx(this.playerBody);
    }
  };

  proto._drawPlayerBodyGfx = function(gfx) {
    gfx.clear();
    const branch = this._getBranch();
    const color  = BRANCH_HEX[branch] ?? 0xaaaaaa;
    const light  = this._lighten(color, 70);
    const dark   = this._darken(color, 60);

    this.playerBody.fillStyle(color, 1);
    this.playerBody.fillRect(-13, -26, 26, 28);
    this.playerBody.fillStyle(light, 0.4);
    this.playerBody.fillRect(-13, -26, 13, 12);
    this.playerBody.fillStyle(this._lighten(color, 50), 1);
    this.playerBody.fillCircle(0, -35, 13);
    this.playerBody.fillStyle(0x000000, 0.85);
    this.playerBody.fillCircle(-5, -36, 3);
    this.playerBody.fillCircle(5, -36, 3);
    this.playerBody.fillStyle(0xffffff, 0.7);
    this.playerBody.fillCircle(-4, -37, 1.2);
    this.playerBody.fillCircle(6, -37, 1.2);
    this.playerBody.fillStyle(dark, 1);
    this.playerBody.fillRect(-12, 2, 11, 16);
    this.playerBody.fillRect(1, 2, 11, 16);
    this._drawWeapon(branch, color);
  };

  proto._drawWeapon = function(branch, color) {
    const g = this.playerBody;
    if (branch === 'warrior') {
      g.fillStyle(0xcccccc, 1); g.fillRect(15, -32, 5, 34); g.fillRect(12, -16, 11, 4);
      g.fillStyle(0x8866aa, 0.8); g.fillRect(-22, -28, 8, 22);
    } else if (branch === 'archer') {
      g.lineStyle(3, 0x886633, 1); g.strokeEllipse(20, -10, 10, 40);
      g.lineStyle(1, 0xddddaa, 0.8); g.lineBetween(20, -30, 20, 10);
    } else if (branch === 'rogue') {
      g.fillStyle(0xaaaacc, 1); g.fillRect(15, -28, 4, 22); g.fillRect(-19, -28, 4, 22);
      g.fillStyle(0xddaa44, 0.9); g.fillRect(15, -22, 4, 4); g.fillRect(-19, -22, 4, 4);
    } else if (branch === 'mage') {
      g.fillStyle(0x6633aa, 1); g.fillRect(15, -44, 5, 56);
      g.fillStyle(this._lighten(color, 40), 1); g.fillTriangle(17, -52, 12, -44, 22, -44);
      g.fillStyle(0xaa66ff, 0.3); g.fillCircle(17, -50, 10);
    }
  };

  proto._getBranch = function() {
    const id  = this.gameState?.currentClass ?? 'novice';
    const cls = window._classMap?.get(id);
    if (cls?.branch) return cls.branch;
    for (const [prefix, branch] of BRANCH_PREFIXES) {
      if (id.startsWith(prefix)) return branch;
    }
    return 'novice';
  };

  proto._updatePlayerVisual = function() {
    this._drawPlayerBody();
    this._updatePlayerLabel();
  };

  proto._updatePlayerLabel = function() {
    const cls = window._classMap?.get(this.gameState?.currentClass);
    this.playerLabel?.setText(cls?.name ?? 'Новичок');
  };

  proto._updatePlayerHpBar = function() {
    if (!this.gameState || !this.playerHpFill) return;
    const pct   = Math.max(0, this.gameState.currentHp / this._cachedMaxHp);
    const color = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xffaa00 : 0xdd2222;
    this.playerHpFill.setFillStyle(color);
    this.playerHpFill.setSize(52 * pct, 7);
    this.playerHpFill.x = -26;
  };

  // ── Мобы ─────────────────────────────────────────────────────────────────────

  proto._createMobVisual = function(mob, index, total) {
    const spacing = Math.min(80, (SCENE_H - 120) / Math.max(total, 1));
    const offsetY = (index - (total - 1) / 2) * spacing * 0.55;
    const startX  = 700;  // за правым краем сцены
    const targetX = 520 - (index % 3) * 35;
    const y       = PLAYER_Y + offsetY;

    const container = this.add.container(startX, y).setDepth(3);
    const shadow    = this.add.ellipse(0, 26, 40, 9, 0x000000, 0.4);
    const body      = this._createMobBody(mob.data);

    const hpBg = this.add.rectangle(0, -44, 50, 6, 0x111111);
    hpBg.setStrokeStyle(1, 0x222222);
    const hpFill = this.add.rectangle(-25, -44, 50, 6,
      mob.data.isBoss ? 0xff5500 : 0xdd2222);
    hpFill.setOrigin(0, 0.5);

    const flagStr  = (mob.data.flags ?? []).map(f => FLAG_ICONS[f] ?? '').join('');
    const nameStyle = mob.data.isBoss
      ? { fontSize: '11px', fill: '#ffaa44', stroke: '#000', strokeThickness: 2, fontStyle: 'bold' }
      : { fontSize: '10px', fill: '#cc8866', stroke: '#000', strokeThickness: 2 };
    const label    = flagStr ? `${mob.data.name} ${flagStr}` : mob.data.name;
    const nameText = this.add.text(0, -56, label, { fontFamily: 'Segoe UI', ...nameStyle })
      .setOrigin(0.5);

    container.add([shadow, body, hpBg, hpFill, nameText]);

    this.tweens.add({ targets: container, x: targetX, duration: 550 + index * 70, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: container, y: y - 5,
      duration: 1700 + Math.random() * 500, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: index * 180,
    });

    this.mobVisuals.set(mob.id, { container, body, hpFill, mob, targetX, baseY: y });
  };

  proto._createMobBody = function(data) {
    const key = MOB_SPRITES[data.id];
    if (key && this._hasSprite(key)) {
      const sprite = this.add.image(0, 0, 'sprites', key);
      sprite.setScale(70 / sprite.height).setOrigin(0.5, 1).setY(24);
      return sprite;
    }
    const gfx = this.add.graphics();
    this._drawMobBody(gfx, data);
    return gfx;
  };

  proto._drawMobBody = function(gfx, data) {
    gfx.clear();
    const c     = data.color;
    const light = this._lighten(c, 60);
    const dark  = this._darken(c, 50);

    if (data.isBoss) {
      const r = 26;
      gfx.fillStyle(c, 1); gfx.fillCircle(0, 0, r);
      gfx.fillStyle(light, 0.5); gfx.fillCircle(-8, -10, r * 0.45);
      gfx.fillStyle(dark, 0.6);  gfx.fillCircle(8, 8, r * 0.5);
      gfx.fillStyle(0xffd700, 1);
      for (let i = -2; i <= 2; i++) {
        const cx = i * 9;
        gfx.fillTriangle(cx - 5, -r, cx, -r - 10 + Math.abs(i) * 3, cx + 5, -r);
      }
      gfx.fillRect(-22, -r - 1, 44, 8);
      gfx.fillStyle(0xff2200, 1); gfx.fillCircle(-9, -4, 5); gfx.fillCircle(9, -4, 5);
      gfx.fillStyle(0xffffff, 0.8); gfx.fillCircle(-8, -5, 2); gfx.fillCircle(10, -5, 2);
      return;
    }

    switch (data.shape) {
      case 'circle':
        gfx.fillStyle(c, 1); gfx.fillCircle(0, 0, 18);
        gfx.fillStyle(light, 0.45); gfx.fillCircle(-6, -6, 7);
        gfx.fillStyle(0x000000, 0.75); gfx.fillCircle(-6, -2, 3.5); gfx.fillCircle(6, -2, 3.5);
        break;
      case 'rect':
        gfx.fillStyle(c, 1); gfx.fillRect(-15, -22, 30, 30);
        gfx.fillStyle(light, 0.4); gfx.fillRect(-15, -22, 15, 11);
        gfx.fillStyle(this._lighten(light, 30), 1); gfx.fillRect(-10, -34, 20, 14);
        gfx.fillStyle(0x000000, 0.8); gfx.fillRect(-7, -30, 5, 5); gfx.fillRect(2, -30, 5, 5);
        break;
      default: // diamond
        gfx.fillStyle(c, 1);
        gfx.fillTriangle(0, -25, -18, 2, 18, 2); gfx.fillTriangle(0, 25, -18, 2, 18, 2);
        gfx.fillStyle(light, 0.45); gfx.fillTriangle(0, -25, -9, -7, 9, -7);
        gfx.fillStyle(0x000000, 0.75); gfx.fillCircle(-5, -6, 3); gfx.fillCircle(5, -6, 3);
    }
  };

  proto._updateMobHpBar = function(visual) {
    const pct = Math.max(0, visual.mob.hp / visual.mob.data.maxHp);
    visual.hpFill.setSize(50 * pct, 6);
    visual.hpFill.x = -25;
  };
}
