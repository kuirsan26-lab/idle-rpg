/**
 * Radial class tree graph — depth 0–5, pan+zoom overlay
 */
import {
  CLASS_MAP, CHILDREN_MAP, BRANCH_COLORS,
  DEPTH_LEVEL_REQ, DEPTH_GOLD_COST, getAncestors,
} from '../data/classes.js';

// ── Layout constants ──────────────────────────────────────────────────────────
const CX = 900, CY = 900, CANVAS_SZ = 1800;
const RADII     = [0, 120, 230, 360, 510, 680];
const NODE_R    = 18;
const MAX_DEPTH = 5;

// ── Visible children (depth ≤ MAX_DEPTH) ─────────────────────────────────────
function vcr(id) {
  return (CHILDREN_MAP.get(id) || []).filter(c => (CLASS_MAP.get(c)?.depth ?? 99) <= MAX_DEPTH);
}

// ── Leaf count: number of MAX_DEPTH descendants in subtree (memoized) ────────
const _lc = new Map();
function leafCount(id) {
  if (_lc.has(id)) return _lc.get(id);
  const cls = CLASS_MAP.get(id);
  if (!cls || cls.depth > MAX_DEPTH) { _lc.set(id, 0); return 0; }
  const ch = vcr(id);
  const n  = (!ch.length || cls.depth === MAX_DEPTH)
    ? 1 : ch.reduce((s, c) => s + leafCount(c), 0);
  _lc.set(id, n);
  return n;
}

// ── Radial positions (computed once at module load) ───────────────────────────
const POS = new Map(); // id → {x, y}
function place(id, a0, a1) {
  const cls = CLASS_MAP.get(id);
  if (!cls || cls.depth > MAX_DEPTH) return;
  const mid = (a0 + a1) / 2;
  const r   = RADII[cls.depth] ?? RADII[MAX_DEPTH];
  POS.set(id, { x: CX + r * Math.cos(mid), y: CY + r * Math.sin(mid) });
  const ch  = vcr(id);
  if (!ch.length) return;
  const tot = ch.reduce((s, c) => s + (leafCount(c) || 1), 0);
  let a = a0;
  for (const c of ch) {
    const f = (leafCount(c) || 1) / tot;
    place(c, a, a + f * (a1 - a0));
    a += f * (a1 - a0);
  }
}
place('novice', -Math.PI / 2, Math.PI * 1.5); // top, clockwise

// ── Component ─────────────────────────────────────────────────────────────────
export class ClassTreeGraph {
  constructor(state) {
    this.state    = state;
    this._nodeEls = new Map();
    this._edgeMap = new Map();
    this._tx = 0; this._ty = 0; this._scale = 1;
    this._dragging = false;
    this._drag0    = { x: 0, y: 0, tx: 0, ty: 0 };

    this._buildOverlay();
    this._buildEdges();
    this._buildNodes();
    this._bindPanZoom();
    this._addPanelButton();

    this._unsubs = [
      state.on('player:classChanged',    () => this._refreshNodes()),
      state.on('player:goldChanged',     () => this._refreshNodes()),
      state.on('player:levelUp',         () => this._refreshNodes()),
      state.on('player:classDiscovered', () => this._refreshNodes()),
    ];

    window.game = window.game || {};
    window.game.openClassGraph = () => this.open();
  }

  destroy() {
    this._unsubs.forEach(u => u());
    window.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('mouseup',   this._onUp);
    this._overlay?.remove();
  }

