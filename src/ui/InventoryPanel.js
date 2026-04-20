/**
 * Оверлей инвентаря и снаряжения с куклой персонажа
 * Открывается через window.game.openInventory()
 */
import { RARITY_COLOR, RARITY_LABEL, ITEM_TYPE_ICON, ITEM_TYPE_LABEL, formatBonuses, SELL_VALUE } from '../data/items.js';

const HERO_SPRITE = { warrior: 'hero_warrior', rogue: 'hero_rogue', archer: 'hero_archer', mage: 'hero_mage' };

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

    // Клик по слоту куклы — снять предмет
    document.getElementById('inv-doll').addEventListener('click', e => {
      const slot = e.target.closest('[data-slot]')?.dataset.slot;
      if (slot && this.state.equipment[slot]) this.state.unequipItem(slot);
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
    this._renderDoll();
    this._renderInventory();
  }

  // ── Кукла персонажа ──────────────────────────────────────────────────────────

  _heroSprite() {
    const cls = window._classMap?.get(this.state.currentClass);
    return HERO_SPRITE[cls?.branch] || 'hero_novice';
  }

  _renderDoll() {
    const eq = this.state.equipment;
    const W  = eq.weapon;
    const A  = eq.armor;
    const Ac = eq.accessory;

    document.getElementById('inv-doll').innerHTML = `
      <div class="inv-doll-layout">

        <!-- Левый слот: оружие -->
        <div class="inv-doll-slot-card inv-doll-left ${W ? 'doll-slot-filled' : ''}"
             data-slot="weapon"
             style="${W ? `border-color:${RARITY_COLOR[W.rarity]};box-shadow:0 0 6px ${RARITY_COLOR[W.rarity]}44` : ''}">
          <div class="doll-slot-icon">⚔️</div>
          <div class="doll-slot-label">Оружие</div>
          ${W
            ? `<div class="doll-slot-name" style="color:${RARITY_COLOR[W.rarity]}">${W.name}</div>
               <div class="doll-slot-bonus">${formatBonuses(W.bonuses)}</div>
               <div class="doll-slot-hint">↩ снять</div>`
            : `<div class="doll-slot-empty">Пусто</div>`}
        </div>

        <!-- Спрайт героя -->
        <div class="inv-doll-figure">
          <img class="inv-doll-hero-sprite" src="/sprites/${this._heroSprite()}.png" draggable="false">
        </div>

        <!-- Правый слот: аксессуар -->
        <div class="inv-doll-slot-card inv-doll-right ${Ac ? 'doll-slot-filled' : ''}"
             data-slot="accessory"
             style="${Ac ? `border-color:${RARITY_COLOR[Ac.rarity]};box-shadow:0 0 6px ${RARITY_COLOR[Ac.rarity]}44` : ''}">
          <div class="doll-slot-icon">💍</div>
          <div class="doll-slot-label">Аксессуар</div>
          ${Ac
            ? `<div class="doll-slot-name" style="color:${RARITY_COLOR[Ac.rarity]}">${Ac.name}</div>
               <div class="doll-slot-bonus">${formatBonuses(Ac.bonuses)}</div>
               <div class="doll-slot-hint">↩ снять</div>`
            : `<div class="doll-slot-empty">Пусто</div>`}
        </div>

        <!-- Нижний слот: броня (центр под куклой) -->
        <div class="inv-doll-slot-card inv-doll-bottom ${A ? 'doll-slot-filled' : ''}"
             data-slot="armor"
             style="${A ? `border-color:${RARITY_COLOR[A.rarity]};box-shadow:0 0 6px ${RARITY_COLOR[A.rarity]}44` : ''}">
          <div class="doll-slot-icon">🛡️</div>
          <div class="doll-slot-label">Броня</div>
          ${A
            ? `<div class="doll-slot-name" style="color:${RARITY_COLOR[A.rarity]}">${A.name}</div>
               <div class="doll-slot-bonus">${formatBonuses(A.bonuses)}</div>
               <div class="doll-slot-hint">↩ снять</div>`
            : `<div class="doll-slot-empty">Пусто</div>`}
        </div>

        <!-- Суммарные статы (row 3) -->
        <div class="inv-doll-stats">
          ${this._dollStatsHtml()}
        </div>

      </div>
    `;
  }

  /** Краткие статы от снаряжения под куклой */
  _dollStatsHtml() {
    const eq = this.state.equipBonuses;
    const lines = [];
    if (eq.atk)     lines.push(`ATK +${(eq.atk * 100).toFixed(0)}%`);
    if (eq.hp)      lines.push(`HP +${(eq.hp * 100).toFixed(0)}%`);
    if (eq.def)     lines.push(`DEF +${(eq.def * 100).toFixed(0)}%`);
    if (eq.spd)     lines.push(`SPD +${(eq.spd * 100).toFixed(0)}%`);
    if (eq.crit)    lines.push(`CRIT +${(eq.crit * 100).toFixed(1)}%`);
    if (eq.xpMult)  lines.push(`XP +${(eq.xpMult * 100).toFixed(0)}%`);
    if (eq.goldMult)lines.push(`GOLD +${(eq.goldMult * 100).toFixed(0)}%`);
    if (!lines.length) return '<span style="color:#333;font-size:9px">— нет бонусов —</span>';
    return lines.map(l => `<span class="doll-stat-chip">${l}</span>`).join('');
  }

  // ── Инвентарь ────────────────────────────────────────────────────────────────

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
      const color   = RARITY_COLOR[item.rarity];
      const sellVal = Math.round(SELL_VALUE[item.rarity] * (1 + item.wave * 0.05));
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
