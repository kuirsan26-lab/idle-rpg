/**
 * HUD: верхняя панель + журнал боя + управление Prestige
 */
import { CLASS_MAP, BRANCH_COLORS } from '../data/classes.js';
import { xpForLevel } from '../core/GameState.js';
import { describeSkill } from '../data/skills.js';

export class HUD {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;

    this._update();
    this._updateSkillBtn();
    this._updateSouls();

    this._unsubs = [
      state.on('player:inventoryChanged', () => this._updateInvCount()),
      state.on('player:statsChanged',     () => this._update()),
      state.on('player:goldChanged',      () => { this._updateGold(); this._updateSkillUpgrade(); }),
      state.on('player:xpChanged',        () => this._updateXp()),
      state.on('player:skillLevelChanged', () => { this._updateSkillBtn(); }),
      state.on('player:levelUp',          (d) => { this._update(); this._updatePrestigeBtn(); this._log(`🎉 Уровень ${d.level}!`, 'level'); }),
      state.on('player:classChanged',     () => { this._update(); this._updateSkillBtn(); }),
      state.on('combat:killCountChanged', () => this._updateKills()),
      state.on('combat:waveCleared',      (d) => { this._log(`✅ Волна ${d.wave} пройдена`, 'wave'); this._updatePrestigeBtn(); }),
      state.on('combat:waveStarted',      (d) => {
        const txt = d.isBoss ? `⚠️ ВОЛНА ${d.wave} — появился БОСС!` : `⚔️ Волна ${d.wave}`;
        this._log(txt, d.isBoss ? 'kill' : 'wave');
      }),
      state.on('player:death',    () => { this._log('💀 Вы погибли! Возрождение...', 'death'); this._updateGold(); }),
      state.on('player:respawn',  () => this._log('✨ Возрождение!', 'wave')),
      state.on('player:prestige', (d) => {
        this._log(`⭐ ПЕРЕРОЖДЕНИЕ #${d.count}!`, 'player:prestige');
        this._update();
        this._updateInvCount();
        this._updateSkillBtn();
      }),
      state.on('player:ppChanged',      () => { this._updatePrestigeBtn(); this._updateSkillUpgrade(); }),
      state.on('shadow:soulsChanged',   () => this._updateSouls()),
      state.on('shadow:perkBought',     () => this._updateSouls()),

      state.on('player:prestigeShopChanged', () => this._syncAutoCast()),
      state.on('combat:milestone', (d) => {
        this._showMilestone(d);
        if (d.isNewRecord) {
          const bonusTxt = d.bonusGold > 0 ? ` +${this._fmt(d.bonusGold)}🪙` : '';
          this._log(`🏆 НОВЫЙ РЕКОРД! Волна ${d.wave} пройдена!${bonusTxt}`, 'level');
        } else {
          this._log(`⭐ Рубеж: волна ${d.wave} пройдена!`, 'wave');
        }
      }),
      state.on('player:skillTriggered', ({ skill }) => {
        this._log(`⚡ Скилл: ${skill.icon} ${skill.name}!`, 'wave');
      }),
      state.on('player:classDiscovered', ({ totalDiscovered }) => {
        this._log(`🔍 Новый класс открыт! (открыто: ${totalDiscovered})`, 'level');
      }),
    ];

    this._milestoneTimeout = null;
    this._skillCdTimer = setInterval(() => this._updateSkillCd(), 100);

    // Prestige modal → endRun() + RunSummary
    document.getElementById('prestige-confirm-btn').addEventListener('click', () => {
      document.getElementById('prestige-modal-overlay').classList.remove('visible');
      const summary = this.state.endRun();
      window.game?.showRunSummary?.(summary, () => window.game?.restartCombat?.());
    });
    document.getElementById('prestige-cancel-btn').addEventListener('click', () => {
      document.getElementById('prestige-modal-overlay').classList.remove('visible');
    });

