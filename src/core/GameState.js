/**
 * Центральное состояние игры + система событий
 * Единственный источник истины; все системы читают и пишут только сюда.
 * Save/load вынесено в GameStateSave.js
 */
import { getCumulativeBonuses, CLASS_MAP, CHILDREN_MAP, DEPTH_LEVEL_REQ, DEPTH_GOLD_COST } from '../data/classes.js';
import { generateItem, SELL_VALUE } from '../data/items.js';
import { SKILLS_BY_BRANCH, SKILL_UPGRADES, SKILL_MAX_LEVEL, getSkillParams } from '../data/skills.js';
import { installSave } from './GameStateSave.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ZONES_MAP, ZONE_IDS } from '../data/zones.js';

// Базовые статы на 1-м уровне
const BASE_STATS = { hp: 130, atk: 14, def: 7, spd: 1.3 };

// Рост статов за уровень
const LEVEL_GROWTH = { hp: 18, atk: 2.0, def: 1.0, spd: 0.010 };

// Формула XP до следующего уровня
export function xpForLevel(level) {
  return Math.round(100 * Math.pow(1.22, level - 1));
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
  spd:    { spd: 0.06 },
  crit:   { crit: 0.02 },
  critDmg:{ critDmg: 0.10 },
};

export const UPGRADES_LIST = [
  { id: 'atk',     name: '⚔️ Сила Удара',  desc: '+6% к урону за уровень' },
  { id: 'def',     name: '🛡️ Крепость',    desc: '+6% к защите за уровень' },
  { id: 'hp',      name: '❤️ Живучесть',   desc: '+8% к HP за уровень' },
  { id: 'spd',     name: '⚡ Быстрота',     desc: '+6% к скорости атаки' },
  { id: 'crit',    name: '🎯 Меткость',     desc: '+2% к шансу крита' },
  { id: 'critDmg', name: '💥 Сокрушение',   desc: '+10% к урону крита' },
];

