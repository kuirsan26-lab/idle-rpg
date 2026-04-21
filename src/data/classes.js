/**
 * Дерево классов: 10 уровней глубины
 * Depth 0: Новичок (1 класс)
 * Depth 1: Воин, Плут, Лучник, Маг (4 класса)
 * Depth 2–4: вручную (56 классов)
 * Depth 5–10: генерируются автоматически (~4032 класса)
 */

// Цвет для каждой ветки
export const BRANCH_COLORS = {
  warrior: '#e74c3c',
  rogue:   '#9b59b6',
  archer:  '#2ecc71',
  mage:    '#3498db',
  novice:  '#aaaaaa',
};

// Hex-цвета для Phaser
export const BRANCH_HEX = {
  warrior: 0xe74c3c,
  rogue:   0x9b59b6,
  archer:  0x2ecc71,
  mage:    0x3498db,
  novice:  0xaaaaaa,
};

// Модификаторы имён для генерируемых глубин 5–10
const DEPTH_MODIFIERS = {
  5:  ['Великий',      'Тёмный'],
  6:  ['Древний',      'Проклятый'],
  7:  ['Легендарный',  'Мифический'],
  8:  ['Бессмертный',  'Вечный'],
  9:  ['Небесный',     'Адский'],
  10: ['Верховный',    'Абсолютный'],
};

// Уровень игрока, необходимый для разблокировки
export const DEPTH_LEVEL_REQ = [0, 5, 15, 30, 50, 65, 75, 83, 90, 95, 99];

// Стоимость в золоте для смены класса
export const DEPTH_GOLD_COST = [
  0, 200, 800, 3_000, 12_000,
  50_000, 200_000, 800_000, 3_000_000, 10_000_000, 40_000_000,
];

