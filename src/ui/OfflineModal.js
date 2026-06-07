/**
 * Экран «С возвращением» — итог офлайн-прогресса.
 * Получает summary из state.offlineSummary (заполняется в GameStateSave._simulateOffline)
 * и показывает, что игрок «нафармил» пока его не было.
 */

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000)    return (n / 1000).toFixed(0) + 'K';
  if (n >= 1_000)     return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин`;
  return `${Math.floor(sec)} сек`;
}

export class OfflineModal {
  constructor() {
    this._overlay = document.getElementById('offline-overlay');
    this._btn     = document.getElementById('offline-collect-btn');
    this._btn?.addEventListener('click', () => this.close());

    window.game = window.game || {};
    window.game.showOfflineSummary = (s) => this.show(s);
  }

  /** @param {object} s summary из state.offlineSummary */
  show(s) {
    if (!s) return;

    document.getElementById('offline-away').innerHTML =
      `Тебя не было — <strong>${fmtDuration(s.elapsedSec)}</strong>`;

    const waveDelta = s.waveAfter - s.waveBefore;
    const lvlDelta  = s.levelAfter - s.levelBefore;

    const rows = [];
    rows.push(row('🌊', 'Волна', `${s.waveBefore} → ${s.waveAfter}`, waveDelta > 0 ? `+${waveDelta}` : ''));
    if (lvlDelta > 0)
      rows.push(row('⭐', 'Уровень', `${s.levelBefore} → ${s.levelAfter}`, `+${lvlDelta}`));
    if (s.kills > 0) rows.push(row('💀', 'Убийств', `~${fmtNum(s.kills)}`, ''));
    if (s.gold  > 0) rows.push(row('💰', 'Золото', `+${fmtNum(s.gold)}`, ''));
    if (s.drops > 0) rows.push(row('🎁', 'Найдено предметов', `${s.drops}`, ''));

    document.getElementById('offline-rows').innerHTML = rows.join('');
    this._overlay.classList.add('visible');
  }

  close() {
    this._overlay.classList.remove('visible');
  }
}

function row(ico, label, value, delta) {
  const deltaHtml = delta ? `<span class="ofl-delta">${delta}</span>` : '';
  return `
    <div class="offline-row">
      <span class="offline-row-label"><span class="ofl-ico">${ico}</span>${label}</span>
      <span class="offline-row-value">${value}${deltaHtml}</span>
    </div>`;
}
