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

    state.on('statsChanged',   () => this._update());
    state.on('goldChanged',    () => this._updateGold());
    state.on('hpChanged',      () => this._updateXp()); // XP бар заодно
    state.on('levelUp',        (d) => { this._update(); this._log(`🎉 Уровень ${d.level}!`, 'level'); });
    state.on('classChanged',   () => { this._update(); });
    state.on('killCountChanged', () => this._updateKills());
    state.on('waveCleared',    (d) => this._log(`✅ Волна ${d.wave} пройдена`, 'wave'));
    state.on('waveStarted',    (d) => {
      const txt = d.isBoss
        ? `⚠️ ВОЛНА ${d.wave} — появился БОСС!`
        : `⚔️ Волна ${d.wave}`;
      this._log(txt, d.isBoss ? 'kill' : 'wave');
    });
    state.on('death',          () => { this._log('💀 Вы погибли! -5% золота. Возрождение...', 'death'); this._updateGold(); });
    state.on('respawn',        () => this._log('✨ Возрождение!', 'wave'));
    state.on('prestige',       (d) => {
      this._log(`⭐ ПЕРЕРОЖДЕНИЕ #${d.count}! +${d.count * 10}% к опыту и золоту навсегда`, 'prestige');
      this._update();
    });

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

  showPrestigeModal() {
    const count = this.state.prestigeCount + 1;
    document.getElementById('prestige-bonus-text').textContent =
      `+${count * 10}% к золоту и опыту навсегда (итого ×${(1 + count * 0.10).toFixed(1)})`;
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
    const can  = this.state.canPrestige();
    const btn  = document.getElementById('prestige-btn');
    const prog = document.getElementById('prestige-progress');

    if (btn)  btn.style.display  = can ? 'block' : 'none';
    if (prog) prog.style.display = can ? 'none'  : 'flex';

    if (!can) {
      const lvl    = this.state.level;
      const pct    = Math.min(100, Math.round((lvl / 99) * 100));
      const bar    = document.getElementById('prestige-progress-bar');
      const label  = document.getElementById('prestige-progress-label');
      if (bar)   bar.style.width   = pct + '%';
      if (label) label.textContent = `⭐ Ур. ${lvl} / 99`;
    }
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
