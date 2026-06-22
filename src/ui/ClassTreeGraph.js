/**
 * Class tree — horizontal DOM table (depth 1-5 eager, depth 6-10 lazy)
 * Replaces radial canvas graph for better readability.
 */
import {
  CLASS_MAP, CHILDREN_MAP, BRANCH_COLORS,
  DEPTH_LEVEL_REQ, DEPTH_GOLD_COST, getAncestors, getCumulativeBonuses,
} from '../data/classes.js';

// ── Depth column labels ────────────────────────────────────────────────────────
const DEPTH_LABELS = ['', 'Начало', 'Ветка', 'Специализация', 'Путь', 'Мастерство'];

// ── Component ─────────────────────────────────────────────────────────────────
export class ClassTreeGraph {
  constructor(state) {
    this.state      = state;
    this._nodeEls   = new Map(); // id → div
    this._deepShown = false;

    this._buildOverlay();
    this._buildTable();

    this._unsubs = [
      state.on('player:classChanged',    () => this._refreshNodes()),
      state.on('player:goldChanged',     () => this._refreshNodes()),
      state.on('player:levelUp',         () => this._refreshNodes()),
      state.on('player:classDiscovered', () => this._refreshNodes()),
    ];

    window.game = window.game || {};
    window.game.openClassGraph = () => this.open();

    this._updateBtnPulse();
  }

  destroy() {
    this._unsubs.forEach(u => u());
    this._overlay?.remove();
  }

