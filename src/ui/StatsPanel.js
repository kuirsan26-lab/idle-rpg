/**
 * Правая панель: характеристики + магазин улучшений
 */
import { UPGRADES_LIST, upgradeCost } from '../core/GameState.js';

export class StatsPanel {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;

    this._renderUpgrades();
    this._updateStats();

    state.on('statsChanged', () => this._updateStats());
    state.on('goldChanged',  () => {
      this._updateStats();
      this._updateButtonStates();
    });
  }

  _updateStats() {
    const s = this.state.getStats();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('stat-hp',       this._fmt(s.maxHp));
    set('stat-atk',      this._fmt(s.atk));
    set('stat-def',      this._fmt(s.def));
    set('stat-spd',      s.spd.toFixed(2));
    set('stat-crit',     s.crit.toFixed(1));
    set('stat-critdmg',  s.critDmg.toFixed(0));
    set('stat-xpmult',   s.xpMult.toFixed(2));
    set('stat-goldmult', s.goldMult.toFixed(2));
    set('stat-prestmult', this.state.prestigeCount > 0 ? `#${this.state.prestigeCount} (${this.state.prestigePoints} ПО)` : '—');

    // Множители
    const setMult = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val > 1 ? `×${val.toFixed(2)}` : '';
    };
    setMult('stat-hp-mult',  s.hpMult);
    setMult('stat-atk-mult', s.atkMult);
    setMult('stat-def-mult', s.defMult);
    setMult('stat-spd-mult', s.spdMult);
  }

  _renderUpgrades() {
    const container = document.getElementById('upgrades-scroll');
    container.innerHTML = UPGRADES_LIST.map(upg => `
      <div class="upgrade-item" id="upg-${upg.id}">
        <div class="upg-info">
          <div class="upg-name">${upg.name}</div>
          <div class="upg-desc">${upg.desc}</div>
          <div class="upg-level">Уровень: <span id="upg-lvl-${upg.id}">0</span></div>
        </div>
        <button class="upg-buy-btn" id="upg-btn-${upg.id}" data-id="${upg.id}">
          <span id="upg-cost-${upg.id}">...</span>g
        </button>
      </div>
    `).join('');

    // Вешаем обработчики
    container.querySelectorAll('.upg-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.state.buyUpgrade(id);
        this._updateUpgradeItem(id);
      });
    });

    // Первичное заполнение
    for (const upg of UPGRADES_LIST) this._updateUpgradeItem(upg.id);
  }

  _updateUpgradeItem(id) {
    const level = this.state.upgrades[id] ?? 0;
    const cost  = upgradeCost(id, level);

    const lvlEl  = document.getElementById(`upg-lvl-${id}`);
    const costEl = document.getElementById(`upg-cost-${id}`);
    const btn    = document.getElementById(`upg-btn-${id}`);

    if (lvlEl)  lvlEl.textContent  = level;
    if (costEl) costEl.textContent = this._fmt(cost);
    if (btn)    btn.disabled       = this.state.gold < cost;
  }

  _updateButtonStates() {
    for (const upg of UPGRADES_LIST) {
      const level = this.state.upgrades[upg.id] ?? 0;
      const cost  = upgradeCost(upg.id, level);
      const btn   = document.getElementById(`upg-btn-${upg.id}`);
      if (btn) btn.disabled = this.state.gold < cost;
    }
  }

  _fmt(n) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
}