// Ручное определение классов (depths 1–4)
const MANUAL_CLASSES = [
  // ── DEPTH 1 ──────────────────────────────────────────────────────
  { id: 'warrior', name: 'Воин',    parent: 'novice', branch: 'warrior', desc: 'Мастер ближнего боя, непоколебимый и выносливый', bonuses: { atk: 0.20, hp: 0.15, def: 0.10 } },
  { id: 'rogue',   name: 'Плут',    parent: 'novice', branch: 'rogue',   desc: 'Быстрый и хитрый, специалист по критическим ударам', bonuses: { atk: 0.15, spd: 0.20, crit: 0.05, dodge: 0.05 } },
  { id: 'archer',  name: 'Лучник',  parent: 'novice', branch: 'archer',  desc: 'Меткий стрелок, атакующий издалека', bonuses: { atk: 0.18, spd: 0.15, crit: 0.07 } },
  { id: 'mage',    name: 'Маг',     parent: 'novice', branch: 'mage',    desc: 'Повелитель магических сил, получает больше опыта', bonuses: { atk: 0.25, xpMult: 0.20, goldMult: 0.10 } },

  // ── DEPTH 2 ──────────────────────────────────────────────────────
  // Воин
  { id: 'berserker', name: 'Берсерк',  parent: 'warrior', branch: 'warrior', desc: 'Яростный боец, жертвующий защитой ради сокрушительных ударов', bonuses: { atk: 0.30, spd: 0.15, hp: 0.10 } },
  { id: 'paladin',   name: 'Паладин',  parent: 'warrior', branch: 'warrior', desc: 'Священный воин, сочетающий силу и защиту', bonuses: { hp: 0.25, def: 0.25, atk: 0.10, thorns: 0.06 } },
  // Плут
  { id: 'assassin',  name: 'Убийца',   parent: 'rogue',   branch: 'rogue',   desc: 'Специалист по молниеносным смертельным атакам', bonuses: { atk: 0.25, crit: 0.10, spd: 0.15 } },
  { id: 'thief',     name: 'Вор',      parent: 'rogue',   branch: 'rogue',   desc: 'Мастер по добыче золота и ценностей', bonuses: { spd: 0.20, goldMult: 0.30, crit: 0.05 } },
  // Лучник
  { id: 'ranger',    name: 'Рейнджер', parent: 'archer',  branch: 'archer',  desc: 'Страж природы, связанный с дикими землями', bonuses: { atk: 0.20, spd: 0.15, hp: 0.15, xpMult: 0.10 } },
  { id: 'sniper',    name: 'Снайпер',  parent: 'archer',  branch: 'archer',  desc: 'Мастер точных выстрелов с чудовищным критическим уроном', bonuses: { atk: 0.15, crit: 0.15, critDmg: 0.30 } },
  // Маг
  { id: 'druid',     name: 'Друид',    parent: 'mage',    branch: 'mage',    desc: 'Хранитель природы, накапливающий опыт быстрее всех', bonuses: { xpMult: 0.30, hp: 0.20, atk: 0.15 } },
  { id: 'alchemist', name: 'Алхимик',  parent: 'mage',    branch: 'mage',    desc: 'Мастер зелий, превращающий врагов в золото', bonuses: { atk: 0.20, goldMult: 0.30, crit: 0.10 } },

  // ── DEPTH 3 ──────────────────────────────────────────────────────
  // Берсерк
  { id: 'destroyer',   name: 'Разрушитель', parent: 'berserker', branch: 'warrior', desc: 'Непреодолимая сила разрушения', bonuses: { atk: 0.35, hp: 0.15, spd: 0.10 } },
  { id: 'bloodthirst', name: 'Кровожад',    parent: 'berserker', branch: 'warrior', desc: 'Восстанавливает жизнь с каждым убийством', bonuses: { atk: 0.30, hp: 0.20, crit: 0.10, lifesteal: 0.08 } },
  // Паладин
  { id: 'crusader',    name: 'Крестоносец', parent: 'paladin',   branch: 'warrior', desc: 'Непоколебимый воин святого дела', bonuses: { def: 0.30, hp: 0.25, atk: 0.15, thorns: 0.10 } },
  { id: 'inquisitor',  name: 'Инквизитор',  parent: 'paladin',   branch: 'warrior', desc: 'Неумолимый охотник на нечисть', bonuses: { atk: 0.30, crit: 0.10, def: 0.20 } },
  // Убийца
  { id: 'ninja',       name: 'Ниндзя',      parent: 'assassin',  branch: 'rogue',   desc: 'Невидимый мастер теней', bonuses: { spd: 0.25, crit: 0.15, atk: 0.20, dodge: 0.08 } },
  { id: 'mercenary',   name: 'Наёмник',     parent: 'assassin',  branch: 'rogue',   desc: 'Профессиональный боец, работающий за золото', bonuses: { atk: 0.25, goldMult: 0.20, spd: 0.15 } },
  // Вор
  { id: 'pickpocket',  name: 'Карманник',   parent: 'thief',     branch: 'rogue',   desc: 'Виртуоз быстрого обогащения', bonuses: { goldMult: 0.40, spd: 0.20, crit: 0.10 } },
  { id: 'bandit',      name: 'Разбойник',   parent: 'thief',     branch: 'rogue',   desc: 'Опасный бандит с тяжёлым ножом', bonuses: { atk: 0.30, spd: 0.15, hp: 0.15 } },
  // Рейнджер
  { id: 'forest_guard', name: 'Страж Леса', parent: 'ranger',   branch: 'archer',  desc: 'Защитник лесных угодий', bonuses: { hp: 0.20, def: 0.20, atk: 0.20, xpMult: 0.15 } },
  { id: 'tracker',      name: 'Следопыт',   parent: 'ranger',   branch: 'archer',  desc: 'Неуловимый охотник, всегда находящий добычу', bonuses: { spd: 0.25, atk: 0.25, xpMult: 0.15 } },
  // Снайпер
  { id: 'eagle_eye',   name: 'Орлиный Глаз',    parent: 'sniper',    branch: 'archer', desc: 'Никогда не промахивается', bonuses: { crit: 0.20, critDmg: 0.40, atk: 0.15 } },
  { id: 'dark_shot',   name: 'Тёмный Стрелок',  parent: 'sniper',    branch: 'archer', desc: 'Отравляет врагов своими стрелами', bonuses: { atk: 0.25, crit: 0.15, critDmg: 0.25 } },
  // Друид
  { id: 'archdruid',   name: 'Архидруид',        parent: 'druid',     branch: 'mage',   desc: 'Высший адепт природной магии', bonuses: { xpMult: 0.35, hp: 0.25, atk: 0.15 } },
  { id: 'shaman',      name: 'Шаман',             parent: 'druid',     branch: 'mage',   desc: 'Призывает силы духов предков', bonuses: { xpMult: 0.25, atk: 0.25, spd: 0.15 } },
  // Алхимик
  { id: 'potion_master', name: 'Зельевар',  parent: 'alchemist', branch: 'mage', desc: 'Мастер зелий невероятной силы', bonuses: { atk: 0.25, goldMult: 0.25, hp: 0.20 } },
  { id: 'bombardier',    name: 'Бомбардир', parent: 'alchemist', branch: 'mage', desc: 'Взрывчатые соединения сносят врагов', bonuses: { atk: 0.35, crit: 0.15, goldMult: 0.15 } },

  // ── DEPTH 4 ──────────────────────────────────────────────────────
  // Разрушитель
  { id: 'devastator',  name: 'Опустошитель',  parent: 'destroyer',   branch: 'warrior', desc: 'Оставляет за собой только руины', bonuses: { atk: 0.40, hp: 0.15, spd: 0.10 } },
  { id: 'thunderer',   name: 'Громовержец',   parent: 'destroyer',   branch: 'warrior', desc: 'Удары звучат как раскаты грома', bonuses: { atk: 0.35, crit: 0.10, spd: 0.15 } },
  // Кровожад
  { id: 'vampire',     name: 'Вампир',        parent: 'bloodthirst', branch: 'warrior', desc: 'Пьёт жизненную силу врагов', bonuses: { atk: 0.25, hp: 0.30, crit: 0.15, lifesteal: 0.12 } },
  { id: 'bloodlord',   name: 'Лорд Крови',    parent: 'bloodthirst', branch: 'warrior', desc: 'Повелитель кровопролития', bonuses: { atk: 0.35, hp: 0.20, crit: 0.10, lifesteal: 0.10 } },
  // Крестоносец
  { id: 'faith_guard', name: 'Страж Веры',    parent: 'crusader',    branch: 'warrior', desc: 'Несокрушимый защитник', bonuses: { def: 0.40, hp: 0.30, atk: 0.10, thorns: 0.15 } },
  { id: 'light_knight',name: 'Рыцарь Света',  parent: 'crusader',    branch: 'warrior', desc: 'Воин, освящённый светом', bonuses: { hp: 0.25, atk: 0.25, def: 0.25 } },
  // Инквизитор
  { id: 'dark_judge',    name: 'Тёмный Судья',       parent: 'inquisitor', branch: 'warrior', desc: 'Выносит смертные приговоры', bonuses: { atk: 0.35, crit: 0.15, def: 0.15 } },
  { id: 'witch_hunter',  name: 'Охотник на Ведьм',   parent: 'inquisitor', branch: 'warrior', desc: 'Специализируется на магических противниках', bonuses: { atk: 0.30, xpMult: 0.15, crit: 0.15 } },
  // Ниндзя
  { id: 'shadow',      name: 'Тень',     parent: 'ninja',      branch: 'rogue', desc: 'Никто не видит его движений', bonuses: { spd: 0.30, crit: 0.20, atk: 0.15, dodge: 0.10 } },
  { id: 'ghost',       name: 'Призрак',  parent: 'ninja',      branch: 'rogue', desc: 'Движется сквозь стены', bonuses: { spd: 0.35, atk: 0.20, crit: 0.15, dodge: 0.12 } },
  // Наёмник
  { id: 'gladiator',      name: 'Гладиатор',          parent: 'mercenary', branch: 'rogue', desc: 'Ветеран кровавой арены', bonuses: { atk: 0.30, hp: 0.20, def: 0.15, goldMult: 0.15 } },
  { id: 'bounty_hunter',  name: 'Охотник за Головами', parent: 'mercenary', branch: 'rogue', desc: 'Получает бонус за каждое убийство', bonuses: { atk: 0.25, goldMult: 0.35, crit: 0.10 } },
  // Карманник
  { id: 'swindler',    name: 'Мошенник',    parent: 'pickpocket', branch: 'rogue', desc: 'Обманывает всех на пути', bonuses: { goldMult: 0.45, spd: 0.20, crit: 0.10 } },
  { id: 'adventurer',  name: 'Авантюрист',  parent: 'pickpocket', branch: 'rogue', desc: 'Всегда в поисках приключений', bonuses: { xpMult: 0.20, goldMult: 0.25, atk: 0.15, spd: 0.15 } },
  // Разбойник
  { id: 'outlaw',  name: 'Изгой', parent: 'bandit', branch: 'rogue', desc: 'Вне закона и вне пощады', bonuses: { atk: 0.35, spd: 0.20, crit: 0.10 } },
  { id: 'pirate',  name: 'Пират', parent: 'bandit', branch: 'rogue', desc: 'Грабитель морей и суши', bonuses: { atk: 0.25, goldMult: 0.25, spd: 0.15, hp: 0.10 } },
  // Страж Леса
  { id: 'green_guardian', name: 'Зелёный Страж',    parent: 'forest_guard', branch: 'archer', desc: 'Защита леса — его призвание', bonuses: { hp: 0.30, def: 0.25, atk: 0.15 } },
  { id: 'beast_tamer',    name: 'Укротитель Зверей', parent: 'forest_guard', branch: 'archer', desc: 'Повелевает дикими зверями', bonuses: { atk: 0.25, hp: 0.20, xpMult: 0.20 } },
  // Следопыт
  { id: 'forest_spirit',  name: 'Лесной Дух',        parent: 'tracker', branch: 'archer', desc: 'Стал частью самого леса', bonuses: { spd: 0.25, xpMult: 0.20, atk: 0.20, hp: 0.15 } },
  { id: 'monster_hunter', name: 'Охотник на Монстров', parent: 'tracker', branch: 'archer', desc: 'Охотится на самую опасную дичь', bonuses: { atk: 0.30, crit: 0.15, xpMult: 0.15 } },
  // Орлиный Глаз
  { id: 'marksman',    name: 'Меткий Стрелок', parent: 'eagle_eye', branch: 'archer', desc: 'Попадает с любого расстояния', bonuses: { crit: 0.25, critDmg: 0.45, atk: 0.10 } },
  { id: 'crossbowman', name: 'Арбалетчик',     parent: 'eagle_eye', branch: 'archer', desc: 'Мощные болты пробивают любую броню', bonuses: { atk: 0.35, crit: 0.15, def: 0.10 } },
  // Тёмный Стрелок
  { id: 'poison_arrow',  name: 'Отравленная Стрела', parent: 'dark_shot', branch: 'archer', desc: 'Яд медленно съедает врага', bonuses: { atk: 0.30, crit: 0.20, critDmg: 0.20 } },
  { id: 'shadow_archer', name: 'Теневой Лучник',     parent: 'dark_shot', branch: 'archer', desc: 'Стреляет из кромешной тьмы', bonuses: { atk: 0.25, spd: 0.20, crit: 0.15, critDmg: 0.20 } },
  // Архидруид
  { id: 'nature_warden',  name: 'Хранитель Природы', parent: 'archdruid', branch: 'mage', desc: 'Природа подчиняется его слову', bonuses: { xpMult: 0.40, hp: 0.30, atk: 0.10 } },
  { id: 'voice_of_nature', name: 'Голос Природы',    parent: 'archdruid', branch: 'mage', desc: 'Говорит от имени всего живого', bonuses: { xpMult: 0.35, atk: 0.20, hp: 0.20 } },
  // Шаман
  { id: 'spirit_seer',  name: 'Духовидец',        parent: 'shaman', branch: 'mage', desc: 'Видит сквозь завесу миров', bonuses: { xpMult: 0.30, atk: 0.25, spd: 0.10, hp: 0.10 } },
  { id: 'spirit_lord',  name: 'Повелитель Духов', parent: 'shaman', branch: 'mage', desc: 'Командует легионами духов', bonuses: { atk: 0.30, xpMult: 0.25, hp: 0.15 } },
  // Зельевар
  { id: 'brew_master', name: 'Мастер Зелий', parent: 'potion_master', branch: 'mage', desc: 'Зелья чудовищной силы', bonuses: { atk: 0.30, goldMult: 0.25, hp: 0.20 } },
  { id: 'apothecary',  name: 'Аптекарь',    parent: 'potion_master', branch: 'mage', desc: 'Лечит и отравляет с равным мастерством', bonuses: { hp: 0.30, atk: 0.25, goldMult: 0.20 } },
  // Бомбардир
  { id: 'pyromaniac',      name: 'Пиротехник',  parent: 'bombardier', branch: 'mage', desc: 'Обожает взрывы и огонь', bonuses: { atk: 0.40, crit: 0.15, goldMult: 0.10 } },
  { id: 'explosive_expert', name: 'Взрывотехник', parent: 'bombardier', branch: 'mage', desc: 'Мастер разрушительных веществ', bonuses: { atk: 0.35, crit: 0.20, goldMult: 0.15 } },
];

