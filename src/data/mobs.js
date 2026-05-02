/**
 * Мобы: 10 типов, волновая система
 * Тир моба = ceil(currentWave / 5), но не больше 10
 * Боссы каждые 10 волн
 */

export const MOB_TYPES = [
  {
    id: 'slime',
    name: 'Слизень',
    tier: 1,
    color: 0x44bb44,
    shape: 'circle',
    baseHp: 40,
    baseAtk: 5,
    baseDef: 0,
    baseXp: 8,
    baseGold: 4,
    speed: 50,
  },
  {
    id: 'goblin',
    name: 'Гоблин',
    tier: 1,
    color: 0x88cc44,
    shape: 'diamond',
    baseHp: 55,
    baseAtk: 8,
    baseDef: 1,
    baseXp: 12,
    baseGold: 6,
    speed: 75,
  },
  {
    id: 'skeleton',
    name: 'Скелет',
    tier: 2,
    color: 0xddddcc,
    shape: 'rect',
    baseHp: 80,
    baseAtk: 12,
    baseDef: 3,
    baseXp: 18,
    baseGold: 9,
    speed: 60,
  },
  {
    id: 'orc',
    name: 'Орк',
    tier: 3,
    color: 0x668833,
    shape: 'rect',
    baseHp: 150,
    baseAtk: 18,
    baseDef: 6,
    baseXp: 28,
    baseGold: 14,
    speed: 45,
  },
  {
    id: 'troll',
    name: 'Тролль',
    tier: 4,
    color: 0x556644,
    shape: 'rect',
    baseHp: 280,
    baseAtk: 24,
    baseDef: 10,
    baseXp: 45,
    baseGold: 22,
    speed: 38,
  },
  {
    id: 'dragonling',
    name: 'Дракончик',
    tier: 5,
    color: 0xff6633,
    shape: 'diamond',
    baseHp: 400,
    baseAtk: 32,
    baseDef: 14,
    baseXp: 70,
    baseGold: 35,
    speed: 80,
  },
  {
    id: 'demon',
    name: 'Демон',
    tier: 6,
    color: 0xcc2222,
    shape: 'circle',
    baseHp: 600,
    baseAtk: 45,
    baseDef: 18,
    baseXp: 110,
    baseGold: 55,
    speed: 65,
  },
  {
    id: 'lich',
    name: 'Личь',
    tier: 7,
    color: 0x8833cc,
    shape: 'rect',
    baseHp: 900,
    baseAtk: 60,
    baseDef: 22,
    baseXp: 165,
    baseGold: 82,
    speed: 55,
  },
  {
    id: 'dragon',
    name: 'Дракон',
    tier: 8,
    color: 0xff3300,
    shape: 'diamond',
    baseHp: 1400,
    baseAtk: 80,
    baseDef: 30,
    baseXp: 250,
    baseGold: 125,
    speed: 70,
  },
  {
    id: 'archdemon',
    name: 'Архидемон',
    tier: 9,
    color: 0x990000,
    shape: 'circle',
    baseHp: 2200,
    baseAtk: 110,
    baseDef: 40,
    baseXp: 380,
    baseGold: 190,
    speed: 60,
  },
];

// Боссы (появляются каждые 10 волн)
export const BOSS_TYPES = [
  { id: 'boss_slime_king',   name: 'Король Слизней',    tier: 1,  color: 0x00ff88, shape: 'circle', hpMult: 8,  atkMult: 4,  defMult: 2,  xpMult: 10, goldMult: 8 },
  { id: 'boss_goblin_chief', name: 'Вождь Гоблинов',    tier: 2,  color: 0xaaff00, shape: 'diamond',hpMult: 8,  atkMult: 4,  defMult: 2,  xpMult: 10, goldMult: 8 },
  { id: 'boss_bone_king',    name: 'Костяной Король',   tier: 3,  color: 0xffffff, shape: 'rect',   hpMult: 8,  atkMult: 4,  defMult: 2,  xpMult: 10, goldMult: 8 },
  { id: 'boss_orc_warlord',  name: 'Орочий Военачальник',tier: 4, color: 0x44aa00, shape: 'rect',   hpMult: 8,  atkMult: 4,  defMult: 2,  xpMult: 10, goldMult: 8 },
  { id: 'boss_troll_ancient',name: 'Древний Тролль',    tier: 5,  color: 0x336622, shape: 'rect',   hpMult: 10, atkMult: 4,  defMult: 3,  xpMult: 15, goldMult: 12 },
  { id: 'boss_fire_dragon',  name: 'Огненный Дракон',   tier: 6,  color: 0xff4400, shape: 'diamond',hpMult: 10, atkMult: 4,  defMult: 3,  xpMult: 15, goldMult: 12 },
  { id: 'boss_demon_lord',   name: 'Лорд Демонов',      tier: 7,  color: 0xdd0000, shape: 'circle', hpMult: 12, atkMult: 5,  defMult: 4,  xpMult: 20, goldMult: 15 },
  { id: 'boss_lich_king',    name: 'Король Личей',       tier: 8,  color: 0xaa00ff, shape: 'rect',   hpMult: 12, atkMult: 5,  defMult: 4,  xpMult: 20, goldMult: 15 },
  { id: 'boss_dragon_ancient',name: 'Праотец Драконов', tier: 9,  color: 0xff2200, shape: 'diamond',hpMult: 15, atkMult: 6,  defMult: 5,  xpMult: 25, goldMult: 20 },
  { id: 'boss_chaos_lord',   name: 'Повелитель Хаоса',  tier: 10, color: 0xff0088, shape: 'circle', hpMult: 20, atkMult: 8,  defMult: 6,  xpMult: 35, goldMult: 30 },
];

