/**
 * Battle Strip — горизонтальная полоса между HUD и ареной.
 * Показывает: [Игрок HP] ── VS ── [Мобы] [Волна]
 * Обновляется через callbacks CombatSystem.
 */
import { CLASS_MAP, BRANCH_COLORS } from '../data/classes.js';
import { FLAG_ICONS } from '../data/mobs.js';

const FLAG_DESC = {
  shield:  'Щит — поглощает урон перед HP',
  regen:   'Регенерация — +2% HP каждые 0.4с',
  armored: 'Броня — DEF×1.5; крит пробивает насквозь',
  swift:   'Стремительный — скорость×2, HP×0.5',
};

export class BattleStrip {
  constructor(state, combat) {
    this.state   = state;
    this.combat  = combat;

    this._currentMobs = []; // { name, maxHp, hp, isBoss }
    this._killCount   = 0;
    this._totalMobs   = 0;
    // Кешируем maxHp — обновляем только при реальном изменении статов
    this._cachedMaxHp = state.getStats().maxHp;

    this._render();

    this._unsubs = [
      state.on('player:hpChanged',    () => this._updatePlayerHP()),
      state.on('player:classChanged', () => this._updatePlayer()),
      state.on('player:levelUp',      () => this._updatePlayer()),
      state.on('player:statsChanged', () => { this._cachedMaxHp = state.getStats().maxHp; this._updatePlayer(); }),
      state.on('combat:waveStarted',  () => this._updateWave()),
      state.on('player:respawn',      () => this._updatePlayerHP()),
    ];
  }

  destroy() {
    this._unsubs.forEach(u => u());
  }

  // ── Callbacks от CombatSystem ────────────────────────────────────────────────

  onWaveSpawn({ wave, mobs }) {
    this._currentMobs = mobs.map(m => ({
      id:       m.id,
      name:     m.data.name,
      maxHp:    m.data.maxHp,
      hp:       m.hp,
      isBoss:   m.data.isBoss,
      isElite:  m.data.isElite ?? false,
      flags:    m.data.flags ?? [],
      shield:   m.shield ?? 0,
      shieldMax: m.data.shieldHp ?? 0,
      icon:     m.data.icon ?? '❓',
      atk:      m.data.atk,
    }));
    this._killCount = 0;
    this._totalMobs = mobs.length;
    this._renderEnemies();
    this._updateWave();
  }

  onMobDeath({ mob }) {
    const entry = this._currentMobs.find(m => m.id === mob.id);
    if (entry) entry.hp = 0;
    this._killCount++;
    this._renderEnemies();
    this._updateProgress();
  }

  onPlayerAttack({ mob }) {
    const entry = this._currentMobs.find(m => m.id === mob.id);
    if (!entry) return;
    entry.hp     = mob.hp;
    entry.shield = mob.shield ?? 0;
    this._updateGroupHpFill(entry.name);
  }

  onPlayerHit() {
    this._updatePlayerHP();
    this._flashPlayer();
  }

  onPlayerDeath({ deathsOnWave = 0, maxDeaths = 3 } = {}) {
    const strip = document.getElementById('bs-player-hp-fill');
    if (strip) { strip.style.width = '0%'; strip.style.background = '#880000'; }
    const name = document.getElementById('bs-player-name');
    if (name) name.style.color = '#ff4444';
    const status = document.getElementById('bs-player-status');
    if (status) {
      const remaining = maxDeaths - deathsOnWave;
      const warning = remaining > 0
        ? ` (−${remaining} до отката)`
        : ' ⬇️ откат!';
      status.textContent = `💀 ПОГИБ${warning}`;
      status.style.color = remaining > 0 ? '#ff8844' : '#ff4444';
    }
  }

  onWaveRollback({ wave }) {
    const badge = document.getElementById('bs-wave-badge');
    if (badge) {
      badge.textContent = `⬇️ Откат → Волна ${wave}`;
      badge.style.background = 'rgba(180,60,180,0.35)';
      badge.style.borderColor = '#aa44aa';
      // Вернём нормальный вид через 2с
      setTimeout(() => this._updateWave(), 2000);
    }
  }

  onRespawn() {
    const name = document.getElementById('bs-player-name');
    if (name) name.style.color = '';
    const status = document.getElementById('bs-player-status');
    if (status) { status.textContent = ''; }
    this._updatePlayerHP();
  }

  // ── Рендер ───────────────────────────────────────────────────────────────────

