/**
 * Tutorial — онбординг первого запуска.
 * Показывает 4 подсказки с подсветкой целевых элементов.
 * Запускается один раз (state.tutorialDone = false).
 * Клик по оверлею или кнопка «Пропустить» переходят к следующему шагу / завершению.
 */
export class Tutorial {
  constructor(state) {
    this._state = state;
    this._step  = 0;
    this._steps = [
      { text: 'Твой герой сражается автоматически. Просто наблюдай!', target: '#game-container' },
      { text: 'Зарабатывай золото 🪙 и трать его на прокачку справа', target: '#stats-panel' },
      { text: 'Скилл готов — нажми для активации!', target: '#skill-btn' },
      { text: 'Победи босса зоны → получи Души 💜 → прокачай Зеркало Теней', target: '#hud' },
    ];
    this._overlay  = null;
    this._tooltip  = null;
    this._skipBtn  = null;
    this._highlight = null;
  }

  shouldShow() {
    return !this._state.tutorialDone;
  }

  start() {
    if (!this.shouldShow()) return;
    this._buildUI();
    this._showStep(0);
  }

  _buildUI() {
    // Затемняющий оверлей
    this._overlay = document.createElement('div');
    this._overlay.id = 'tutorial-overlay';

    // Подсветка целевого элемента
    this._highlight = document.createElement('div');
    this._highlight.id = 'tutorial-highlight';
    this._highlight.style.cssText = `
      position: fixed; z-index: 500; pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.65);
      border: 2px solid rgba(243,156,18,0.6);
      border-radius: 4px; transition: all 0.2s ease;
    `;

    // Всплывающая подсказка
    this._tooltip = document.createElement('div');
    this._tooltip.id = 'tutorial-tooltip';

    // Кнопка «Пропустить»
    this._skipBtn = document.createElement('button');
    this._skipBtn.id = 'tutorial-skip';
    this._skipBtn.textContent = 'Пропустить';
    this._skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this._finish(); });

    document.body.appendChild(this._overlay);
    document.body.appendChild(this._highlight);
    document.body.appendChild(this._tooltip);
    document.body.appendChild(this._skipBtn);

    this._overlay.addEventListener('click', () => this._next());
  }

  _showStep(i) {
    if (i >= this._steps.length) {
      this._finish();
      return;
    }
    const step   = this._steps[i];
    const target = document.querySelector(step.target);

    // Текст подсказки
    const stepNum = `<span style="font-size:10px;color:#8b0000;letter-spacing:2px;display:block;margin-bottom:4px;">ШАГ ${i + 1} / ${this._steps.length}</span>`;
    const hint    = `<span style="font-size:11px;color:#666;display:block;margin-top:8px;">Нажми в любом месте →</span>`;
    this._tooltip.innerHTML = stepNum + step.text + hint;
    this._tooltip.style.display = 'block';

    if (target) {
      const rect = target.getBoundingClientRect();
      const pad  = 4;

      // Позиционируем подсветку
      this._highlight.style.display = 'block';
      this._highlight.style.left    = (rect.left   - pad) + 'px';
      this._highlight.style.top     = (rect.top    - pad) + 'px';
      this._highlight.style.width   = (rect.width  + pad * 2) + 'px';
      this._highlight.style.height  = (rect.height + pad * 2) + 'px';

      // Позиционируем тултип: снизу от target, не уходим за края
      const ttMaxW = 280;
      let ttLeft = rect.left;
      let ttTop  = rect.bottom + 10;

      // Если не влезает снизу — ставим сверху
      if (ttTop + 100 > window.innerHeight) {
        ttTop = rect.top - 110;
      }
      // Не уходим за правый край
      if (ttLeft + ttMaxW > window.innerWidth) {
        ttLeft = window.innerWidth - ttMaxW - 10;
      }
      if (ttLeft < 8) ttLeft = 8;

      this._tooltip.style.top  = ttTop  + 'px';
      this._tooltip.style.left = ttLeft + 'px';
    } else {
      // Элемент не найден — показываем тултип по центру
      this._highlight.style.display = 'none';
      this._tooltip.style.top  = '50%';
      this._tooltip.style.left = '50%';
      this._tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }

  _next() {
    this._step++;
    this._showStep(this._step);
  }

  _finish() {
    this._overlay?.remove();
    this._highlight?.remove();
    this._tooltip?.remove();
    this._skipBtn?.remove();
    this._state.tutorialDone = true;
    this._state.save?.();
  }
}
