/**
 * Зеркало Теней — постоянные перки между ранами, покупаются за Души
 * Открывается через window.game.openShadowMirror()
 */
import { SHADOW_PERKS } from '../core/GameState.js';

export class ShadowMirror {
  constructor(state) {
    this.state = state;
    window.game = window.game || {};
    window.game.openShadowMirror = () => this.open();

    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'shadow-mirror-overlay';
    overlay.style.cssText = `
      display:none;position:fixed;inset:0;z-index:250;
      background:rgba(0,0,0,0.90);
      align-items:center;justify-content:center;
    `;

    overlay.innerHTML = `
      <div style="
        background:var(--bg-panel,#0d0510);
        border:1px solid var(--border-dark,#3a1a1a);
        border-top:3px solid var(--color-souls,#9b59b6);
        width:520px;max-height:85vh;display:flex;flex-direction:column;
        box-shadow:0 0 60px rgba(155,89,182,0.4);
      ">
        <div style="
          padding:14px 20px;display:flex;align-items:center;justify-content:space-between;
          background:linear-gradient(#12060a,#0d0510);
          border-bottom:1px solid var(--border-dark,#3a1a1a);
          flex-shrink:0;
        ">
          <div>
            <div style="font-family:var(--font-heading,'Cinzel',Georgia,serif);
              color:var(--text-parchment,#e8d5b7);letter-spacing:2px;font-size:14px;">
              💜 ЗЕРКАЛО ТЕНЕЙ
            </div>
            <div style="font-size:10px;color:var(--color-souls,#9b59b6);margin-top:2px;letter-spacing:1px;">
              Постоянные перки · Сохраняются между ранами
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div id="sm-souls-display" style="
              color:var(--color-souls,#9b59b6);font-size:15px;font-weight:700;letter-spacing:1px;
            ">💜 0</div>
            <button id="sm-close" style="
              background:transparent;border:1px solid var(--border-dark,#3a1a1a);
              color:var(--border-red,#8b0000);cursor:pointer;padding:4px 10px;font-size:14px;
            ">✕</button>
          </div>
        </div>

        <div id="sm-perk-list" style="overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;">
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(overlay);
    this._overlay = overlay;
  }

  _bindEvents() {
    document.getElementById('sm-close').addEventListener('click', () => this.close());
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close();
    });
    this.state.on('shadow:perkBought', () => this._refresh());
    this.state.on('shadow:soulsChanged', () => this._refresh());
  }

  open() {
    this._refresh();
    this._overlay.style.display = 'flex';
  }

  close() {
    this._overlay.style.display = 'none';
  }

  _refresh() {
    const souls = this.state.souls ?? 0;
    document.getElementById('sm-souls-display').textContent = `💜 ${souls.toLocaleString()}`;

    const list = document.getElementById('sm-perk-list');
    list.innerHTML = '';

    for (const perk of SHADOW_PERKS) {
      const rank   = this.state.getShadowPerkRank(perk.id);
      const maxed  = rank >= perk.maxRank;
      const canBuy = !maxed && souls >= perk.cost;

      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:10px 12px;
        background:#12060a;
        border:1px solid ${maxed ? 'var(--color-souls,#9b59b6)' : 'var(--border-dark,#3a1a1a)'};
        opacity:${maxed ? '0.85' : '1'};
      `;

      const stars = Array.from({ length: perk.maxRank }, (_, i) =>
        `<span style="color:${i < rank ? 'var(--color-souls,#9b59b6)' : '#333'};font-size:11px;">★</span>`
      ).join('');

      row.innerHTML = `
        <span style="font-size:20px;width:26px;text-align:center;">${perk.icon}</span>
        <div style="flex:1;">
          <div style="color:var(--text-parchment,#e8d5b7);font-size:12px;font-weight:700;">
            ${perk.name}
          </div>
          <div style="color:#666;font-size:10px;margin-top:2px;">${perk.desc}</div>
          <div style="margin-top:4px;">${stars}</div>
        </div>
        <button data-perk="${perk.id}" style="
          padding:5px 12px;cursor:${canBuy ? 'pointer' : 'default'};
          background:${canBuy ? 'linear-gradient(135deg,#1a0520,#0d0318)' : '#0a0510'};
          border:1px solid ${canBuy ? 'var(--color-souls,#9b59b6)' : '#1a0a1a'};
          color:${canBuy ? 'var(--color-souls,#9b59b6)' : '#444'};
          font-size:11px;white-space:nowrap;
        ">${maxed ? '✓ МАКС' : `💜 ${perk.cost}`}</button>
      `;

      if (canBuy) {
        row.querySelector('button').addEventListener('click', () => {
          this.state.buyShadowPerk(perk.id);
        });
      }

      list.appendChild(row);
    }
  }
}
