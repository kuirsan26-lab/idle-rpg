/**
 * Mixin: сохранение, загрузка, автосейв, хард-ресет
 * Устанавливается на GameState.prototype
 */

import { CLASS_MAP } from '../data/classes.js';
import { getMobCount, createMobData } from '../data/mobs.js';

const OFFLINE_CAP_SEC  = 8 * 3600; // максимум засчитываемого офлайна
const OFFLINE_MIN_SEC  = 60;       // ниже — не показываем экран возвращения
const SIM_WAVE_CAP     = 4000;     // защита от зацикливания фазы продвижения

export function installSave(proto) {
  proto.save = function() {
    const data = {
      v: 2,
      level:          this.level,
      xp:             this.xp,
      gold:           this.gold,
      totalKills:     this.totalKills,
      totalGold:      this.totalGold,
      playTime:       this.playTime,
      prestigeCount:  this.prestigeCount,
      prestigePoints: this.prestigePoints,
      prestigeShop:   { ...this.prestigeShop },
      currentClass:    this.currentClass,
      unlockedClasses:  [...this.unlockedClasses],
      discoveredClasses: [...this.discoveredClasses],
      upgrades:       { ...this.upgrades },
      currentWave:    this.currentWave,
      maxWaveReached: this.maxWaveReached,
      inventory:      this.inventory,
      equipment:      this.equipment,
      completedAchievements: [...this.completedAchievements],
      bossKillCount:   this.bossKillCount,
      poisonKillCount: this.poisonKillCount,
      skillLevels:    { ...this.skillLevels },
      automation:     { ...this.automation },
      // Зоны
      currentZoneId:  this.currentZoneId,
      zoneWave:       this.zoneWave,
      globalWave:     this.globalWave,
      zonesProgress:  JSON.parse(JSON.stringify(this.zonesProgress)),
      timestamp:      Date.now(),
    };
    try {
      localStorage.setItem('idle_rpg_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  };

  proto._load = function() {
    try {
      const raw = localStorage.getItem('idle_rpg_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || (data.v !== 1 && data.v !== 2)) return false;

      this.level          = data.level ?? 1;
      this.xp             = data.xp ?? 0;
      this.gold           = data.gold ?? 0;
      this.totalKills     = data.totalKills ?? 0;
      this.totalGold      = data.totalGold ?? 0;
      this.playTime       = data.playTime ?? 0;
      this.prestigeCount  = data.prestigeCount ?? 0;
      this.prestigePoints = data.prestigePoints ?? 0;
      this.prestigeShop   = data.prestigeShop ?? {};
      this.currentClass   = data.currentClass ?? 'novice';
      // Миграция: авто-генерируемые depth-5 (devastator_0 и т.п.) заменены ручными —
      // откатываемся по суффиксу _0/_1 до ближайшего существующего предка.
      let _cls = this.currentClass;
      while (_cls && !CLASS_MAP.has(_cls)) {
        const _parent = _cls.replace(/_[01]$/, '');
        if (_parent === _cls) { _cls = 'novice'; break; }
        _cls = _parent;
      }
      this.currentClass = _cls;

      this.unlockedClasses = new Set(data.unlockedClasses ?? ['novice']);
      // Фильтруем удалённые авто-генерируемые ID из разблокированных
      this.unlockedClasses = new Set([...this.unlockedClasses].filter(id => CLASS_MAP.has(id)));
      if (!this.unlockedClasses.has('novice')) this.unlockedClasses.add('novice');

      // Миграция: старые сейвы без discoveredClasses — заполняем из unlockedClasses
      const rawDiscovered = data.discoveredClasses ?? [...this.unlockedClasses];
      this.discoveredClasses = new Set(rawDiscovered.filter(id => CLASS_MAP.has(id)));
      if (!this.discoveredClasses.has('novice')) this.discoveredClasses.add('novice');
      this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0, ...data.upgrades };
      this.currentWave    = data.currentWave ?? 1;
      this.maxWaveReached = data.maxWaveReached ?? (data.currentWave ?? 0);
      this.inventory      = data.inventory ?? [];
      this.equipment      = { weapon: null, armor: null, accessory: null, ...(data.equipment ?? {}) };
      this.completedAchievements = new Set(data.completedAchievements ?? []);
      this.bossKillCount   = data.bossKillCount ?? 0;
      this.poisonKillCount = data.poisonKillCount ?? 0;
      this.skillLevels = { novice: 0, warrior: 0, rogue: 0, archer: 0, mage: 0, ...(data.skillLevels ?? {}) };
      this.automation  = { autoCast: false, autoBuy: false, autoSell: 'off', ...(data.automation ?? {}) };

      // Зоны — миграция: старые сейвы без zonesProgress получают дефолт
      this.currentZoneId = data.currentZoneId ?? 'forest';
      this.zoneWave      = data.zoneWave      ?? 1;
      this.globalWave    = data.globalWave     ?? (data.currentWave ?? 1);
      const defaultZones = {
        forest:    { wavesCleared: 0, bossDefeated: false, unlocked: true  },
        catacombs: { wavesCleared: 0, bossDefeated: false, unlocked: false },
        volcano:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
        skyfort:   { wavesCleared: 0, bossDefeated: false, unlocked: false },
        abyss:     { wavesCleared: 0, bossDefeated: false, unlocked: false },
      };
      // Мерж: каждая зона отдельно, чтобы новые поля не терялись при расширении
      this.zonesProgress = {};
      for (const [id, def] of Object.entries(defaultZones)) {
        this.zonesProgress[id] = { ...def, ...(data.zonesProgress?.[id] ?? {}) };
      }

      // Офлайн-прогресс (до 8 часов) — волновая симуляция + экран возвращения
      const elapsed = Math.min((Date.now() - (data.timestamp ?? Date.now())) / 1000, OFFLINE_CAP_SEC);
      if (elapsed >= OFFLINE_MIN_SEC) {
        this.offlineSummary = this._simulateOffline(elapsed);
      }

      this.currentHp = this.getStats().maxHp;
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  };

  /**
   * Симуляция офлайн-прогресса по волнам.
   * Аналитически (не по тикам) оценивает, сколько волн игрок «прокрутил» бы
   * за elapsedSec секунд при текущей силе, накапливает золото/опыт/убийства/дроп.
   * Модель консервативная (скорее недооценит прогресс): сила фиксируется на момент
   * загрузки, выживаемость считается по самому опасному мобу волны.
   * @returns {object} summary для экрана «С возвращением»
   */
  proto._simulateOffline = function(elapsedSec) {
    const stats     = this.getStats();
    const playerDps = stats.atk * stats.spd;
    // Ожидаемый множитель от крита: E[dmg] = 1 + p*(critDmg-1)
    const critMult  = 1 + (stats.crit / 100) * (stats.critDmg / 100 - 1);

    const before = { wave: this.currentWave, level: this.level };
    const goldStart = this.totalGold;
    let kills = 0, drops = 0, deathsOnWave = 0;

    // Оценка одной волны: время зачистки + выживает ли игрок
    const evalWave = (wave) => {
      const count  = getMobCount(wave);
      const isBoss = wave % 10 === 0;
      let clearTime = 0, worstAtk = 0;
      const seeds = [];
      for (let i = 0; i < count; i++) {
        const isElite = !isBoss && wave % 5 === 0 && i === 0;
        const d = createMobData(wave, isElite);
        const perHit = Math.max(1, stats.atk - Math.round(d.def * 0.5)) * critMult;
        const effDps = Math.max(1, perHit * stats.spd);
        clearTime += (d.maxHp + (d.shieldHp || 0)) / effDps;
        worstAtk = Math.max(worstAtk, d.atk);
        seeds.push({ isElite, isBoss });
      }
      // Входящий урон от самого опасного моба, с учётом защиты/маг.щита/уворота/вампиризма
      const incoming = Math.max(1, worstAtk - Math.round(stats.def * 0.7))
        * (1 - stats.magicShield / 100) * (1 - stats.dodge / 100);
      const netDps  = incoming - playerDps * (stats.lifesteal / 100);
      const survive = netDps <= 0 || netDps * clearTime < stats.maxHp;
      return { count, clearTime, survive, seeds };
    };

    // Засчитать награды за зачистку волны (по каждому мобу — XP/золото/дроп)
    const grantWave = (wave, ev) => {
      for (const s of ev.seeds) {
        const d = createMobData(wave, s.isElite);
        this.addXp(d.xp);
        this.addGold(d.gold);
        this.totalKills++;
        if (d.isBoss) this.bossKillCount++;
        if (this.rollItemDrop(wave, d.isBoss, d.isElite)) drops++;
      }
      kills += ev.count;
    };

    let budget = elapsedSec;
    let wave   = this.currentWave;
    let lastCleared = wave - 1;
    let hitWall = false;
    let safety  = SIM_WAVE_CAP;

    // ── Фаза 1: продвижение по волнам, пока выживаем и хватает времени ──
    while (budget > 0 && safety-- > 0) {
      const ev = evalWave(wave);
      if (!ev.survive) {
        // Стена: в живой игре — серия смертей и откат. Дальше фармим последнюю взятую.
        deathsOnWave++;
        if (deathsOnWave >= 3 || wave % 10 === 0) { hitWall = true; break; }
        // мелкий штраф времени на неудачные попытки
        budget -= ev.clearTime * 0.5;
        continue;
      }
      if (budget < ev.clearTime) break; // не успеваем дочистить ещё одну
      budget -= ev.clearTime;
      grantWave(wave, ev);
      lastCleared = wave;
      wave++;
      deathsOnWave = 0;
    }

    // ── Фаза 2: фарм последней взятой волны оставшимся временем ──
    if (hitWall && budget > 0 && lastCleared >= 1) {
      const fw = lastCleared;
      const ev = evalWave(fw);
      if (ev.survive && ev.clearTime > 0) {
        const clears = Math.min(Math.floor(budget / ev.clearTime), 1_000_000);
        if (clears > 0) {
          // Награды считаем по образцу одной волны × число зачисток (батчем, без тиков)
          const sample = createMobData(fw, fw % 5 === 0 && fw % 10 !== 0);
          this.addXp(sample.xp * ev.count * clears);
          this.addGold(sample.gold * ev.count * clears);
          this.totalKills += ev.count * clears;
          kills += ev.count * clears;
          // Дроп — ограниченным числом бросков (инвентарь всё равно лимитирован)
          const rolls = Math.min(ev.count * clears, 60);
          for (let i = 0; i < rolls; i++) if (this.rollItemDrop(fw, false, false)) drops++;
        }
      }
    }

    // Где игрок окажется при возвращении
    this.currentWave = Math.max(1, wave);
    if (lastCleared > this.maxWaveReached) this.maxWaveReached = lastCleared;
    this.checkAchievements();

    return {
      elapsedSec,
      waveBefore: before.wave,  waveAfter:  this.currentWave,
      levelBefore: before.level, levelAfter: this.level,
      kills,
      gold: this.totalGold - goldStart,
      drops,
    };
  };

  proto._autoSave = function() {
    this._boundSave = () => this.save();
    setInterval(this._boundSave, 30_000);
    window.addEventListener('beforeunload', this._boundSave);
  };

  proto.hardReset = function() {
    window.removeEventListener('beforeunload', this._boundSave);
    localStorage.removeItem('idle_rpg_save');
    localStorage.removeItem('idle_rpg_seen_version');
    window.location.reload();
  };
}