  // ── Overlay DOM ───────────────────────────────────────────────────────────
  _buildOverlay() {
    const el = document.createElement('div');
    el.id = 'class-graph-overlay';
    el.style.cssText = `
      display:none;position:fixed;inset:0;z-index:200;
      background:rgba(0,0,0,0.92);
      display:none;flex-direction:column;
    `;

    // Header bar
    const header = document.createElement('div');
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 20px;border-bottom:1px solid #3a1a1a;
      background:linear-gradient(180deg,#12060a,#0d0510);
      flex-shrink:0;
    `;
    const title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-family:var(--font-heading,Cinzel,serif);color:#e8d5b7;letter-spacing:2px;';
    title.textContent = '🌿 Дерево Классов';

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:14px;font-size:11px;align-items:center;';
    legend.innerHTML = `
      <span style="color:#e05555">◆ Воин</span>
      <span style="color:#2ecc71">◆ Лучник</span>
      <span style="color:#aa55ee">◆ Плут</span>
      <span style="color:#5588ee">◆ Маг</span>
      <span style="color:#f39c12;border:1px solid rgba(243,156,18,0.4);padding:0 5px;border-radius:3px">★ Текущий</span>
      <span style="color:#ffd700;border:1px solid rgba(255,215,0,0.3);padding:0 5px;border-radius:3px">⭐ Престиж</span>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Закрыть';
    closeBtn.style.cssText = `
      background:transparent;border:1px solid #3a1a1a;color:#8b0000;
      padding:5px 12px;cursor:pointer;border-radius:3px;font-size:13px;
      transition:color 0.15s,border-color 0.15s;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#e74c3c'; closeBtn.style.borderColor = '#8b0000'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#8b0000'; closeBtn.style.borderColor = '#3a1a1a'; });
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(legend);
    header.appendChild(closeBtn);
    el.appendChild(header);

    // Scrollable table area
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:auto;display:flex;align-items:flex-start;';
    el.appendChild(body);
    this._tableBody = body;

    // Info panel (floating)
    const info = document.createElement('div');
    info.style.cssText = `
      position:fixed;width:220px;
      background:#0d0510;border:1px solid #3a1a1a;border-radius:5px;
      padding:14px;font-size:12px;color:#e8d5b7;
      display:none;z-index:300;pointer-events:auto;
      box-shadow:0 4px 20px rgba(0,0,0,0.9),0 0 16px rgba(139,0,0,0.15);
    `;
    el.appendChild(info);
    this._infoPanel = info;

    // Click outside info to close it
    body.addEventListener('click', e => {
      if (e.target === body) this._hideInfo();
    });

    document.body.appendChild(el);
    this._overlay = el;

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._overlay.style.display !== 'none') this.close();
    });
  }

  // ── Build horizontal table ─────────────────────────────────────────────────
  _buildTable() {
    const wrap = document.createElement('div');
    wrap.className = 'cls-tree-table';
    this._tableBody.appendChild(wrap);
    this._tableWrap = wrap;

    // Group classes by depth 1-5
    const byDepth = new Map();
    for (let d = 1; d <= 5; d++) byDepth.set(d, []);

    for (const [id, cls] of CLASS_MAP) {
      if (!cls || cls.depth < 1 || cls.depth > 5) continue;
      byDepth.get(cls.depth).push({ id, cls });
    }

    // Sort each depth by branch then name for readability
    const BRANCH_ORDER = { novice: 0, warrior: 1, rogue: 2, archer: 3, mage: 4 };
    for (const [, arr] of byDepth) {
      arr.sort((a, b) => {
        const bo = (BRANCH_ORDER[a.cls.branch] ?? 9) - (BRANCH_ORDER[b.cls.branch] ?? 9);
        if (bo !== 0) return bo;
        return (a.cls.name ?? '').localeCompare(b.cls.name ?? '', 'ru');
      });
    }

    // Render depth columns 1-5
    for (let d = 1; d <= 5; d++) {
      const col = document.createElement('div');
      col.className = 'cls-depth-col';

      const hdr = document.createElement('div');
      hdr.className = 'cls-depth-header';
      hdr.textContent = `${DEPTH_LABELS[d] ?? `Уровень ${d}`}`;
      col.appendChild(hdr);

      for (const { id, cls } of byDepth.get(d)) {
        const node = this._makeNode(id, cls);
        col.appendChild(node);
        this._nodeEls.set(id, node);
      }
      wrap.appendChild(col);
    }

    // Deep column — toggle button + lazy-built column
    const deepCol = document.createElement('div');
    deepCol.className = 'cls-depth-col';
    deepCol.style.minWidth = '160px';

    const deepHdr = document.createElement('div');
    deepHdr.className = 'cls-depth-header';
    deepHdr.textContent = 'Продвинутые';
    deepCol.appendChild(deepHdr);

    // Count deep classes
    let deepCount = 0;
    for (const [, cls] of CLASS_MAP) {
      if (cls && cls.depth >= 6) deepCount++;
    }

    const showDeepBtn = document.createElement('button');
    showDeepBtn.className = 'cls-show-deep-btn';
    showDeepBtn.textContent = `▶ Показать глубины 6-10 (${deepCount})`;
    showDeepBtn.addEventListener('click', () => {
      if (this._deepShown) return;
      this._deepShown = true;
      showDeepBtn.remove();
      this._buildDeepColumns(wrap);
    });
    deepCol.appendChild(showDeepBtn);
    wrap.appendChild(deepCol);
    this._deepToggleCol = deepCol;
  }

  _makeNode(id, cls) {
    const node = document.createElement('div');
    node.className = 'cls-node';
    node.dataset.id = id;
    // Branch left-border color class
    if (cls.branch && cls.branch !== 'novice') {
      node.classList.add(`cls-branch-${cls.branch}`);
    }
    node.textContent = cls.name ?? id;
    node.title = cls.desc ?? '';
    node.addEventListener('click', e => {
      e.stopPropagation();
      this._onNodeClick(id, node);
    });
    return node;
  }

  _buildDeepColumns(wrap) {
    // Group deep classes by depth 6-10
    const byDepth = new Map();
    for (let d = 6; d <= 10; d++) byDepth.set(d, []);

    for (const [id, cls] of CLASS_MAP) {
      if (!cls || cls.depth < 6 || cls.depth > 10) continue;
      if (!byDepth.has(cls.depth)) byDepth.set(cls.depth, []);
      byDepth.get(cls.depth).push({ id, cls });
    }

    // Remove the placeholder deep col
    this._deepToggleCol?.remove();

    for (const [d, arr] of byDepth) {
      if (!arr.length) continue;
      const col = document.createElement('div');
      col.className = 'cls-depth-col';

      const hdr = document.createElement('div');
      hdr.className = 'cls-depth-header';
      hdr.textContent = `Глубина ${d}`;
      col.appendChild(hdr);

      // Limit to first 200 per depth to avoid DOM flooding (still ~1000 total)
      const display = arr.slice(0, 200);
      for (const { id: nodeId, cls: nodeCls } of display) {
        const node = this._makeNode(nodeId, nodeCls);
        col.appendChild(node);
        this._nodeEls.set(nodeId, node);
      }
      if (arr.length > 200) {
        const more = document.createElement('div');
        more.style.cssText = 'font-size:10px;color:#555;padding:4px 8px;text-align:center;';
        more.textContent = `... ещё ${arr.length - 200}`;
        col.appendChild(more);
      }
      wrap.appendChild(col);
    }

    // Refresh state on newly built nodes
    this._refreshNodes();
  }

  // ── Node click → show info panel ──────────────────────────────────────────
  _onNodeClick(id, nodeEl) {
    this._showInfo(id);
    // Position info panel near clicked node
    const rect = nodeEl.getBoundingClientRect();
    const pw = 220 + 16;
    const ph = 300;
    let px = rect.right + 8;
    let py = rect.top;
    if (px + pw > window.innerWidth - 8) px = rect.left - pw - 8;
    py = Math.max(8, Math.min(py, window.innerHeight - ph - 8));
    this._infoPanel.style.left = px + 'px';
    this._infoPanel.style.top  = py + 'px';
  }

  // ── Info panel (reused from original) ─────────────────────────────────────
  _showInfo(id) {
    const cls = CLASS_MAP.get(id);
    if (!cls) return;
    const isCur  = id === this.state.currentClass;
    const cur    = this.state.currentClass;
    const anc    = new Set(getAncestors(cur));
    const color  = BRANCH_COLORS[cls.branch] ?? '#888';
    const cost   = DEPTH_GOLD_COST[cls.depth] ?? 0;
    const lvl    = DEPTH_LEVEL_REQ[cls.depth] ?? 0;
    const isPrestigeFromCur = !!(cls.prestige && cls.requires?.includes(cur) && cls.parent !== cur);
    const allReqsMet = !!(cls.prestige && cls.requires?.length &&
      cls.requires.every(rid => this.state.discoveredClasses.has(rid) || rid === cur || anc.has(rid)));
    const isDisc  = this.state.discoveredClasses.has(id) || isCur || anc.has(id) || allReqsMet;
    const reqsMet = !cls.requires?.length || (isPrestigeFromCur
      ? cls.requires.filter(rid => rid !== cur).every(rid => this.state.discoveredClasses.has(rid))
      : cls.requires.every(rid => this.state.discoveredClasses.has(rid)));
    const isAvail = (cls.parent === cur || isPrestigeFromCur)
      && !this.state.unlockedClasses.has(id)
      && this.state.level >= lvl
      && this.state.gold >= cost
      && reqsMet;
    const isLocked = !isCur && !isAvail && !this.state.unlockedClasses.has(id);

    const BNAMES = {
      atk:'⚔️ Урон', hp:'❤️ HP', def:'🛡️ Защита', spd:'⚡ Скорость',
      crit:'🎯 Крит шанс', critDmg:'💥 Крит урон', xpMult:'📚 Опыт',
      goldMult:'💰 Золото', dodge:'🌀 Уворот', lifesteal:'🩸 Вампиризм',
      thorns:'🌵 Шипы', magicShield:'🔮 Маг. щит',
      pierce:'🏹 Пробитие', deathblow:'💀 Смерт. удар', poison:'☠️ Яд', burn:'🔥 Горение',
    };

    const depthMult = Math.pow(1.30, cls.depth);
    const multLabel = depthMult.toFixed(2);

    let bonusHtml = '';
    if (isDisc) {
      bonusHtml = Object.entries(cls.bonuses || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `<div style="display:flex;justify-content:space-between;margin:2px 0">
          <span style="color:#666">${BNAMES[k] ?? k}</span>
          <span style="color:#7dcc7d">+${Math.round(v * 100)}%</span></div>`)
        .join('');
    }

    const DEPTH_SCALED = new Set(['hp', 'atk', 'def', 'spd']);
    let cumulHtml = '';
    if (isDisc && cls.depth > 0) {
      const cb = getCumulativeBonuses(id);
      const rows = Object.entries(cb)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const m = DEPTH_SCALED.has(k) ? depthMult : 1;
          const scaled = Math.round(v * m * 100);
          const col = DEPTH_SCALED.has(k) ? '#ffcc44' : '#aaaaaa';
          return `<div style="display:flex;justify-content:space-between;margin:2px 0">
            <span style="color:#666">${BNAMES[k] ?? k}</span>
            <span style="color:${col}">+${scaled}%</span></div>`;
        }).join('');
      if (rows) {
        cumulHtml = `<div style="border-top:1px solid #3a1a1a;padding-top:6px;margin-top:4px">
          <div style="color:#666;font-size:10px;margin-bottom:3px">Итого с цепочкой <span style="color:#ffd700;font-weight:bold">×${multLabel}</span> <span style="color:#444">(HP/ATK/DEF/SPD)</span></div>
          ${rows}
        </div>`;
      }
    }

    let footer = '';
    if (isCur) {
      footer = `<div style="margin-top:10px;text-align:center;color:#8b0000;font-size:11px;letter-spacing:1px">▶ Текущий класс</div>`;
    } else if (isAvail) {
      footer = `<button id="gip-switch" style="margin-top:10px;width:100%;padding:5px;background:#12060a;border:1px solid #8b0000;color:#e8d5b7;cursor:pointer;border-radius:3px;font-size:11px;transition:background 0.15s">
        Сменить класс (−${this._fmt(cost)}g)</button>`;
    } else if (isDisc && isLocked) {
      const needLvl  = this.state.level < lvl  ? `Ур. ${lvl}` : '';
      const needGold = this.state.gold < cost   ? `${this._fmt(cost)}g` : '';
      const needs = [needLvl, needGold].filter(Boolean).join(', ');
      footer = `<div style="margin-top:10px;text-align:center;color:#666;font-size:11px">🔒 Нужно: ${needs}</div>`;
    } else if (!isDisc) {
      footer = `<div style="margin-top:10px;text-align:center;color:#3a1a1a;font-size:11px">⊡ Неизвестный класс</div>`;
    }

    const prestigeLabel = cls.prestige === 2 ? '⭐⭐ ' : cls.prestige === 1 ? '⭐ ' : '';
    const nameColor = cls.prestige ? '#ffd700' : (isDisc ? color : '#333');

    let requiresHtml = '';
    if (isDisc && cls.requires?.length) {
      const items = cls.requires.map(rid => {
        const rc  = CLASS_MAP.get(rid);
        const met = this.state.discoveredClasses.has(rid);
        return `<span style="color:${met ? '#ffd700' : '#555'}">${met && rc ? rc.name : '???'} ${met ? '✓' : '✗'}</span>`;
      }).join(' <span style="color:#3a1a1a">+</span> ');
      requiresHtml = `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #3a1a1a;font-size:10px;color:#666">⭐ Требует:<br><div style="margin-top:3px">${items}</div></div>`;
    }

    this._infoPanel.innerHTML = `
      <div style="font-weight:bold;color:${nameColor};font-size:13px;margin-bottom:4px;font-family:var(--font-heading,Georgia),serif;letter-spacing:1px">${isDisc ? `${prestigeLabel}${cls.name}` : '???'}</div>
      <div style="color:#666;font-size:10px;margin-bottom:${bonusHtml ? 6 : 0}px;line-height:1.4">${isDisc ? cls.desc : 'Откройте, чтобы узнать'}</div>
      ${bonusHtml ? `<div style="border-top:1px solid #3a1a1a;padding-top:6px">
        <div style="color:#555;font-size:10px;margin-bottom:3px">Бонусы класса:</div>
        ${bonusHtml}
      </div>` : ''}
      ${cumulHtml}
      ${requiresHtml}
      ${footer}
    `;

    if (isAvail) {
      this._infoPanel.querySelector('#gip-switch')?.addEventListener('click', e => {
        e.stopPropagation();
        this.state.changeClass(id);
      });
    }

    this._infoPanel.style.display = 'block';
  }

