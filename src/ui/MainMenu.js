import { CHANGELOG } from '../data/changelog.js';
import { t, getLang, setLang } from '../i18n/index.js';

export class MainMenu {
  constructor({ onStart, onNewGame }) {
    this._onStart   = onStart;
    this._onNewGame = onNewGame;
    this._el        = document.getElementById('main-menu-overlay');
    this._render();
  }

  _hasSave() {
    try { return !!JSON.parse(localStorage.getItem('idle_rpg_save')); }
    catch { return false; }
  }

  _render() {
    const hasSave = this._hasSave();
    const latest  = CHANGELOG[0];

    this._el.innerHTML = `
      <div id="main-menu-panel">
        <div class="mm-title-block">
          <div class="mm-title">${t('menu_title')}</div>
          <div class="mm-subtitle">${t('menu_subtitle')}</div>
        </div>

        <div class="mm-changelog">
          <div class="mm-cl-header">
            ${t('menu_whats_new')} — <span class="mm-cl-version">v${latest.version}</span>
          </div>
          ${latest.entries.map(e => `<div class="mm-cl-entry">${e.text}</div>`).join('')}
        </div>

        <div class="mm-buttons" id="mm-buttons-area">
          <button class="mm-btn-primary" id="mm-btn-start">
            ${hasSave ? t('menu_continue') : t('menu_start')}
          </button>
          ${hasSave ? `<button class="mm-btn-secondary" id="mm-btn-newgame">${t('menu_new_game')}</button>` : ''}
        </div>

        <div class="mm-lang">
          <span class="mm-lang-label">${t('menu_language')}</span>
          <button class="mm-lang-btn${getLang() === 'ru' ? ' mm-lang-active' : ''}" id="mm-lang-ru">RU</button>
          <button class="mm-lang-btn${getLang() === 'en' ? ' mm-lang-active' : ''}" id="mm-lang-en">EN</button>
        </div>
      </div>
    `;

    document.getElementById('mm-btn-start')
      .addEventListener('click', () => this._hide(() => this._onStart()));

    document.getElementById('mm-btn-newgame')
      ?.addEventListener('click', () => this._showConfirm());

    document.getElementById('mm-lang-ru')
      .addEventListener('click', () => { setLang('ru'); this._render(); });
    document.getElementById('mm-lang-en')
      .addEventListener('click', () => { setLang('en'); this._render(); });
  }

  _showConfirm() {
    const area = document.getElementById('mm-buttons-area');
    area.innerHTML = `
      <div class="mm-warn-text">${t('menu_new_game_warn')}</div>
      <div class="mm-confirm-row">
        <button class="mm-btn-danger" id="mm-confirm-yes">${t('menu_confirm')}</button>
        <button class="mm-btn-secondary" id="mm-confirm-no">${t('menu_cancel')}</button>
      </div>
    `;
    document.getElementById('mm-confirm-yes')
      .addEventListener('click', () => this._onNewGame());
    document.getElementById('mm-confirm-no')
      .addEventListener('click', () => this._render());
  }

  show() {
    this._el.classList.add('visible');
  }

  _hide(cb) {
    this._el.classList.remove('visible');
    setTimeout(() => cb?.(), 450);
  }
}
