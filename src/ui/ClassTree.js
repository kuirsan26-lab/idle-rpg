/**
 * HTML-панель дерева классов
 * Показывает: путь до текущего класса, доступные следующие, верхние ветки
 */
import {
  CLASS_MAP,
  CHILDREN_MAP,
  BRANCH_COLORS,
  DEPTH_LEVEL_REQ,
  DEPTH_GOLD_COST,
  getAncestors,
  getBranch,
} from '../data/classes.js';

export class ClassTreePanel {
  /** @param {import('../core/GameState.js').GameState} state */
  constructor(state) {
    this.state       = state;
    this.container   = document.getElementById('class-tree-scroll');
    this.searchInput = document.getElementById('class-search-input');
    this.activeBranch = 'all';
    this.pendingClass = null; // ID класса в модальном окне

    this._bindEvents();
    this._render();

    this._unsubs = [
      state.on('player:classChanged',    () => this._render()),
      state.on('player:statsChanged',    () => this._render()),
      state.on('player:goldChanged',     () => this._render()),
      state.on('player:levelUp',         () => this._render()),
      state.on('player:classDiscovered', () => this._render()),
    ];
  }

  destroy() {
    this._unsubs.forEach(u => u());
  }

  _bindEvents() {
    // Вкладки веток
    document.querySelectorAll('.branch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.branch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeBranch = tab.dataset.branch;
        this._render();
      });
    });

    // Поиск
    this.searchInput.addEventListener('input', () => this._render());

    // Модальное окно
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      if (this.pendingClass) {
        const success = this.state.changeClass(this.pendingClass);
        if (success) {
          this._closeModal();
        }
      }
    });
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._closeModal());
    document.getElementById('class-modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('class-modal-overlay')) this._closeModal();
    });

    window.game = window.game || {};
    window.game.openClassModal = (id) => this._openModal(id);
  }

  // ── Рендер дерева ─────────────────────────────────────────────────────────────
  _render() {
    const searchQuery  = this.searchInput.value.trim().toLowerCase();
    const currentClass = this.state.currentClass;
    const ancestors    = new Set(getAncestors(currentClass));

    // Решаем, что показывать
    let nodesToShow = [];

    if (searchQuery) {
      // Режим поиска: только открытые классы (неоткрытые — ???, их имя неизвестно)
      for (const [id, cls] of CLASS_MAP) {
        if (!this.state.discoveredClasses.has(id)) continue;
        if (cls.name.toLowerCase().includes(searchQuery)) {
          nodesToShow.push(cls);
          if (nodesToShow.length >= 60) break; // лимит отображения
        }
      }
    } else {
      // Обычный режим: показываем иерархически
      nodesToShow = this._buildVisibleTree(currentClass, ancestors);
    }

    // Фильтр по ветке
    if (this.activeBranch !== 'all') {
      nodesToShow = nodesToShow.filter(c =>
        c.branch === this.activeBranch || c.id === 'novice'
      );
    }

    this.container.innerHTML = nodesToShow.map(cls =>
      this._renderNode(cls, ancestors, currentClass)
    ).join('');

    // Вешаем click на "доступные" узлы
    this.container.querySelectorAll('.tree-node.available').forEach(el => {
      el.addEventListener('click', () => this._openModal(el.dataset.id));
    });
  }

  _buildVisibleTree(currentClass, ancestors) {
    const result = [];
    const seen   = new Set();

    // 1. Новичок всегда виден
    this._addNode('novice', result, seen);

    // 2. Ветки depth-1 как навигационные якоря
    const depth1 = (CHILDREN_MAP.get('novice') || []).map(id => CLASS_MAP.get(id));
    for (const cls of depth1) {
      if (!cls) continue;
      this._addNode(cls.id, result, seen);

      // Если текущая ветка совпадает — показываем путь
      if (ancestors.has(cls.id) || cls.id === currentClass) {
        this._addBranchPath(cls.id, currentClass, ancestors, result, seen, 1);
      }
    }

    return result;
  }

  _addBranchPath(fromId, currentClass, ancestors, result, seen, depth) {
    const children = CHILDREN_MAP.get(fromId) || [];
    for (const childId of children) {
      const child = CLASS_MAP.get(childId);
      if (!child) continue;

      const isAncestor  = ancestors.has(childId);
      const isCurrent   = childId === currentClass;
      const isChild     = child.parent === currentClass;

      // Показываем узел если: предок тек. класса, текущий, или непосредственный ребёнок
      if (isAncestor || isCurrent || isChild) {
        this._addNode(childId, result, seen);

        // Рекурсия только вглубь предков и текущего
        if (isAncestor || isCurrent) {
          this._addBranchPath(childId, currentClass, ancestors, result, seen, depth + 1);
        }
      }
    }
  }

  _addNode(id, list, seen) {
    if (seen.has(id)) return;
    seen.add(id);
    const cls = CLASS_MAP.get(id);
    if (cls) list.push(cls);
  }

  // ── Рендер одного узла ────────────────────────────────────────────────────────
  _renderNode(cls, ancestors, currentClass) {
    const isCurrent    = cls.id === currentClass;
    const isAncestor   = ancestors.has(cls.id) && !isCurrent;
    const isAvailable  = this._isAvailable(cls);
    const isDiscovered = this.state.discoveredClasses.has(cls.id);
    const isLocked     = !isCurrent && !isAncestor && !isAvailable;

    const depth  = cls.depth ?? 0;
    const indent = Math.min(depth, 6) * 10;

    // Mystery-нода: ещё ни разу не открывался
    if (!isDiscovered && !isCurrent && !isAncestor) {
      const cost = DEPTH_GOLD_COST[depth] ?? 0;
      const lvl  = DEPTH_LEVEL_REQ[depth] ?? 0;
      const nodeClass = 'tree-node mystery' + (isAvailable ? ' available' : ' locked');
      const costStr = isAvailable
        ? `<span style="color:#ffd700">${this._formatNum(cost)}g</span>`
        : depth > 0 ? `<span style="color:#333">${this._formatNum(cost)}g</span>` : '';
      const prestigePrefix = cls.prestige === 2 ? '⭐⭐ ' : cls.prestige === 1 ? '⭐ ' : '';
      const requiresHint = cls.requires?.length
        ? '\nТребует: ' + cls.requires.map(id => CLASS_MAP.get(id)?.name ?? '???').join(' + ')
        : '';
      return `
        <div class="${nodeClass}" data-id="${cls.id}" title="Неизвестный класс\nОткройте, чтобы узнать\nНужен уровень: ${lvl}">
          <div class="node-row">
            <span class="node-indent" style="width:${indent}px"></span>
            <span class="node-specialty-dot" style="background:#222;border:1px solid ${cls.prestige ? '#6a5000' : '#444'}"></span>
            <span class="node-name" style="color:${cls.prestige ? '#6a5000' : '#444'}">${prestigePrefix}⊡ ???</span>
            <span class="node-depth" style="color:#333">${depth > 0 ? 'Ур.' + depth : ''}</span>
            <span style="margin-left:auto;font-size:10px">${costStr}</span>
          </div>
        </div>`;
    }

    let nodeClass = 'tree-node';
    if (isCurrent)        nodeClass += ' current';
    else if (isAncestor)  nodeClass += ' ancestor';
    else if (isAvailable) nodeClass += ' available';
    else                  nodeClass += ' locked';

    const color  = BRANCH_COLORS[cls.branch] ?? '#aaa';
    const cost   = DEPTH_GOLD_COST[depth] ?? 0;
    const lvl    = DEPTH_LEVEL_REQ[depth] ?? 0;
    const costStr = isAvailable
      ? `<span style="color:#ffd700">${this._formatNum(cost)}g</span>`
      : isLocked && depth > 0
        ? `<span style="color:#555">${this._formatNum(cost)}g</span>`
        : '';

    const icon = isCurrent ? '▶ ' : isAncestor ? '✓ ' : isAvailable ? '✦ ' : '⊡ ';
    const prestigePrefix = cls.prestige === 2 ? '⭐⭐ ' : cls.prestige === 1 ? '⭐ ' : '';
    const requiresHint = cls.requires?.length
      ? '\nТребует: ' + cls.requires.map(id => CLASS_MAP.get(id)?.name ?? id).join(' + ')
      : '';
    const dotColor = cls.prestige ? (isCurrent || isAncestor ? '#ffd700' : '#6a5000') : color;

    return `
      <div class="${nodeClass}" data-id="${cls.id}" title="${cls.desc}\nНужен уровень: ${lvl}">
        <div class="node-row">
          <span class="node-indent" style="width:${indent}px"></span>
          <span class="node-specialty-dot" style="background:${dotColor}"></span>
          <span class="node-name" style="${cls.prestige && (isCurrent || isAncestor) ? 'color:#ffd700' : ''}">${icon}${prestigePrefix}${cls.name}</span>
          <span class="node-depth" style="color:#444">${depth > 0 ? 'Ур.' + depth : ''}</span>
          <span style="margin-left:auto;font-size:10px">${costStr}</span>
        </div>
      </div>`;
  }

  _isAvailable(cls) {
    if (!cls || cls.id === 'novice') return false;
    if (cls.parent !== this.state.currentClass) return false;
    if (this.state.unlockedClasses.has(cls.id)) return false;
    if (cls.requires?.length && !cls.requires.every(id => this.state.discoveredClasses.has(id))) return false;
    const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvl  = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    return this.state.level >= lvl && this.state.gold >= cost;
  }

  // ── Модальное окно ────────────────────────────────────────────────────────────
  _openModal(classId) {
    const cls   = CLASS_MAP.get(classId);
    if (!cls) return;
    this.pendingClass = classId;

    const cost        = DEPTH_GOLD_COST[cls.depth] ?? 0;
    const lvReq       = DEPTH_LEVEL_REQ[cls.depth] ?? 0;
    const isDiscovered = this.state.discoveredClasses.has(classId);
    const color       = isDiscovered ? (BRANCH_COLORS[cls.branch] ?? '#aaa') : '#444';

    const prestigeLabel = cls.prestige === 2 ? '⭐⭐ ' : cls.prestige === 1 ? '⭐ ' : '';
    document.getElementById('modal-class-name').textContent = isDiscovered ? `${prestigeLabel}${cls.name}` : '??? Неизвестный класс';
    document.getElementById('modal-class-name').style.color = cls.prestige ? '#ffd700' : color;
    document.getElementById('modal-class-desc').textContent = isDiscovered ? cls.desc : 'Откройте этот класс, чтобы узнать его секреты. Каждый новый класс приносит +1 ПО.';
    document.getElementById('modal-class-cost').textContent = this._formatNum(cost);

    // Бонусы — скрываем для неоткрытых классов
    const bKeys = {
      atk: '⚔️ Урон',        hp: '❤️ HP',            def: '🛡️ Защита',
      spd: '⚡ Скорость',     crit: '🎯 Крит шанс',   critDmg: '💥 Крит урон',
      xpMult: '📚 Опыт',     goldMult: '💰 Золото',
      dodge: '🌀 Уворот',    lifesteal: '🩸 Вампиризм',
      thorns: '🌵 Шипы',     magicShield: '🔮 Маг. щит',
      pierce: '🏹 Пробитие', deathblow: '💀 Смерт. удар', poison: '☠️ Яд',
    };
    let statsHtml;
    if (isDiscovered) {
      const bonuses = cls.bonuses || {};
      statsHtml = Object.entries(bonuses)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `
          <div class="modal-stat-row">
            <span class="msr-name">${bKeys[k] ?? k}</span>
            <span class="msr-val">+${Math.round(v * 100)}%</span>
          </div>`).join('');
      if (!statsHtml) statsHtml = '<div class="modal-stat-row"><span class="msr-name">Базовые бонусы</span></div>';
    } else {
      statsHtml = '<div class="modal-stat-row" style="color:#444"><span class="msr-name">??? ??? ???</span></div>';
    }

    document.getElementById('modal-class-stats').innerHTML = statsHtml;

    // Престиж: секция требований
    let requiresHtml = '';
    if (cls.requires?.length) {
      const reqItems = cls.requires.map(id => {
        const rc  = CLASS_MAP.get(id);
        const met = this.state.discoveredClasses.has(id);
        return `<span style="color:${met ? '#ffd700' : '#555'}">${met && rc ? rc.name : '???'} ${met ? '✓' : '✗'}</span>`;
      }).join(' <span style="color:#444">+</span> ');
      requiresHtml = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #1a1a28;font-size:11px;color:#888">⭐ Требует открытых классов:<br><div style="margin-top:4px">${reqItems}</div></div>`;
    }
    const existingStats = document.getElementById('modal-class-stats');
    const reqEl = document.getElementById('modal-class-requires');
    if (reqEl) reqEl.remove();
    if (requiresHtml) {
      const div = document.createElement('div');
      div.id = 'modal-class-requires';
      div.innerHTML = requiresHtml;
      existingStats.after(div);
    }

    document.getElementById('class-modal-overlay').classList.add('visible');
  }

  _closeModal() {
    this.pendingClass = null;
    document.getElementById('class-modal-overlay').classList.remove('visible');
  }

  _formatNum(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }
}
