/**
 * Система предметов: генерация, редкости, бонусы
 */

const NAMES = {
  weapon:    ['Клинок', 'Меч', 'Топор', 'Копьё', 'Молот', 'Кинжал', 'Посох', 'Лук', 'Серп', 'Хлыст'],
  armor:     ['Кираса', 'Доспех', 'Мантия', 'Плащ', 'Щит', 'Латы', 'Кольчуга', 'Поножи'],
  accessory: ['Кольцо', 'Амулет', 'Талисман', 'Браслет', 'Медальон', 'Пояс', 'Символ'],
};

const PREFIXES = {
  rare: ['Зачарованный', 'Магический', 'Крепкий', 'Острый', 'Закалённый'],
  epic: ['Легендарный', 'Проклятый', 'Древний', 'Эпический', 'Мифический'],
};

export const RARITY_COLOR = { common: '#999', rare: '#4a9eff', epic: '#cc44ff' };
export const RARITY_LABEL = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический' };

export const ITEM_TYPE_ICON = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };
export const ITEM_TYPE_LABEL = { weapon: 'Оружие', armor: 'Броня', accessory: 'Аксессуар' };

export const SELL_VALUE = { common: 50, rare: 250, epic: 1500 };

const RARITY_MULT  = { common: 1.0, rare: 1.9, epic: 3.5 };
const ITEM_TYPES   = ['weapon', 'armor', 'accessory'];

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }

function bonusesForType(type, scale) {
  switch (type) {
    case 'weapon': {
      const b = { atk: parseFloat((rand(0.07, 0.11) * scale).toFixed(3)) };
      if (Math.random() < 0.4) b.crit = parseFloat((rand(0.01, 0.025) * scale).toFixed(3));
      if (Math.random() < 0.3) b.spd  = parseFloat((rand(0.01, 0.03)  * scale).toFixed(3));
      return b;
    }
    case 'armor': {
      const b = { hp: parseFloat((rand(0.07, 0.11) * scale).toFixed(3)) };
      if (Math.random() < 0.5) b.def = parseFloat((rand(0.03, 0.06) * scale).toFixed(3));
      return b;
    }
    case 'accessory': {
      const r = Math.random();
      if (r < 0.25) return { spd:     parseFloat((rand(0.03, 0.06) * scale).toFixed(3)) };
      if (r < 0.50) return { crit:    parseFloat((rand(0.02, 0.04) * scale).toFixed(3)),
                             critDmg: parseFloat((rand(0.04, 0.08) * scale).toFixed(3)) };
      if (r < 0.75) return { xpMult:  parseFloat((rand(0.05, 0.10) * scale).toFixed(3)) };
      return               { goldMult: parseFloat((rand(0.05, 0.10) * scale).toFixed(3)) };
    }
  }
}

/**
 * Генерация предмета.
 * @param {number} wave — текущая волна
 * @param {'common'|'rare'|'epic'|null} forcedRarity — принудительная редкость
 */
export function generateItem(wave, forcedRarity = null) {
  const waveTier = Math.min(Math.ceil(wave / 10), 10) - 1; // 0–9

  let rarity = forcedRarity;
  if (!rarity) {
    const r = Math.random();
    rarity = r < 0.05 ? 'epic' : r < 0.25 ? 'rare' : 'common';
  }

  const type     = pick(ITEM_TYPES);
  const baseName = pick(NAMES[type]);
  const prefix   = rarity === 'common' ? '' : pick(PREFIXES[rarity]);
  const name     = prefix ? `${prefix} ${baseName}` : baseName;

  const scale   = RARITY_MULT[rarity] * (1 + waveTier * 0.08);
  const bonuses = bonusesForType(type, scale);

  return {
    uid:     `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    rarity,
    name,
    bonuses,
    wave,
  };
}

/** Локализованное описание бонусов предмета */
export function formatBonuses(bonuses) {
  const LABELS = {
    atk: 'ATK', hp: 'HP', def: 'DEF', spd: 'SPD',
    crit: 'CRIT', critDmg: 'CRITDMG', xpMult: 'XP', goldMult: 'GOLD',
  };
  return Object.entries(bonuses)
    .map(([k, v]) => `+${(v * 100).toFixed(1)}% ${LABELS[k] ?? k}`)
    .join('  ');
}
