/**
 * Меню настроек: статистика, сброс прогресса, экспорт/импорт сейва
 */
import { CLASS_MAP } from '../data/classes.js';

export class SettingsMenu {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state        = state;
    this._activeTab   = 'stats';
    this._resetPhase  = 0; // 0 = кнопка, 1 = первое подтверждение, 2 = финальное
    this._resetTimer  = null;

    this._initDOM();
    this._bindEvents();

    // Кнопка в HUD
    window.game = window.game || {};
    window.game.openSettings = () => this.open();
  }

  open() {
    this._resetPhase = 0;
    this._updateResetBtn();
    this._renderStats();
    document.getElementById('settings-overlay').classList.add('visible');
  }

  close() {
    document.getElementById('settings-overlay').classList.remove('visible');
    clearTimeout(this._resetTimer);
    this._resetPhase = 0;
  }

  // ── DOM ───────────────────────────────────────────────────────────────────────
  _initDOM() {
    // Модалка уже в HTML; просто убеждаемся что вкладки работают
  }

  _bindEvents() {
    document.getElementById('settings-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('settings-overlay')) this.close();
    });

    // Вкладки
    document.querySelectorAll('.stab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeTab = tab.dataset.tab;
        this._switchTab(this._activeTab);
      });
    });

    // Кнопка Reset
    document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
      this._advanceReset();
    });

    // Сохранить сейчас
    document.getElementById('save-now-btn')?.addEventListener('click', () => {
      this.state.save();
      const btn = document.getElementById('save-now-btn');
      const orig = btn.textContent;
      btn.textContent = '✓ Сохранено!';
      btn.style.color = '#7dda7d';
      setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
    });

    // Экспорт
    document.getElementById('export-save-btn')?.addEventListener('click', () => {
      this._exportSave();
    });

    // Импорт
    document.getElementById('import-save-btn')?.addEventListener('click', () => {
      document.getElementById('import-file-input')?.click();
    });
    document.getElementById('import-file-input')?.addEventListener('change', (e) => {
      this._importSave(e.target.files[0]);
    });
  }

  _switchTab(tab) {
    document.querySelectorAll('.stab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`stab-${tab}`)?.classList.add('active');
    if (tab === 'stats') this._renderStats();
  }

  // ── Статистика ────────────────────────────────────────────────────────────────
  _renderStats() {
    const s = this.state;
    const stats = s.getStats();

    // Найти максимальную глубину среди разблокированных классов
    let maxDepth = 0;
    for (const id of s.unlockedClasses) {
      const cls = CLASS_MAP.get(id);
      if (cls && cls.depth > maxDepth) maxDepth = cls.depth;
    }

    const playSecs  = Math.round(s.playTime);
    const playHours = Math.floor(playSecs / 3600);
    const playMins  = Math.floor((playSecs % 3600) / 60);
    const playSec2  = playSecs % 60;
    const playStr   = `${playHours}ч ${playMins}м ${playSec2}с`;

    const statsEl = document.getElementById('stats-content');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div class="sstat-grid">
        <div class="sstat-item">
          <div class="sstat-icon">⚔️</div>
          <div class="sstat-info">
            <div class="sstat-value">${this._fmt(s.totalKills)}</div>
            <div class="sstat-label">Убито врагов</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">💰</div>
          <div class="sstat-info">
            <div class="sstat-value">${this._fmt(s.totalGold)}</div>
            <div class="sstat-label">Золота собрано</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">🏆</div>
          <div class="sstat-info">
            <div class="sstat-value">Волна ${s.currentWave}</div>
            <div class="sstat-label">Текущая волна</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">⏱️</div>
          <div class="sstat-info">
            <div class="sstat-value">${playStr}</div>
            <div class="sstat-label">Время в игре</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">⭐</div>
          <div class="sstat-info">
            <div class="sstat-value">${s.prestigeCount}</div>
            <div class="sstat-label">Перерождений</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">🌿</div>
          <div class="sstat-info">
            <div class="sstat-value">Глубина ${maxDepth} / 10</div>
            <div class="sstat-label">Макс. класс</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">📚</div>
          <div class="sstat-info">
            <div class="sstat-value">${s.unlockedClasses.size}</div>
            <div class="sstat-label">Разблокировано классов</div>
          </div>
        </div>
        <div class="sstat-item">
          <div class="sstat-icon">🎯</div>
          <div class="sstat-info">
            <div class="sstat-value">${stats.crit.toFixed(1)}% / ${stats.critDmg.toFixed(0)}%</div>
            <div class="sstat-label">Крит шанс / урон</div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Сброс прогресса (3 шага) ─────────────────────────────────────────────────
  _advanceReset() {
    this._resetPhase++;
    this._updateResetBtn();

    if (this._resetPhase === 1) {
      // Автоотмена через 5с
      this._resetTimer = setTimeout(() => {
        this._resetPhase = 0;
        this._updateResetBtn();
      }, 5000);
    } else if (this._resetPhase === 2) {
      clearTimeout(this._resetTimer);
      this._resetTimer = setTimeout(() => {
        this._resetPhase = 0;
        this._updateResetBtn();
      }, 5000);
    } else if (this._resetPhase >= 3) {
      // Выполняем сброс
      clearTimeout(this._resetTimer);
      localStorage.removeItem('idle_rpg_save');
      window.location.reload();
    }
  }

  _updateResetBtn() {
    const btn = document.getElementById('reset-progress-btn');
    if (!btn) return;
    switch (this._resetPhase) {
      case 0:
        btn.textContent = '🗑️ Сбросить прогресс';
        btn.className   = 'settings-danger-btn';
        break;
      case 1:
        btn.textContent = '⚠️ Вы уверены? Нажмите ещё раз';
        btn.className   = 'settings-danger-btn confirm1';
        break;
      case 2:
        btn.textContent = '☠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ! Всё сотрётся!';
        btn.className   = 'settings-danger-btn confirm2';
        break;
    }
  }

  // ── Экспорт / Импорт ─────────────────────────────────────────────────────────
  _exportSave() {
    this.state.save();
    const raw  = localStorage.getItem('idle_rpg_save') ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `idle_rpg_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _importSave(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.v !== 1) throw new Error('Неверная версия сейва');
        localStorage.setItem('idle_rpg_save', e.target.result);
        window.location.reload();
      } catch (err) {
        alert('Ошибка импорта: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  _fmt(n) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
}