  _render() {
    const strip = document.getElementById('battle-strip');
    if (!strip) return;

    strip.innerHTML = `
      <!-- ИГРОК -->
      <div class="bs-player-block">
        <div class="bs-player-header">
          <div class="bs-class-dot" id="bs-class-dot"></div>
          <span class="bs-player-name" id="bs-player-name">Новичок</span>
          <span class="bs-level" id="bs-player-level">Ур.1</span>
          <span class="bs-player-status" id="bs-player-status"></span>
        </div>
        <div class="bs-hp-wrap">
          <div class="bs-hp-bar" id="bs-player-hp-bar">
            <div class="bs-hp-fill" id="bs-player-hp-fill"></div>
          </div>
          <span class="bs-hp-text" id="bs-player-hp-text">100 / 100</span>
        </div>
      </div>

      <!-- VS + ПРОГРЕСС -->
      <div class="bs-vs-block">
        <div class="bs-vs-text">⚔️</div>
        <div class="bs-progress" id="bs-progress">0/0</div>
        <div class="bs-wave-badge" id="bs-wave-badge">Волна 1</div>
      </div>

      <!-- ВРАГИ -->
      <div class="bs-enemies-block" id="bs-enemies-block">
        <div class="bs-enemies-list" id="bs-enemies-list">
          <span class="bs-waiting">Ожидание...</span>
        </div>
      </div>
    `;

    this._updatePlayer();
    this._updateWave();
    this._initTooltip();
  }

  _initTooltip() {
    let tt = document.getElementById('bs-mob-tooltip');
    if (!tt) {
      tt = document.createElement('div');
      tt.id = 'bs-mob-tooltip';
      tt.className = 'bs-mob-tooltip';
      document.body.appendChild(tt);
    }
    this._tooltip = tt;

    const block = document.getElementById('bs-enemies-block');
    if (!block) return;

    block.addEventListener('mousemove', (e) => {
      const chip = e.target.closest('[data-name]');
      if (!chip) { tt.style.display = 'none'; return; }
      const g = this._renderedGroups?.get(chip.dataset.name);
      if (!g) return;
      this._showTooltip(tt, chip, g);
    });
    block.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
  }

  _showTooltip(tt, chip, g) {
    const rect = chip.getBoundingClientRect();
    const hpPct = g.maxHp > 0 ? Math.round((g.hp / g.maxHp) * 100) : 0;
    const hpColor = hpPct > 50 ? '#55dd55' : hpPct > 25 ? '#ffaa00' : '#ff4444';

    let html = `<div class="bstt-name">${g.icon} ${g.isBoss ? '👑 ' : ''}${chip.dataset.name}${g.count > 1 ? ' ×' + g.count : ''}</div>`;
    html += `<div class="bstt-row">❤️ HP: <span style="color:${hpColor}">${this._fmt(g.hp)}</span> / ${this._fmt(g.maxHp)}</div>`;
    if (g.shieldMax > 0) {
      html += `<div class="bstt-row">🛡 Щит: <span style="color:#88aaff">${this._fmt(g.shield)}</span> / ${this._fmt(g.shieldMax)}</div>`;
    }
    html += `<div class="bstt-row">⚔️ Атака: ${this._fmt(g.atk)}</div>`;
    if (g.flags.length > 0) {
      html += '<div class="bstt-flags">' +
        g.flags.map(f => `<div class="bstt-flag">${FLAG_ICONS[f]} ${FLAG_DESC[f] ?? f}</div>`).join('') +
        '</div>';
    }

    tt.innerHTML = html;
    tt.style.display = 'block';

    // Позиционируем под чипом, но не уходим за экран
    const ttW  = 210;
    const left = Math.min(rect.left, window.innerWidth - ttW - 8);
    tt.style.left = left + 'px';
    tt.style.top  = (rect.bottom + 6) + 'px';
  }

  _updatePlayer() {
    const clsId = this.state.currentClass;
    const cls   = CLASS_MAP.get(clsId);
    const color = BRANCH_COLORS[cls?.branch] ?? '#aaa';

    const dot  = document.getElementById('bs-class-dot');
    const name = document.getElementById('bs-player-name');
    const lvl  = document.getElementById('bs-player-level');

    if (dot)  dot.style.background = color;
    if (name) name.textContent = cls?.name ?? 'Новичок';
    if (lvl)  lvl.textContent  = `Ур.${this.state.level}`;

    this._updatePlayerHP();
  }

  _updatePlayerHP() {
    const cur   = this.state.currentHp;
    const max   = this._cachedMaxHp;
    const pct   = Math.max(0, Math.min(100, (cur / max) * 100));
    const color = pct > 50 ? '#44dd44' : pct > 25 ? '#ffaa00' : '#dd3333';

    const fill = document.getElementById('bs-player-hp-fill');
    const text = document.getElementById('bs-player-hp-text');

    if (fill) { fill.style.width = pct + '%'; fill.style.background = color; }
    if (text) text.textContent = `${this._fmt(cur)} / ${this._fmt(max)}`;
  }

