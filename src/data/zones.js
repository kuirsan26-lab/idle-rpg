/**
 * Зоны: 5 линейных зон, каждая из 20 волн + финальный босс (волна 21 зоны)
 * Зоны разблокируются последовательно после победы над боссом предыдущей зоны.
 */

export const ZONES = [
  {
    id: 'forest',
    name: 'Тёмный Лес',
    nameEn: 'Dark Forest',
    icon: '🌑',
    waves: 20,
    mobPool: ['goblin', 'slime', 'skeleton'],
    bossId: 'boss_forest_guardian',
    bgKey: 'bg_01_10',
    unlocked: true,
  },
  {
    id: 'catacombs',
    name: 'Катакомбы',
    nameEn: 'Catacombs',
    icon: '💀',
    waves: 20,
    mobPool: ['skeleton', 'orc', 'demon'],
    bossId: 'boss_undead_king',
    bgKey: 'bg_11_20',
    unlocked: false,
  },
  {
    id: 'volcano',
    name: 'Вулканические Пещеры',
    nameEn: 'Volcanic Caves',
    icon: '🔥',
    waves: 20,
    mobPool: ['troll', 'dragonling', 'demon'],
    bossId: 'boss_fire_titan',
    bgKey: 'bg_21_30',
    unlocked: false,
  },
  {
    id: 'skyfort',
    name: 'Небесная Крепость',
    nameEn: 'Sky Fortress',
    icon: '⚡',
    waves: 20,
    mobPool: ['dragonling', 'dragon', 'lich'],
    bossId: 'boss_dark_archangel',
    bgKey: 'bg_31_40',
    unlocked: false,
  },
  {
    id: 'abyss',
    name: 'Бездна',
    nameEn: 'The Abyss',
    icon: '🌀',
    waves: 20,
    mobPool: ['lich', 'dragon', 'archdemon'],
    bossId: 'boss_chaos_lord',
    bgKey: 'bg_41_50',
    unlocked: false,
  },
];

export const ZONES_MAP = new Map(ZONES.map(z => [z.id, z]));
export const ZONE_IDS  = ZONES.map(z => z.id);
