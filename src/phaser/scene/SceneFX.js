/**
 * Mixin: эффекты, floating text, combat callbacks + хелперы
 * Устанавливается на GameScene.prototype
 */

const PLAYER_X = 100;
const GROUND_Y = 310;
const PLAYER_Y = GROUND_Y - 5;
const SCENE_W  = 620;
const SCENE_H  = 480;

export function installFX(proto) {
  // ── Хелперы ──────────────────────────────────────────────────────────────────

  proto._lighten = function(hex, amount = 60) {
    const r = Math.min(255, ((hex >> 16) & 0xff) + amount);
    const g = Math.min(255, ((hex >> 8)  & 0xff) + amount);
    const b = Math.min(255, (hex & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  };

  proto._darken = function(hex, amount = 60) {
    const r = Math.max(0, ((hex >> 16) & 0xff) - amount);
    const g = Math.max(0, ((hex >> 8)  & 0xff) - amount);
    const b = Math.max(0, (hex & 0xff) - amount);
    return (r << 16) | (g << 8) | b;
  };

  proto._fmt = function(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // ── Combat callbacks ─────────────────────────────────────────────────────────

  proto._onWaveSpawn = function({ mobs }) {
    for (const [, v] of this.mobVisuals) v.container.destroy();
    this.mobVisuals.clear();
    mobs.forEach((mob, i) => this._createMobVisual(mob, i, mobs.length));
  };

  proto._onPlayerAttack = function({ mob, damage, isCrit, isDeathblow, shieldAbsorbed }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;

    this._updateMobHpBar(v);
    this.tweens.add({ targets: v.body, alpha: 0.25, duration: 55, yoyo: true });

    const ox = v.container.x;
    this.tweens.add({
      targets: v.container, x: ox + (isDeathblow ? 40 : isCrit ? 28 : 14),
      duration: 75, yoyo: true, ease: 'Power2',
    });
    this.tweens.add({ targets: this.playerContainer, x: PLAYER_X + 18, duration: 70, yoyo: true });

    if (isDeathblow) {
      this._spawnDmgText(v.container.x, v.container.y - 55, '☠️ СМЕРТЬ!', '#ff00ff', '18px');
    } else if (shieldAbsorbed > 0 && damage === 0) {
      this._spawnDmgText(v.container.x, v.container.y - 55, `🛡 ${shieldAbsorbed}`, '#6699ff', '13px');
    } else if (shieldAbsorbed > 0) {
      this._spawnDmgText(v.container.x, v.container.y - 55,
        `${damage} 🛡`, isCrit ? '#ff7755' : '#ffeecc', isCrit ? '17px' : '13px');
    } else {
      this._spawnDmgText(v.container.x, v.container.y - 55,
        isCrit ? `💥 ${damage}!` : `${damage}`,
        isCrit ? '#ff7755' : '#ffeecc',
        isCrit ? '17px' : '13px');
    }
    this._drawAttackFX(v.container.x, v.container.y, isCrit || isDeathblow);
  };

  proto._onMobDeath = function({ mob, xpGained, goldGained }) {
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
  };

  proto._onPlayerHit = function({ damage, dodged }) {
    if (dodged) {
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, 'MISS', '#888888', '14px');
      return;
    }
    if (this.combat.mobs[0]?.data?.isBoss) this.cameras.main.shake(110, 0.012);

    const flash = this.add.rectangle(0, 0, SCENE_W, SCENE_H, 0xff0000, 0.15)
      .setOrigin(0).setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });

    this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, `-${damage}`, '#ff5555', '13px');
    this._updatePlayerHpBar();
  };

  proto._onThornsReflect = function({ mob, damage }) {
    this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, 'БЛОК', '#4488ff', '14px');
    const v = this.mobVisuals.get(mob.id);
    if (v) this._spawnDmgText(v.container.x, v.container.y - 40, `🔥 ${damage}`, '#4488ff', '12px');
  };

  proto._onMobRegen = function({ mob, heal }) {
    const v = this.mobVisuals.get(mob.id);
    if (v) {
      this._updateMobHpBar(v);
      this._spawnDmgText(v.container.x, v.container.y - 30, `+${heal}`, '#44dd88', '11px');
    }
  };

  proto._onShieldBreak = function({ mob }) {
    const v = this.mobVisuals.get(mob.id);
    if (v) this._spawnDmgText(v.container.x, v.container.y - 55, '🛡 ЩИТ СЛОМАН!', '#aaccff', '13px');
  };

  proto._onPlayerDeath = function() {
    this.deathOverlay.setAlpha(0.55).setDepth(20);
    this.deathText.setAlpha(1);
    this.respawnText.setAlpha(1);
    this.playerContainer.setAlpha(0.35);
    this.tweens.add({ targets: this.playerContainer, angle: 88, duration: 550, ease: 'Power2' });

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
  };

  proto._onRespawn = function() {
    clearInterval(this._respawnInterval);
    this.deathOverlay.setAlpha(0);
    this.deathText.setAlpha(0);
    this.respawnText.setAlpha(0);
    this.playerContainer.setAlpha(1).setAngle(0);
    this._updatePlayerHpBar();
  };

  proto._onSkillUsed = function({ skill, healAmt, target }) {
    if (healAmt) {
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 70, `+${healAmt} ✨`, '#44ff88', '15px');
    }
    if (target) {
      const v = this.mobVisuals.get(target.id);
      if (v) this._spawnDmgText(v.container.x, v.container.y - 60, '⭐ СТАН', '#ffee44', '13px');
    }
    if (skill.id === 'poison_stab') {
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 70, '☠️ Яд!', '#88ff44', '14px');
    }
  };

  proto._onMobDot = function({ mob, damage, type }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;
    this._updateMobHpBar(v);
    const icon  = type === 'poison' ? '☠️' : '🔥';
    const color = type === 'poison' ? '#88ff44' : '#ff8822';
    this._spawnDmgText(v.container.x, v.container.y - 40, `${icon} ${damage}`, color, '11px');
  };

  // ── Визуальные эффекты ───────────────────────────────────────────────────────

  proto._spawnDmgText = function(x, y, text, color, fontSize) {
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
  };

  proto._drawAttackFX = function(tx, ty, isCrit) {
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
    this.tweens.add({ targets: line, alpha: 0, duration: 200, onComplete: () => line.destroy() });
  };

  proto._spawnDeathParticles = function(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const p     = this.add.circle(x, y, 4 + Math.random() * 3, color, 0.95).setDepth(25);
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
  };
}
