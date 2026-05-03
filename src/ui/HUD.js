/**
 * HUD: верхняя панель + журнал боя + управление Prestige
 */
import { CLASS_MAP, BRANCH_COLORS } from '../data/classes.js';
import { xpForLevel } from '../core/GameState.js';

export class HUD {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;

    this._update();
    this._updateSkillBtn();

    this._unsubs = [
      state.on('player:inventoryChanged', () => this._updateInvCount()),
      state.on('player:statsChanged',     () => this._update()),
      state.on('player:goldChanged',      () => this._updateGold()),
      state.on('player:xpChanged',        () => this._updateXp()),
      state.on('player:levelUp',          (d) => { this._update(); this._updatePrestigeBtn(); this._log(`🎉 Уровень ${d.level}!`, 'level'); }),
      state.on('player:classChanged',     () => { this._update(); this._updateSkillBtn(); }),
      state.on('combat:killCountChanged', () => this._updateKills()),
      state.on('combat:waveCleared',      (d) => { this._log(`✅ Волна ${d.wave} пройдена`, 'wave'); this._updatePrestigeBtn(); }),
      state.on('combat:waveStarted',      (d) => {
        const txt = d.isBoss ? `⚠️ ВОЛНА ${d.wave} — появился БОСС!` : `⚔️ Волна ${d.wave}`;
        this._log(txt, d.isBoss ? 'kill' : 'wave');
      }),
      state.on('player:death',    () => { this._log('💀 Вы погибли! Возрождение...', 'player:death'); this._updateGold(); }),
      state.on('player:respawn',  () => this._log('✨ Возрождение!', 'wave')),
      state.on('player:prestige', (d) => {
        this._log(`⭐ ПЕРЕРОЖДЕНИЕ #${d.count}! Получено ${d.pp} ПО (всего: ${d.totalPp} ПО)`, 'player:prestige');
        this._update();
        this._updateInvCount();
        this._updateSkillBtn();
      }),
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
    ];

    this._milestoneTimeout = null;
    this._skillCdTimer = setInterval(() => this._updateSkillCd(), 100);

    // Prestige modal
    document.getElementById('prestige-confirm-btn').addEventListener('click', () => {
      this.state.prestige();
      document.getElementById('prestige-modal-overlay').classList.remove('visible');
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
    if (desc) desc.textContent = skill.desc;

    const btn = document.getElementById('skill-btn');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => this.state.triggerSkill());
    }
    this._updateSkillCd();
  }

  _updateSkillCd() {
    const btn  = document.getElementById('skill-btn');
    const fill = document.getElementById('skill-cd-fill');
    const cd   = document.getElementById('skill-btn-cd');
    if (!btn) return;

    const pct   = this.state.getSkillCooldownPct();
    const ready = pct >= 1;

    btn.disabled = !ready || !this.state.isAlive;
    if (fill) fill.style.width = (pct * 100) + '%';
    if (cd) {
      if (ready) {
        cd.textContent = 'ГОТОВО';
        cd.style.color = '#88ff88';
      } else {
        const sec = ((this.state._skillCdEnd - performance.now()) / 1000).toFixed(1);
        cd.textContent = `${sec}с`;
        cd.style.color = '#888';
      }
    }
  }

  _updateInvCount() {
    const el = document.getElementById('hud-inv-count');
    if (el) el.textContent = this.state.inventory.length > 0 ? `(${this.state.inventory.length})` : '';
  }

  showPrestigeModal() {
    const pp       = this.state.calcPrestigePoints();
    const totalPp  = this.state.prestigePoints + pp;
    const hasKeep  = this.state.getPrestigeRank('keepUpgrades') > 0;
    const hasWave  = this.state.getPrestigeRank('startWave') > 0;
    const startGold = (this.state.getPrestigeRank('startGold1') ? 1000 : 0)
                    + (this.state.getPrestigeRank('startGold2') ? 5000 : 0)
                    + (this.state.getPrestigeRank('startGold3') ? 25000 : 0);

    document.getElementById('prestige-bonus-text').textContent =
      `+${pp} ПО (всего будет ${totalPp} ПО)`;

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
  }

  _updateClass() {
    const clsId  = this.state.currentClass;
    const cls    = CLASS_MAP.get(clsId);
    const name   = cls?.name ?? 'Новичок';
    const color  = BRANCH_COLORS[cls?.branch] ?? '#aaa';
    const pCount = this.state.prestigeCount;

    document.getElementById('hud-class-name').textContent = name;
    const icon = document.getElementById('hud-class-icon');
    if (icon) { icon.style.background = color; }

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

  _updateKills() {
    document.getElementById('hud-kills').textContent = this._fmt(this.state.totalKills);
    document.getElementById('hud-wave').textContent  = this.state.currentWave;
  }

  _updatePrestigeBtn() {
    const pp      = this.state.calcPrestigePoints();
    const canDo   = this.state.canPrestige();
    const btn     = document.getElementById('prestige-btn');
    const preview = document.getElementById('prestige-pp-preview');
    const hudPp   = document.getElementById('hud-pp');

    if (btn)     btn.disabled         = !canDo;
    if (preview) preview.textContent  = pp;
    if (hudPp)   hudPp.textContent    = this.state.prestigePoints;
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
