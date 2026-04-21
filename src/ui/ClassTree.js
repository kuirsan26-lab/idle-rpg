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
      state.on('player:classChanged', () => this._render()),
      state.on('player:statsChanged', () => this._render()),
      state.on('player:goldChanged',  () => this._render()),
      state.on('player:levelUp',      () => this._render()),
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
  }

  // ── Рендер дерева ─────────────────────────────────────────────────────────────
  _render() {
    const searchQuery  = this.searchInput.value.trim().toLowerCase();
    const currentClass = this.state.currentClass;
    const ancestors    = new Set(getAncestors(currentClass));

    // Решаем, что показывать
    let nodesToShow = [];

    if (searchQuery) {
      // Режим поиска: все классы, имя которых содержит запрос
      for (const [id, cls] of CLASS_MAP) {
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
    const isCurrent   = cls.id === currentClass;
    const isAncestor  = ancestors.has(cls.id) && !isCurrent;
    const isAvailable = this._isAvailable(cls);
    const isLocked    = !isCurrent && !isAncestor && !isAvailable;

    let nodeClass = 'tree-node';
    if (isCurrent)  nodeClass += ' current';
    else if (isAncestor)  nodeClass += ' ancestor';
    else if (isAvailable) nodeClass += ' available';
    else nodeClass += ' locked';

    const depth  = cls.depth ?? 0;
    const indent = Math.min(depth, 6) * 10;
    const color  = BRANCH_COLORS[cls.branch] ?? '#aaa';

    const cost = DEPTH_GOLD_COST[depth] ?? 0;
    const lvl  = DEPTH_LEVEL_REQ[depth] ?? 0;
    const costStr = isAvailable
      ? `<span style="color:#ffd700">${this._formatNum(cost)}g</span>`
      : isLocked && depth > 0
        ? `<span style="color:#555">${this._formatNum(cost)}g</span>`
        : '';

    const icon = isCurrent ? '▶ ' : isAncestor ? '✓ ' : isAvailable ? '✦ ' : '⊡ ';

    return `
      <div class="${nodeClass}" data-id="${cls.id}" title="${cls.desc}\nНужен уровень: ${lvl}">
        <div class="node-row">
          <span class="node-indent" style="width:${indent}px"></span>
          <span class="node-specialty-dot" style="background:${color}"></span>
          <span class="node-name">${icon}${cls.name}</span>
          <span class="node-depth" style="color:#444">${depth > 0 ? 'Ур.' + depth : ''}</span>
          <span style="margin-left:auto;font-size:10px">${costStr}</span>
        </div>
      </div>`;
  }

  _isAvailable(cls) {
    if (!cls || cls.id === 'novice') return false;
    const parentIsCurrentClass = cls.parent === this.state.currentClass;
    if (!parentIsCurrentClass) return false;
    if (this.state.unlockedClasses.has(cls.id)) return false;
    const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvl  = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    return this.state.level >= lvl && this.state.gold >= cost;
  }

  // ── Модальное окно ────────────────────────────────────────────────────────────
  _openModal(classId) {
    const cls   = CLASS_MAP.get(classId);
    if (!cls) return;
    this.pendingClass = classId;

    const cost  = DEPTH_GOLD_COST[cls.depth] ?? 0;
    const lvReq = DEPTH_LEVEL_REQ[cls.depth] ?? 0;
    const color = BRANCH_COLORS[cls.branch] ?? '#aaa';

    document.getElementById('modal-class-name').textContent = cls.name;
    document.getElementById('modal-class-name').style.color = color;
    document.getElementById('modal-class-desc').textContent = cls.desc;
    document.getElementById('modal-class-cost').textContent = this._formatNum(cost);

    // Бонусы
    const bonuses = cls.bonuses || {};
    const bKeys = {
      atk: '⚔️ Урон',        hp: '❤️ HP',            def: '🛡️ Защита',
      spd: '⚡ Скорость',     crit: '🎯 Крит шанс',   critDmg: '💥 Крит урон',
      xpMult: '📚 Опыт',     goldMult: '💰 Золото',
      dodge: '🌀 Уворот',    lifesteal: '🩸 Вампиризм',
      thorns: '🌵 Шипы',     magicShield: '🔮 Маг. щит',
      pierce: '🏹 Пробитие', deathblow: '💀 Смерт. удар',
    };
    const statsHtml = Object.entries(bonuses)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `
        <div class="modal-stat-row">
          <span class="msr-name">${bKeys[k] ?? k}</span>
          <span class="msr-val">+${Math.round(v * 100)}%</span>
        </div>`).join('');

    document.getElementById('modal-class-stats').innerHTML =
      statsHtml || '<div class="modal-stat-row"><span class="msr-name">Базовые бонусы</span></div>';

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
