/**
 * Игровой цикл боя
 * Отвечает за: тики атаки, очередь мобов, волны, респолн
 */
import { createMobData, getMobCount } from '../data/mobs.js';

const TICK_MS            = 200;   // базовый тик логики
const RESPAWN_MS         = 3000;  // время до воскрешения
const WAVE_PAUSE_MS      = 1500;  // пауза между волнами
const MAX_DEATHS_PER_WAVE = 3;    // смертей до отката на предыдущую волну

export class CombatSystem {
  /** @param {import('./GameState.js').GameState} state */
  constructor(state) {
    this.state = state;

    this.mobs         = [];          // активные мобы: { id, data, hp, x, y }
    this.nextMobId    = 0;
    this.attackCooldown = 0;         // ms до следующей атаки игрока
    this.respawnTimer   = 0;
    this.waveTimer      = 0;
    this.waveState      = 'fighting';// 'fighting' | 'paused' | 'spawning'
    this.deathsOnWave   = 0;        // счётчик смертей на текущей волне

    this._mobCallbacks = [];         // {onSpawn, onDeath, onDamage, onPlayerAttack, onPlayerHit}
    this._lastTick     = performance.now();

    this._timerId = null;
  }

  start() {
    this._spawnWave();
    this._timerId = setInterval(() => this._tick(), TICK_MS);
  }

  stop() {
    if (this._timerId !== null) clearInterval(this._timerId);
  }

  /** Зарегистрировать callbacks (обычно из GameScene) */
  register(callbacks) {
    this._mobCallbacks.push(callbacks);
  }

  // ── Тик логики ──────────────────────────────────────────────────────────────
  _tick() {
    const now  = performance.now();
    const dt   = Math.min(now - this._lastTick, 500); // не более 500 ms за шаг
    this._lastTick = now;

    this.state.playTime += dt / 1000;

    if (!this.state.isAlive) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= RESPAWN_MS) {
        this.respawnTimer = 0;
        this.state.respawn();
        this._emit('onRespawn', {});
        this.waveState = 'fighting';

        // Откат на предыдущую волну при слишком частых смертях
        if (this.deathsOnWave >= MAX_DEATHS_PER_WAVE && this.state.currentWave > 1) {
          this.state.currentWave--;
          this.deathsOnWave = 0;
          this._emit('onWaveRollback', { wave: this.state.currentWave });
          this.state.emit('waveRollback', { wave: this.state.currentWave });
        }

        this._spawnWave();
      }
      return;
    }

    if (this.waveState === 'paused') {
      this.waveTimer += dt;
      if (this.waveTimer >= WAVE_PAUSE_MS) {
        this.waveTimer = 0;
        this.waveState = 'fighting';
        this._spawnWave();
      }
      return;
    }

    this.attackCooldown -= dt;

    // Волна считается пройденной только если игрок ЖИВОЙ и мобы закончились
    if (this.mobs.length === 0 && this.waveState === 'fighting') {
      this.deathsOnWave = 0; // волна пройдена — сбрасываем счётчик смертей
      this.waveState = 'paused';
      this.state.currentWave++;
      this.state.emit('waveCleared', { wave: this.state.currentWave - 1 });
      return;
    }

    // Атака игрока
    if (this.attackCooldown <= 0 && this.mobs.length > 0) {
      const stats = this.state.getStats();
      // Интервал атаки в ms
      const attackInterval = Math.round(1000 / Math.max(0.1, stats.spd));
      this.attackCooldown = attackInterval;

      // Бьём ближайшего моба (первый в массиве)
      const target = this.mobs[0];
      const isCrit = Math.random() * 100 < stats.crit;
      let dmg = Math.max(1, stats.atk - Math.round(target.data.def * 0.5));
      if (isCrit) dmg = Math.round(dmg * (stats.critDmg / 100));

      target.hp -= dmg;
      this._emit('onPlayerAttack', { mob: target, damage: dmg, isCrit });

      if (target.hp <= 0) {
        this._killMob(target);
      }
    }

    // Атаки мобов по игроку
    for (const mob of this.mobs) {
      mob.attackCooldown = (mob.attackCooldown ?? 0) - dt;
      if (mob.attackCooldown <= 0) {
        const mobInterval = Math.round(1200 / Math.max(0.5, mob.data.speed / 40));
        mob.attackCooldown = mobInterval;

        // Только ближайший моб бьёт игрока (упрощение)
        if (mob === this.mobs[0]) {
          const stats = this.state.getStats();
          const dmg   = Math.max(1, mob.data.atk - Math.round(stats.def * 0.7));
          const died  = this.state.takeDamage(dmg);
          this._emit('onPlayerHit', { damage: dmg });

          if (died) {
            this.deathsOnWave++;
            this._emit('onPlayerDeath', { deathsOnWave: this.deathsOnWave, maxDeaths: MAX_DEATHS_PER_WAVE });
            this.mobs = [];
            // waveState остаётся 'fighting' — после respawn та же волна (или откат) переспавнится
            return;
          }
        }
      }
    }
  }

  // ── Убийство моба ───────────────────────────────────────────────────────────
  _killMob(mob) {
    const stats = this.state.getStats();
    const xpGained   = this.state.addXp(mob.data.xp);
    const goldGained  = this.state.addGold(mob.data.gold);
    this.state.totalKills++;

    this.mobs = this.mobs.filter(m => m !== mob);
    this._emit('onMobDeath', { mob, xpGained, goldGained });
    this.state.emit('killCountChanged', { kills: this.state.totalKills });
  }

  // ── Спавн волны ─────────────────────────────────────────────────────────────
  _spawnWave() {
    const wave  = this.state.currentWave;
    const count = getMobCount(wave);
    this.mobs   = [];

    for (let i = 0; i < count; i++) {
      const data = createMobData(wave);
      this.mobs.push({
        id:              this.nextMobId++,
        data,
        hp:              data.maxHp,
        attackCooldown:  1000 + Math.random() * 800,
      });
    }

    this._emit('onWaveSpawn', { wave, mobs: this.mobs });
    this.state.emit('waveStarted', { wave, isBoss: wave % 10 === 0 });
  }

  // ── Emit ─────────────────────────────────────────────────────────────────────
  _emit(event, data) {
    for (const cb of this._mobCallbacks) {
      if (typeof cb[event] === 'function') cb[event](data);
    }
  }
}
