/**
 * ZoneMap — оверлей выбора зоны мира.
 * Показывает 5 зон, их прогресс и позволяет переключаться между разблокированными зонами.
 */
import { ZONES } from '../data/zones.js';

export class ZoneMap {
  constructor(state) {
    this.state = state;
    window.game = window.game || {};
    window.game.openZoneMap = () => this.open();

    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'zone-map-overlay';
    overlay.style.cssText = `
      display:none; position:fixed; inset:0; z-index:200;
      background:rgba(0,0,0,0.88);
      align-items:center; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.id = 'zone-map-panel';
    panel.style.cssText = `
      background:var(--bg-panel,#0d0510);
      border:1px solid var(--border-dark,#3a1a1a);
      border-top:2px solid var(--border-red,#8b0000);
      width:480px; max-height:80vh; overflow-y:auto;
      box-shadow:0 0 40px rgba(139,0,0,0.3);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding:14px 20px; display:flex; align-items:center;
      justify-content:space-between;
      background:linear-gradient(#12060a,#0d0510);
      border-bottom:1px solid var(--border-dark,#3a1a1a);
    `;
    header.innerHTML = `
      <span style="font-family:var(--font-heading,'Cinzel',Georgia,serif);
        color:var(--text-parchment,#e8d5b7);letter-spacing:2px;font-size:14px;">
        🗺 КАРТА МИРА
      </span>
      <button id="zone-map-close" style="
        background:transparent;border:1px solid var(--border-dark,#3a1a1a);
        color:var(--border-red,#8b0000);cursor:pointer;padding:4px 10px;font-size:14px;
      ">✕</button>
    `;

    // Zone list container
    const list = document.createElement('div');
    list.id = 'zone-map-list';
    list.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:10px;';

    panel.appendChild(header);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.getElementById('app').appendChild(overlay);

    this._overlay = overlay;
    this._list = list;
  }

  _bindEvents() {
    document.getElementById('zone-map-close').addEventListener('click', () => this.close());
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close();
    });

    // Обновляем при разблокировке/завершении зоны
    this.state.on('zone:unlocked', () => this._refresh());
    this.state.on('zone:completed', () => this._refresh());
  }

  open() {
    this._refresh();
    this._overlay.style.display = 'flex';
  }

  close() {
    this._overlay.style.display = 'none';
  }

  _refresh() {
    this._list.innerHTML = '';
    const currentZoneId = this.state.currentZoneId;

    for (const zone of ZONES) {
      const progress = this.state.zonesProgress?.[zone.id];
      const isUnlocked = progress?.unlocked ?? zone.unlocked ?? false;
      const isCurrent = zone.id === currentZoneId;
      const bossDefeated = progress?.bossDefeated ?? false;
      const wavesCleared = progress?.wavesCleared ?? 0;

      const card = document.createElement('div');
      card.style.cssText = `
        padding:14px 16px;
        background:${isUnlocked ? '#12060a' : 'rgba(10,5,10,0.5)'};
        border:1px solid ${isCurrent ? 'var(--border-red,#8b0000)' : 'var(--border-dark,#3a1a1a)'};
        cursor:${isUnlocked && !isCurrent ? 'pointer' : 'default'};
        opacity:${isUnlocked ? '1' : '0.45'};
        transition:border-color 0.2s;
        ${isCurrent ? 'box-shadow:0 0 12px rgba(139,0,0,0.3);' : ''}
      `;

      const statusIcon = bossDefeated ? '✓' : (isCurrent ? '▶' : (isUnlocked ? '○' : '🔒'));
      const waveText = isUnlocked
        ? (bossDefeated
            ? 'Завершено'
            : `Волны: ${wavesCleared}/20${isCurrent ? ` · Текущая: ${this.state.zoneWave ?? 1}` : ''}`)
        : 'Заблокировано';

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:24px;">${zone.icon}</span>
          <div style="flex:1;">
            <div style="font-family:var(--font-heading,'Cinzel',serif);
              color:${isUnlocked ? 'var(--text-parchment,#e8d5b7)' : '#555'};
              font-size:13px;letter-spacing:1px;">
              ${zone.name}
            </div>
            <div style="font-size:10px;color:${isCurrent ? 'var(--border-red,#8b0000)' : '#666'};
              margin-top:3px;letter-spacing:1px;">
              ${waveText}
            </div>
          </div>
          <span style="color:${bossDefeated ? '#2ecc71' : isCurrent ? 'var(--accent-bright,#e74c3c)' : '#555'};
            font-size:16px;">${statusIcon}</span>
        </div>
        ${isUnlocked && !bossDefeated ? `
          <div style="margin-top:8px;height:3px;background:#1a0a1a;border-radius:1px;">
            <div style="width:${Math.round((wavesCleared / 20) * 100)}%;height:100%;
              background:linear-gradient(90deg,#3a0a0a,var(--border-red,#8b0000));border-radius:1px;"></div>
          </div>
        ` : ''}
      `;

      if (isUnlocked && !isCurrent) {
        card.addEventListener('click', () => {
          this.state.enterZone(zone.id);
          this.close();
        });
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--border-red,#8b0000)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--border-dark,#3a1a1a)';
        });
      }

      this._list.appendChild(card);
    }
  }
}