    // Экспозиция для кнопки в HTML (onclick)
    window.game = window.game || {};
    window.game.showPrestigeModal = () => this.showPrestigeModal();
  }

  destroy() {
    this._unsubs.forEach(u => u());
    clearTimeout(this._milestoneTimeout);
    clearInterval(this._skillCdTimer);
  }

  _updateSkillBtn() {
    const skill = this.state.getActiveSkill();
    const icon  = document.getElementById('skill-btn-icon');
    const name  = document.getElementById('skill-btn-name');
    const desc  = document.getElementById('skill-zone-desc');
    if (icon) icon.textContent = skill.icon;
    if (name) name.textContent = skill.name;
    if (desc) desc.textContent = describeSkill(this.state.getBranch(), this.state.getSkillLevel());

    const btn = document.getElementById('skill-btn');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => this.state.triggerSkill());
    }

    // Кнопка усиления скилла
    const upBtn = document.getElementById('skill-upgrade-btn');
    if (upBtn && !upBtn.dataset.bound) {
      upBtn.dataset.bound = '1';
      upBtn.addEventListener('click', () => {
        if (this.state.buySkillUpgrade()) this._updateSkillUpgrade();
      });
    }
    // Чекбокс авто-каста
    const autoCb = document.getElementById('skill-autocast');
    if (autoCb && !autoCb.dataset.bound) {
      autoCb.dataset.bound = '1';
      autoCb.addEventListener('change', () => { this.state.automation.autoCast = autoCb.checked; });
    }
    this._syncAutoCast();

    this._updateSkillUpgrade();
    this._updateSkillCd();
  }

  /** Состояние чекбокса авто-каста с учётом разблокировки в магазине престижа */
  _syncAutoCast() {
    const autoCb = document.getElementById('skill-autocast');
    const wrap   = document.getElementById('skill-autocast-wrap');
    if (!autoCb) return;
    const unlocked = this.state.isAutomationUnlocked('autoCast');
    autoCb.disabled = !unlocked;
    autoCb.checked  = unlocked && this.state.automation.autoCast;
    if (wrap) {
      wrap.style.opacity = unlocked ? '1' : '0.5';
      wrap.title = unlocked ? 'Авто-каст по готовности' : '🔒 Откройте в магазине престижа';
      wrap.firstChild && (wrap.childNodes[1].textContent = unlocked ? ' Авто' : ' 🔒');
    }
  }

  _updateSkillUpgrade() {
    const lvlEl  = document.getElementById('skill-level');
    const costEl = document.getElementById('skill-upgrade-cost');
    const btn    = document.getElementById('skill-upgrade-btn');
    if (!btn) return;

    const level = this.state.getSkillLevel();
    if (lvlEl) lvlEl.textContent = level;

    const next = this.state.getNextSkillUpgrade();
    if (!next) {
      btn.classList.add('maxed');
      btn.disabled = true;
      if (costEl) costEl.textContent = 'МАКС';
      return;
    }
    btn.classList.remove('maxed');
    const affordable = next.type === 'gold'
      ? this.state.gold >= next.cost
      : this.state.prestigePoints >= next.cost;
    btn.disabled = !affordable;
    if (costEl) costEl.textContent = next.type === 'gold' ? `${this._fmt(next.cost)}🪙` : `${next.cost}ПО`;
    btn.title = `Ур.${level + 1}: ${next.label}`;
  }

  _updateSkillCd() {
    const btn  = document.getElementById('skill-btn');
    const fill = document.getElementById('skill-cd-fill');
    const cd   = document.getElementById('skill-btn-cd');
    if (!btn) return;

    const pct     = this.state.getSkillCooldownPct();
    const ready    = pct >= 1;
    const charges  = this.state.getSkillCharges();
    const maxCharges = this.state.getSkillMaxCharges();

    btn.disabled = !ready || !this.state.isAlive;
    if (fill) fill.style.width = (pct * 100) + '%';
    if (cd) {
      const chargeTag = maxCharges > 1 ? ` ×${charges}` : '';
      if (ready) {
        cd.textContent = `ГОТОВО${chargeTag}`;
        cd.style.color = '#88ff88';
      } else {
        const sec = ((this.state._skillCdEnd - performance.now()) / 1000).toFixed(1);
        cd.textContent = `${sec}с${chargeTag}`;
        cd.style.color = '#888';
      }
    }
  }

  _updateInvCount() {
    const el = document.getElementById('hud-inv-count');
    if (el) el.textContent = this.state.inventory.length > 0 ? `(${this.state.inventory.length})` : '';
  }

  showPrestigeModal() {
    const hasKeep  = this.state.getPrestigeRank('keepUpgrades') > 0;
    const hasWave  = this.state.getPrestigeRank('startWave') > 0;
    const startGold = (this.state.getPrestigeRank('startGold1') ? 1000 : 0)
                    + (this.state.getPrestigeRank('startGold2') ? 5000 : 0)
                    + (this.state.getPrestigeRank('startGold3') ? 25000 : 0);

    document.getElementById('prestige-bonus-text').textContent =
      `Сброс прогресса, бонусы из магазина сохраняются`;

    const keepRow  = document.getElementById('prestige-keep-upgrades-row');
    const goldRow  = document.getElementById('prestige-start-gold-row');
    const waveRow  = document.getElementById('prestige-start-wave-row');

    if (keepRow) keepRow.style.display = hasKeep ? '' : 'none';
    if (goldRow) {
      goldRow.style.display = startGold > 0 ? '' : 'none';
      const goldVal = document.getElementById('prestige-start-gold-val');
      if (goldVal) goldVal.textContent = this._fmt(startGold);
    }
    if (waveRow) waveRow.style.display = hasWave ? '' : 'none';

    document.getElementById('prestige-modal-overlay').classList.add('visible');
  }

  _update() {
    this._updateClass();
    this._updateLevel();
    this._updateXp();
    this._updateGold();
    this._updateKills();
    this._updatePrestigeBtn();
    this._updateSouls();
  }

  _updateClass() {
    const clsId  = this.state.currentClass;
    const cls    = CLASS_MAP.get(clsId);
    const name   = cls?.name ?? 'Новичок';
    const color  = BRANCH_COLORS[cls?.branch] ?? '#aaa';
    const pCount = this.state.prestigeCount;

    document.getElementById('hud-class-name').textContent = name;
    const icon = document.getElementById('hud-class-icon');
    if (icon) {
      icon.style.background = `radial-gradient(circle, ${color}55, #0d0510)`;
      icon.style.borderColor = color;
      icon.style.boxShadow  = `0 0 8px ${color}88`;
    }

    const stars = document.getElementById('hud-prestige-stars');
    if (stars) stars.textContent = pCount > 0 ? '★'.repeat(Math.min(pCount, 5)) : '';
  }

  _updateLevel() {
    document.getElementById('hud-level').textContent = this.state.level;
  }

  _updateXp() {
    const cur  = this.state.xp;
    const req  = xpForLevel(this.state.level);
    const pct  = Math.min(100, (cur / req) * 100);
    const bar  = document.getElementById('xp-bar');
    const lbl  = document.getElementById('xp-label');
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = `${this._fmt(cur)} / ${this._fmt(req)} XP`;
  }

  _updateGold() {
    document.getElementById('hud-gold').textContent = this._fmt(this.state.gold);
  }

  _updateSouls() {
    const el = document.getElementById('hud-souls-count');
    if (el) el.textContent = this._fmt(this.state.souls || 0);
  }

  _updateKills() {
    document.getElementById('hud-kills').textContent = this._fmt(this.state.totalKills);
    document.getElementById('hud-wave').textContent  = this.state.currentWave;
  }

  _updatePrestigeBtn() {
    const canDo = this.state.canEndRun ? this.state.canEndRun() : this.state.canPrestige?.();
    const btn   = document.getElementById('prestige-btn');
    const hudPp = document.getElementById('hud-pp');

    if (btn) {
      btn.disabled    = !canDo;
      btn.textContent = '⚡ Завершить ран';
      btn.title       = canDo ? 'Завершить ран и получить Души' : 'Нужна волна 10 или победа над боссом Зоны 1';
    }
    if (hudPp) hudPp.textContent = this.state.prestigePoints;
  }

  // ── Milestone overlay ─────────────────────────────────────────────────────────
  _showMilestone({ wave, isNewRecord, bonusGold }) {
    const overlay = document.getElementById('milestone-overlay');
    if (!overlay) return;

    overlay.querySelector('#milestone-wave-label').textContent = `ВОЛНА ${wave}`;

    const recordEl = overlay.querySelector('#milestone-record');
    const bonusEl  = overlay.querySelector('#milestone-bonus');

    recordEl.style.display = isNewRecord ? '' : 'none';
    bonusEl.style.display  = isNewRecord && bonusGold > 0 ? '' : 'none';
    if (bonusGold > 0) bonusEl.textContent = `+${this._fmt(bonusGold)} 🪙`;

    overlay.classList.remove('visible');
    void overlay.offsetWidth; // force reflow для перезапуска анимации
    overlay.classList.add('visible');

    clearTimeout(this._milestoneTimeout);
    this._milestoneTimeout = setTimeout(() => overlay.classList.remove('visible'), 3200);
  }

  // ── Журнал боя ────────────────────────────────────────────────────────────────
  _log(text, type = '') {
    const container = document.getElementById('log-entries');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.textContent = `[${this._time()}] ${text}`;
    container.prepend(el);

    // Лимит записей
    while (container.children.length > 80) {
      container.removeChild(container.lastChild);
    }
  }

  logCombat(text, type) { this._log(text, type); }

  _time() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  _fmt(n) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
}
