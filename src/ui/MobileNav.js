/**
 * MobileNav — нижний таб-бар для мобильной вёрстки.
 *
 * Виден только в @media (max-width: 820px) (CSS управляет display).
 * Кнопки дёргают существующие window.game.openX() хуки.
 * Кнопка «Статы» тогглит #stats-panel как выезжающий снизу bottom-sheet
 * (через класс body.stats-sheet-open) + затемняющий backdrop.
 */
export class MobileNav {
  constructor() {
    this._build();
    this._wire();
  }

  _build() {
    const app = document.getElementById('app');

    // Backdrop под bottom-sheet (вне #app, чтобы перекрывать весь экран)
    const backdrop = document.createElement('div');
    backdrop.id = 'mobile-sheet-backdrop';
    document.body.appendChild(backdrop);

    // Таб-бар — последний ребёнок #app (flex-column → прижат к низу)
    const bar = document.createElement('div');
    bar.id = 'mobile-tabbar';
    bar.innerHTML = `
      <button class="mtab" data-action="stats"><span class="mtab-icon">📊</span>Статы</button>
      <button class="mtab" data-action="classes"><span class="mtab-icon">🌿</span>Классы</button>
      <button class="mtab" data-action="inventory"><span class="mtab-icon">🎒</span>Инвент.</button>
      <button class="mtab" data-action="achievements"><span class="mtab-icon">🏆</span>Ачивки</button>
      <button class="mtab" data-action="settings"><span class="mtab-icon">⚙️</span>Ещё</button>
    `;
    app.appendChild(bar);

    this.bar = bar;
    this.backdrop = backdrop;
  }

  _wire() {
    this.bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.mtab');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'stats') { this._toggleStats(); return; }

      // Остальные действия открывают полноэкранные оверлеи — закрываем шит статов
      this._closeStats();
      const g = window.game;
      if (!g) return;
      if      (action === 'classes')      g.openClassGraph   && g.openClassGraph();
      else if (action === 'inventory')    g.openInventory    && g.openInventory();
      else if (action === 'achievements') g.openAchievements && g.openAchievements();
      else if (action === 'settings')     g.openSettings     && g.openSettings();
    });

    this.backdrop.addEventListener('click', () => this._closeStats());
  }

  _toggleStats() {
    document.body.classList.toggle('stats-sheet-open');
    this._syncActive();
  }

  _closeStats() {
    document.body.classList.remove('stats-sheet-open');
    this._syncActive();
  }

  _syncActive() {
    const open = document.body.classList.contains('stats-sheet-open');
    const statsBtn = this.bar.querySelector('[data-action="stats"]');
    if (statsBtn) statsBtn.classList.toggle('active', open);
  }
}
