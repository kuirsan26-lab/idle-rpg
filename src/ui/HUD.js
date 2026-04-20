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

    this._unsubs = [
      state.on('player:statsChanged',     () => this._update()),
      state.on('player:goldChanged',      () => this._updateGold()),
      state.on('player:hpChanged',        () => this._updateXp()),
      state.on('player:levelUp',          (d) => { this._update(); this._updatePrestigeBtn(); this._log(`🎉 Уровень ${d.level}!`, 'level'); }),
      state.on('player:classChanged',     () => this._update()),
      state.on('combat:killCountChanged', () => this._updateKills()),
      state.on('combat:waveCleared',      (d) => { this._log(`✅ Волна ${d.wave} пройдена`, 'wave'); this._updatePrestigeBtn(); }),
      state.on('combat:waveStarted',      (d) => {
        const txt = d.isBoss ? `⚠️ ВОЛНА ${d.wave} — появился БОСС!` : `⚔️ Волна ${d.wave}`;
        this._log(txt, d.isBoss ? 'kill' : 'wave');
      }),
      state.on('player:death',    () => { this._log('💀 Вы погибли! -5% золота. Возрождение...', 'player:death'); this._updateGold(); }),
      state.on('player:respawn',  () => this._log('✨ Возрождение!', 'wave')),
      state.on('player:prestige', (d) => {
        this._log(`⭐ ПЕРЕРОЖДЕНИЕ #${d.count}! Получено ${d.pp} ПО (всего: ${d.totalPp} ПО)`, 'player:prestige');
        this._update();
      }),
    ];

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