// ── ГЕНЕРАЦИЯ БОНУСОВ ДЛЯ ГЛУБИН 5–10 ───────────────────────────────────────
function generateBonuses(parentBonuses, depth) {
  const scale = 0.04 + depth * 0.025; // 0.165 при depth=5, 0.29 при depth=10
  const result = {};
  for (const [key, val] of Object.entries(parentBonuses)) {
    result[key] = parseFloat((val * (1 + scale * 0.3)).toFixed(4));
  }
  return result;
}

// ── ГЕНЕРАТОР ГЛУБОКИХ КЛАССОВ ────────────────────────────────────────────────
function generateDeepClasses(parentClasses, targetDepth) {
  if (targetDepth > 10) return [];
  const mods = DEPTH_MODIFIERS[targetDepth];
  const generated = [];

  for (const parent of parentClasses) {
    for (let i = 0; i < 2; i++) {
      const mod = mods[i];
      const childName = `${mod} ${parent.name}`;
      const childId   = `${parent.id}_${i}`;
      const child = {
        id:      childId,
        name:    childName,
        parent:  parent.id,
        branch:  parent.branch,
        desc:    `Продвинутая форма класса «${parent.name}»`,
        bonuses: generateBonuses(parent.bonuses, targetDepth),
        generated: true,
      };
      generated.push(child);
    }
  }

  return generated.concat(generateDeepClasses(generated, targetDepth + 1));
}

