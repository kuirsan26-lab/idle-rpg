/**
 * Экран итогов рана — показывается после «Завершить ран»
 * Открывается через window.game.showRunSummary(summary, onContinue)
 */
export class RunSummary {
  constructor() {
    window.game = window.game || {};
    window.game.showRunSummary = (summary, onContinue) => this.show(summary, onContinue);
    this._buildDOM();
  }

  _buildDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'run-summary-overlay';
    overlay.style.cssText = `
      display:none;position:fixed;inset:0;z-index:300;
      background:rgba(0,0,0,0.92);
      align-items:center;justify-content:center;
    `;

    overlay.innerHTML = `
      <div id="run-summary-panel" style="
        background:var(--bg-panel,#0d0510);
        border:1px solid var(--border-dark,#3a1a1a);
        border-top:3px solid var(--border-red,#8b0000);
        width:460px;
        box-shadow:0 0 60px rgba(139,0,0,0.5);
      ">
        <div style="
          padding:18px 24px;
          background:linear-gradient(#12060a,#0d0510);
          border-bottom:1px solid var(--border-dark,#3a1a1a);
          text-align:center;
        ">
          <div style="font-family:var(--font-heading,'Cinzel',Georgia,serif);
            color:var(--text-parchment,#e8d5b7);font-size:18px;letter-spacing:3px;">
            ⚡ РАН ЗАВЕРШЁН
          </div>
          <div style="color:var(--border-red,#8b0000);font-size:10px;letter-spacing:2px;margin-top:4px;">
            ИТОГИ ВЫЛАЗКИ
          </div>
        </div>

        <div id="run-summary-stats" style="padding:20px 24px;display:flex;flex-direction:column;gap:8px;">
        </div>

        <div style="
          padding:16px 24px;
          background:#0a0318;
          border-top:1px solid var(--border-dark,#3a1a1a);
          text-align:center;
        ">
          <div style="color:var(--color-souls,#9b59b6);font-size:22px;font-weight:700;
            font-family:var(--font-heading,'Cinzel',Georgia,serif);letter-spacing:2px;">
            💜 +<span id="run-souls-earned">0</span> Душ
          </div>
          <div style="color:#555;font-size:10px;letter-spacing:1px;margin-top:4px;">
            ДОБАВЛЕНО В ЗЕРКАЛО ТЕНЕЙ
          </div>
        </div>

        <div style="padding:16px 24px;display:flex;gap:10px;">
          <button id="run-open-mirror" style="
            flex:1;padding:10px;cursor:pointer;
            background:linear-gradient(135deg,#1a0520,#0d0318);
            border:1px solid var(--color-souls,#9b59b6);
            color:var(--color-souls,#9b59b6);
            font-family:var(--font-heading,'Cinzel',Georgia,serif);
            font-size:12px;letter-spacing:1px;
          ">💜 ЗЕРКАЛО ТЕНЕЙ</button>
          <button id="run-new-run" style="
            flex:1;padding:10px;cursor:pointer;
            background:linear-gradient(135deg,#3a0a0a,#1a0520);
            border:1px solid var(--border-red,#8b0000);
            color:var(--text-parchment,#e8d5b7);
            font-family:var(--font-heading,'Cinzel',Georgia,serif);
            font-size:12px;letter-spacing:1px;
          ">⚡ НОВЫЙ РАН</button>
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(overlay);
    this._overlay = overlay;
  }

  show(summary, onContinue) {
    const stats = document.getElementById('run-summary-stats');
    const ZONE_NAMES = ['Тёмный Лес', 'Катакомбы', 'Вулкан', 'Небесная Крепость', 'Бездна'];
    const zoneText = summary.zonesCleared > 0
      ? ZONE_NAMES.slice(0, summary.zonesCleared).join(' → ')
      : 'Ни одной';

    stats.innerHTML = [
      ['🌑 Зоны пройдены', zoneText],
      ['⚔ Волн зачищено', summary.globalWave],
      ['☠ Убийств', summary.totalKills.toLocaleString()],
      ['📊 Уровень достигнут', summary.level],
    ].map(([label, val]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:7px 0;border-bottom:1px solid rgba(58,26,26,0.3);">
        <span style="color:#888;font-size:11px;letter-spacing:1px;">${label}</span>
        <span style="color:var(--text-parchment,#e8d5b7);font-size:12px;font-weight:700;">${val}</span>
      </div>
    `).join('');

    document.getElementById('run-souls-earned').textContent = summary.soulsEarned;

    const mirrorBtn = document.getElementById('run-open-mirror');
    const newRunBtn = document.getElementById('run-new-run');

    const freshMirror = mirrorBtn.cloneNode(true);
    const freshNew    = newRunBtn.cloneNode(true);
    mirrorBtn.replaceWith(freshMirror);
    newRunBtn.replaceWith(freshNew);

    freshMirror.addEventListener('click', () => {
      this._overlay.style.display = 'none';
      window.game?.openShadowMirror?.();
    });

    freshNew.addEventListener('click', () => {
      this._overlay.style.display = 'none';
      onContinue?.();
    });

    this._overlay.style.display = 'flex';
  }
}
