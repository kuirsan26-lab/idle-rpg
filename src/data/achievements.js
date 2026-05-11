import { CLASS_MAP } from './classes.js';

export const ACHIEVEMENTS = [
  // ── Ранняя игра ──────────────────────────────────────────────────
  {
    id: 'first_blood',
    name: 'Первая кровь',
    desc: 'Убить первого моба',
    pp: 1,
    progress: s => ({ cur: Math.min(s.totalKills, 1), max: 1 }),
    check: s => s.totalKills >= 1,
  },
  {
    id: 'survivor',
    name: 'Выживший',
    desc: 'Пройти волну 10',
    pp: 2,
    progress: s => ({ cur: Math.min(s.maxWaveReached, 10), max: 10 }),
    check: s => s.maxWaveReached >= 10,
  },
  {
    id: 'second_path',
    name: 'Второй путь',
    desc: 'Взять класс глубины 2',
    pp: 1,
    check: s => [...s.discoveredClasses].some(id => (CLASS_MAP.get(id)?.depth ?? 0) >= 2),
  },
  {
    id: 'equipped',
    name: 'Экипированный',
    desc: 'Надеть предметы во все 3 слота',
    pp: 2,
    check: s => Object.values(s.equipment).filter(Boolean).length >= 3,
  },

  // ── Боевые цели ──────────────────────────────────────────────────
  {
    id: 'fighter',
    name: 'Боец',
    desc: '500 убийств',
    pp: 2,
    progress: s => ({ cur: Math.min(s.totalKills, 500), max: 500 }),
    check: s => s.totalKills >= 500,
  },
  {
    id: 'veteran',
    name: 'Ветеран',
    desc: '5 000 убийств',
    pp: 4,
    progress: s => ({ cur: Math.min(s.totalKills, 5000), max: 5000 }),
    check: s => s.totalKills >= 5000,
  },
  {
    id: 'marshal',
    name: 'Маршал',
    desc: '50 000 убийств',
    pp: 8,
    progress: s => ({ cur: Math.min(s.totalKills, 50000), max: 50000 }),
    check: s => s.totalKills >= 50000,
  },
  {
    id: 'conqueror',
    name: 'Завоеватель',
    desc: 'Пройти волну 50',
    pp: 5,
    progress: s => ({ cur: Math.min(s.maxWaveReached, 50), max: 50 }),
    check: s => s.maxWaveReached >= 50,
  },
  {
    id: 'legend',
    name: 'Легенда',
    desc: 'Пройти волну 100',
    pp: 10,
    progress: s => ({ cur: Math.min(s.maxWaveReached, 100), max: 100 }),
    check: s => s.maxWaveReached >= 100,
  },
  {
    id: 'boss_hunter',
    name: 'Охотник на боссов',
    desc: 'Убить 10 боссов',
    pp: 3,
    progress: s => ({ cur: Math.min(s.bossKillCount, 10), max: 10 }),
    check: s => s.bossKillCount >= 10,
  },

  // ── Дерево классов ───────────────────────────────────────────────
  {
    id: 'collector',
    name: 'Коллекционер',
    desc: 'Открыть 20 классов',
    pp: 3,
    progress: s => ({ cur: Math.min(s.discoveredClasses.size, 20), max: 20 }),
    check: s => s.discoveredClasses.size >= 20,
  },
  {
    id: 'four_paths',
    name: 'Четыре пути',
    desc: 'Открыть класс depth-2 во всех 4 ветках',
    pp: 3,
    check: s => ['warrior', 'rogue', 'archer', 'mage'].every(br =>
      [...s.discoveredClasses].some(id => {
        const c = CLASS_MAP.get(id);
        return c?.branch === br && c?.depth === 2;
      })
    ),
  },
  {
    id: 'master',
    name: 'Мастер',
    desc: 'Достичь класса глубины 5',
    pp: 5,
    check: s => (CLASS_MAP.get(s.currentClass)?.depth ?? 0) >= 5,
  },
  {
    id: 'chosen',
    name: 'Избранный',
    desc: 'Открыть первый ⭐ престиж-класс',
    pp: 5,
    check: s => [...s.discoveredClasses].some(id => CLASS_MAP.get(id)?.prestige === 1),
  },
  {
    id: 'ascension',
    name: 'Вознесение',
    desc: 'Открыть первый ⭐⭐ престиж-класс',
    pp: 10,
    check: s => [...s.discoveredClasses].some(id => CLASS_MAP.get(id)?.prestige === 2),
  },

  // ── Специальные ──────────────────────────────────────────────────
  {
    id: 'first_prestige',
    name: 'Перерождение',
    desc: 'Совершить первый престиж',
    pp: 3,
    check: s => s.prestigeCount >= 1,
  },
  {
    id: 'gold_hoard',
    name: 'Золотой запас',
    desc: 'Заработать 500 000 золота суммарно',
    pp: 3,
    progress: s => ({ cur: Math.min(s.totalGold, 500000), max: 500000 }),
    check: s => s.totalGold >= 500000,
  },

  // ── Скрытые ──────────────────────────────────────────────────────
  {
    id: 'phantom',
    name: 'Призрак',
    desc: 'Достичь 60% уворота',
    pp: 4,
    hidden: true,
    check: s => s.getStats().dodge >= 60,
  },
  {
    id: 'vampire',
    name: 'Вампир',
    desc: 'Достичь 30% вампиризма',
    pp: 4,
    hidden: true,
    check: s => s.getStats().lifesteal >= 30,
  },
  {
    id: 'poison_master_ach',
    name: 'Мастер яда',
    desc: 'Убить 1 000 мобов ядом',
    pp: 5,
    hidden: true,
    progress: s => ({ cur: Math.min(s.poisonKillCount, 1000), max: 1000 }),
    check: s => s.poisonKillCount >= 1000,
  },
];

export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