  _hideInfo() {
    this._infoPanel.style.display = 'none';
  }

  _fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  // ── State-driven visual refresh ────────────────────────────────────────────
  _hasAvailableClass() {
    const cur = this.state.currentClass;
    const children = CHILDREN_MAP.get(cur) || [];
    for (const id of children) {
      const cls = CLASS_MAP.get(id);
      if (!cls || this.state.unlockedClasses.has(id)) continue;
      const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
      const lvl  = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
      if (this.state.level < lvl || this.state.gold < cost) continue;
      if (cls.requires?.length && !cls.requires.every(rid => this.state.discoveredClasses.has(rid))) continue;
      return true;
    }
    for (const [id, cls] of CLASS_MAP) {
      if (!cls.prestige || !cls.requires?.includes(cur)) continue;
      if (this.state.unlockedClasses.has(id)) continue;
      const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
      const lvl  = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
      if (this.state.level < lvl || this.state.gold < cost) continue;
      const otherReqs = cls.requires.filter(rid => rid !== cur);
      if (!otherReqs.every(rid => this.state.discoveredClasses.has(rid))) continue;
      return true;
    }
    return false;
  }

  _updateBtnPulse() {
    const btn = document.getElementById('class-tree-btn');
    if (!btn) return;
    btn.classList.toggle('available-pulse', this._hasAvailableClass());
  }

