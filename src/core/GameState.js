/**
 * Центральное состояние игры + система событий
 * Единственный источник истины; все системы читают и пишут только сюда.
 */
import { getCumulativeBonuses, CLASS_MAP, CHILDREN_MAP, DEPTH_LEVEL_REQ, DEPTH_GOLD_COST } from '../data/classes.js';

// Базовые статы на 1-м уровне
const BASE_STATS = { hp: 100, atk: 10, def: 5, spd: 1.0 };

// Рост статов за уровень
const LEVEL_GROWTH = { hp: 12, atk: 1.2, def: 0.6, spd: 0.008 };

// Формула XP до следующего уровня
export function xpForLevel(level) {
  return Math.round(100 * Math.pow(1.28, level - 1));
}

// Формула стоимости улучшения
export function upgradeCost(type, currentLevel) {
  const base = { atk: 100, def: 80, hp: 90, spd: 120, crit: 150, critDmg: 200 };
  return Math.round((base[type] || 100) * Math.pow(1.55, currentLevel));
}

// Базовый прирост характеристики за улучшение
export const UPGRADE_BONUS = {
  atk:    { atk: 0.06 },
  def:    { def: 0.06 },
  hp:     { hp: 0.08 },
  spd:    { spd: 0.04 },
  crit:   { crit: 0.02 },
  critDmg:{ critDmg: 0.10 },
};

export const UPGRADES_LIST = [
  { id: 'atk',     name: '⚔️ Сила Удара',    desc: '+6% к урону за уровень' },
  { id: 'def',     name: '🛡️ Крепость',      desc: '+6% к защите за уровень' },
  { id: 'hp',      name: '❤️ Живучесть',     desc: '+8% к HP за уровень' },
  { id: 'spd',     name: '⚡ Быстрота',       desc: '+4% к скорости атаки' },
  { id: 'crit',    name: '🎯 Меткость',       desc: '+2% к шансу крита' },
  { id: 'critDmg', name: '💥 Сокрушение',     desc: '+10% к урону крита' },
];

class EventBus {
  constructor() { this._listeners = new Map(); }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const list = this._listeners.get(event) || [];
    this._listeners.set(event, list.filter(f => f !== fn));
  }
  emit(event, data) {
    for (const fn of (this._listeners.get(event) || [])) fn(data);
  }
}

export class GameState extends EventBus {
  constructor() {
    super();

    // ── Прогресс персонажа ──────────────────────────────────────────
    this.level       = 1;
    this.xp          = 0;
    this.gold        = 0;
    this.totalKills  = 0;
    this.totalGold   = 0;
    this.playTime    = 0;
    this.prestigeCount = 0;
    this.prestigeMult  = 1.0;   // множитель золота и XP от престижа

    // ── Классы ─────────────────────────────────────────────────────
    this.currentClass    = 'novice';
    this.unlockedClasses = new Set(['novice']);

    // ── Улучшения (кол-во купленных уровней) ───────────────────────
    this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0 };

    // ── Бой ─────────────────────────────────────────────────────────
    this.currentWave    = 1;
    this.currentHp      = 0;   // заполняется после инициализации
    this.isAlive        = true;
    this.respawnTimer   = 0;

