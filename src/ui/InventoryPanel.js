/**
 * Оверлей инвентаря и снаряжения
 * Открывается через window.game.openInventory()
 */
import { RARITY_COLOR, RARITY_LABEL, ITEM_TYPE_ICON, ITEM_TYPE_LABEL, formatBonuses, SELL_VALUE } from '../data/items.js';

const SLOTS = ['weapon', 'armor', 'accessory'];

export class InventoryPanel {
  constructor(state) {
    this.state = state;

    this._unsubs = [
      state.on('player:inventoryChanged', () => this._refresh()),
      state.on('player:prestige',         () => this._refresh()),
    ];

    window.game = window.game || {};
    window.game.openInventory = () => this.open();

    this._bindEvents();
  }

  open() {
    this._refresh();
    document.getElementById('inventory-overlay').classList.add('visible');
  }

  close() {
    document.getElementById('inventory-overlay').classList.remove('visible');
  }

  destroy() {
    this._unsubs.forEach(u => u());
  }

  _bindEvents() {
    document.getElementById('inv-close-btn').addEventListener('click', () => this.close());

    // Клик по слоту снаряжения — снять предмет
    document.getElementById('inv-equipment').addEventListener('click', e => {
      const slot = e.target.closest('[data-slot]')?.dataset.slot;
      if (slot && this.state.equipment[slot]) {
        this.state.unequipItem(slot);
      }
    });

    // Делегирование кликов по инвентарю
    document.getElementById('inv-grid').addEventListener('click', e => {
      const card = e.target.closest('.inv-item');
      if (!card) return;
      const uid = card.dataset.uid;
      if (e.target.classList.contains('inv-sell-btn')) {
        const gold = this.state.sellItem(uid);
        if (gold) this._showNotif(`Продано за ${gold}g`);
      } else {
        this.state.equipItem(uid);
      }
    });
  }

  _refresh() {
    this._renderEquipment();
    this._renderInventory();
  }

  _renderEquipment() {
    const container = document.getElementById('inv-equipment');
    container.innerHTML = SLOTS.map(slot => {
      const item  = this.state.equipment[slot];
      const color = item ? RARITY_COLOR[item.rarity] : '#333';
      const inner = item
        ? `<div class="inv-eq-name" style="color:${color}">${item.name}</div>
           <div class="inv-eq-bonus">${formatBonuses(item.bonuses)}</div>
           <div class="inv-eq-hint">Клик — снять</div>`
        : `<div class="inv-eq-empty">Пусто</div>`;
      return `
        <div class="inv-eq-slot ${item ? 'filled' : ''}" data-slot="${slot}">
          <div class="inv-eq-label">${ITEM_TYPE_ICON[slot]} ${ITEM_TYPE_LABEL[slot]}</div>
          ${inner}
        </div>`;
    }).join('');
  }

  _renderInventory() {
    const inv   = this.state.inventory;
    const count = document.getElementById('inv-count');
    if (count) count.textContent = `${inv.length}/20`;

    const grid = document.getElementById('inv-grid');
    if (!inv.length) {
      grid.innerHTML = '<div class="inv-empty">Инвентарь пуст</div>';
      return;
    }

    grid.innerHTML = inv.map(item => {
      const color    = RARITY_COLOR[item.rarity];
      const sellVal  = Math.round(SELL_VALUE[item.rarity] * (1 + item.wave * 0.05));
      return `
        <div class="inv-item" data-uid="${item.uid}" title="Клик — надеть">
          <div class="inv-item-type">${ITEM_TYPE_ICON[item.type]}</div>
          <div class="inv-item-name" style="color:${color}">${item.name}</div>
          <div class="inv-item-rarity" style="color:${color}">${RARITY_LABEL[item.rarity]}</div>
          <div class="inv-item-bonus">${formatBonuses(item.bonuses)}</div>
          <div class="inv-item-wave">Волна ${item.wave}</div>
          <button class="inv-sell-btn" title="Продать за ${sellVal}g">${sellVal}g</button>
        </div>`;
    }).join('');
  }

  _showNotif(text) {
    const el = document.getElementById('inv-notif');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
  }
}
