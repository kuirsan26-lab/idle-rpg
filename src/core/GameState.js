/**
 * Центральное состояние игры + система событий
 * Единственный источник истины; все системы читают и пишут только сюда.
 */
import { getCumulativeBonuses, CLASS_MAP, CHILDREN_MAP, DEPTH_LEVEL_REQ, DEPTH_GOLD_COST } from '../data/classes.js';
import { generateItem, SELL_VALUE } from '../data/items.js';

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
  { id: 'startGold1',   name: '💰 Стартовое золото I',   desc: '+1,000 золота на старте',            cost: 3,  max: 1, group: 'gold'  },
  { id: 'startGold2',   name: '💰 Стартовое золото II',  desc: '+5,000 золота на старте',            cost: 8,  max: 1, group: 'gold'  },
  { id: 'startGold3',   name: '💰 Стартовое золото III', desc: '+25,000 золота на старте',           cost: 20, max: 1, group: 'gold'  },
  { id: 'xpBonus',      name: '📚 Бонус опыта',          desc: '+20% XP навсегда за ранг',          cost: 5,  max: 5, group: 'mult'  },
  { id: 'goldBonus',    name: '🪙 Бонус золота',         desc: '+20% золота навсегда за ранг',      cost: 5,  max: 5, group: 'mult'  },
  { id: 'baseAtk',      name: '⚔️ Базовый удар',         desc: '+15% базового урона за ранг',       cost: 8,  max: 5, group: 'stats' },
  { id: 'baseHp',       name: '❤️ Базовое здоровье',     desc: '+15% базового HP за ранг',          cost: 8,  max: 5, group: 'stats' },
  { id: 'baseSpd',      name: '⚡ Скорость ветерана',    desc: '+10% базовой скорости за ранг',     cost: 12, max: 3, group: 'stats' },
  { id: 'keepUpgrades', name: '🔒 Сохранить улучшения',  desc: 'Апгрейды магазина не сбрасываются', cost: 30, max: 1, group: 'qol'   },
  { id: 'startWave',    name: '🌊 Стартовая волна',      desc: 'Начинать каждый ран с волны 5',     cost: 20, max: 1, group: 'qol'   },
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
    this.prestigePoints = 0;   // накопленные ПО (не сбрасываются)
    this.prestigeShop   = {};  // { upgradeId: rank }

    // ── Классы ─────────────────────────────────────────────────────
    this.currentClass    = 'novice';
    this.unlockedClasses = new Set(['novice']);

    // ── Улучшения (кол-во купленных уровней) ───────────────────────
    this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0 };

    // ── Инвентарь и снаряжение ──────────────────────────────────────────
    this.inventory  = [];                                      // макс 20 предметов
    this.equipment  = { weapon: null, armor: null, accessory: null };

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

    const hpMult   = 1 + (cb.hp   || 0) + (upgBonuses.hp  || 0) + (eq.hp  || 0);
    const atkMult  = 1 + (cb.atk  || 0) + (upgBonuses.atk || 0) + (eq.atk || 0);
    const defMult  = 1 + (cb.def  || 0) + (upgBonuses.def || 0) + (eq.def || 0);
    const spdMult  = 1 + (cb.spd  || 0) + (upgBonuses.spd || 0) + (eq.spd || 0);

    return {
      maxHp:    Math.round(rawHp * hpMult),
      atk:      Math.max(1, Math.round(rawAtk * atkMult)),
      def:      Math.max(0, Math.round(rawDef * defMult)),
      spd:      parseFloat((rawSpd * spdMult).toFixed(2)),
      crit:     Math.min(95, 5  + (cb.crit    || 0) * 100 + (upgBonuses.crit    || 0) * 100 + (eq.crit    || 0) * 100),
      critDmg:  150 + (cb.critDmg || 0) * 100 + (upgBonuses.critDmg || 0) * 100 + (eq.critDmg || 0) * 100,
      xpMult:   parseFloat(((1 + (cb.xpMult   || 0) + (eq.xpMult   || 0)) * pXp).toFixed(3)),
      goldMult: parseFloat(((1 + (cb.goldMult  || 0) + (eq.goldMult || 0)) * pGold).toFixed(3)),
      dodge:       Math.min(75, (cb.dodge       || 0) * 100 + (eq.dodge       || 0) * 100),
      lifesteal:   (cb.lifesteal   || 0) * 100 + (eq.lifesteal   || 0) * 100,
      thorns:      (cb.thorns      || 0) * 100 + (eq.thorns      || 0) * 100,
      magicShield: Math.min(75, (cb.magicShield || 0) * 100 + (eq.magicShield || 0) * 100),
      pierce:      Math.min(75, (cb.pierce      || 0) * 100),
      deathblow:   Math.min(20, (cb.deathblow   || 0) * 100),
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
      this.emit('player:levelUp', { level: this.level });
    }
    this.emit('player:statsChanged');
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
    this.emit('player:classChanged', { classId });
    this.emit('player:statsChanged');
    this.emit('player:goldChanged', { gold: this.gold });
    return true;
  }

  /** Получить ранг постоянного улучшения престижа */
  getPrestigeRank(id) {
    return this.prestigeShop[id] ?? 0;
  }

  /** Сколько ПО принесёт текущий ран */
  calcPrestigePoints() {
    return Math.floor(Math.pow(this.currentWave, 1.45) / 15) + Math.floor(this.level / 20);
  }

  /** Можно ли совершить перерождение (минимум 1 ПО) */
  canPrestige() {
    return this.calcPrestigePoints() >= 1;
  }

  /** Перерождение */
  prestige() {
    if (!this.canPrestige()) return false;

    const pp = this.calcPrestigePoints();
    this.prestigeCount++;
    this.prestigePoints += pp;

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

    // Стартовая волна
    this.currentWave = this.getPrestigeRank('startWave') ? 5 : 1;

    // Стартовое золото из магазина престижа
    let startGold = 0;
    if (this.getPrestigeRank('startGold1')) startGold += 1_000;
    if (this.getPrestigeRank('startGold2')) startGold += 5_000;
    if (this.getPrestigeRank('startGold3')) startGold += 25_000;
    this.gold = startGold;

    this.currentHp = this.getStats().maxHp;

    this.emit('player:prestige', { count: this.prestigeCount, pp, totalPp: this.prestigePoints });
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
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.emit('player:hpChanged', { hp: this.currentHp });
    if (this.currentHp <= 0) {
      this.isAlive = false;
      this.gold = Math.max(0, Math.round(this.gold * 0.95));
      this.emit('player:death');
      this.emit('player:goldChanged', { gold: this.gold });
      return true;
    }
    return false;
  }

  /** Возродиться */
  respawn() {
    this.isAlive   = true;
    this.currentHp = this.getStats().maxHp;
    this.emit('player:respawn');
    this.emit('player:hpChanged', { hp: this.currentHp });
  }

  // ── Инвентарь ─────────────────────────────────────────────────────

  /** Попытка дропа предмета с моба. isBoss — босс гарантирует rare+ */
  rollItemDrop(wave, isBoss = false) {
    const chance = isBoss ? 0.50 : 0.12;
    if (Math.random() > chance) return null;
    if (this.inventory.length >= 20) return null; // инвентарь полон

    const forcedRarity = isBoss && Math.random() < 0.7 ? 'rare' : null;
    const item = generateItem(wave, forcedRarity);
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
      v: 2,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      totalKills: this.totalKills,
      totalGold: this.totalGold,
      playTime: this.playTime,
      prestigeCount: this.prestigeCount,
      prestigePoints: this.prestigePoints,
      prestigeShop: { ...this.prestigeShop },
      currentClass: this.currentClass,
      unlockedClasses: [...this.unlockedClasses],
      upgrades: { ...this.upgrades },
      currentWave: this.currentWave,
      inventory:  this.inventory,
      equipment:  this.equipment,
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
      if (!data || (data.v !== 1 && data.v !== 2)) return false;

      this.level           = data.level ?? 1;
      this.xp              = data.xp ?? 0;
      this.gold            = data.gold ?? 0;
      this.totalKills      = data.totalKills ?? 0;
      this.totalGold       = data.totalGold ?? 0;
      this.playTime        = data.playTime ?? 0;
      this.prestigeCount   = data.prestigeCount ?? 0;
      this.prestigePoints  = data.prestigePoints ?? 0;
      this.prestigeShop    = data.prestigeShop ?? {};
      this.currentClass    = data.currentClass ?? 'novice';
      this.unlockedClasses = new Set(data.unlockedClasses ?? ['novice']);
      this.upgrades        = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0, ...data.upgrades };
      this.currentWave     = data.currentWave ?? 1;
      this.inventory       = data.inventory ?? [];
      this.equipment       = { weapon: null, armor: null, accessory: null, ...(data.equipment ?? {}) };

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
