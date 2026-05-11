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
  { id: 'archer',  name: 'Лучник',  parent: 'novice', branch: 'archer',  desc: 'Меткий стрелок, атакующий издалека. Стрелы пробивают броню', bonuses: { atk: 0.18, spd: 0.15, crit: 0.07, pierce: 0.05 } },
  { id: 'mage',    name: 'Маг',     parent: 'novice', branch: 'mage',    desc: 'Повелитель магических сил, получает больше опыта', bonuses: { atk: 0.25, xpMult: 0.20, goldMult: 0.10, magicShield: 0.05 } },

  // ── DEPTH 2 ──────────────────────────────────────────────────────
  // Воин
  { id: 'berserker', name: 'Берсерк',  parent: 'warrior', branch: 'warrior', desc: 'Яростный боец, жертвующий защитой ради сокрушительных ударов', bonuses: { atk: 0.30, spd: 0.15, hp: 0.10 } },
  { id: 'paladin',   name: 'Паладин',  parent: 'warrior', branch: 'warrior', desc: 'Священный воин, сочетающий силу и защиту', bonuses: { hp: 0.25, def: 0.25, atk: 0.10, thorns: 0.06 } },
  // Плут
  { id: 'assassin',  name: 'Убийца',   parent: 'rogue',   branch: 'rogue',   desc: 'Специалист по молниеносным смертельным атакам. Знает куда бить — насмерть', bonuses: { atk: 0.25, crit: 0.10, spd: 0.15, deathblow: 0.01 } },
  { id: 'thief',     name: 'Вор',      parent: 'rogue',   branch: 'rogue',   desc: 'Мастер по добыче золота и ценностей', bonuses: { spd: 0.20, goldMult: 0.30, crit: 0.05 } },
  // Лучник
  { id: 'ranger',    name: 'Рейнджер', parent: 'archer',  branch: 'archer',  desc: 'Страж природы, связанный с дикими землями', bonuses: { atk: 0.20, spd: 0.15, hp: 0.15, xpMult: 0.10, pierce: 0.03 } },
  { id: 'sniper',    name: 'Снайпер',  parent: 'archer',  branch: 'archer',  desc: 'Мастер точных выстрелов. Пробивает броню и может убить одним ударом', bonuses: { atk: 0.15, crit: 0.15, critDmg: 0.30, pierce: 0.08, deathblow: 0.02 } },
  // Маг
  { id: 'druid',     name: 'Друид',    parent: 'mage',    branch: 'mage',    desc: 'Хранитель природы, накапливающий опыт быстрее всех', bonuses: { xpMult: 0.30, hp: 0.20, atk: 0.15, magicShield: 0.07 } },
  { id: 'alchemist', name: 'Алхимик',  parent: 'mage',    branch: 'mage',    desc: 'Мастер зелий, превращающий врагов в золото', bonuses: { atk: 0.20, goldMult: 0.30, crit: 0.10, magicShield: 0.05, poison: 0.03 } },

  // ── DEPTH 3 ──────────────────────────────────────────────────────
  // Берсерк
  { id: 'destroyer',   name: 'Разрушитель', parent: 'berserker', branch: 'warrior', desc: 'Непреодолимая сила разрушения', bonuses: { atk: 0.35, hp: 0.15, spd: 0.10 } },
  { id: 'bloodthirst', name: 'Кровожад',    parent: 'berserker', branch: 'warrior', desc: 'Восстанавливает жизнь с каждым убийством', bonuses: { atk: 0.30, hp: 0.20, crit: 0.10, lifesteal: 0.08 } },
  // Паладин
  { id: 'crusader',    name: 'Крестоносец', parent: 'paladin',   branch: 'warrior', desc: 'Непоколебимый воин святого дела', bonuses: { def: 0.30, hp: 0.25, atk: 0.15, thorns: 0.10 } },
  { id: 'inquisitor',  name: 'Инквизитор',  parent: 'paladin',   branch: 'warrior', desc: 'Неумолимый охотник на нечисть. Святая воля защищает от проклятий', bonuses: { atk: 0.30, crit: 0.10, def: 0.20, magicShield: 0.05 } },
  // Убийца
  { id: 'ninja',       name: 'Ниндзя',      parent: 'assassin',  branch: 'rogue',   desc: 'Невидимый мастер теней. Удар в уязвимую точку — сквозь любую броню', bonuses: { spd: 0.25, crit: 0.15, atk: 0.20, dodge: 0.08, pierce: 0.04 } },
  { id: 'mercenary',   name: 'Наёмник',     parent: 'assassin',  branch: 'rogue',   desc: 'Профессиональный боец, работающий за золото', bonuses: { atk: 0.25, goldMult: 0.20, spd: 0.15 } },
  // Вор
  { id: 'pickpocket',  name: 'Карманник',   parent: 'thief',     branch: 'rogue',   desc: 'Виртуоз быстрого обогащения', bonuses: { goldMult: 0.40, spd: 0.20, crit: 0.10 } },
  { id: 'bandit',      name: 'Разбойник',   parent: 'thief',     branch: 'rogue',   desc: 'Опасный бандит с тяжёлым ножом', bonuses: { atk: 0.30, spd: 0.15, hp: 0.15 } },
  // Рейнджер
  { id: 'forest_guard', name: 'Страж Леса', parent: 'ranger',   branch: 'archer',  desc: 'Защитник лесных угодий', bonuses: { hp: 0.20, def: 0.20, atk: 0.20, xpMult: 0.15, pierce: 0.04 } },
  { id: 'tracker',      name: 'Следопыт',   parent: 'ranger',   branch: 'archer',  desc: 'Неуловимый охотник, всегда находящий добычу', bonuses: { spd: 0.25, atk: 0.25, xpMult: 0.15, pierce: 0.04 } },
  // Снайпер
  { id: 'eagle_eye',   name: 'Орлиный Глаз',    parent: 'sniper',    branch: 'archer', desc: 'Никогда не промахивается. Каждый выстрел может стать смертельным', bonuses: { crit: 0.20, critDmg: 0.40, atk: 0.15, pierce: 0.10, deathblow: 0.03 } },
  { id: 'dark_shot',   name: 'Тёмный Стрелок',  parent: 'sniper',    branch: 'archer', desc: 'Отравляет врагов своими стрелами', bonuses: { atk: 0.25, crit: 0.15, critDmg: 0.25, pierce: 0.08, deathblow: 0.02, poison: 0.04 } },
  // Друид
  { id: 'archdruid',   name: 'Архидруид',        parent: 'druid',     branch: 'mage',   desc: 'Высший адепт природной магии', bonuses: { xpMult: 0.35, hp: 0.25, atk: 0.15, magicShield: 0.10 } },
  { id: 'shaman',      name: 'Шаман',             parent: 'druid',     branch: 'mage',   desc: 'Призывает силы духов предков. Духи-хранители уводят удары', bonuses: { xpMult: 0.25, atk: 0.25, spd: 0.15, magicShield: 0.08, dodge: 0.04 } },
  // Алхимик
  { id: 'potion_master', name: 'Зельевар',   parent: 'alchemist', branch: 'mage', desc: 'Мастер зелий невероятной силы', bonuses: { atk: 0.25, goldMult: 0.25, hp: 0.20, magicShield: 0.08 } },
  { id: 'bombardier',    name: 'Бомбардир',  parent: 'alchemist', branch: 'mage', desc: 'Взрывчатые соединения сносят врагов', bonuses: { atk: 0.35, crit: 0.15, goldMult: 0.15, magicShield: 0.06 } },
  { id: 'toxicologist',  name: 'Токсиколог', parent: 'alchemist', branch: 'mage', desc: 'Превращает яды в оружие. Каждый удар может стать смертным приговором', bonuses: { atk: 0.20, goldMult: 0.20, crit: 0.08, poison: 0.06 } },

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
  { id: 'dark_judge',    name: 'Тёмный Судья',       parent: 'inquisitor', branch: 'warrior', desc: 'Выносит смертные приговоры. Смертный удар — его привилегия', bonuses: { atk: 0.35, crit: 0.15, def: 0.15, deathblow: 0.03 } },
  { id: 'witch_hunter',  name: 'Охотник на Ведьм',   parent: 'inquisitor', branch: 'warrior', desc: 'Изучил магию, чтобы её уничтожать. Устойчив к заклинаниям', bonuses: { atk: 0.30, xpMult: 0.15, crit: 0.15, magicShield: 0.08 } },
  // Ниндзя
  { id: 'shadow',      name: 'Тень',     parent: 'ninja',      branch: 'rogue', desc: 'Никто не видит его движений. Питается жизнью поверженных', bonuses: { spd: 0.30, crit: 0.20, atk: 0.15, dodge: 0.10, lifesteal: 0.04 } },
  { id: 'ghost',       name: 'Призрак',  parent: 'ninja',      branch: 'rogue', desc: 'Движется сквозь стены. Нематериальная природа отражает магию', bonuses: { spd: 0.35, atk: 0.20, crit: 0.15, dodge: 0.12, magicShield: 0.05 } },
  // Наёмник
  { id: 'gladiator',      name: 'Гладиатор',          parent: 'mercenary', branch: 'rogue', desc: 'Ветеран кровавой арены. Шипастый щит наказывает атакующих', bonuses: { atk: 0.30, hp: 0.20, def: 0.15, goldMult: 0.15, thorns: 0.07 } },
  { id: 'bounty_hunter',  name: 'Охотник за Головами', parent: 'mercenary', branch: 'rogue', desc: 'Получает бонус за каждое убийство. Знает единственный верный удар', bonuses: { atk: 0.25, goldMult: 0.35, crit: 0.10, deathblow: 0.02 } },
  // Карманник
  { id: 'swindler',    name: 'Мошенник',    parent: 'pickpocket', branch: 'rogue', desc: 'Обманывает всех на пути', bonuses: { goldMult: 0.45, spd: 0.20, crit: 0.10 } },
  { id: 'adventurer',  name: 'Авантюрист',  parent: 'pickpocket', branch: 'rogue', desc: 'Всегда в поисках приключений', bonuses: { xpMult: 0.20, goldMult: 0.25, atk: 0.15, spd: 0.15 } },
  // Разбойник
  { id: 'outlaw',  name: 'Изгой', parent: 'bandit', branch: 'rogue', desc: 'Вне закона и вне пощады', bonuses: { atk: 0.35, spd: 0.20, crit: 0.10 } },
  { id: 'pirate',  name: 'Пират', parent: 'bandit', branch: 'rogue', desc: 'Грабитель морей и суши. Кровожадный — восстанавливает силы в бою', bonuses: { atk: 0.25, goldMult: 0.25, spd: 0.15, hp: 0.10, lifesteal: 0.04 } },
  // Страж Леса
  { id: 'green_guardian', name: 'Зелёный Страж',    parent: 'forest_guard', branch: 'archer', desc: 'Защита леса — его призвание', bonuses: { hp: 0.30, def: 0.25, atk: 0.15, pierce: 0.05 } },
  { id: 'beast_tamer',    name: 'Укротитель Зверей', parent: 'forest_guard', branch: 'archer', desc: 'Повелевает дикими зверями', bonuses: { atk: 0.25, hp: 0.20, xpMult: 0.20, pierce: 0.05 } },
  // Следопыт
  { id: 'forest_spirit',  name: 'Лесной Дух',        parent: 'tracker', branch: 'archer', desc: 'Стал частью самого леса', bonuses: { spd: 0.25, xpMult: 0.20, atk: 0.20, hp: 0.15, pierce: 0.05 } },
  { id: 'monster_hunter', name: 'Охотник на Монстров', parent: 'tracker', branch: 'archer', desc: 'Охотится на самую опасную дичь', bonuses: { atk: 0.30, crit: 0.15, xpMult: 0.15, pierce: 0.05 } },
  // Орлиный Глаз
  { id: 'marksman',    name: 'Меткий Стрелок', parent: 'eagle_eye', branch: 'archer', desc: 'Попадает с любого расстояния. Смерть от одного выстрела — не редкость', bonuses: { crit: 0.25, critDmg: 0.45, atk: 0.10, pierce: 0.12, deathblow: 0.04 } },
  { id: 'crossbowman', name: 'Арбалетчик',     parent: 'eagle_eye', branch: 'archer', desc: 'Мощные болты пробивают любую броню', bonuses: { atk: 0.35, crit: 0.15, def: 0.10, pierce: 0.12, deathblow: 0.03 } },
  // Тёмный Стрелок
  { id: 'poison_arrow',  name: 'Отравленная Стрела', parent: 'dark_shot', branch: 'archer', desc: 'Яд медленно съедает врага', bonuses: { atk: 0.30, crit: 0.20, critDmg: 0.20, pierce: 0.10, deathblow: 0.03, poison: 0.07 } },
  { id: 'shadow_archer', name: 'Теневой Лучник',     parent: 'dark_shot', branch: 'archer', desc: 'Стреляет из кромешной тьмы', bonuses: { atk: 0.25, spd: 0.20, crit: 0.15, critDmg: 0.20, pierce: 0.10, deathblow: 0.02 } },
  // Архидруид
  { id: 'nature_warden',  name: 'Хранитель Природы', parent: 'archdruid', branch: 'mage', desc: 'Природа подчиняется его слову', bonuses: { xpMult: 0.40, hp: 0.30, atk: 0.10 } },
  { id: 'voice_of_nature', name: 'Голос Природы',    parent: 'archdruid', branch: 'mage', desc: 'Говорит от имени всего живого', bonuses: { xpMult: 0.35, atk: 0.20, hp: 0.20 } },
  // Шаман
  { id: 'spirit_seer',  name: 'Духовидец',        parent: 'shaman', branch: 'mage', desc: 'Видит сквозь завесу миров', bonuses: { xpMult: 0.30, atk: 0.25, spd: 0.10, hp: 0.10 } },
  { id: 'spirit_lord',  name: 'Повелитель Духов', parent: 'shaman', branch: 'mage', desc: 'Командует легионами духов', bonuses: { atk: 0.30, xpMult: 0.25, hp: 0.15 } },
  // Зельевар
  { id: 'brew_master', name: 'Мастер Зелий', parent: 'potion_master', branch: 'mage', desc: 'Зелья чудовищной силы', bonuses: { atk: 0.30, goldMult: 0.25, hp: 0.20 } },
  { id: 'apothecary',  name: 'Аптекарь',    parent: 'potion_master', branch: 'mage', desc: 'Лечит и отравляет с равным мастерством', bonuses: { hp: 0.30, atk: 0.25, goldMult: 0.20, poison: 0.05 } },
  // Бомбардир
  { id: 'pyromaniac',      name: 'Пиротехник',    parent: 'bombardier',   branch: 'mage', desc: 'Обожает взрывы и огонь', bonuses: { atk: 0.40, crit: 0.15, goldMult: 0.10 } },
  { id: 'explosive_expert', name: 'Взрывотехник', parent: 'bombardier',   branch: 'mage', desc: 'Мастер разрушительных веществ', bonuses: { atk: 0.35, crit: 0.20, goldMult: 0.15 } },
  { id: 'poison_master',   name: 'Мастер Ядов',  parent: 'toxicologist', branch: 'mage', desc: 'Знает тысячу ядов. Ни один враг не уходит без отравы в крови', bonuses: { atk: 0.25, goldMult: 0.15, crit: 0.10, poison: 0.08 } },
  { id: 'plague_doctor',   name: 'Чумной Доктор', parent: 'toxicologist', branch: 'mage', desc: 'Несёт болезнь и смерть под маской целителя', bonuses: { hp: 0.20, goldMult: 0.25, atk: 0.15, poison: 0.08 } },

  // ── DEPTH 5 ──────────────────────────────────────────────────────
  // ⚔️ WARRIOR

  // Опустошитель
  { id: 'colossus',               name: 'Колосс',                 parent: 'devastator',        branch: 'warrior', desc: 'Не атакует первым — стоит, пока враги разбиваются об него',               bonuses: { hp: 0.45, def: 0.35, atk: 0.10, thorns: 0.18 } },
  { id: 'war_incarnation',        name: 'Воплощение Войны',       parent: 'devastator',        branch: 'warrior', desc: 'Война сама обрела форму — и эта форма неудержима',                        bonuses: { atk: 0.55, spd: 0.30, hp: 0.10 } },

  // Громовержец
  { id: 'stormbird',              name: 'Буревестник',            parent: 'thunderer',         branch: 'warrior', desc: 'Бьёт так часто, что раны успевают затянуться между ударами',              bonuses: { spd: 0.40, lifesteal: 0.15, atk: 0.20, crit: 0.10 } },
  { id: 'thunder_avatar',         name: 'Аватар Грома',           parent: 'thunderer',         branch: 'warrior', desc: 'Гром решил, что быть звуком недостаточно',                               bonuses: { atk: 0.35, spd: 0.40, crit: 0.25 } },

  // Вампир
  { id: 'forefather',             name: 'Праотец',                parent: 'vampire',           branch: 'warrior', desc: 'Первый. Пил кровь ещё до того, как появилось слово «смерть»',            bonuses: { lifesteal: 0.30, hp: 0.50, atk: 0.15, crit: 0.10 } },
  { id: 'blood_bride',            name: 'Кровавая Невеста',       parent: 'vampire',           branch: 'warrior', desc: 'Элегантна. Смертоносна. Оставляет тела красивее, чем находит',           bonuses: { crit: 0.30, lifesteal: 0.20, spd: 0.25, atk: 0.20 } },

  // Лорд Крови
  { id: 'blood_archon',           name: 'Архонт Крови',           parent: 'bloodlord',         branch: 'warrior', desc: 'Управляет кровью как жидкостью — чужой не меньше, чем своей',            bonuses: { lifesteal: 0.25, deathblow: 0.05, atk: 0.30, hp: 0.20 } },
  { id: 'eternal_reaper',         name: 'Жнец Вечности',          parent: 'bloodlord',         branch: 'warrior', desc: 'Собирает жизни так же методично, как крестьянин — урожай',               bonuses: { lifesteal: 0.25, hp: 0.40, atk: 0.25, crit: 0.10 } },

  // Страж Веры
  { id: 'living_fortress',        name: 'Живая Крепость',         parent: 'faith_guard',       branch: 'warrior', desc: 'Стены города падали. Он — никогда',                                       bonuses: { def: 0.55, thorns: 0.30, hp: 0.30, atk: 0.05 } },
  { id: 'doomed_defender',        name: 'Защитник Обречённых',    parent: 'faith_guard',       branch: 'warrior', desc: 'Принимает удары, предназначенные другим. Каким-то образом не умирает',  bonuses: { thorns: 0.25, lifesteal: 0.12, hp: 0.40, def: 0.30 } },

  // Рыцарь Света
  { id: 'sun_paladin',            name: 'Солнечный Паладин',      parent: 'light_knight',      branch: 'warrior', desc: 'Свет и сталь — одно. Заклинания разбиваются о его броню как волны',     bonuses: { atk: 0.40, magicShield: 0.20, def: 0.25, hp: 0.20 } },
  { id: 'justice',                name: 'Правосудие',             parent: 'light_knight',      branch: 'warrior', desc: 'У правосудия нет лица. Есть только приговор',                            bonuses: { atk: 0.40, def: 0.35, deathblow: 0.04, hp: 0.15 } },

  // Тёмный Судья
  { id: 'supreme_judge',          name: 'Верховный Судья',        parent: 'dark_judge',        branch: 'warrior', desc: 'Приговор произносится один раз. Исполняется мгновенно',                   bonuses: { crit: 0.35, critDmg: 0.60, deathblow: 0.08, atk: 0.20 } },
  { id: 'silent_tribunal',        name: 'Молчаливый Трибунал',    parent: 'dark_judge',        branch: 'warrior', desc: 'Тысяча голосов вынесли один приговор. Он их единственный голос',         bonuses: { atk: 0.45, def: 0.30, deathblow: 0.06, crit: 0.10 } },

  // Охотник на Ведьм
  { id: 'wizard_slayer',          name: 'Истребитель Колдунов',   parent: 'witch_hunter',      branch: 'warrior', desc: 'Каждое отражённое заклинание — урок. Он учился тысячи лет',               bonuses: { magicShield: 0.35, xpMult: 0.40, atk: 0.20, crit: 0.10 } },
  { id: 'word_burner',            name: 'Сжигатель Слов',         parent: 'witch_hunter',      branch: 'warrior', desc: 'Магия существует, потому что её называют по имени. Он забирает имена',  bonuses: { crit: 0.30, magicShield: 0.20, atk: 0.35, xpMult: 0.10 } },

  // 🗡️ ROGUE

  // Тень
  { id: 'shadow_lord',            name: 'Владыка Теней',          parent: 'shadow',            branch: 'rogue',   desc: 'Удары проходят сквозь него. Его удары — нет',                            bonuses: { dodge: 0.30, lifesteal: 0.20, spd: 0.25, atk: 0.15 } },
  { id: 'blade_dancer',           name: 'Танцующий с Клинками',   parent: 'shadow',            branch: 'rogue',   desc: 'Смотрит на бой как на танец. Партнёры не выживают',                      bonuses: { spd: 0.40, crit: 0.25, atk: 0.30, pierce: 0.10 } },

  // Призрак
  { id: 'incorporeal',            name: 'Бесплотный',             parent: 'ghost',             branch: 'rogue',   desc: 'Физика для него необязательна',                                          bonuses: { dodge: 0.35, magicShield: 0.30, spd: 0.30, atk: 0.15 } },
  { id: 'dream_reaper',           name: 'Жнец Грёз',              parent: 'ghost',             branch: 'rogue',   desc: 'Убивает в тот момент, когда враг думает, что в безопасности',            bonuses: { dodge: 0.25, deathblow: 0.07, spd: 0.30, atk: 0.25, crit: 0.15 } },

  // Гладиатор
  { id: 'undefeated',             name: 'Непобеждённый',          parent: 'gladiator',         branch: 'rogue',   desc: 'Сотни боёв. Ни одного поражения. Просто факт',                           bonuses: { thorns: 0.20, atk: 0.35, hp: 0.30, def: 0.15 } },
  { id: 'arena_blood',            name: 'Кровь Арены',            parent: 'gladiator',         branch: 'rogue',   desc: 'Чем больнее бьют — тем богаче становится. Боль — его валюта',           bonuses: { thorns: 0.20, goldMult: 0.35, atk: 0.25, hp: 0.20 } },

  // Охотник за Головами
  { id: 'boss_bane',              name: 'Гроза Боссов',           parent: 'bounty_hunter',     branch: 'rogue',   desc: 'Специализируется на невозможных целях. На лёгких — скучает',             bonuses: { deathblow: 0.12, goldMult: 0.50, atk: 0.20, crit: 0.10 } },
  { id: 'soul_collector',         name: 'Коллекционер Душ',       parent: 'bounty_hunter',     branch: 'rogue',   desc: 'Записывает имя каждой жертвы. Список очень длинный',                     bonuses: { goldMult: 0.45, deathblow: 0.08, spd: 0.20, atk: 0.20 } },

  // Мошенник
  { id: 'thief_baron',            name: 'Барон Воров',            parent: 'swindler',          branch: 'rogue',   desc: 'Управляет преступным миром не силой — золотом',                          bonuses: { goldMult: 0.70, spd: 0.15, crit: 0.10, atk: 0.05 } },
  { id: 'illusion_master',        name: 'Мастер Иллюзий',         parent: 'swindler',          branch: 'rogue',   desc: 'Пока ты его видишь — он уже в другом месте и с твоими деньгами',        bonuses: { goldMult: 0.45, dodge: 0.20, crit: 0.25, spd: 0.15 } },

  // Авантюрист
  { id: 'legend_chronicler',      name: 'Хроникёр Легенд',        parent: 'adventurer',        branch: 'rogue',   desc: 'Записывает историю сражений. Его версия — единственно верная',           bonuses: { xpMult: 0.45, goldMult: 0.40, atk: 0.10, spd: 0.10 } },
  { id: 'eternal_wanderer',       name: 'Вечный Странник',        parent: 'adventurer',        branch: 'rogue',   desc: 'Был везде. Знает всё. Никуда не торопится — кроме боя',                  bonuses: { xpMult: 0.30, spd: 0.30, goldMult: 0.30, atk: 0.15 } },

  // Изгой
  { id: 'road_beast',             name: 'Зверь Дороги',           parent: 'outlaw',            branch: 'rogue',   desc: 'Дорога сделала его диким. Теперь дорога его боится',                     bonuses: { atk: 0.45, spd: 0.35, crit: 0.10, hp: 0.10 } },
  { id: 'nameless',               name: 'Безымянный',             parent: 'outlaw',            branch: 'rogue',   desc: 'Имя стёрто из всех записей. Слишком опасно его произносить',             bonuses: { atk: 0.45, crit: 0.25, deathblow: 0.05, spd: 0.15 } },

  // Пират
  { id: 'cursed_admiral',         name: 'Адмирал Проклятых',      parent: 'pirate',            branch: 'rogue',   desc: 'Командует флотом мертвецов. Сам давно должен был умереть',                bonuses: { goldMult: 0.40, lifesteal: 0.15, hp: 0.30, atk: 0.15 } },
  { id: 'sea_devil',              name: 'Морской Дьявол',         parent: 'pirate',            branch: 'rogue',   desc: 'Море сделало его чем-то большим, чем человек. И меньшим',                bonuses: { atk: 0.35, lifesteal: 0.15, spd: 0.25, poison: 0.08, goldMult: 0.10 } },

  // 🏹 ARCHER

  // Зелёный Страж
  { id: 'eternal_forest_warden',  name: 'Страж Вечного Леса',     parent: 'green_guardian',    branch: 'archer',  desc: 'Лес сражается вместе с ним. Каждое дерево — союзник',                    bonuses: { pierce: 0.20, thorns: 0.15, def: 0.30, hp: 0.35, atk: 0.10 } },
  { id: 'grove_keeper',           name: 'Хранитель Рощ',          parent: 'green_guardian',    branch: 'archer',  desc: 'Тысяча лет в одной роще. Мудрость старше любого королевства',           bonuses: { def: 0.35, hp: 0.40, xpMult: 0.25, atk: 0.10 } },

  // Укротитель Зверей
  { id: 'beast_god',              name: 'Зверобог',               parent: 'beast_tamer',       branch: 'archer',  desc: 'Перестал быть укротителем. Стал зверем',                                 bonuses: { atk: 0.40, spd: 0.25, crit: 0.20, lifesteal: 0.08 } },
  { id: 'nature_lord',            name: 'Повелитель Природы',     parent: 'beast_tamer',       branch: 'archer',  desc: 'Одним жестом поднимает стаи и прячет солнце',                            bonuses: { xpMult: 0.50, atk: 0.35, hp: 0.15, pierce: 0.05 } },

  // Лесной Дух
  { id: 'forest_will',            name: 'Воля Леса',              parent: 'forest_spirit',     branch: 'archer',  desc: 'Лес захотел победить. Он — способ',                                      bonuses: { spd: 0.45, xpMult: 0.40, atk: 0.15, pierce: 0.05 } },
  { id: 'forest_phantom',         name: 'Лесной Призрак',         parent: 'forest_spirit',     branch: 'archer',  desc: 'Следит за добычей неделями. Та никогда не замечает',                     bonuses: { spd: 0.40, dodge: 0.18, pierce: 0.20, atk: 0.20 } },

  // Охотник на Монстров
  { id: 'colossus_slayer',        name: 'Истребитель Колоссов',   parent: 'monster_hunter',    branch: 'archer',  desc: 'Чем крупнее цель — тем интереснее охота. Боссы — любимая дичь',         bonuses: { deathblow: 0.10, pierce: 0.30, atk: 0.30, crit: 0.15 } },
  { id: 'fortune_hunter',         name: 'Охотник за Удачей',      parent: 'monster_hunter',    branch: 'archer',  desc: 'Ищет не монстров, а их сокровища. Монстры — просто препятствие',         bonuses: { crit: 0.30, critDmg: 0.50, goldMult: 0.30, atk: 0.20 } },

  // Меткий Стрелок
  { id: 'god_slayer',             name: 'Убийца Богов',           parent: 'marksman',          branch: 'archer',  desc: 'Они думали, что недосягаемы. Думали',                                    bonuses: { crit: 0.40, critDmg: 0.65, deathblow: 0.10, atk: 0.15 } },
  { id: 'inevitability',          name: 'Неотвратимость',         parent: 'marksman',          branch: 'archer',  desc: 'Выстрел уже произошёл. Стрела просто ещё не долетела',                   bonuses: { pierce: 0.30, deathblow: 0.08, crit: 0.30, atk: 0.20 } },

  // Арбалетчик
  { id: 'steel_hunter',           name: 'Стальной Охотник',       parent: 'crossbowman',       branch: 'archer',  desc: 'Броня не защищает. Никакая броня',                                       bonuses: { atk: 0.55, pierce: 0.35, crit: 0.10, def: 0.10 } },
  { id: 'bastion_guard',          name: 'Страж Бастиона',         parent: 'crossbowman',       branch: 'archer',  desc: 'Стреляет с высоты. Снизу его не достать',                               bonuses: { def: 0.30, atk: 0.40, pierce: 0.25, hp: 0.20 } },

  // Отравленная Стрела
  { id: 'fate_poison',            name: 'Яд Судьбы',              parent: 'poison_arrow',      branch: 'archer',  desc: 'Враг уже мёртв. Просто ещё не знает об этом',                           bonuses: { poison: 0.18, deathblow: 0.08, atk: 0.25, crit: 0.20, pierce: 0.10 } },
  { id: 'archenemy',              name: 'Архивраг',               parent: 'poison_arrow',      branch: 'archer',  desc: 'Не борется с конкретными существами. Борется с существованием',          bonuses: { poison: 0.15, crit: 0.30, critDmg: 0.45, atk: 0.25 } },

  // Теневой Лучник
  { id: 'night_spawn',            name: 'Порождение Ночи',        parent: 'shadow_archer',     branch: 'archer',  desc: 'Удар достигает цели раньше, чем цель успела испугаться',                  bonuses: { spd: 0.35, crit: 0.30, deathblow: 0.07, atk: 0.25, pierce: 0.10 } },
  { id: 'darkness_weaver',        name: 'Ткач Тьмы',             parent: 'shadow_archer',     branch: 'archer',  desc: 'Тьма — его материал. Из неё он строит смерть',                           bonuses: { spd: 0.35, dodge: 0.18, pierce: 0.25, atk: 0.20, crit: 0.10 } },

  // 🔮 MAGE

  // Хранитель Природы
  { id: 'world_root',             name: 'Корень Мира',            parent: 'nature_warden',     branch: 'mage',    desc: 'Существовал до первого дерева. Переживёт последнее',                      bonuses: { hp: 0.55, xpMult: 0.55, atk: 0.05, magicShield: 0.10 } },
  { id: 'primordial',             name: 'Первозданный',           parent: 'nature_warden',     branch: 'mage',    desc: 'Природа в её изначальной форме — до того как стала доброй',              bonuses: { hp: 0.45, xpMult: 0.45, magicShield: 0.20, atk: 0.10 } },

  // Голос Природы
  { id: 'earth_prophet',          name: 'Пророк Земли',           parent: 'voice_of_nature',   branch: 'mage',    desc: 'Земля рассказала ему всё что будет. Он просто ждёт',                     bonuses: { xpMult: 0.55, goldMult: 0.40, atk: 0.10, hp: 0.10 } },
  { id: 'nature_storm',           name: 'Буря Природы',           parent: 'voice_of_nature',   branch: 'mage',    desc: 'Природа не только растит. Иногда она уничтожает',                        bonuses: { atk: 0.40, xpMult: 0.35, crit: 0.20, hp: 0.15 } },

  // Духовидец
  { id: 'veil_guardian',          name: 'Страж Завесы',           parent: 'spirit_seer',       branch: 'mage',    desc: 'Стоит между миром живых и мёртвых. Не пропускает никого',                bonuses: { xpMult: 0.45, dodge: 0.20, atk: 0.20, hp: 0.15 } },
  { id: 'oracle',                 name: 'Оракул',                 parent: 'spirit_seer',       branch: 'mage',    desc: 'Знает исход каждого боя до его начала. Воюет для вида',                  bonuses: { xpMult: 0.50, atk: 0.40, spd: 0.10, hp: 0.10 } },

  // Повелитель Духов
  { id: 'spirit_archon',          name: 'Архонт Духов',           parent: 'spirit_lord',       branch: 'mage',    desc: 'Командует легионами невидимых солдат',                                   bonuses: { atk: 0.45, xpMult: 0.35, magicShield: 0.18, hp: 0.15 } },
  { id: 'soul_devourer',          name: 'Пожиратель Душ',         parent: 'spirit_lord',       branch: 'mage',    desc: 'Убитые враги не умирают. Они становятся его силой',                      bonuses: { atk: 0.45, lifesteal: 0.15, xpMult: 0.30, hp: 0.10 } },

  // Мастер Зелий
  { id: 'potion_lord',            name: 'Повелитель Зелий',       parent: 'brew_master',       branch: 'mage',    desc: 'Его зелья совершенны. Цена соответствующая',                             bonuses: { goldMult: 0.55, hp: 0.45, atk: 0.10 } },
  { id: 'chaos_alchemist',        name: 'Алхимик Хаоса',          parent: 'brew_master',       branch: 'mage',    desc: 'Алхимия предсказуема? Не в его руках',                                   bonuses: { atk: 0.45, crit: 0.20, goldMult: 0.35, hp: 0.10 } },

  // Аптекарь
  { id: 'dark_healer',            name: 'Лекарь Тьмы',            parent: 'apothecary',        branch: 'mage',    desc: 'Лечит союзников. Отравляет врагов. Разницы не замечает',                 bonuses: { hp: 0.50, poison: 0.18, atk: 0.15, goldMult: 0.15 } },
  { id: 'death_merchant',         name: 'Торговец Смертью',       parent: 'apothecary',        branch: 'mage',    desc: 'Смерть в красивых флаконах. По умеренной цене',                          bonuses: { goldMult: 0.40, poison: 0.15, atk: 0.30, hp: 0.15 } },

  // Пиротехник
  { id: 'flame_demon',            name: 'Демон Пламени',          parent: 'pyromaniac',        branch: 'mage',    desc: 'Огонь не его оружие. Огонь — это он',                                    bonuses: { atk: 0.60, crit: 0.30, goldMult: 0.10 } },
  { id: 'mad_arsonist',           name: 'Безумный Поджигатель',   parent: 'pyromaniac',        branch: 'mage',    desc: 'Считает пожары красивыми. Устраивает их везде',                          bonuses: { atk: 0.45, goldMult: 0.30, spd: 0.20, crit: 0.10 } },

  // Взрывотехник
  { id: 'army_destroyer',         name: 'Разрушитель Армий',      parent: 'explosive_expert',  branch: 'mage',    desc: 'Не интересуется отдельными солдатами. Только армиями целиком',           bonuses: { atk: 0.55, crit: 0.35, goldMult: 0.10 } },
  { id: 'catastrophe_architect',  name: 'Архитектор Катастроф',   parent: 'explosive_expert',  branch: 'mage',    desc: 'Каждый взрыв — заранее спланированное произведение искусства',           bonuses: { crit: 0.30, goldMult: 0.35, atk: 0.40, spd: 0.10 } },

  // Мастер Ядов
  { id: 'supreme_poisoner',       name: 'Верховный Ядовар',       parent: 'poison_master',     branch: 'mage',    desc: 'Знает яды, которых не существует. Изобрёл их сам',                       bonuses: { poison: 0.25, crit: 0.30, atk: 0.20, goldMult: 0.10 } },
  { id: 'silent_killer',          name: 'Тихий Убийца',           parent: 'poison_master',     branch: 'mage',    desc: 'Никогда не торопится. Яд сделает всё сам',                               bonuses: { poison: 0.20, deathblow: 0.06, spd: 0.25, atk: 0.20 } },

  // Чумной Доктор
  { id: 'plague_bearer',          name: 'Несущий Чуму',           parent: 'plague_doctor',     branch: 'mage',    desc: 'Там где он прошёл — трава не растёт три года',                           bonuses: { poison: 0.25, hp: 0.45, atk: 0.10, goldMult: 0.15 } },
  { id: 'doomsday_doctor',        name: 'Доктор Конца Света',     parent: 'plague_doctor',     branch: 'mage',    desc: 'Лечит всех. От жизни',                                                   bonuses: { hp: 0.35, goldMult: 0.40, poison: 0.18, atk: 0.10 } },

  // ── ⭐ ПРЕСТИЖ depth 4 (require два depth-3) ─────────────────────────────────
  { id: 'toxic_archer',   name: 'Ядовитый Стрелок', parent: 'toxicologist', branch: 'mage',    prestige: 1, requires: ['toxicologist', 'dark_shot'],  desc: 'Смешал яды алхимика с мастерством стрелка. Каждая стрела несёт медленную смерть',    bonuses: { atk: 0.30, poison: 0.08, pierce: 0.10, crit: 0.10 } },
  { id: 'battle_phantom', name: 'Боевой Призрак',   parent: 'ninja',        branch: 'rogue',   prestige: 1, requires: ['ninja', 'crusader'],          desc: 'Неуловимый как тень, стойкий как крепость. Чужие удары возвращаются к владельцу',   bonuses: { dodge: 0.10, thorns: 0.08, atk: 0.20, spd: 0.15 } },
  { id: 'war_chaos',      name: 'Воин Хаоса',       parent: 'destroyer',    branch: 'warrior', prestige: 1, requires: ['destroyer', 'bombardier'],    desc: 'Ярость берсерка сплавлена с магией взрывчатки. Никто не понимает как он это делает', bonuses: { atk: 0.35, crit: 0.15, spd: 0.10, magicShield: 0.05 } },
  { id: 'blood_hunter',   name: 'Кровавый Охотник', parent: 'bloodthirst',  branch: 'warrior', prestige: 1, requires: ['bloodthirst', 'tracker'],     desc: 'Преследует добычу неотступно, восстанавливая силы с каждым пробитием',               bonuses: { lifesteal: 0.10, pierce: 0.08, atk: 0.25, spd: 0.12 } },
  { id: 'iron_mage',      name: 'Железный Маг',     parent: 'crusader',     branch: 'warrior', prestige: 1, requires: ['crusader', 'shaman'],         desc: 'Броня паладина сплавлена с магическим щитом шамана. Абсолютная непробиваемость',     bonuses: { def: 0.20, magicShield: 0.12, hp: 0.20, thorns: 0.08 } },

  // ── Дети ⭐ depth-4 престижа (depth 5) ────────────────────────────────────────
  // Ядовитый Стрелок
  { id: 'venom_lord',       name: 'Владыка Яда',         parent: 'toxic_archer',   branch: 'mage',    desc: 'Яд стал его сутью. Враги растворяются в нём ещё до смерти',                bonuses: { poison: 0.22, pierce: 0.18, crit: 0.20, atk: 0.15 } },
  { id: 'plague_archer',    name: 'Чумной Лучник',        parent: 'toxic_archer',   branch: 'mage',    desc: 'Одна стрела заражает. Следующая убивает. Иногда достаточно одной',         bonuses: { poison: 0.18, deathblow: 0.08, pierce: 0.15, atk: 0.25 } },
  // Боевой Призрак
  { id: 'ethereal_blade',   name: 'Эфирный Клинок',       parent: 'battle_phantom', branch: 'rogue',   desc: 'Его клинок из чистой воли. Броня, шипы, плоть — всё лишь препятствие',  bonuses: { dodge: 0.25, thorns: 0.20, atk: 0.30, spd: 0.15 } },
  { id: 'phantom_guardian', name: 'Призрачный Страж',     parent: 'battle_phantom', branch: 'rogue',   desc: 'Щит для союзников, кошмар для врагов. Каждый удар по нему возвращается', bonuses: { dodge: 0.20, thorns: 0.25, def: 0.30, hp: 0.20 } },
  // Воин Хаоса
  { id: 'arcane_destroyer', name: 'Тайный Разрушитель',   parent: 'war_chaos',      branch: 'warrior', desc: 'Магия и сталь: взрыв в ближнем бою. Враги не успевают понять откуда',    bonuses: { atk: 0.50, crit: 0.20, magicShield: 0.15, spd: 0.10 } },
  { id: 'void_knight',      name: 'Рыцарь Пустоты',       parent: 'war_chaos',      branch: 'warrior', desc: 'Черпает силу из разрыва между магией и сталью. Пустота его союзник',     bonuses: { atk: 0.40, def: 0.25, magicShield: 0.20, crit: 0.15 } },
  // Кровавый Охотник
  { id: 'eternal_predator', name: 'Вечный Хищник',        parent: 'blood_hunter',   branch: 'warrior', desc: 'Охота никогда не заканчивается. Он стал самой охотой',                   bonuses: { lifesteal: 0.22, pierce: 0.20, atk: 0.30, spd: 0.15 } },
  { id: 'blood_tracker',    name: 'Кровавый Следопыт',    parent: 'blood_hunter',   branch: 'warrior', desc: 'Чует добычу за тысячи миль. Пронзает её ещё до встречи',                bonuses: { lifesteal: 0.18, pierce: 0.15, atk: 0.35, crit: 0.12 } },
  // Железный Маг
  { id: 'fortress_mage',    name: 'Маг-Крепость',         parent: 'iron_mage',      branch: 'warrior', desc: 'Неприступная магическая цитадель. Атаки разбиваются о него как о скалу', bonuses: { def: 0.40, magicShield: 0.25, thorns: 0.20, hp: 0.25 } },
  { id: 'spirit_armor',     name: 'Духовной Доспех',       parent: 'iron_mage',      branch: 'warrior', desc: 'Дух предков стал его бронёй. Каждый удар по нему — удар по легиону',    bonuses: { magicShield: 0.30, thorns: 0.25, def: 0.35, atk: 0.10 } },

  // ── ⭐⭐ ПРЕСТИЖ depth 5 (require два depth-4) ────────────────────────────────
  { id: 'shadow_marksman',   name: 'Теневой Стрелок',  parent: 'ghost',        branch: 'rogue',   prestige: 2, requires: ['ghost', 'marksman'],              desc: 'Стреляет из ниоткуда. Уворачивается от ответа. Убивает наверняка',                bonuses: { dodge: 0.15, deathblow: 0.10, pierce: 0.08, atk: 0.30, crit: 0.20 } },
  { id: 'paladin_magister',  name: 'Паладин-Магистр',  parent: 'faith_guard',  branch: 'warrior', prestige: 2, requires: ['faith_guard', 'spirit_lord'],      desc: 'Непоколебимый рыцарь духа. Магия и сталь защищают его с двух сторон',           bonuses: { thorns: 0.20, magicShield: 0.18, def: 0.30, hp: 0.25 } },
  { id: 'arch_toxicologist', name: 'Архитоксиколог',   parent: 'poison_master',branch: 'mage',    prestige: 2, requires: ['poison_master', 'toxic_archer'],   desc: 'Наука ядов слилась с искусством отравленной стрелы. Непревзойдённый мастер',   bonuses: { poison: 0.28, pierce: 0.12, crit: 0.20, atk: 0.25 } },
  { id: 'chaos_incarnate',   name: 'Воплощение Хаоса', parent: 'war_chaos',    branch: 'warrior', prestige: 2, requires: ['war_chaos', 'battle_phantom'],     desc: 'Два хаоса объединились. Взрыв и тень. Магия и уворот. Он неостановим',        bonuses: { atk: 0.45, crit: 0.25, magicShield: 0.15, dodge: 0.12, spd: 0.10 } },
  { id: 'eternal_guardian',  name: 'Вечный Страж',     parent: 'iron_mage',    branch: 'warrior', prestige: 2, requires: ['iron_mage', 'faith_guard'],        desc: 'Живая крепость, наполненная духами предков. Абсолютная защита на все времена', bonuses: { magicShield: 0.22, thorns: 0.22, def: 0.40, hp: 0.30 } },
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

// Ручные depth-5: их depth-4 родители пропускаются при авто-генерации depth-5,
// но сами становятся сидами для авто-генерации depth 6–10.
const manualDepth5 = manualWithDepths.filter(c => c.depth === 5);
const manualDepth5ParentIds = new Set(manualDepth5.map(c => c.parent));
const depth4WithoutManualD5 = depth4Classes.filter(c => !manualDepth5ParentIds.has(c.id));

// Генерируем классы depth 5–10 (только для depth-4 без ручных детей)
// + depth 6–10 для ручных depth-5 классов
const generatedClasses = [
  ...generateDeepClasses(depth4WithoutManualD5, 5),
  ...generateDeepClasses(manualDepth5, 6),
];

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
  const total = { atk: 0, hp: 0, def: 0, spd: 0, crit: 0, critDmg: 0, xpMult: 0, goldMult: 0, dodge: 0, lifesteal: 0, thorns: 0, magicShield: 0, pierce: 0, deathblow: 0, poison: 0 };
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