  // ── Overlay DOM ───────────────────────────────────────────────────────────
  _buildOverlay() {
    const el = document.createElement('div');
    el.id = 'class-graph-overlay';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:200;background:rgba(3,3,10,0.95);';

    const hint = document.createElement('div');
    hint.style.cssText = 'position:absolute;top:14px;left:50%;transform:translateX(-50%);color:#444;font-size:11px;pointer-events:none;white-space:nowrap;';
    hint.textContent = 'Колесо — масштаб · Перетащить — перемещение · Клик на класс — подробности';
    el.appendChild(hint);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Закрыть';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:16px;z-index:1;background:#111;border:1px solid #333;color:#888;padding:5px 12px;cursor:pointer;border-radius:3px;font-size:13px;';
    closeBtn.addEventListener('click', () => this.close());
    el.appendChild(closeBtn);

    const legend = document.createElement('div');
    legend.style.cssText = 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:20px;pointer-events:none;font-size:11px;';
    legend.innerHTML = `
      <span style="color:#e05555">● Воин</span>
      <span style="color:#aa55ee">● Плут</span>
      <span style="color:#55cc66">● Лучник</span>
      <span style="color:#5588ee">● Маг</span>
      <span style="color:#fff">◎ Текущий</span>
      <span style="color:#555;border:1px dashed #555;padding:0 4px">? Доступный</span>
      <span style="color:#2a2a3a">· Неизвестный</span>
    `;
    el.appendChild(legend);

    const vp = document.createElement('div');
    vp.style.cssText = 'position:absolute;inset:0;overflow:hidden;cursor:grab;';
    el.appendChild(vp);
    this._viewport = vp;

    const canvas = document.createElement('div');
    canvas.style.cssText = `position:absolute;width:${CANVAS_SZ}px;height:${CANVAS_SZ}px;transform-origin:0 0;`;
    vp.appendChild(canvas);
    this._canvas = canvas;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', CANVAS_SZ);
    svg.setAttribute('height', CANVAS_SZ);
    svg.style.cssText = `position:absolute;top:0;left:0;width:${CANVAS_SZ}px;height:${CANVAS_SZ}px;pointer-events:none;`;
    canvas.appendChild(svg);
    this._svg = svg;

    // Click on empty area — hide info panel only
    vp.addEventListener('click', e => {
      if (e.target === vp || e.target === canvas || e.target === svg) this._hideInfo();
    });

    // Info panel (floating near clicked node)
    const info = document.createElement('div');
    info.style.cssText = 'position:absolute;top:0;left:0;width:210px;background:#080812;border:1px solid #2a2a40;border-radius:5px;padding:14px;font-size:12px;color:#aaa;display:none;z-index:2;pointer-events:auto;box-shadow:0 4px 20px rgba(0,0,0,0.8);';
    el.appendChild(info);
    this._infoPanel = info;

    document.body.appendChild(el);
    this._overlay = el;

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._overlay.style.display !== 'none') this.close();
    });
  }

  // ── SVG edges ─────────────────────────────────────────────────────────────
  _buildEdges() {
    for (const [id, cls] of CLASS_MAP) {
      if (!cls || cls.depth < 1 || cls.depth > MAX_DEPTH) continue;
      const p = POS.get(cls.parent);
      const c = POS.get(id);
      if (!p || !c) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p.x.toFixed(1));
      line.setAttribute('y1', p.y.toFixed(1));
      line.setAttribute('x2', c.x.toFixed(1));
      line.setAttribute('y2', c.y.toFixed(1));
      line.setAttribute('stroke', '#16161f');
      line.setAttribute('stroke-width', '1.5');
      this._svg.appendChild(line);
      this._edgeMap.set(id, line);
    }
  }

  // ── Node divs ─────────────────────────────────────────────────────────────
  _buildNodes() {
    for (const [id] of CLASS_MAP) {
      const pos = POS.get(id);
      if (!pos) continue;
      const div = document.createElement('div');
      div.dataset.id = id;
      div.style.cssText = `position:absolute;left:${(pos.x - NODE_R).toFixed(1)}px;top:${(pos.y - NODE_R).toFixed(1)}px;width:${NODE_R * 2}px;height:${NODE_R * 2}px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-sizing:border-box;transition:transform 0.1s;`;
      div.addEventListener('click', e => { e.stopPropagation(); this._onNodeClick(id); });
      div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.4)'; });
      div.addEventListener('mouseleave', () => { div.style.transform = ''; });
      this._canvas.appendChild(div);
      this._nodeEls.set(id, div);
    }
  }

  _onNodeClick(id) {
    this._showInfo(id);
    this._positionInfo(id);
  }

  _positionInfo(id) {
    const pos = POS.get(id);
    if (!pos) return;
    // Convert canvas coords to screen coords
    let px = this._tx + pos.x * this._scale;
    let py = this._ty + (pos.y + NODE_R) * this._scale + 10; // below node
    // Clamp so panel stays within viewport
    const pw = 210 + 28, ph = 260; // panel width + padding, estimated height
    px = Math.max(8, Math.min(px - pw / 2, window.innerWidth  - pw - 8));
    py = Math.max(8, Math.min(py,          window.innerHeight - ph - 8));
    this._infoPanel.style.left = px + 'px';
    this._infoPanel.style.top  = py + 'px';
  }

  // ── Info panel ────────────────────────────────────────────────────────────
  _showInfo(id) {
    const cls    = CLASS_MAP.get(id);
    if (!cls) return;
    const isCur   = id === this.state.currentClass;
    const anc     = new Set(getAncestors(this.state.currentClass));
    const isDisc  = this.state.discoveredClasses.has(id) || isCur || anc.has(id);
    const color   = BRANCH_COLORS[cls.branch] ?? '#888';
    const cost    = DEPTH_GOLD_COST[cls.depth] ?? 0;
    const lvl     = DEPTH_LEVEL_REQ[cls.depth] ?? 0;
    const isAvail = cls.parent === this.state.currentClass
      && !this.state.unlockedClasses.has(id)
      && this.state.level >= lvl
      && this.state.gold >= cost;
    const isLocked = !isCur && !isAvail && !this.state.unlockedClasses.has(id);

    const BNAMES = {
      atk:'⚔️ Урон', hp:'❤️ HP', def:'🛡️ Защита', spd:'⚡ Скорость',
      crit:'🎯 Крит шанс', critDmg:'💥 Крит урон', xpMult:'📚 Опыт',
      goldMult:'💰 Золото', dodge:'🌀 Уворот', lifesteal:'🩸 Вампиризм',
      thorns:'🌵 Шипы', magicShield:'🔮 Маг. щит',
      pierce:'🏹 Пробитие', deathblow:'💀 Смерт. удар',
    };

    let bonusHtml = '';
    if (isDisc) {
      bonusHtml = Object.entries(cls.bonuses || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `<div style="display:flex;justify-content:space-between;margin:2px 0">
          <span style="color:#666">${BNAMES[k] ?? k}</span>
          <span style="color:#88cc66">+${Math.round(v * 100)}%</span></div>`)
        .join('');
    }

    let footer = '';
    if (isCur) {
      footer = `<div style="margin-top:10px;text-align:center;color:#666;font-size:11px">▶ Текущий класс</div>`;
    } else if (isAvail) {
      footer = `<button id="gip-switch" style="margin-top:10px;width:100%;padding:5px;background:#0f2a0f;border:1px solid #2a5a2a;color:#77cc77;cursor:pointer;border-radius:3px;font-size:11px">
        Сменить класс (−${this._fmt(cost)}g)</button>`;
    } else if (isDisc && isLocked) {
      const needLvl  = this.state.level < lvl  ? `Ур. ${lvl}` : '';
      const needGold = this.state.gold < cost  ? `${this._fmt(cost)}g` : '';
      const needs = [needLvl, needGold].filter(Boolean).join(', ');
      footer = `<div style="margin-top:10px;text-align:center;color:#555;font-size:11px">🔒 Нужно: ${needs}</div>`;
    } else if (!isDisc) {
      footer = `<div style="margin-top:10px;text-align:center;color:#333;font-size:11px">⊡ Неизвестный класс</div>`;
    }

    this._infoPanel.innerHTML = `
      <div style="font-weight:bold;color:${isDisc ? color : '#333'};font-size:13px;margin-bottom:4px">${isDisc ? cls.name : '???'}</div>
      <div style="color:#444;font-size:10px;margin-bottom:${bonusHtml ? 8 : 0}px;line-height:1.4">${isDisc ? cls.desc : 'Откройте, чтобы узнать'}</div>
      ${bonusHtml ? `<div style="border-top:1px solid #1a1a28;padding-top:6px">${bonusHtml}</div>` : ''}
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
  _refreshNodes() {
    if (this._overlay.style.display === 'none') return;
    const cur = this.state.currentClass;
    const anc = new Set(getAncestors(cur));

    for (const [id, div] of this._nodeEls) {
      const cls = CLASS_MAP.get(id);
      if (cls) this._styleNode(div, id, cls, cur, anc);
    }

    for (const [id, line] of this._edgeMap) {
      const onPath = id === cur || anc.has(id);
      line.setAttribute('stroke', onPath ? '#2a3050' : '#16161f');
      line.setAttribute('stroke-width', onPath ? '2.5' : '1.5');
    }
  }

  _styleNode(div, id, cls, cur, anc) {
    const isCur   = id === cur;
    const isAnc   = anc.has(id) && !isCur;
    const isDisc  = this.state.discoveredClasses.has(id) || isCur || isAnc; // ancestors always revealed
    const cost    = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvl     = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    const isAvail = cls.parent === cur
      && !this.state.unlockedClasses.has(id)
      && this.state.level >= lvl
      && this.state.gold >= cost;
    const color   = BRANCH_COLORS[cls.branch] ?? '#888';
    const s       = div.style;

    div.title = isDisc ? `${cls.name}\n${cls.desc}` : '???\nОткройте, чтобы узнать';

    if (isCur) {
      s.background = color;
      s.border     = '3px solid #fff';
      s.boxShadow  = `0 0 10px ${color},0 0 22px ${color}44`;
      s.color      = '#fff';
      div.textContent = '★';
    } else if (isAnc) {
      s.background = color + '44';
      s.border     = `2px solid ${color}aa`;
      s.boxShadow  = '';
      s.color      = '#bbb';
      div.textContent = '✓';
    } else if (isDisc) {
      s.background = '#0b0b16';
      s.border     = `1px solid ${color}44`;
      s.boxShadow  = '';
      s.color      = color + '77';
      div.textContent = '';
    } else if (isAvail) {
      s.background = '#080812';
      s.border     = `1.5px dashed ${color}66`;
      s.boxShadow  = '';
      s.color      = '#555';
      div.textContent = '?';
    } else {
      s.background = '#050510';
      s.border     = '1px solid #181826';
      s.boxShadow  = '';
      s.color      = '#1e1e30';
      div.textContent = '';
    }
  }

  // ── Pan / zoom ─────────────────────────────────────────────────────────────
  _bindPanZoom() {
    const vp = this._viewport;

    vp.addEventListener('mousedown', e => {
      if (e.target.dataset?.id) return;
      this._dragging = true;
      vp.style.cursor = 'grabbing';
      this._drag0 = { x: e.clientX, y: e.clientY, tx: this._tx, ty: this._ty };
    });

    this._onMove = e => {
      if (!this._dragging) return;
      this._tx = this._drag0.tx + e.clientX - this._drag0.x;
      this._ty = this._drag0.ty + e.clientY - this._drag0.y;
      this._applyTx();
    };
    this._onUp = () => { this._dragging = false; vp.style.cursor = 'grab'; };
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('mouseup',   this._onUp);

    vp.addEventListener('wheel', e => {
      e.preventDefault();
      const rect  = vp.getBoundingClientRect();
      const mx    = e.clientX - rect.left;
      const my    = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.12 : 0.89;
      const ns    = Math.max(0.12, Math.min(4, this._scale * delta));
      this._tx    = mx - (mx - this._tx) * (ns / this._scale);
      this._ty    = my - (my - this._ty) * (ns / this._scale);
      this._scale = ns;
      this._applyTx();
    }, { passive: false });
  }

  _applyTx() {
    this._canvas.style.transform = `translate(${this._tx}px,${this._ty}px) scale(${this._scale})`;
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  open() {
    this._overlay.style.display = 'block';
    const vw = window.innerWidth, vh = window.innerHeight;
    this._scale = Math.min(0.38, (vw * 0.88) / CANVAS_SZ, (vh * 0.88) / CANVAS_SZ);
    this._tx    = Math.round(vw / 2 - CX * this._scale);
    this._ty    = Math.round(vh / 2 - CY * this._scale);
    this._applyTx();
    this._refreshNodes();
  }

  close() {
    this._overlay.style.display = 'none';
    this._hideInfo();
  }

  // ── Panel button ──────────────────────────────────────────────────────────
  _addPanelButton() {
    const scroll = document.getElementById('class-tree-scroll');
    if (!scroll) return;
    const btn = document.createElement('button');
    btn.id = 'open-class-graph-btn';
    btn.textContent = '🌐 Радиальный граф';
    btn.style.cssText = 'display:block;width:calc(100% - 8px);margin:0 4px 6px;padding:5px 4px;background:#0b180b;border:1px solid #1a361a;color:#5a9a5a;cursor:pointer;border-radius:3px;font-size:11px;';
    btn.addEventListener('click', () => this.open());
    scroll.before(btn);
  }
}
