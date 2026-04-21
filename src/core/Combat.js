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
    this._accumulated  = 0;

    this._rafId = null;

    // При престиже — сбросить текущих мобов и начать с новой волны
    state.on('player:prestige', () => {
      this.mobs          = [];
      this.attackCooldown = 0;
      this.deathsOnWave   = 0;
      this.waveState      = 'fighting';
      this.state.isAlive  = true;
      this.state.currentHp = this.state.getStats().maxHp;
      this._emit('onRespawn', {});
      this._spawnWave();
    });
  }

  start() {
    this._spawnWave();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  stop() {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
  }

  _loop() {
    this._rafId = requestAnimationFrame(this._loop.bind(this));

    const now     = performance.now();
    // Panic cap: не более 10 сек за раз (защита от фоновых вкладок)
    const elapsed = Math.min(now - this._lastTick, 10_000);
    this._lastTick     = now;
    this._accumulated += elapsed;

    this.state.playTime += elapsed / 1000;

    while (this._accumulated >= TICK_MS) {
      this._accumulated -= TICK_MS;
      this._tick();
    }
  }

  /** Зарегистрировать callbacks (обычно из GameScene) */
  register(callbacks) {
    this._mobCallbacks.push(callbacks);
  }

  // ── Тик логики (фиксированный шаг TICK_MS) ──────────────────────────────────
  _tick() {
    const dt = TICK_MS;

    if (!this.state.isAlive) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= RESPAWN_MS) {
        this.respawnTimer = 0;
        this.state.respawn();
        this._emit('onRespawn', {});
        this.waveState = 'fighting';

        // Откат на предыдущую волну: сразу при смерти на боссе ИЛИ после MAX_DEATHS_PER_WAVE смертей
        const isBossWave = this.state.currentWave % 10 === 0;
        const shouldRollback = (isBossWave || this.deathsOnWave >= MAX_DEATHS_PER_WAVE) && this.state.currentWave > 1;
        if (shouldRollback) {
          this.state.currentWave--;
          this.deathsOnWave = 0;
          this._emit('onWaveRollback', { wave: this.state.currentWave });
          this.state.emit('combat:waveRollback', { wave: this.state.currentWave });
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
      this.deathsOnWave = 0;
      this.waveState = 'paused';
      this.state.currentWave++;
      // Полное лечение между волнами
      this.state.currentHp = this.state.getStats().maxHp;
      this.state.emit('player:hpChanged', { hp: this.state.currentHp });
      this.state.emit('combat:waveCleared', { wave: this.state.currentWave - 1 });
      return;
    }

    // Атака игрока
    if (this.attackCooldown <= 0 && this.mobs.length > 0) {
      const stats = this.state.getStats();
      const attackInterval = Math.round(1000 / Math.max(0.1, stats.spd));
      this.attackCooldown = attackInterval;

      const target = this.mobs[0];
      const isCrit = Math.random() * 100 < stats.crit;
      let dmg = Math.max(1, stats.atk - Math.round(target.data.def * 0.5));
      if (isCrit) dmg = Math.round(dmg * (stats.critDmg / 100));

      target.hp -= dmg;
      this._emit('onPlayerAttack', { mob: target, damage: dmg, isCrit });

      // Lifesteal: восстанавливаем HP пропорционально урону
      if (stats.lifesteal > 0) {
        const heal = Math.round(dmg * stats.lifesteal / 100);
        if (heal > 0) {
          this.state.currentHp = Math.min(this.state.getStats().maxHp, this.state.currentHp + heal);
          this.state.emit('player:hpChanged', { hp: this.state.currentHp });
        }
      }

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

        if (mob === this.mobs[0]) {
          const stats = this.state.getStats();
          const dmg   = Math.max(1, mob.data.atk - Math.round(stats.def * 0.7));

          // Dodge: шанс полностью уклониться от удара
          const dodged = stats.dodge > 0 && Math.random() * 100 < stats.dodge;
          if (dodged) {
            this._emit('onPlayerHit', { damage: 0, dodged: true });
            continue;
          }

          const died = this.state.takeDamage(dmg);
          this._emit('onPlayerHit', { damage: dmg, dodged: false });

          // Thorns: отражаем часть урона обратно мобу
          if (stats.thorns > 0) {
            const reflect = Math.round(dmg * stats.thorns / 100);
            if (reflect > 0) {
              mob.hp -= reflect;
              if (mob.hp <= 0) {
                this._killMob(mob);
                if (died) {
                  this.deathsOnWave++;
                  this._emit('onPlayerDeath', { deathsOnWave: this.deathsOnWave, maxDeaths: MAX_DEATHS_PER_WAVE });
                  this.mobs = [];
                  return;
                }
                break;
              }
            }
          }

          if (died) {
            this.deathsOnWave++;
            this._emit('onPlayerDeath', { deathsOnWave: this.deathsOnWave, maxDeaths: MAX_DEATHS_PER_WAVE });
            this.mobs = [];
            return;
          }
        }
      }
    }
  }

  // ── Убийство моба ───────────────────────────────────────────────────────────
  _killMob(mob) {
    const xpGained   = this.state.addXp(mob.data.xp);
    const goldGained = this.state.addGold(mob.data.gold);
    this.state.totalKills++;

    const itemDrop = this.state.rollItemDrop(this.state.currentWave, mob.data.isBoss);

    this.mobs = this.mobs.filter(m => m !== mob);
    this._emit('onMobDeath', { mob, xpGained, goldGained, itemDrop });
    this.state.emit('combat:killCountChanged', { kills: this.state.totalKills });
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
    this.state.emit('combat:waveStarted', { wave, isBoss: wave % 10 === 0 });
  }

  // ── Emit ─────────────────────────────────────────────────────────────────────
  _emit(event, data) {
    for (const cb of this._mobCallbacks) {
      if (typeof cb[event] === 'function') cb[event](data);
    }
  }
}
