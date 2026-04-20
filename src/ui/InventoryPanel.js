/**
 * Оверлей инвентаря и снаряжения с куклой персонажа
 * Открывается через window.game.openInventory()
 */
import { RARITY_COLOR, RARITY_LABEL, ITEM_TYPE_ICON, ITEM_TYPE_LABEL, formatBonuses, SELL_VALUE } from '../data/items.js';

// Цвет части тела по редкости (или дефолт если пусто)
const EMPTY_COLOR  = '#2a2a3a';
const EMPTY_STROKE = '#3a3a5e';

function bodyColor(item) {
  return item ? RARITY_COLOR[item.rarity] : EMPTY_COLOR;
}
function bodyStroke(item) {
  return item ? RARITY_COLOR[item.rarity] : EMPTY_STROKE;
}
function bodyGlow(item) {
  if (!item) return '';
  const c = RARITY_COLOR[item.rarity];
  const intensity = item.rarity === 'epic' ? 8 : item.rarity === 'rare' ? 5 : 3;
  return `filter: drop-shadow(0 0 ${intensity}px ${c});`;
}

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

  _renderDoll() {
    const eq = this.state.equipment;
    const W  = eq.weapon;
    const A  = eq.armor;
    const Ac = eq.accessory;

    const wColor  = bodyColor(W);  const wStroke = bodyStroke(W);
    const aColor  = bodyColor(A);  const aStroke = bodyStroke(A);
    const acColor = bodyColor(Ac); const acStroke = bodyStroke(Ac);

    const wGlow  = bodyGlow(W);
    const aGlow  = bodyGlow(A);
    const acGlow = bodyGlow(Ac);

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

        <!-- SVG кукла -->
        <div class="inv-doll-figure">
          <svg viewBox="0 0 90 200" width="90" height="200" xmlns="http://www.w3.org/2000/svg">
            <!-- Голова -->
            <circle cx="45" cy="20" r="17" fill="#12121e" stroke="#4a4a7a" stroke-width="1.5"/>
            <!-- Глаза -->
            <circle cx="38" cy="18" r="3.5" fill="#5555bb" opacity="0.9"/>
            <circle cx="52" cy="18" r="3.5" fill="#5555bb" opacity="0.9"/>
            <!-- Блик в глазах -->
            <circle cx="39.5" cy="16.5" r="1.2" fill="#aaaaff" opacity="0.7"/>
            <circle cx="53.5" cy="16.5" r="1.2" fill="#aaaaff" opacity="0.7"/>
            <!-- Рот -->
            <path d="M39 25 Q45 29 51 25" stroke="#4a4a7a" stroke-width="1" fill="none"/>
            <!-- Шея -->
            <rect x="40" y="37" width="10" height="9" fill="#12121e" stroke="#3a3a5e" stroke-width="1"/>

            <!-- Левая рука (оружие) -->
            <g style="${wGlow}">
              <rect x="7" y="48" width="16" height="46" rx="4"
                    fill="${wColor}" stroke="${wStroke}" stroke-width="1.5" opacity="${W ? '1' : '0.5'}"/>
              ${W ? `<text x="15" y="78" text-anchor="middle" font-size="10" fill="${wStroke}" opacity="0.8">⚔</text>` : ''}
            </g>

            <!-- Торс (броня) -->
            <g style="${aGlow}">
              <rect x="24" y="46" width="42" height="52" rx="4"
                    fill="${aColor}" stroke="${aStroke}" stroke-width="1.5" opacity="${A ? '1' : '0.5'}"/>
              ${A ? `<text x="45" y="76" text-anchor="middle" font-size="11" fill="${aStroke}" opacity="0.9">🛡</text>` : ''}
            </g>

            <!-- Правая рука (аксессуар) -->
            <g style="${acGlow}">
              <rect x="67" y="48" width="16" height="46" rx="4"
                    fill="${acColor}" stroke="${acStroke}" stroke-width="1.5" opacity="${Ac ? '1' : '0.5'}"/>
              ${Ac ? `<text x="75" y="78" text-anchor="middle" font-size="10" fill="${acStroke}" opacity="0.8">💍</text>` : ''}
            </g>

            <!-- Пояс -->
            <rect x="24" y="97" width="42" height="10" rx="2" fill="#1a1a2e" stroke="#3a3a5e" stroke-width="1"/>

            <!-- Левая нога -->
            <rect x="25" y="108" width="17" height="56" rx="4" fill="#12121e" stroke="#3a3a5e" stroke-width="1.2"/>
            <!-- Правая нога -->
            <rect x="48" y="108" width="17" height="56" rx="4" fill="#12121e" stroke="#3a3a5e" stroke-width="1.2"/>
            <!-- Ступни -->
            <rect x="23" y="159" width="21" height="8" rx="3" fill="#0e0e1a" stroke="#3a3a5e" stroke-width="1"/>
            <rect x="46" y="159" width="21" height="8" rx="3" fill="#0e0e1a" stroke="#3a3a5e" stroke-width="1"/>
          </svg>

          <!-- Подпись под куклой -->
          <div class="inv-doll-stats">
            ${this._dollStatsHtml()}
          </div>
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