  _refreshNodes() {
    this._updateBtnPulse();
    if (this._overlay.style.display === 'none') return;

    const cur = this.state.currentClass;
    const anc = new Set(getAncestors(cur));

    for (const [id, node] of this._nodeEls) {
      const cls = CLASS_MAP.get(id);
      if (!cls) continue;
      this._styleNode(node, id, cls, cur, anc);
    }
  }

  _styleNode(node, id, cls, cur, anc) {
    const isCur  = id === cur;
    const isAnc  = anc.has(id) && !isCur;
    const cost   = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvl    = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    const isPrestigeFromCur = !!(cls.prestige && cls.requires?.includes(cur) && cls.parent !== cur);
    const allReqsMet = !!(cls.prestige && cls.requires?.length &&
      cls.requires.every(rid => this.state.discoveredClasses.has(rid) || rid === cur || anc.has(rid)));
    const isDisc  = this.state.discoveredClasses.has(id) || isCur || isAnc || allReqsMet;
    const reqsMet = !cls.requires?.length || (isPrestigeFromCur
      ? cls.requires.filter(rid => rid !== cur).every(rid => this.state.discoveredClasses.has(rid))
      : cls.requires.every(rid => this.state.discoveredClasses.has(rid)));
    const isAvail = (cls.parent === cur || isPrestigeFromCur)
      && !this.state.unlockedClasses.has(id)
      && this.state.level >= lvl
      && this.state.gold >= cost
      && reqsMet;

    // Reset state classes
    node.classList.remove('cls-current', 'cls-ancestor', 'cls-available', 'cls-locked', 'cls-prestige', 'node-avail-pulse');

    // Tooltip
    const requiresHint = isDisc && cls.requires?.length
      ? '\nТребует: ' + cls.requires.map(rid => CLASS_MAP.get(rid)?.name ?? rid).join(' + ')
      : '';
    node.title = isDisc ? `${cls.name}\n${cls.desc}${requiresHint}` : '??? — Откройте, чтобы узнать';

    // Display name
    if (isDisc) {
      const prefix = cls.prestige === 2 ? '⭐⭐ ' : cls.prestige === 1 ? '⭐ ' : (isCur ? '★ ' : isAnc ? '✓ ' : '');
      node.textContent = prefix + (cls.name ?? id);
    } else {
      node.textContent = '???';
    }

    // State class
    if (cls.prestige) node.classList.add('cls-prestige');

    if (isCur) {
      node.classList.add('cls-current');
    } else if (isAnc) {
      node.classList.add('cls-ancestor');
    } else if (isAvail) {
      node.classList.add('cls-available');
      node.classList.add('node-avail-pulse');
      node.style.setProperty('--pulse-col', cls.prestige ? '#ffd700' : '#8b0000');
    } else if (!isDisc) {
      node.classList.add('cls-locked');
    }
    // discovered but not current/ancestor/avail → default style (slightly visible)
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  open() {
    this._overlay.style.display = 'flex';
    this._refreshNodes();
  }

  close() {
    this._overlay.style.display = 'none';
    this._hideInfo();
  }
}