// ── Флаги мобов ────────────────────────────────────────────────────────────────
// shield  — поглощает shieldHp урона перед HP (pierce не помогает)
// regen   — восстанавливает 2% maxHp каждые 400ms
// armored — DEF×1.5; крит полностью игнорирует броню (pierce становится ценен)
// swift   — speed×2, HP×0.5
export const FLAG_ICONS = { shield: '🛡', regen: '💚', armored: '⚔', swift: '⚡' };
const ALL_FLAGS = ['shield', 'regen', 'armored', 'swift'];

function rollFlags(isBoss, isElite) {
  const shuffled = [...ALL_FLAGS].sort(() => Math.random() - 0.5);
  if (isBoss)   return shuffled.slice(0, Math.random() < 0.5 ? 2 : 1);
  if (isElite)  return shuffled.slice(0, Math.random() < 0.5 ? 2 : 1);
  return Math.random() < 0.30 ? [shuffled[0]] : [];
}

/**
 * Боевой масштаб: логарифм с нарастающим коэффициентом.
 * k стартует с 0.55 и прибавляет 0.05 каждые 5 волн.
 * wave 10 ≈ 2.38x | wave 20 ≈ 3.10x | wave 40 ≈ 4.32x | wave 100 ≈ 7.91x
 */
function combatScale(wave) {
  const tier = Math.floor((wave - 1) / 5);
  const k = 0.55 + 0.10 * tier;
  return 1 + k * Math.log(wave);
}

/**
 * Наградной масштаб: экспоненциальный — XP и золото растут быстро,
 * чтобы прокачка и апгрейды оставались значимыми на любой волне.
 */
function rewardScale(wave) {
  return Math.pow(1.06, wave - 1);
}

/**
 * Создать данные моба для заданной волны.
 * @param {number} wave
 * @param {boolean} [isElite] — элита: HP×3, ATK×1.8, гарантированный дроп редкого предмета
 */
export function createMobData(wave, isElite = false) {
  const isBoss = wave % 10 === 0;
  const flags  = rollFlags(isBoss, isElite);

  if (isBoss) {
    const bossIdx      = Math.min(Math.floor(wave / 10) - 1, BOSS_TYPES.length - 1);
    const bossTemplate = BOSS_TYPES[bossIdx];
    const baseType     = MOB_TYPES[Math.min(bossIdx, MOB_TYPES.length - 1)];
    const cs = combatScale(wave);
    const rs = rewardScale(wave);

    let maxHp = Math.round(baseType.baseHp * cs * bossTemplate.hpMult);
    let def   = Math.round(baseType.baseDef * Math.sqrt(cs) * bossTemplate.defMult);
    let speed = baseType.speed * 1.1;
    if (flags.includes('armored')) def   = Math.round(def * 1.5);
    if (flags.includes('swift'))   { speed *= 2; maxHp = Math.round(maxHp * 0.5); }
    const shieldHp = flags.includes('shield') ? Math.ceil(maxHp * 0.25) : 0;

    return {
      id: bossTemplate.id, name: bossTemplate.name,
      color: bossTemplate.color, shape: bossTemplate.shape,
      maxHp, atk: Math.round(baseType.baseAtk * cs * bossTemplate.atkMult),
      def, xp: Math.round(baseType.baseXp * rs * bossTemplate.xpMult),
      gold: Math.round(baseType.baseGold * rs * bossTemplate.goldMult),
      speed, isBoss: true, isElite: false, tier: bossTemplate.tier,
      flags, shieldHp,
    };
  }

  // Выбор типа моба в зависимости от волны
  const tierMax  = Math.min(Math.ceil(wave / 5), MOB_TYPES.length);
  const tierMin  = Math.max(tierMax - 2, 0);
  const typeIdx  = tierMin + Math.floor(Math.random() * (tierMax - tierMin + 1));
  const template = MOB_TYPES[Math.min(typeIdx, MOB_TYPES.length - 1)];
  const cs = combatScale(wave);
  const rs = rewardScale(wave);

  let maxHp = Math.round(template.baseHp * cs);
  let def   = Math.round(template.baseDef * Math.sqrt(cs));
  let speed = template.speed;
  let atk   = Math.round(template.baseAtk * cs);

  if (isElite) { maxHp = Math.round(maxHp * 3); atk = Math.round(atk * 1.8); }
  if (flags.includes('armored')) def   = Math.round(def * 1.5);
  if (flags.includes('swift'))   { speed *= 2; maxHp = Math.round(maxHp * 0.5); }
  const shieldHp = flags.includes('shield') ? Math.ceil(maxHp * 0.25) : 0;

  return {
    id: template.id,
    name: isElite ? `⚡ ${template.name}` : template.name,
    color: isElite ? 0xffdd00 : template.color,
    shape: template.shape,
    maxHp, atk, def,
    xp:    Math.round(template.baseXp  * rs * (isElite ? 3 : 1)),
    gold:  Math.round(template.baseGold * rs * (isElite ? 3 : 1)),
    speed, isBoss: false, isElite, tier: template.tier,
    flags, shieldHp,
  };
}

/** Количество мобов на волне */
export function getMobCount(wave) {
  if (wave % 10 === 0) return 1; // босс — один
  return Math.min(3 + Math.floor(wave / 4), 8);
}
