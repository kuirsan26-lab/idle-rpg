/**
 * Battle Strip — горизонтальная полоса между HUD и ареной.
 * Показывает: [Игрок HP] ── VS ── [Мобы] [Волна]
 * Обновляется через callbacks CombatSystem.
 */
import { CLASS_MAP, BRANCH_COLORS } from '../data/classes.js';

export class BattleStrip {
  constructor(state, combat) {
    this.state   = state;
    this.combat  = combat;

    this._currentMobs = []; // { name, maxHp, hp, isBoss }
    this._killCount   = 0;
    this._totalMobs   = 0;

    this._render();

    state.on('hpChanged',    () => this._updatePlayerHP());
    state.on('classChanged', () => this._updatePlayer());
    state.on('statsChanged', () => this._updatePlayer());
    state.on('waveStarted',  () => this._updateWave());
    state.on('respawn',      () => this._updatePlayerHP());
  }

  // ── Callbacks от CombatSystem ────────────────────────────────────────────────

  onWaveSpawn({ wave, mobs }) {
    this._currentMobs = mobs.map(m => ({
      id:    m.id,
      name:  m.data.name,
      maxHp: m.data.maxHp,
      hp:    m.hp,
      isBoss: m.data.isBoss,
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
    // Обновляем HP моба в нашем списке
    const entry = this._currentMobs.find(m => m.id === mob.id);
    if (entry) entry.hp = mob.hp;
    this._renderEnemies();
  }

  onPlayerHit() {
    this._updatePlayerHP();
    this._flashPlayer();
  }

  onPlayerDeath() {
    const strip = document.getElementById('bs-player-hp-fill');
    if (strip) { strip.style.width = '0%'; strip.style.background = '#880000'; }
    const name = document.getElementById('bs-player-name');
    if (name) name.style.color = '#ff4444';
    const status = document.getElementById('bs-player-status');
    if (status) { status.textContent = '💀 ПОГИБ'; status.style.color = '#ff4444'; }
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
    const stats  = this.state.getStats();
    const cur    = this.state.currentHp;
    const max    = stats.maxHp;
    const pct    = Math.max(0, Math.min(100, (cur / max) * 100));
    const color  = pct > 50 ? '#44dd44' : pct > 25 ? '#ffaa00' : '#dd3333';

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

  _renderEnemies() {
    const list = document.getElementById('bs-enemies-list');
    if (!list) return;

    const alive = this._currentMobs.filter(m => m.hp > 0);
    if (alive.length === 0) {
      list.innerHTML = '<span class="bs-waiting" style="color:#4a4">✓ Победа!</span>';
      return;
    }

    // Группируем одинаковых мобов
    const groups = new Map();
    for (const m of alive) {
      if (!groups.has(m.name)) groups.set(m.name, { count: 0, hp: 0, maxHp: 0, isBoss: m.isBoss });
      const g = groups.get(m.name);
      g.count++;
      g.hp    += m.hp;
      g.maxHp += m.maxHp;
    }

    list.innerHTML = [...groups.entries()].map(([name, g]) => {
      const pct   = Math.max(0, (g.hp / g.maxHp) * 100);
      const color = g.isBoss ? '#ff6644' : '#dd4444';
      const cntLabel = g.count > 1 ? ` ×${g.count}` : '';
      return `
        <div class="bs-enemy-chip ${g.isBoss ? 'bs-boss-chip' : ''}">
          <span class="bs-enemy-name">${g.isBoss ? '👑 ' : ''}${name}${cntLabel}</span>
          <div class="bs-enemy-hp-bar">
            <div class="bs-enemy-hp-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>`;
    }).join('');
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
