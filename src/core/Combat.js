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

    this._mobCallbacks  = [];
    this._lastTick      = performance.now();
    this._accumulated   = 0;
    this._rafId         = null;
    this._pendingPoison = null; // { dmg, ticks } — устанавливается скиллом rogue

    // При престиже — сбросить текущих мобов и начать с новой волны
    state.on('player:prestige', () => {
      this.mobs           = [];
      this.attackCooldown = 0;
      this.deathsOnWave   = 0;
      this.waveState      = 'fighting';
      this._pendingPoison = null;
      this.state.isAlive  = true;
      this.state.currentHp = this.state.getStats().maxHp;
      this._emit('onRespawn', {});
      this._spawnWave();
    });

    // Применить скилл при активации игроком
    state.on('player:skillTriggered', ({ skill }) => this._applySkill(skill));
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

    // DOT: яд и горение (обрабатываем до атак, копируем массив т.к. _killMob меняет this.mobs)
    for (const mob of [...this.mobs]) {
      if (mob.poisonTicks > 0) {
        mob.poisonTicks--;
        mob.hp -= mob.poisonDmg;
        this._emit('onMobDot', { mob, damage: mob.poisonDmg, type: 'poison' });
        if (mob.hp <= 0) { this._killMob(mob); continue; }
      }
      if (mob.burnTicks > 0) {
        mob.burnTicks--;
        mob.hp -= mob.burnDmg;
        this._emit('onMobDot', { mob, damage: mob.burnDmg, type: 'burn' });
        if (mob.hp <= 0) { this._killMob(mob); continue; }
      }
    }

    // Реген флаговых мобов (до всех атак)
    for (const mob of this.mobs) {
      if (mob.data.flags?.includes('regen') && mob.hp > 0 && mob.hp < mob.data.maxHp) {
        mob.regenTimer = (mob.regenTimer ?? 0) + dt;
        if (mob.regenTimer >= 400) {
          mob.regenTimer -= 400;
          const heal = Math.max(1, Math.ceil(mob.data.maxHp * 0.02));
          mob.hp = Math.min(mob.data.maxHp, mob.hp + heal);
          this._emit('onMobRegen', { mob, heal });
        }
      }
    }

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

    // Кешируем stats один раз на тик — getStats() дорогой (обход дерева классов)
    const stats = this.state.getStats();

    // Волна считается пройденной только если игрок ЖИВОЙ и мобы закончились
    if (this.mobs.length === 0 && this.waveState === 'fighting') {
      this.deathsOnWave = 0;
      this.waveState = 'paused';
      const clearedWave = this.state.currentWave;
      this.state.currentWave++;
      // Полное лечение между волнами
      this.state.currentHp = stats.maxHp;
      this.state.emit('player:hpChanged', { hp: this.state.currentHp });
      this.state.emit('combat:waveCleared', { wave: clearedWave });

      // Milestone: каждая волна кратная 10
      if (clearedWave % 10 === 0) {
        const isNewRecord = clearedWave > this.state.maxWaveReached;
        let bonusGold = 0;
        if (isNewRecord) {
          this.state.maxWaveReached = clearedWave;
          bonusGold = this.state.addGold(clearedWave * 50);
        }
        this.state.emit('combat:milestone', { wave: clearedWave, isNewRecord, bonusGold });
      }
      return;
    }

    // Атака игрока
    if (this.attackCooldown <= 0 && this.mobs.length > 0) {
      const attackInterval = Math.round(1000 / Math.max(0.1, stats.spd));
      this.attackCooldown = attackInterval;

      const target = this.mobs[0];

      // Deathblow: мгновенное убийство (не работает на боссах)
      if (stats.deathblow > 0 && !target.data.isBoss && Math.random() * 100 < stats.deathblow) {
        const killingDmg = target.hp;
        target.hp = 0;
        this._emit('onPlayerAttack', { mob: target, damage: killingDmg, isCrit: false, isDeathblow: true });
        this._killMob(target);
        return;
      }

      // Pierce: снижает эффективную защиту моба
      const isCrit = Math.random() * 100 < stats.crit;
      let effectiveDef = stats.pierce > 0
        ? Math.round(target.data.def * (1 - stats.pierce / 100))
        : target.data.def;
      // Armored: крит обнуляет броню целиком (делает pierce+crit ценными против бронированных)
      if (isCrit && target.data.flags?.includes('armored')) effectiveDef = 0;

      let dmg = Math.max(1, stats.atk - Math.round(effectiveDef * 0.5));
      if (isCrit) dmg = Math.round(dmg * (stats.critDmg / 100));

      // Яд от скилла rogue: бонус +80% к текущей атаке + вешаем яд на цель
      if (this._pendingPoison) {
        const p = this._pendingPoison;
        this._pendingPoison = null;
        dmg = Math.round(dmg * 1.8);
        target.poisonTicks = p.ticks;
        target.poisonDmg   = p.dmg;
      }

      // Shield: поглощает урон до HP
      let shieldAbsorbed = 0;
      if (target.shield > 0) {
        shieldAbsorbed = Math.min(target.shield, dmg);
        target.shield -= shieldAbsorbed;
        dmg -= shieldAbsorbed;
        if (target.shield === 0) this._emit('onShieldBreak', { mob: target });
      }

      target.hp -= dmg;
      this._emit('onPlayerAttack', { mob: target, damage: dmg, isCrit, shieldAbsorbed });

      // Lifesteal: восстанавливаем HP пропорционально урону
      if (stats.lifesteal > 0) {
        const heal = Math.round(dmg * stats.lifesteal / 100);
        if (heal > 0) {
          this.state.currentHp = Math.min(stats.maxHp, this.state.currentHp + heal);
          this.state.emit('player:hpChanged', { hp: this.state.currentHp });
        }
      }

      if (target.hp <= 0) {
        this._killMob(target);
      }
    }

    // Атаки мобов по игроку
    for (const mob of this.mobs) {
      // Стан от shield_bash: уменьшаем счётчик, пропускаем атаку
      if (mob.stunTicks > 0) { mob.stunTicks--; continue; }

      mob.attackCooldown = (mob.attackCooldown ?? 0) - dt;
      if (mob.attackCooldown <= 0) {
        const mobInterval = Math.round(1200 / Math.max(0.5, mob.data.speed / 40));
        mob.attackCooldown = mobInterval;

        if (mob === this.mobs[0]) {
          let dmg = Math.max(1, mob.data.atk - Math.round(stats.def * 0.7));

          // Dodge: шанс полностью уклониться от удара
          const dodged = stats.dodge > 0 && Math.random() * 100 < stats.dodge;
          if (dodged) {
            this._emit('onPlayerHit', { damage: 0, dodged: true });
            continue;
          }

          // MagicShield: снижает входящий урон на %
          if (stats.magicShield > 0) {
            dmg = Math.max(1, Math.round(dmg * (1 - stats.magicShield / 100)));
          }

          const died = this.state.takeDamage(dmg);
          this._emit('onPlayerHit', { damage: dmg, dodged: false });

          // Thorns: отражаем часть урона обратно мобу
          if (stats.thorns > 0) {
            const reflect = Math.round(dmg * stats.thorns / 100);
            if (reflect > 0) {
              mob.hp -= reflect;
              this._emit('onThornsReflect', { mob, damage: reflect });
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

  // ── Активные скилы ──────────────────────────────────────────────────────────
  _applySkill(skill) {
    const stats = this.state.getStats();

    switch (skill.id) {
      case 'focus': {
        const healAmt = Math.round(stats.maxHp * 0.25);
        this.state.currentHp = Math.min(stats.maxHp, this.state.currentHp + healAmt);
        this.state.emit('player:hpChanged', { hp: this.state.currentHp });
        this._emit('onSkillUsed', { skill, healAmt });
        break;
      }
      case 'shield_bash': {
        const target = this.mobs[0];
        if (target) {
          target.stunTicks = 5; // 5 тиков × 200ms = 1 сек
          this._emit('onSkillUsed', { skill, target });
        }
        break;
      }
      case 'poison_stab': {
        this._pendingPoison = { dmg: Math.round(stats.atk * 0.15), ticks: 3 };
        this._emit('onSkillUsed', { skill });
        break;
      }
      case 'volley': {
        const dmg = Math.max(1, Math.round(stats.atk * 0.5));
        for (const mob of [...this.mobs]) {
          mob.hp -= dmg;
          this._emit('onPlayerAttack', { mob, damage: dmg, isCrit: false });
          if (mob.hp <= 0) this._killMob(mob);
        }
        break;
      }
      case 'fireball': {
        const fbDmg   = Math.max(1, Math.round(stats.atk * 0.8));
        const burnDmg = Math.max(1, Math.round(stats.atk * 0.1));
        for (const mob of [...this.mobs]) {
          mob.hp -= fbDmg;
          mob.burnTicks = (mob.burnTicks ?? 0) + 3;
          mob.burnDmg   = burnDmg;
          this._emit('onPlayerAttack', { mob, damage: fbDmg, isCrit: false });
          if (mob.hp <= 0) this._killMob(mob);
        }
        break;
      }
    }
  }

  // ── Убийство моба ───────────────────────────────────────────────────────────
  _killMob(mob) {
    const xpGained   = this.state.addXp(mob.data.xp);
    const goldGained = this.state.addGold(mob.data.gold);
    this.state.totalKills++;

    const itemDrop = this.state.rollItemDrop(this.state.currentWave, mob.data.isBoss, mob.data.isElite ?? false);

    this.mobs = this.mobs.filter(m => m !== mob);
    this._emit('onMobDeath', { mob, xpGained, goldGained, itemDrop });
    this.state.emit('combat:killCountChanged', { kills: this.state.totalKills });
  }

  // ── Спавн волны ─────────────────────────────────────────────────────────────
  _spawnWave() {
    const wave        = this.state.currentWave;
    const isBoss      = wave % 10 === 0;
    const isEliteWave = wave % 5 === 0 && !isBoss;
    const count = getMobCount(wave);
    this.mobs   = [];

    for (let i = 0; i < count; i++) {
      const isElite = isEliteWave && i === 0;
      const data = createMobData(wave, isElite);
      this.mobs.push({
        id:             this.nextMobId++,
        data,
        hp:             data.maxHp,
        shield:         data.shieldHp ?? 0,
        regenTimer:     0,
        attackCooldown: 1000 + Math.random() * 800,
      });
    }

    this._emit('onWaveSpawn', { wave, mobs: this.mobs });
    this.state.emit('combat:waveStarted', { wave, isBoss, isEliteWave });
  }

  // ── Emit ─────────────────────────────────────────────────────────────────────
  _emit(event, data) {
    for (const cb of this._mobCallbacks) {
      if (typeof cb[event] === 'function') cb[event](data);
    }
  }
}