// ── Постоянные улучшения престижа ─────────────────────────────────────────────
export const PRESTIGE_UPGRADES = [
  { id: 'startGold1',   name: '💰 Стартовое золото I',   desc: '+1,000 золота на старте',            cost: 2,  max: 1, group: 'gold'  },
  { id: 'startGold2',   name: '💰 Стартовое золото II',  desc: '+5,000 золота на старте',            cost: 5,  max: 1, group: 'gold'  },
  { id: 'startGold3',   name: '💰 Стартовое золото III', desc: '+25,000 золота на старте',           cost: 12, max: 1, group: 'gold'  },
  { id: 'xpBonus',      name: '📚 Бонус опыта',          desc: '+20% XP навсегда за ранг',          cost: 3,  max: 5, group: 'mult'  },
  { id: 'goldBonus',    name: '🪙 Бонус золота',         desc: '+20% золота навсегда за ранг',      cost: 3,  max: 5, group: 'mult'  },
  { id: 'baseAtk',      name: '⚔️ Базовый удар',         desc: '+15% базового урона за ранг',       cost: 5,  max: 5, group: 'stats' },
  { id: 'baseHp',       name: '❤️ Базовое здоровье',     desc: '+15% базового HP за ранг',          cost: 5,  max: 5, group: 'stats' },
  { id: 'baseSpd',      name: '⚡ Скорость ветерана',    desc: '+10% базовой скорости за ранг',     cost: 7,  max: 3, group: 'stats' },
  { id: 'keepUpgrades', name: '🔒 Сохранить улучшения',  desc: 'Апгрейды магазина не сбрасываются', cost: 30, max: 1, group: 'qol'   },
  { id: 'startWave',    name: '🌊 Стартовая волна',      desc: 'Начинать каждый ран с волны 5',     cost: 15, max: 1, group: 'qol'   },
  // Автоматизация — разблокирует тумблеры в соответствующих панелях
  { id: 'autoSell', name: '💰 Авто-продажа',  desc: 'Авто-продажа дропа по редкости (тумблер в инвентаре)',  cost: 5,  max: 1, group: 'auto' },
  { id: 'autoBuy',  name: '🛒 Авто-покупка',   desc: 'Авто-покупка дешёвого апгрейда (тумблер в прокачке)',   cost: 15, max: 1, group: 'auto' },
  { id: 'autoCast', name: '⚡ Авто-каст',      desc: 'Скилл срабатывает сам по готовности (тумблер у скилла)', cost: 20, max: 1, group: 'auto' },
];
export const PRESTIGE_UPGRADES_MAP = new Map(PRESTIGE_UPGRADES.map(u => [u.id, u]));

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
    this.prestigeCount  = 0;
    this.prestigePoints = 0;   // накопленные ПО (только из ачивок, не сбрасываются)
    this.prestigeShop   = {};  // { upgradeId: rank }

    // ── Ачивки и трекинг ───────────────────────────────────────────
    this.completedAchievements = new Set(); // не сбрасывается при престиже
    this.bossKillCount   = 0;
    this.poisonKillCount = 0;

    // ── Классы ─────────────────────────────────────────────────────
    this.currentClass    = 'novice';
    this.unlockedClasses  = new Set(['novice']);
    this.discoveredClasses = new Set(['novice']); // не сбрасывается при престиже

    // ── Улучшения (кол-во купленных уровней) ───────────────────────
    this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0 };

    // ── Инвентарь и снаряжение ──────────────────────────────────────────
    this.inventory  = [];                                      // макс 20 предметов
    this.equipment  = { weapon: null, armor: null, accessory: null };

    // ── Бой ─────────────────────────────────────────────────────────
    this.currentWave    = 1;
    this.maxWaveReached = 0;   // максимальная волна за все время (не сбрасывается при престиже)
    this.currentHp      = 0;   // заполняется после инициализации
    this.isAlive        = true;
    this.respawnTimer   = 0;

    // ── Метаданные сохранения ────────────────────────────────────────
    this._lastSave = Date.now();
    this.offlineSummary = null; // заполняется при загрузке, если был офлайн-прогресс

    // ── Скилы ────────────────────────────────────────────────────────
    this._skillCdEnd  = 0; // performance.now() когда перезарядится следующий заряд
    this._skillCharges = 1; // доступные заряды (max задаётся прокачкой)
    this.skillLevels  = { novice: 0, warrior: 0, rogue: 0, archer: 0, mage: 0 }; // не сбрасывается при престиже
    this._atkBuffEnd  = 0;  // performance.now() конца бафа +20% урона (focus L4)
    this._respawnShield = 0;// поглощение урона после возрождения (focus L5)

    // ── Автоматизация (не сбрасывается при престиже) ──────────────────
    this.automation = {
      autoCast: false,           // авто-каст скилла по готовности
      autoBuy:  false,           // авто-покупка самого дешёвого апгрейда
      autoSell: 'off',           // 'off' | 'common' | 'rare' — авто-продажа дропа
    };

    // ── Зоны ─────────────────────────────────────────────────────────
    this.currentZoneId = 'forest'; // текущая активная зона
    this.zoneWave      = 1;        // волна внутри зоны (1–20, 21 = финальный босс)
    this.globalWave    = 1;        // суммарные волны всех зон (для скейлинга мобов)
    this.zonesProgress = {         // прогресс по каждой зоне
      forest:    { wavesCleared: 0, bossDefeated: false, unlocked: true  },
      catacombs: { wavesCleared: 0, bossDefeated: false, unlocked: false },
      volcano:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
      skyfort:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
      abyss:     { wavesCleared: 0, bossDefeated: false, unlocked: false },
    };
  }

  /** Все суммарные бонусы от класса */
  get classBonuses() {
    return getCumulativeBonuses(this.currentClass);
  }

  /** Суммарные бонусы от надетого снаряжения */
  get equipBonuses() {
    const result = {};
    for (const item of Object.values(this.equipment)) {
      if (!item) continue;
      for (const [k, v] of Object.entries(item.bonuses)) {
        result[k] = (result[k] || 0) + v;
      }
    }
    return result;
  }

  /** Рассчитать эффективные статы (с учётом уровня, класса, улучшений, престижа) */
  getStats() {
    const lvl = this.level;
    const cb  = this.classBonuses;
    const upg = this.upgrades;

    // Усилитель бонусов класса по глубине: 1.30^depth (depth 0→×1.0, depth 5→×3.71)
    const depth     = CLASS_MAP.get(this.currentClass)?.depth ?? 0;
    const depthMult = Math.pow(1.30, depth);

    // Постоянные бонусы из магазина престижа (множители к базовым значениям)
    const pHp   = 1 + this.getPrestigeRank('baseHp')  * 0.15;
    const pAtk  = 1 + this.getPrestigeRank('baseAtk') * 0.15;
    const pSpd  = 1 + this.getPrestigeRank('baseSpd') * 0.10;
    const pXp   = 1 + this.getPrestigeRank('xpBonus') * 0.20;
    const pGold = 1 + this.getPrestigeRank('goldBonus') * 0.20;

    // Сырые базовые значения с учётом постоянных бонусов престижа
    const rawHp  = BASE_STATS.hp  * pHp  + LEVEL_GROWTH.hp  * (lvl - 1);
    const rawAtk = BASE_STATS.atk * pAtk + LEVEL_GROWTH.atk * (lvl - 1);
    const rawDef = BASE_STATS.def         + LEVEL_GROWTH.def * (lvl - 1);
    const rawSpd = BASE_STATS.spd * pSpd  + LEVEL_GROWTH.spd * (lvl - 1);

    // Суммарный бонус от улучшений магазина
    const upgBonuses = {};
    for (const [id, lvls] of Object.entries(upg)) {
      const b = UPGRADE_BONUS[id];
      if (!b) continue;
      for (const [k, v] of Object.entries(b)) {
        upgBonuses[k] = (upgBonuses[k] || 0) + v * lvls;
      }
    }

    const eq = this.equipBonuses;

    // depthMult усиливает только HP/ATK/DEF/SPD; все остальные статы — без множителя
    const hpMult  = 1 + (cb.hp  || 0) * depthMult + (upgBonuses.hp  || 0) + (eq.hp  || 0);
    const atkMult = 1 + (cb.atk || 0) * depthMult + (upgBonuses.atk || 0) + (eq.atk || 0);
    const defMult = 1 + (cb.def || 0) * depthMult + (upgBonuses.def || 0) + (eq.def || 0);
    const spdMult = 1 + (cb.spd || 0) * depthMult + (upgBonuses.spd || 0) + (eq.spd || 0);

    // Временный баф урона от скилла focus L4 (+20% на 10с)
    const atkBuff = performance.now() < this._atkBuffEnd ? 1.2 : 1;

    return {
      maxHp:    Math.round(rawHp * hpMult),
      atk:      Math.max(1, Math.round(rawAtk * atkMult * atkBuff)),
      def:      Math.max(0, Math.round(rawDef * defMult)),
      spd:      parseFloat((rawSpd * spdMult).toFixed(2)),
      crit:     Math.min(95, 5  + (cb.crit    || 0) * 100 + (upgBonuses.crit    || 0) * 100 + (eq.crit    || 0) * 100),
      critDmg:  150 + (cb.critDmg || 0) * 100 + (upgBonuses.critDmg || 0) * 100 + (eq.critDmg || 0) * 100,
      xpMult:   parseFloat(((1 + (cb.xpMult  || 0) + (eq.xpMult  || 0)) * pXp).toFixed(3)),
      goldMult: parseFloat(((1 + (cb.goldMult || 0) + (eq.goldMult || 0)) * pGold).toFixed(3)),
      dodge:       Math.min(75, (cb.dodge       || 0) * 100 + (eq.dodge       || 0) * 100),
      lifesteal:   (cb.lifesteal   || 0) * 100 + (eq.lifesteal   || 0) * 100,
      thorns:      (cb.thorns      || 0) * 100 + (eq.thorns      || 0) * 100,
      magicShield: Math.min(75, (cb.magicShield || 0) * 100 + (eq.magicShield || 0) * 100),
      pierce:      Math.min(75, (cb.pierce      || 0) * 100),
      deathblow:   Math.min(20, (cb.deathblow   || 0) * 100),
      poison:      Math.min(60, (cb.poison      || 0) * 100),
      burn:        Math.min(50, (cb.burn        || 0) * 100),
      hpMult, atkMult, defMult, spdMult,
    };
  }

  /** Добавить XP */
  addXp(amount) {
    const stats  = this.getStats();
    const gained = Math.round(amount * stats.xpMult);
    this.xp += gained;

    let didLevelUp = false;
    while (this.xp >= xpForLevel(this.level) && this.level < 100) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.currentHp = this.getStats().maxHp;
      this.emit('player:levelUp', { level: this.level });
      didLevelUp = true;
    }

    if (didLevelUp) {
      // Полный пересчёт статов нужен только при смене уровня
      this.emit('player:statsChanged');
    } else {
      // Только XP-бар — лёгкое обновление без пересчёта статов
      this.emit('player:xpChanged', { xp: this.xp, xpNeeded: xpForLevel(this.level) });
    }
    return gained;
  }

  /** Добавить золото */
  addGold(amount) {
    const stats  = this.getStats();
    const gained = Math.round(amount * stats.goldMult);
    this.gold     += gained;
    this.totalGold += gained;
    this.emit('player:goldChanged', { gold: this.gold });
    return gained;
  }

  /** Купить улучшение */
  buyUpgrade(id) {
    const level = this.upgrades[id] ?? 0;
    const cost  = upgradeCost(id, level);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.upgrades[id] = level + 1;
    this.emit('player:statsChanged');
    this.emit('player:goldChanged', { gold: this.gold });
    return true;
  }

  /** Купить N уровней апгрейда (count: число или 'max'). Возвращает кол-во купленных. */
  buyUpgradeBulk(id, count = 1) {
    const limit = count === 'max' ? Infinity : count;
    let bought = 0;
    while (bought < limit) {
      const level = this.upgrades[id] ?? 0;
      const cost  = upgradeCost(id, level);
      if (this.gold < cost) break;
      this.gold -= cost;
      this.upgrades[id] = level + 1;
      bought++;
    }
    if (bought > 0) {
      this.emit('player:statsChanged');
      this.emit('player:goldChanged', { gold: this.gold });
    }
    return bought;
  }

  /** Проверить, может ли игрок взять класс */
  canUnlockClass(classId) {
    const cls = CLASS_MAP.get(classId);
    if (!cls) return false;
    if (this.unlockedClasses.has(classId)) return false;
    // Prestige class: accessible if currentClass is in requires[] and all other reqs discovered
    if (cls.prestige && cls.requires?.length) {
      if (!cls.requires.includes(this.currentClass)) return false;
      const otherReqs = cls.requires.filter(rid => rid !== this.currentClass);
      if (!otherReqs.every(rid => this.discoveredClasses.has(rid))) return false;
    } else {
      if (cls.parent !== this.currentClass) return false;
      if (cls.requires?.length && !cls.requires.every(id => this.discoveredClasses.has(id))) return false;
    }
    const cost  = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    const lvReq = DEPTH_LEVEL_REQ[cls.depth] ?? 999;
    return this.level >= lvReq && this.gold >= cost;
  }

  /** Доступные для разблокировки классы (дети текущего + престиж через requires) */
  getAvailableClasses() {
    const children = CHILDREN_MAP.get(this.currentClass) || [];
    const result = children.filter(id => this.canUnlockClass(id));
    // Also check prestige classes reachable via requires[] from current class
    for (const [id, cls] of CLASS_MAP) {
      if (!cls.prestige || !cls.requires?.includes(this.currentClass)) continue;
      if (!result.includes(id) && this.canUnlockClass(id)) result.push(id);
    }
    return result;
  }

  /** Сменить класс (с оплатой) */
  changeClass(classId) {
    const cls  = CLASS_MAP.get(classId);
    if (!cls) return false;
    const cost = DEPTH_GOLD_COST[cls.depth] ?? Infinity;
    if (this.gold < cost) return false;
    // Prestige class: allow entry from any requires[] class
    if (cls.prestige && cls.requires?.length) {
      if (!cls.requires.includes(this.currentClass)) return false;
      const otherReqs = cls.requires.filter(rid => rid !== this.currentClass);
      if (!otherReqs.every(rid => this.discoveredClasses.has(rid))) return false;
    } else {
      if (cls.parent !== this.currentClass) return false;
      if (cls.requires?.length && !cls.requires.every(id => this.discoveredClasses.has(id))) return false;
    }

    this.gold -= cost;
    this.currentClass = classId;
    this.unlockedClasses.add(classId);

    // Новая ветка → свежий скилл: полные заряды
    this._skillCharges = this.getSkillMaxCharges();
    this._skillCdEnd   = 0;

    if (!this.discoveredClasses.has(classId)) {
      this.discoveredClasses.add(classId);
      this.emit('player:classDiscovered', { classId, totalDiscovered: this.discoveredClasses.size });
    }

    this.emit('player:classChanged', { classId });
    this.emit('player:statsChanged');
    this.emit('player:goldChanged', { gold: this.gold });
    this.checkAchievements();
    return true;
  }

  /** Получить ранг постоянного улучшения престижа */
  getPrestigeRank(id) {
    return this.prestigeShop[id] ?? 0;
  }

  /** Можно ли совершить перерождение (нужна хотя бы волна 10) */
  canPrestige() {
    return this.maxWaveReached >= 10;
  }

  /** Перерождение */
  prestige() {
    if (!this.canPrestige()) return false;

    this.prestigeCount++;

    // Сброс уровня и класса
    this.level = 1;
    this.xp    = 0;
    this.currentClass    = 'novice';
    this.unlockedClasses = new Set(['novice']);

    // Улучшения магазина: сбрасываются, если не куплен keepUpgrades
    if (!this.getPrestigeRank('keepUpgrades')) {
      this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0 };
    }

    // Инвентарь и снаряжение сбрасываются при перерождении
    this.inventory = [];
    this.equipment = { weapon: null, armor: null, accessory: null };

    // Стартовая волна — сбрасываем все волновые счётчики включая зональные
    const startWave = this.getPrestigeRank('startWave') ? 5 : 1;
    this.currentWave = startWave;
    this.zoneWave    = startWave;
    this.globalWave  = startWave;
    this.currentZoneId = 'forest';
    this.zonesProgress = {
      forest:    { wavesCleared: 0, bossDefeated: false, unlocked: true  },
      catacombs: { wavesCleared: 0, bossDefeated: false, unlocked: false },
      volcano:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
      skyfort:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
      abyss:     { wavesCleared: 0, bossDefeated: false, unlocked: false },
    };

    // Стартовое золото из магазина престижа
    let startGold = 0;
    if (this.getPrestigeRank('startGold1')) startGold += 1_000;
    if (this.getPrestigeRank('startGold2')) startGold += 5_000;
    if (this.getPrestigeRank('startGold3')) startGold += 25_000;
    this.gold = startGold;

    this.currentHp = this.getStats().maxHp;

    this.emit('player:prestige', { count: this.prestigeCount, totalPp: this.prestigePoints });
    this.emit('player:classChanged', { classId: 'novice' });
    this.emit('player:statsChanged');
    this.emit('player:goldChanged', { gold: this.gold });
    this.emit('player:hpChanged', { hp: this.currentHp });
    this.save();
    return true;
  }

  /** Купить постоянное улучшение в магазине престижа */
  buyPrestigeUpgrade(id) {
    const upg  = PRESTIGE_UPGRADES_MAP.get(id);
    if (!upg) return false;
    const rank = this.getPrestigeRank(id);
    if (rank >= upg.max) return false;
    if (this.prestigePoints < upg.cost) return false;
    this.prestigePoints -= upg.cost;
    this.prestigeShop[id] = rank + 1;
    this.currentHp = this.getStats().maxHp; // пересчитать HP при изменении бонусов
    this.emit('player:prestigeShopChanged');
    this.emit('player:statsChanged');
    return true;
  }

  /** Получить урон (возвращает true если смерть) */
  takeDamage(amount) {
    // Щит возрождения (focus L5) поглощает урон первым
    if (this._respawnShield > 0) {
      const absorbed = Math.min(this._respawnShield, amount);
      this._respawnShield -= absorbed;
      amount -= absorbed;
      if (amount <= 0) {
        this.emit('player:hpChanged', { hp: this.currentHp });
        return false;
      }
    }
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emit('player:hpChanged', { hp: this.currentHp });
    if (this.currentHp <= 0) {
      this.isAlive = false;
      this.emit('player:death');
      return true;
    }
    return false;
  }

  /** Возродиться */
  respawn() {
    this.isAlive   = true;
    this.currentHp = this.getStats().maxHp;
    // Щит возрождения (focus L5): поглощает 30% макс. HP до первого пробоя
    this._respawnShield = this.getSkillParams().respawnShield
      ? Math.round(this.currentHp * 0.30)
      : 0;
    this.emit('player:respawn');
    this.emit('player:hpChanged', { hp: this.currentHp });
  }

  // ── Инвентарь ─────────────────────────────────────────────────────

  /** Попытка дропа предмета с моба. isBoss/isElite гарантируют rare+ */
  rollItemDrop(wave, isBoss = false, isElite = false) {
    const chance = isBoss ? 0.50 : isElite ? 1.0 : 0.12;
    if (Math.random() > chance) return null;

    let forcedRarity = null;
    if (isBoss  && Math.random() < 0.7) forcedRarity = 'rare';
    else if (isElite) forcedRarity = 'rare';
    const item = generateItem(wave, forcedRarity);

    // Авто-продажа: продаём сразу, минуя инвентарь (работает и при полном инвентаре)
    if (this.shouldAutoSell(item.rarity)) {
      const gold = Math.round(SELL_VALUE[item.rarity] * (1 + wave * 0.05));
      this.addGold(gold);
      this.emit('player:inventoryChanged', { autoSold: item, gold });
      return null;
    }

    if (this.inventory.length >= 20) return null; // инвентарь полон
    this.inventory.push(item);
    this.emit('player:inventoryChanged', { item });
    return item;
  }

  /** Надеть предмет из инвентаря. Возвращает false если предмет не найден */
  equipItem(uid) {
    const idx  = this.inventory.findIndex(i => i.uid === uid);
    if (idx === -1) return false;
    const item = this.inventory[idx];
    const slot = item.type;

    // Снять текущий предмет в слоте → инвентарь
    if (this.equipment[slot]) {
      this.inventory.push(this.equipment[slot]);
    }
    this.equipment[slot] = item;
    this.inventory.splice(idx, 1);

    this.emit('player:statsChanged');
    this.emit('player:inventoryChanged', {});
    this.checkAchievements();
    return true;
  }

  /** Снять предмет из слота в инвентарь */
  unequipItem(slot) {
    const item = this.equipment[slot];
    if (!item) return false;
    if (this.inventory.length >= 20) return false;
    this.inventory.push(item);
    this.equipment[slot] = null;
    this.emit('player:statsChanged');
    this.emit('player:inventoryChanged', {});
    return true;
  }

  /** Продать предмет из инвентаря */
  sellItem(uid) {
    const idx = this.inventory.findIndex(i => i.uid === uid);
    if (idx === -1) return false;
    const item = this.inventory[idx];
    this.inventory.splice(idx, 1);
    const gold = Math.round(SELL_VALUE[item.rarity] * (1 + item.wave * 0.05));
    this.addGold(gold);
    this.emit('player:inventoryChanged', {});
    return gold;
  }

  // ── Скилы ──────────────────────────────────────────────────────────────────

  /** Ветка класса текущего персонажа */
  getBranch() {
    const cls = CLASS_MAP.get(this.currentClass);
    return cls?.branch ?? 'novice';
  }

  /** Активный скилл по текущей ветке */
  getActiveSkill() {
    return SKILLS_BY_BRANCH[this.getBranch()] ?? SKILLS_BY_BRANCH.novice;
  }

  /** Уровень прокачки скилла ветки */
  getSkillLevel(branch = this.getBranch()) {
    return this.skillLevels[branch] ?? 0;
  }

  /** Параметры скилла с учётом прокачки */
  getSkillParams() {
    return getSkillParams(this.getBranch(), this.getSkillLevel());
  }

  getSkillMaxCharges() { return this.getSkillParams().charges ?? 1; }
  getSkillCdMs()       { return this.getSkillParams().cdMs; }

  /** Ленивая дозарядка зарядов скилла */
  _syncSkillCharges() {
    const max = this.getSkillMaxCharges();
    if (this._skillCharges >= max) { this._skillCharges = max; return; }
    const now = performance.now();
    const cd  = this.getSkillCdMs();
    while (this._skillCharges < max && now >= this._skillCdEnd) {
      this._skillCharges++;
      if (this._skillCharges < max) this._skillCdEnd += cd;
    }
  }

  /** Доступные заряды скилла */
  getSkillCharges() { this._syncSkillCharges(); return this._skillCharges; }

  /** Скилл готов к использованию */
  isSkillReady() {
    this._syncSkillCharges();
    return this._skillCharges > 0 && this.isAlive;
  }

  /** Доля прогресса кулдауна перезаряжающегося заряда [0..1], где 1 = готово */
  getSkillCooldownPct() {
    this._syncSkillCharges();
    if (this._skillCharges > 0) return 1;
    const cd = this.getSkillCdMs();
    const remaining = this._skillCdEnd - performance.now();
    return Math.max(0, Math.min(1, (cd - remaining) / cd));
  }

  /** Активировать скилл. Возвращает объект скилла или null если не готов */
  triggerSkill() {
    this._syncSkillCharges();
    if (this._skillCharges <= 0 || !this.isAlive) return null;
    const max = this.getSkillMaxCharges();
    const wasFull = this._skillCharges >= max;
    this._skillCharges--;
    if (wasFull) this._skillCdEnd = performance.now() + this.getSkillCdMs();
    const skill = this.getActiveSkill();
    this.emit('player:skillTriggered', { skill });
    this.emit('player:skillChargesChanged');
    return skill;
  }

  /** Купить следующий уровень скилла текущей ветки (1–3 золото, 4–5 ПО) */
  buySkillUpgrade() {
    const branch = this.getBranch();
    const lvl    = this.getSkillLevel(branch);
    if (lvl >= SKILL_MAX_LEVEL) return false;
    const next = SKILL_UPGRADES[branch]?.[lvl];
    if (!next) return false;

    if (next.type === 'gold') {
      if (this.gold < next.cost) return false;
      this.gold -= next.cost;
      this.emit('player:goldChanged', { gold: this.gold });
    } else {
      if (this.prestigePoints < next.cost) return false;
      this.prestigePoints -= next.cost;
      this.emit('player:ppChanged', { pp: this.prestigePoints });
    }

    this.skillLevels[branch] = lvl + 1;
    this._skillCharges = this.getSkillMaxCharges(); // обновить, если вырос максимум зарядов
    this.emit('player:skillLevelChanged', { branch, level: lvl + 1 });
    this.emit('player:statsChanged');
    return true;
  }

  /** Стоимость и тип следующего уровня скилла (или null если максимум) */
  getNextSkillUpgrade(branch = this.getBranch()) {
    const lvl = this.getSkillLevel(branch);
    if (lvl >= SKILL_MAX_LEVEL) return null;
    return SKILL_UPGRADES[branch]?.[lvl] ?? null;
  }

  /** Авто-покупка: купить самый дешёвый доступный апгрейд (1 за вызов) */
  autoBuyStep() {
    let bestId = null, bestCost = Infinity;
    for (const upg of UPGRADES_LIST) {
      const cost = upgradeCost(upg.id, this.upgrades[upg.id] ?? 0);
      if (cost <= this.gold && cost < bestCost) { bestCost = cost; bestId = upg.id; }
    }
    if (bestId) return this.buyUpgrade(bestId);
    return false;
  }

  /** Разблокирована ли автоматизация (куплена в магазине престижа) */
  isAutomationUnlocked(key) {
    return this.getPrestigeRank(key) > 0;
  }

  /** Нужно ли авто-продать предмет данной редкости */
  shouldAutoSell(rarity) {
    if (!this.isAutomationUnlocked('autoSell')) return false;
    const m = this.automation.autoSell;
    if (m === 'common') return rarity === 'common';
    if (m === 'rare')   return rarity === 'common' || rarity === 'rare';
    return false;
  }

  /** Начальная инициализация / загрузка */
  initialize() {
    const loaded = this._load();
    if (!loaded) {
      this.currentHp = this.getStats().maxHp;
    }
    this._autoSave();
    // Проверяем ачивки на случай уже выполненных условий при загрузке
    setTimeout(() => this.checkAchievements(), 0);
  }


  checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (this.completedAchievements.has(ach.id)) continue;
      let passed = false;
      try { passed = ach.check(this); } catch { continue; }
      if (!passed) continue;

      this.completedAchievements.add(ach.id);
      this.prestigePoints += ach.pp;
      this.emit('player:achievementUnlocked', { ach });
      this.emit('player:ppChanged', { pp: this.prestigePoints });
    }
  }

  // ── Зоны ───────────────────────────────────────────────────────────────────

  /** Объект текущей активной зоны */
  getCurrentZone() {
    return ZONES_MAP.get(this.currentZoneId);
  }

  /**
   * Войти в зону (только если разблокирована).
   * Сбрасывает zoneWave в 1.
   * @returns {boolean} успех
   */
  enterZone(zoneId) {
    if (!this.zonesProgress[zoneId]?.unlocked) return false;
    this.currentZoneId = zoneId;
    this.zoneWave = 1;
    this.emit('zone:entered', { zoneId });
    return true;
  }

  /**
   * Зафиксировать победу над финальным боссом зоны.
   * Разблокирует следующую зону и испускает события.
   */
  completeZone(zoneId) {
    if (!this.zonesProgress[zoneId]) return;
    this.zonesProgress[zoneId].bossDefeated = true;
    const idx = ZONE_IDS.indexOf(zoneId);
    if (idx >= 0 && idx + 1 < ZONE_IDS.length) {
      const nextId = ZONE_IDS[idx + 1];
      this.zonesProgress[nextId].unlocked = true;
      this.emit('zone:unlocked', { zoneId: nextId });
    }
    this.emit('zone:completed', { zoneId });
  }

}

// Save/load/autosave/hardReset вынесены в GameStateSave.js
installSave(GameState.prototype);