// ── СБОРКА ПОЛНОГО ДЕРЕВА ─────────────────────────────────────────────────────
const NOVICE = {
  id: 'novice', name: 'Новичок', parent: null, branch: 'novice', depth: 0,
  desc: 'Начало пути. Выберите свой путь.',
  bonuses: {},
};

function computeDepth(id, map) {
  if (id === 'novice') return 0;
  const cls = map.get(id);
  if (!cls) return -1;
  return 1 + computeDepth(cls.parent, map);
}

// Добавляем глубины в ручные классы
const manualWithDepths = MANUAL_CLASSES.map((c, _) => ({ ...c }));

// Строим промежуточный map для вычисления глубин
const tempMap = new Map();
tempMap.set('novice', NOVICE);
for (const c of manualWithDepths) tempMap.set(c.id, c);
for (const c of manualWithDepths) c.depth = computeDepth(c.id, tempMap);

// Классы depth=4 для старта генерации
const depth4Classes = manualWithDepths.filter(c => c.depth === 4);

// Генерируем классы depth 5–10
const generatedClasses = generateDeepClasses(depth4Classes, 5);

// Устанавливаем depth для генерируемых
function setGeneratedDepths(classes, parentMap) {
  for (const c of classes) {
    const parent = parentMap.get(c.parent);
    c.depth = parent ? parent.depth + 1 : -1;
    parentMap.set(c.id, c);
  }
}

