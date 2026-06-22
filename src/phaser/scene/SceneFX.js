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
    // Hit flash на мобе
    this._flashHit(v.body, 0xff6666);

    const ox = v.container.x;
    this.tweens.add({
      targets: v.container, x: ox + (isDeathblow ? 40 : isCrit ? 28 : 14),
      duration: 75, yoyo: true, ease: 'Power2',
    });
    this.tweens.add({ targets: this.playerContainer, x: PLAYER_X + 18, duration: 70, yoyo: true });

    if (isDeathblow) {
      this._spawnDmgText(v.container.x, v.container.y - 55, '☠️ СМЕРТЬ!', '#9b59b6', '18px');
    } else if (shieldAbsorbed > 0 && damage === 0) {
      this._spawnDmgText(v.container.x, v.container.y - 55, `🛡 ${shieldAbsorbed}`, '#6699ff', '13px');
    } else if (shieldAbsorbed > 0) {
      this._spawnDmgText(v.container.x, v.container.y - 55,
        `${damage} 🛡`, isCrit ? '#f1c40f' : '#ffffff', isCrit ? '28px' : '20px');
    } else {
      this._spawnDmgText(v.container.x, v.container.y - 55,
        isCrit ? `⚡ ${damage}!` : `${damage}`,
        isCrit ? '#f1c40f' : '#ffffff',
        isCrit ? '28px' : '20px');
    }
    this._drawAttackFX(v.container.x, v.container.y, isCrit || isDeathblow);
  };

  proto._onMobDeath = function({ mob, xpGained, goldGained }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;

    this._spawnDmgText(v.container.x, v.container.y - 40,
      `+${this._fmt(goldGained)}g  +${this._fmt(xpGained)}xp`, '#f39c12', '13px');
    this._spawnDeathParticles(v.container.x, v.container.y, mob.data.color);

    this._deathTween(v.container, () => this.mobVisuals.delete(mob.id));
  };

  proto._onPlayerHit = function({ damage, dodged }) {
    if (dodged) {
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, 'MISS', '#888888', '14px');
      return;
    }
    if (this.combat.mobs[0]?.data?.isBoss) this.cameras.main.shake(110, 0.012);

    const flash = this.add.rectangle(0, 0, SCENE_W, SCENE_H, 0x8b0000, 0.18)
      .setOrigin(0).setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });

    // Hit flash на игроке
    this._flashHit(this.playerBody, 0xff3333);

    this._spawnDmgText(PLAYER_X, PLAYER_Y - 60, `-${damage}`, '#e74c3c', '20px');
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
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 70, `+${healAmt} ✨`, '#27ae60', '15px');
    }
    if (target) {
      const v = this.mobVisuals.get(target.id);
      if (v) this._spawnDmgText(v.container.x, v.container.y - 60, '⭐ СТАН', '#8b0000', '13px');
    }
    if (skill.id === 'poison_stab') {
      this._spawnDmgText(PLAYER_X, PLAYER_Y - 70, '☠️ Яд!', '#2d8b00', '14px');
    }
  };

  proto._onMobDot = function({ mob, damage, type }) {
    const v = this.mobVisuals.get(mob.id);
    if (!v) return;
    this._updateMobHpBar(v);
    const icon  = type === 'poison' ? '☠' : '🔥';
    const color = type === 'poison' ? '#2ecc71' : '#e67e22';
    this._spawnDmgText(v.container.x, v.container.y - 40, `${icon} ${damage}`, color, '18px');
  };

  // ── Визуальные эффекты ───────────────────────────────────────────────────────

  proto._spawnDmgText = function(x, y, text, color, fontSize) {
    const t = this.add.text(x, y, text, {
      fontSize, fill: color,
      fontFamily: 'Segoe UI', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 55, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  };

  proto._drawAttackFX = function(tx, ty, isCrit) {
    const branch = this._getBranch();
    const line   = this.add.graphics().setDepth(12);

    if (branch === 'archer') {
      line.lineStyle(isCrit ? 3 : 2, 0xe74c3c, 0.9);
      line.lineBetween(PLAYER_X + 22, PLAYER_Y - 10, tx - 18, ty);
    } else if (branch === 'mage') {
      line.lineStyle(isCrit ? 5 : 3, 0xff4400, 0.85);
      line.lineBetween(PLAYER_X + 20, PLAYER_Y - 10, tx - 18, ty);
      if (isCrit) {
        line.lineStyle(2, 0xff8844, 0.5);
        line.lineBetween(PLAYER_X + 20, PLAYER_Y - 5, tx - 18, ty - 6);
        line.lineBetween(PLAYER_X + 20, PLAYER_Y - 15, tx - 18, ty + 6);
      }
    } else {
      line.lineStyle(isCrit ? 4 : 2, isCrit ? 0xe74c3c : 0x8b0000, 0.75);
      line.beginPath();
      line.arc(PLAYER_X + 20, PLAYER_Y, 65, -0.6, 0.6, false);
      line.strokePath();
    }
    this.tweens.add({ targets: line, alpha: 0, duration: 200, onComplete: () => line.destroy() });
  };

  proto._showLevelUpFX = function() {
    const x = PLAYER_X;
    const y = PLAYER_Y - 20;
    const ring = this.add.graphics().setDepth(14);
    ring.lineStyle(3, 0xf39c12, 1);
    ring.strokeCircle(0, 0, 10);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring,
      scaleX: 7, scaleY: 7, alpha: 0,
      duration: 600, ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });
    // Второе кольцо чуть задержанное
    const ring2 = this.add.graphics().setDepth(14);
    ring2.lineStyle(2, 0xffd700, 0.7);
    ring2.strokeCircle(0, 0, 10);
    ring2.setPosition(x, y);
    this.tweens.add({
      targets: ring2,
      scaleX: 5, scaleY: 5, alpha: 0,
      delay: 100, duration: 500, ease: 'Quad.Out',
      onComplete: () => ring2.destroy(),
    });
  };

  proto._spawnDeathParticles = function(x, y, color) {
    const darkColors = [0x3a0a3a, 0x8b0000];
    for (let i = 0; i < 10; i++) {
      const pColor = darkColors[i % 2];
      const p     = this.add.circle(x, y, 4 + Math.random() * 3, pColor, 0.95).setDepth(25);
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

  // ── Hit-реакция: красный flash и death tween ─────────────────────────────────

  proto._flashHit = function(target, tintColor) {
    if (!target || typeof target.setTint !== 'function') return;
    target.setTint(tintColor);
    this.time.delayedCall(80, () => {
      if (target?.active) target.clearTint();
    });
  };

  proto._deathTween = function(container, onDeleteFn) {
    this.tweens.add({
      targets: container,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 250, ease: 'Back.In',
      onComplete: () => {
        container.destroy();
        if (onDeleteFn) onDeleteFn();
      },
    });
  };
}
