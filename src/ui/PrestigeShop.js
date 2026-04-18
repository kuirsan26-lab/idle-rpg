/**
 * Магазин Престижа — постоянные улучшения за Очки Престижа (ПО)
 */
import { PRESTIGE_UPGRADES } from '../core/GameState.js';

export class PrestigeShop {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;

    this._render();
    this._bindEvents();

    state.on('prestigeShopChanged', () => this._refresh());
    state.on('prestige',            () => this._refresh());

    window.game = window.game || {};
    window.game.openPrestigeShop = () => this.open();
  }

  open() {
    this._refresh();
    document.getElementById('prestige-shop-overlay').classList.add('visible');
  }

  close() {
    document.getElementById('prestige-shop-overlay').classList.remove('visible');
  }

  _bindEvents() {
    document.getElementById('pshop-close-btn').addEventListener('click', () => this.close());

    // Клик по кнопке купить (делегирование)
    document.getElementById('pshop-body').addEventListener('click', e => {
      const btn = e.target.closest('.pshop-buy-btn');
      if (!btn || btn.disabled) return;
      const id = btn.dataset.id;
      const bought = this.state.buyPrestigeUpgrade(id);
      if (bought) this._refresh();
    });
  }

  _render() {
    const body = document.getElementById('pshop-body');
    const groups = { gold: 'Стартовое золото', mult: 'Множители', stats: 'Статы', qol: 'Качество жизни' };

    let html = '';
    let lastGroup = null;

    for (const upg of PRESTIGE_UPGRADES) {
      if (upg.group !== lastGroup) {
        if (lastGroup !== null) html += '</div>';
        html += `<div class="pshop-group-header" style="grid-column:1/-1;font-size:10px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding-top:6px;">${groups[upg.group] ?? upg.group}</div>`;
        lastGroup = upg.group;
      }

      html += `
        <div class="pshop-item" id="pshop-item-${upg.id}">
          <div class="pshop-item-name">${upg.name}</div>
          <div class="pshop-item-desc">${upg.desc}</div>
          <div class="pshop-item-rank" id="pshop-rank-${upg.id}"></div>
          <div class="pshop-item-footer">
            <span class="pshop-cost" id="pshop-cost-${upg.id}"></span>
            <button class="pshop-buy-btn" data-id="${upg.id}" id="pshop-btn-${upg.id}">Купить</button>
          </div>
        </div>`;
    }

    body.innerHTML = html;
  }

  _refresh() {
    const pp = this.state.prestigePoints;
    document.getElementById('pshop-pp').textContent = pp;

    for (const upg of PRESTIGE_UPGRADES) {
      const rank     = this.state.getPrestigeRank(upg.id);
      const maxed    = rank >= upg.max;
      const canAfford = pp >= upg.cost;

      const item    = document.getElementById(`pshop-item-${upg.id}`);
      const rankEl  = document.getElementById(`pshop-rank-${upg.id}`);
      const costEl  = document.getElementById(`pshop-cost-${upg.id}`);
      const btn     = document.getElementById(`pshop-btn-${upg.id}`);

      if (!item) continue;

      item.classList.toggle('maxed', maxed);
      rankEl.textContent  = upg.max > 1 ? `Ранг ${rank} / ${upg.max}` : (rank ? 'Куплено' : '');

      if (maxed) {
        costEl.innerHTML = '';
        btn.textContent  = '✓ Макс';
        btn.disabled     = true;
      } else {
        costEl.textContent = `${upg.cost} ПО`;
        btn.textContent    = 'Купить';
        btn.disabled       = !canAfford;
      }
    }
  }
}