const allClassMap = new Map();
allClassMap.set('novice', NOVICE);
for (const c of manualWithDepths) allClassMap.set(c.id, c);
setGeneratedDepths(generatedClasses, allClassMap);

// Финальная коллекция всех классов
export const ALL_CLASSES = [NOVICE, ...manualWithDepths, ...generatedClasses];
export const CLASS_MAP = allClassMap;

// Дети каждого класса
export const CHILDREN_MAP = new Map();
for (const cls of ALL_CLASSES) {
  if (!CHILDREN_MAP.has(cls.id)) CHILDREN_MAP.set(cls.id, []);
  if (cls.parent !== null) {
    if (!CHILDREN_MAP.has(cls.parent)) CHILDREN_MAP.set(cls.parent, []);
    CHILDREN_MAP.get(cls.parent).push(cls.id);
  }
}

/** Путь от корня до класса (включительно) */
export function getAncestors(classId) {
  const path = [];
  let current = classId;
  while (current) {
    path.unshift(current);
    const cls = CLASS_MAP.get(current);
    if (!cls) break;
    current = cls.parent;
  }
  return path;
}

/** Суммарные бонусы со всей ветки предков */
export function getCumulativeBonuses(classId) {
  const ancestors = getAncestors(classId);
  const total = { atk: 0, hp: 0, def: 0, spd: 0, crit: 0, critDmg: 0, xpMult: 0, goldMult: 0, dodge: 0, lifesteal: 0, thorns: 0 };
  for (const id of ancestors) {
    const cls = CLASS_MAP.get(id);
    if (!cls?.bonuses) continue;
    for (const [k, v] of Object.entries(cls.bonuses)) {
      total[k] = (total[k] || 0) + v;
    }
  }
  return total;
}

/** Получить ветку класса */
export function getBranch(classId) {
  return CLASS_MAP.get(classId)?.branch ?? 'novice';
}