  _updateWave() {
    const badge = document.getElementById('bs-wave-badge');
    if (!badge) return;
    const wave   = this.state.currentWave;
    const isBoss = wave % 10 === 0;
    badge.textContent = isBoss ? `⚠️ Волна ${wave} БОСС` : `Волна ${wave}`;
    badge.style.background = isBoss ? 'rgba(200,80,0,0.3)' : 'rgba(255,255,255,0.06)';
    badge.style.borderColor = isBoss ? '#cc4400' : 'rgba(255,255,255,0.1)';
  }

  _updateProgress() {
    const el = document.getElementById('bs-progress');
    if (el) el.textContent = `${this._killCount}/${this._totalMobs}`;
  }

  /** Преобразует имя моба в стабильный CSS-id */
  _slug(name) {
    return 'bs-fill-' + name.replace(/[^a-zA-Zа-яёА-ЯЁ0-9]/g, '_');
  }

  /** Полная перестройка списка врагов (только при смерти моба или новой волне) */
  _renderEnemies() {
    const list = document.getElementById('bs-enemies-list');
    if (!list) return;

    const alive = this._currentMobs.filter(m => m.hp > 0);
    if (alive.length === 0) {
      list.innerHTML = '<span class="bs-waiting" style="color:#4a4">✓ Победа!</span>';
      return;
    }

    const groups = new Map();
    for (const m of alive) {
      if (!groups.has(m.name)) {
        groups.set(m.name, { count: 0, hp: 0, maxHp: 0, shield: 0, shieldMax: 0,
                             isBoss: m.isBoss, isElite: m.isElite, flags: m.flags,
                             icon: m.icon, atk: m.atk });
      }
      const g = groups.get(m.name);
      g.count++;
      g.hp       += m.hp;
      g.maxHp    += m.maxHp;
      g.shield   += m.shield;
      g.shieldMax += m.shieldMax;
    }

    this._renderedGroups = groups;

    list.innerHTML = [...groups.entries()].map(([name, g]) => {
      const pct      = Math.max(0, (g.hp / g.maxHp) * 100);
      const color    = g.isBoss ? '#ff6644' : g.isElite ? '#ffcc00' : '#dd4444';
      const cntLabel = g.count > 1 ? ` ×${g.count}` : '';
      const fillId   = this._slug(name);
      const flagStr  = g.flags.map(f => FLAG_ICONS[f] ?? '').join('');
      const shieldBar = g.shieldMax > 0
        ? `<div class="bs-enemy-hp-bar" style="margin-top:1px">
             <div class="bs-enemy-hp-fill" id="${fillId}_sh"
               style="width:${Math.max(0,(g.shield/g.shieldMax)*100)}%;background:#6699ff;transition:width 0.2s"></div>
           </div>`
        : '';
      const bossPrefix = g.isBoss ? '👑 ' : '';
      const chipClass  = g.isBoss ? 'bs-boss-chip' : g.isElite ? 'bs-elite-chip' : '';
      return `
        <div class="bs-enemy-chip ${chipClass}" data-name="${name}">
          <span class="bs-enemy-name">${g.icon} ${bossPrefix}${name}${cntLabel}${flagStr ? ` <span class="bs-flags">${flagStr}</span>` : ''}</span>
          <div class="bs-enemy-hp-bar">
            <div class="bs-enemy-hp-fill" id="${fillId}" style="width:${pct}%;background:${color}"></div>
          </div>
          ${shieldBar}
        </div>`;
    }).join('');
  }

  /** Обновляет только HP/shield-fill одной группы мобов без пересборки всего списка */
  _updateGroupHpFill(name) {
    const group    = this._currentMobs.filter(m => m.name === name);
    const hp       = group.reduce((s, m) => s + Math.max(0, m.hp), 0);
    const maxHp    = group.reduce((s, m) => s + m.maxHp, 0);
    const shield   = group.reduce((s, m) => s + Math.max(0, m.shield), 0);
    const shieldMax = group.reduce((s, m) => s + m.shieldMax, 0);
    const slug     = this._slug(name);
    const fill     = document.getElementById(slug);
    if (fill) fill.style.width = (maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0) + '%';
    const shFill   = document.getElementById(slug + '_sh');
    if (shFill) shFill.style.width = (shieldMax > 0 ? Math.max(0, (shield / shieldMax) * 100) : 0) + '%';
  }

  _flashPlayer() {
    const block = document.querySelector('.bs-player-block');
    if (!block) return;
    block.style.outline = '1px solid #ff4444';
    setTimeout(() => { block.style.outline = ''; }, 150);
  }

  _fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
}