    // ── Метаданные сохранения ────────────────────────────────────────
    this._lastSave = Date.now();
  }

  /** Все суммарные бонусы от класса */
  get classBonuses() {
    return getCumulativeBonuses(this.currentClass);
  }

  /** Рассчитать эффективные статы (с учётом уровня, класса, улучшений) */
  getStats() {
    const lvl    = this.level;
    const cb     = this.classBonuses;
    const upg    = this.upgrades;
    const prestige = this.prestigeMult;

    // Сырые базовые значения
    const rawHp  = BASE_STATS.hp  + LEVEL_GROWTH.hp  * (lvl - 1);
    const rawAtk = BASE_STATS.atk + LEVEL_GROWTH.atk * (lvl - 1);
    const rawDef = BASE_STATS.def + LEVEL_GROWTH.def * (lvl - 1);
    const rawSpd = BASE_STATS.spd + LEVEL_GROWTH.spd * (lvl - 1);

    // Суммарный бонус от улучшений
    const upgBonuses = {};
    for (const [id, lvls] of Object.entries(upg)) {
      const b = UPGRADE_BONUS[id];
      for (const [k, v] of Object.entries(b)) {
        upgBonuses[k] = (upgBonuses[k] || 0) + v * lvls;
      }
    }

    const hpMult   = 1 + (cb.hp   || 0) + (upgBonuses.hp  || 0);
    const atkMult  = 1 + (cb.atk  || 0) + (upgBonuses.atk || 0);
    const defMult  = 1 + (cb.def  || 0) + (upgBonuses.def || 0);
    const spdMult  = 1 + (cb.spd  || 0) + (upgBonuses.spd || 0);

    return {
      maxHp:   Math.round(rawHp * hpMult),
      atk:     Math.max(1, Math.round(rawAtk * atkMult)),
      def:     Math.max(0, Math.round(rawDef * defMult)),
      spd:     parseFloat((rawSpd * spdMult).toFixed(2)),
      crit:    Math.min(95, 5  + (cb.crit    || 0) * 100 + (upgBonuses.crit    || 0) * 100),
      critDmg: 150 + (cb.critDmg || 0) * 100 + (upgBonuses.critDmg || 0) * 100,
      xpMult:  parseFloat(((1 + (cb.xpMult   || 0)) * prestige).toFixed(3)),
      goldMult:parseFloat(((1 + (cb.goldMult  || 0)) * prestige).toFixed(3)),
      // для отображения множителей в UI
      hpMult, atkMult, defMult, spdMult,
    };
  }

  /** Добавить XP */
  addXp(amount) {
    const stats  = this.getStats();
    const gained = Math.round(amount * stats.xpMult);
    this.xp += gained;

    while (this.xp >= xpForLevel(this.level) && this.level < 100) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.currentHp = this.getStats().maxHp;
      this.emit('levelUp', { level: this.level });
    }
    this.emit('statsChanged');
    return gained;
  }

  /** Добавить золото */
  addGold(amount) {
    const stats  = this.getStats();
    const gained = Math.round(amount * stats.goldMult);
    this.gold     += gained;
    this.totalGold += gained;
    this.emit('goldChanged', { gold: this.gold });
    return gained;
  }

  /** Купить улучшение */
  buyUpgrade(id) {
    const level = this.upgrades[id] ?? 0;
    const cost  = upgradeCost(id, level);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.upgrades[id] = level + 1;
    this.emit('statsChanged');
    this.emit('goldChanged', { gold: this.gold });
    return true;
  }

  /** Проверить, может ли игрок взять класс */
  canUnlockClass(classId) {
    const cls = CLASS_MAP.get(classId);
    if (!cls) return false;
    if (this.unlockedClasses.has(classId)) return false;

    // Родитель должен быть текущим классом
    if (cls.parent !== this.currentClass) return false;

    const cost  = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvReq = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    return this.level >= lvReq && this.gold >= cost;
  }

  /** Доступные для разблокировки классы (дети текущего) */
  getAvailableClasses() {
    const children = CHILDREN_MAP.get(this.currentClass) || [];
    return children.filter(id => this.canUnlockClass(id));
  }

  /** Сменить класс (с оплатой) */
  changeClass(classId) {
    const cls  = CLASS_MAP.get(classId);
    if (!cls) return false;
    const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    if (this.gold < cost) return false;
    if (cls.parent !== this.currentClass) return false;

    this.gold -= cost;
    this.currentClass = classId;
    this.unlockedClasses.add(classId);
    this.emit('classChanged', { classId });
    this.emit('statsChanged');
    this.emit('goldChanged', { gold: this.gold });
    return true;
  }

  /** Можно ли совершить перерождение */
  canPrestige() {
    return this.level >= 99 || [...this.unlockedClasses].some(id => {
      const cls = CLASS_MAP.get(id);
      return cls && cls.depth >= 10;
    });
  }

  /** Перерождение */
  prestige() {
    if (!this.canPrestige()) return false;
    this.prestigeCount++;
    this.prestigeMult = 1 + this.prestigeCount * 0.10;

    this.level   = 1;
    this.xp      = 0;
    this.currentClass = 'novice';
    // Улучшения сохраняются; разблокированные классы сохраняются

    this.emit('prestige', { count: this.prestigeCount });
    this.emit('classChanged', { classId: 'novice' });
    this.emit('statsChanged');
    return true;
  }

  /** Получить урон (возвращает true если смерть) */
  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emit('hpChanged', { hp: this.currentHp });
    if (this.currentHp <= 0) {
      this.isAlive = false;
      this.gold = Math.max(0, Math.round(this.gold * 0.95));
      this.emit('death');
      this.emit('goldChanged', { gold: this.gold });
      return true;
    }
    return false;
  }

  /** Возродиться */
  respawn() {
    this.isAlive   = true;
    this.currentHp = this.getStats().maxHp;
    this.emit('respawn');
    this.emit('hpChanged', { hp: this.currentHp });
  }

  /** Начальная инициализация / загрузка */
  initialize() {
    const loaded = this._load();
    if (!loaded) {
      this.currentHp = this.getStats().maxHp;
    }
    this._autoSave();
  }

  // ── Сохранение ─────────────────────────────────────────────────────
  save() {
    const data = {
      v: 1,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      totalKills: this.totalKills,
      totalGold: this.totalGold,
      playTime: this.playTime,
      prestigeCount: this.prestigeCount,
      prestigeMult: this.prestigeMult,
      currentClass: this.currentClass,
      unlockedClasses: [...this.unlockedClasses],
      upgrades: { ...this.upgrades },
      currentWave: this.currentWave,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('idle_rpg_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem('idle_rpg_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return false;

      this.level          = data.level ?? 1;
      this.xp             = data.xp ?? 0;
      this.gold           = data.gold ?? 0;
      this.totalKills     = data.totalKills ?? 0;
      this.totalGold      = data.totalGold ?? 0;
      this.playTime       = data.playTime ?? 0;
      this.prestigeCount  = data.prestigeCount ?? 0;
      this.prestigeMult   = data.prestigeMult ?? 1.0;
      this.currentClass   = data.currentClass ?? 'novice';
      this.unlockedClasses= new Set(data.unlockedClasses ?? ['novice']);
      this.upgrades       = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0, ...data.upgrades };
      this.currentWave    = data.currentWave ?? 1;

      // Офлайн-прогресс (до 8 часов)
      const elapsed = Math.min((Date.now() - (data.timestamp ?? Date.now())) / 1000, 8 * 3600);
      if (elapsed > 10) {
        const dps = this.getStats().atk * this.getStats().spd;
        const goldPerSec = dps * 0.5 * this.getStats().goldMult;
        const xpPerSec   = dps * 0.3 * this.getStats().xpMult;
        this.addGold(Math.round(goldPerSec * elapsed));
        this.addXp(Math.round(xpPerSec * elapsed));
      }

      this.currentHp = this.getStats().maxHp;
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }

  _autoSave() {
    setInterval(() => this.save(), 30_000);
    window.addEventListener('beforeunload', () => this.save());
  }
}
