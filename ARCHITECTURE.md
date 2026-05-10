# Idle RPG — Living Architecture

> Живой документ. Обновлять при каждом значимом изменении структуры или планов.
> Последнее обновление: 2026-05-10 (v1.11.2: чёткие спрайты героев 256×256 + Phaser antialias:false)

---

## Процесс разработки

Каждая новая фича проходит через следующий цикл:

```
1. git checkout -b feature/<name>
2. Реализация пошагово, коммит каждого шага
3. Проверка в браузере (npm run dev)
4. package.json → version bump (semver: patch / minor / major)
5. CHANGELOG.md → новая запись (что добавлено / изменено / исправлено)
6. UI → обновить модалку "Что нового" (SettingsMenu или отдельный overlay)
7. ARCHITECTURE.md → пометить задачи [x], актуализировать описание
8. git checkout master && git merge feature/<name> && git push
```

**Версионирование:** `MAJOR.MINOR.PATCH`
- PATCH — баг-фикс, баланс-правки
- MINOR — новая механика или заметный контент
- MAJOR — рестарт прогрессии / кардинальная смена геймплея

---

## Стек

| Слой | Технология |
|------|-----------|
| Рендер боя | Phaser 3 (canvas) |
| UI-панели | Vanilla HTML/CSS/JS |
| Сборка | Vite |
| Хранилище | localStorage (ключ `idle_rpg_save`, формат v2) |
| Спрайты | YandexART 2.0, мобы/боссы 128×128 · герои 256×256 RGBA PNG |
| Фоны | YandexART 2.0, 620×480 JPG |

---

## Файловая структура

```
src/
  main.js              (119 строки)  — точка входа, монтирование Phaser + UI + MainMenu + ClassTreeGraph
  i18n/
    index.js            (16)  — getLang(), setLang(), t(key); язык в localStorage
    ru.js                (12)  — русские строки (сейчас только главное меню)
    en.js                (12)  — английские строки (сейчас только главное меню)
  core/
    GameState.js       (480)  — центральное состояние + EventBus + скиллы + discoveredClasses
    GameStateSave.js   (111)  — mixin: save/load/autosave/hardReset + discoveredClasses
    Combat.js          (387)  — игровой цикл (rAF + накопленный dt), DoT, скиллы
  data/
    classes.js         (540)  — 128 ручных классов (depth 1–5) + generateDeepClasses()
    mobs.js            (270)  — данные мобов, боссов, флаги, иконки
    items.js            (95)  — генерация предметов, редкости, бонусы
    changelog.js       (120)  — GAME_VERSION + история версий
    skills.js           (12)  — SKILLS_BY_BRANCH (5 активных скиллов по веткам)
  phaser/
    GameScene.js        (76)  — тонкий оркестратор: init, create, update, event wiring
    scene/
      SceneFX.js       (227)  — combat callbacks, floating text, эффекты, helpers
      SceneBackground.js(175) — фон, земля, арена, факелы, wave banner
      SceneEntities.js (264)  — игрок и мобы: спрайты, HP-бары, обновление визуалов
  ui/
    HUD.js             (260)  — верхняя панель + скилл-кнопка с кулдауном
    BattleStrip.js     (342)  — полоса боя: HP-бар, чипы с флагами, tooltip
    ClassTree.js       (262)  — HTML-дерево классов; mystery-ноды; window.game.openClassModal
    ClassTreeGraph.js  (320)  — радиальный граф (depth 0–5): SVG-рёбра, pan/zoom, инфо-панель
    StatsPanel.js      (124)  — правая панель: статы + магазин апгрейдов
    PrestigeShop.js    (108)  — модалка магазина престижа (10 апгрейдов)
    SettingsMenu.js    (311)  — настройки (статистика, сброс, changelog, экспорт/импорт)
    InventoryPanel.js  (185)  — инвентарь: 3 слота, список предметов, продажа
    MainMenu.js         (75)  — главное меню: Продолжить/Начать заново, changelog, RU/EN

scripts/
  build_atlas.py       — сборка atlas.png/json; разные размеры фреймов (мобы 128, герои 256)
  generate_heroes.py   — генерация 5 hero-спрайтов (256×256) через YandexART 2.0; flood-fill bg removal
  generate_sprites.py  — генерация мобов/боссов (128×128)
  generate_grounds.py  — генерация ground-текстур

public/
  sprites/             — 25 PNG: 10 мобов + 10 боссов (128×128) · 5 героев (256×256) + atlas.png/json
  backgrounds/         — 10 JPG (bg_01_10 … bg_91_100) + 10 PNG (ground_*)
```

---

## Архитектура

### Layout (1280×720, index.html)

```
┌─────────────────────────── #hud (52px) ───────────────────────────┐
│  класс · уровень · XP · золото · волна · убийства · prestige · ⚙️  │
├─────────────────────────── #skill-zone (40px) ─────────────────────┤
│  [кнопка скилла: иконка · название · кулдаун-бар]  описание скилла │
├─────────────────────────── #battle-strip (52px) ──────────────────┤
│  [HP игрока] ⚔️  [прогресс волны X/N]  [чипы врагов 👑]            │
├──────────────┬────────────────────────┬────────────────────────────┤
│ #class-tree  │    #game-container     │      #stats-panel          │
│   (280px)    │  Phaser canvas 620×480 │        (300px)             │
│  дерево      │  центрирован flexbox   │  статы + магазин апгрейдов │
│  классов     │                        │                            │
├──────────────┴────────────────────────┴────────────────────────────┤
│                     #combat-log (96px)                              │
└────────────────────────────────────────────────────────────────────┘

Модалки: #class-modal-overlay · #prestige-modal-overlay · #settings-overlay
Главное меню: #main-menu-overlay (position:absolute inset:0 z-index:500, внутри #app для масштабирования)
```

### Поток данных

```
GameState (EventBus)
  │
  ├── Combat.js       читает state.player, пишет HP, gold, XP, wave
  │     └── колбэки → GameScene, BattleStrip, HUD
  │
  ├── GameScene.js    слушает state.on('classChanged', 'waveStarted', ...)
  ├── ClassTree.js    слушает state.on('classChanged', 'goldChanged', ...)
  ├── StatsPanel.js   слушает state.on('statsChanged', 'goldChanged', ...)
  ├── HUD.js          слушает state.on('goldChanged', 'levelUp', ...)
  └── BattleStrip.js  обновляется через combat-колбэки
```

### Ключевые события GameState

**Неймспейс `player:`** — состояние игрока

| Событие | Когда | Подписчики |
|---------|-------|-----------|
| `player:statsChanged` | **реальное** изменение статов: level-up, смена класса, апгрейд, престиж | StatsPanel, BattleStrip, GameScene (кеш maxHp), HUD |
| `player:xpChanged` | XP прибавился без level-up (каждое убийство) | HUD (только XP-бар) |
| `player:goldChanged` | изменилось золото | HUD, StatsPanel (кнопки апгрейдов) |
| `player:levelUp` | новый уровень | HUD (лог + полный update), BattleStrip (уровень) |
| `player:classChanged` | выбран класс | HUD, BattleStrip, GameScene (спрайт) |
| `player:death` | смерть игрока | HUD (лог) |
| `player:prestige` | перерождение | HUD, StatsPanel, BattleStrip |
| `player:hpChanged` | изменилось текущее HP | HUD (XP-бар), BattleStrip (HP-бар), GameScene (HP-бар) |
| `player:respawn` | респавн после смерти | HUD (лог), BattleStrip |
| `player:prestigeShopChanged` | куплен апгрейд в магазине престижа | — |

> **Правило:** `player:statsChanged` — дорогое событие (вызывает пересчёт всего UI). Не эмитить из горячего пути (убийство, удар). Только при реальном изменении статов.

**Неймспейс `combat:`** — волны и бой

| Событие | Когда | Подписчики |
|---------|-------|-----------|
| `combat:waveStarted` | начало волны | HUD (лог) |
| `combat:waveCleared` | волна пройдена | HUD (лог + prestige-btn) |
| `combat:waveRollback` | откат на предыдущую волну | HUD (лог) |
| `combat:killCountChanged` | изменился счётчик убийств | HUD (kills) |
| `combat:milestone` | первое прохождение milestone-волны (wave % 10 === 0, новый рекорд) | HUD (флэш-оверлей, лог) |

### Phaser init (критично)

`scene: []` (пустой) + ручной `phaserGame.scene.add('GameScene', GameScene, true, { state, combat })` после события `ready`. Передавать `GameScene` напрямую в `scene:[]` нельзя — Phaser автостартует без данных.

### Глубины (depth) в Phaser

| depth | что |
|-------|-----|
| 0 | `_bgImage` (фон) |
| 1 | `_ground` (полоса земли) |
| 2 | арена (факелы, декор) |
| 3+ | мобы и игрок |
| 10+ | UI-оверлеи |

---

## Системы

### Дерево классов

> Полный список классов с бонусами и описаниями: **[CLASSES.md](CLASSES.md)**

- **128 ручных классов** (depth 1–5): Новичок → Воин/Плут/Лучник/Маг → … → 68 именных depth-5 мастер-классов
- **~3000 генерируемых** (depth 6–10): `generateDeepClasses()` при старте — запускается от ручных depth-5 как сидов
- `CLASS_MAP` — `Map<id, cls>`, `CHILDREN_MAP` — `Map<parentId, childId[]>`
- `getCumulativeBonuses(classId)` — суммирует бонусы всей цепочки
- Требования: `DEPTH_LEVEL_REQ` (уровень) + `DEPTH_GOLD_COST` (золото)

### Боевая система

- Тик каждые **200ms** (фиксированный шаг); цикл на `requestAnimationFrame` + accumulated delta + panic cap 10 сек
- **`getStats()` кешируется один раз в начале `_tick()`** — результат передаётся по всему тику. Прямых повторных вызовов внутри тика нет.
- Смерть → таймер `RESPAWN_MS` → `_spawnWave()` с той же волной
- Волна засчитана: все мобы мертвы + игрок жив
- **Откат волны:** `deathsOnWave >= 3` → при следующем респавне `currentWave--`
- Исключение: волна-босс (`wave % 10 === 0`) → откат немедленно при смерти
- Штраф за смерть: нет

### Боевые статы игрока

| Стат | База | Cap | Рост/ур. | Источники бонуса |
|------|------|-----|----------|-----------------|
| HP | 130 | — | +18 | класс, апгрейды, экипировка, престиж |
| ATK | 14 | — | +2.0 | класс, апгрейды, экипировка, престиж |
| DEF | 7 | — | +1.0 | класс, апгрейды, экипировка |
| SPD | 1.3 | — | +0.010 | класс, апгрейды, экипировка, престиж |
| CRIT | 5% | 95% | — | класс, апгрейды, экипировка |
| CRITDMG | 150% | — | — | класс, апгрейды, экипировка |
| DODGE | 0% | **75%** | — | класс: rogue-ветка (основная) + Шаман (mage-ветка, кросс) |
| LIFESTEAL | 0% | — | — | класс: bloodthirst-ветка (основная) + Тень, Пират (rogue-ветка, кросс) |
| THORNS | 0% | — | — | класс: paladin-ветка (основная) + Гладиатор (rogue-ветка, кросс) |
| MAGICSHIELD | 0% | **75%** | — | класс: mage-ветка (основная) + Инквизитор, Тёмный Судья, Охотник на Ведьм, Призрак (кросс) |
| PIERCE | 0% | **75%** | — | класс: archer-ветка (основная) + Ниндзя (rogue-ветка, кросс) |
| DEATHBLOW | 0% | **20%** | — | класс: sniper-ветка archer (основная) + Убийца, Тёмный Судья, Охотник за Головами (кросс) |
| POISON | 0% | **60%** | — | класс: toxicologist-ветка mage (основная) + Алхимик, Аптекарь (mage, кросс) + Тёмный Стрелок, Отравленная Стрела (archer, кросс) |

**Классовые бонусы новых статов:**

| Класс | Depth | Стат | +% (инкремент) | Накопл. |
|-------|-------|------|----------------|---------|
| Плут | 1 | dodge | +5% | 5% |
| Паладин | 1 | thorns | +6% | 6% |
| Кровожад | 2 | lifesteal | +8% | 8% |
| Крестоносец | 2 | thorns | +10% | 16% |
| Ниндзя | 3 | dodge | +8% | 13% |
| Вампир | 4 | lifesteal | +12% | 20% |
| Лорд Крови | 4 | lifesteal | +10% | 18% |
| Страж Веры | 4 | thorns | +15% | 31% |
| Тень | 4 | dodge | +10% | 23% |
| Призрак | 4 | dodge | +12% | 25% |
| Алхимик | 2 | poison | +3% | 3% |
| Тёмный Стрелок | 3 | poison | +4% | 4% |
| Токсиколог | 3 | poison | +6% | 9% |
| Аптекарь | 4 | poison | +5% | 5% |
| Отравленная Стрела | 4 | poison | +7% | 11% |
| Мастер Ядов | 4 | poison | +8% | 17% |
| Чумной Доктор | 4 | poison | +8% | 17% |

**Реализация в `Combat.js`:**
```
onPlayerAttack: lifesteal → currentHp += dmg * lifesteal/100, cap maxHp
onPlayerAttack: poison    → if rand < poison% → mob.poisonTicks=12, mob.poisonDmg=atk*0.15 (не стакается)
onPlayerHit:    dodge     → if rand < dodge% → emit miss, skip takeDamage()
onPlayerHit:    thorns    → mob.hp -= dmg * thorns/100 после takeDamage(); если моб умер → _killMob()
DoT начало тика: poisonTicks/burnTicks → hp -= dmg, ticks--; убийство через _killMob()
```

`StatsPanel` скрывает строки dodge/lifesteal/thorns пока значение = 0 (`display:none`).

### Паттерны производительности (hot path)

**Правило:** горячий путь — `_tick()` каждые 200ms + `player:hpChanged` на каждый удар. Дорогие операции туда не идут.

| Паттерн | Где применён |
|---------|-------------|
| `getStats()` кешируется **1 раз за `_tick()`** | `Combat.js` — результат передаётся всему тику |
| `maxHp` кешируется, обновляется по `statsChanged` | `BattleStrip`, `GameScene` — не пересчитывается при каждом ударе |
| `player:xpChanged` вместо `statsChanged` без level-up | `GameState.addXp()` — не тригерит полный перерасчёт UI |
| Частичное DOM-обновление HP врагов | `BattleStrip.onPlayerAttack()` — только `fill.style.width`, без `innerHTML` |
| Полный `innerHTML` врагов — только при смерти/новой волне | `BattleStrip.onMobDeath()`, `onWaveSpawn()` |

### Баланс мобов

| Параметр | Значение |
|----------|---------|
| Масштаб HP/ATK мобов | `1 + k*ln(wave)`, k = 0.55 + 0.10*floor((wave-1)/5) — логарифм с нарастающим коэф.; wave 10≈2.50x, wave 40≈5.61x, wave 100≈12.3x |
| Масштаб DEF мобов | `sqrt(combatScale)` — растёт медленнее ATK/HP |
| Масштаб XP/Gold мобов | `rewardScale = 1.06^(wave-1)` — экспоненциальный, независимо от боевого масштаба |
| Макс. мобов на волне | 8 (прирост +1 каждые 4 волны, начиная с 3) |
| Скорость атаки боссов | `baseSpeed × 1.1` — чуть быстрее обычных мобов |
| atkMult боссов 1–4 | 4 (было 3) |
| Базовый HP игрока | 130 |
| Базовый ATK игрока | 14 |
| Базовый DEF игрока | 7 |
| Базовая SPD | 1.3 (атака ~769ms) |
| Рост HP/уровень | +18 |
| Рост ATK/уровень | +2.0 |
| Рост DEF/уровень | +1.0 |
| Рост SPD/уровень | +0.010 |

### Престиж (v2)

- Доступен при ≥1 ПО (очко престижа)
- Формула ПО: `floor(wave^1.45 / 15) + floor(level / 20)` — нелинейная, wave доминирует; level-фарм на wave 1 не работает (≈0 ПО)
- Открытие нового класса впервые → +1 ПО (`discoveredClasses` Set, сохраняется, не сбрасывается при престиже)
- Магазин: 10 апгрейдов (стартовое золото, XP×5, золото×5, ATK×5, HP×5, скорость×3, сохранить улучшения **100 ПО**, стартовая волна 20 ПО)

### Активные скиллы (v1.7.0)

| Ветка | Скилл | Эффект | Кулдаун |
|-------|-------|--------|---------|
| novice | ✨ Концентрация | +25% maxHp лечение | 20с |
| warrior | 🛡️ Удар щитом | стан первого врага 1с (5 тиков) | 8с |
| rogue | ☠️ Отравить | следующая атака ×1.8 + яд 3 тика | 10с |
| archer | 🏹 Залп | 50% ATK по всем мобам | 12с |
| mage | 🔥 Огненный шар | 80% ATK по всем + горение 3 тика | 15с |

**Реализация:**
- `src/data/skills.js` — `SKILLS_BY_BRANCH`: таблица скиллов по ветке
- `GameState`: `getBranch()`, `getActiveSkill()`, `triggerSkill()`, `getSkillCooldownPct()` — кулдаун через `performance.now()`
- `Combat.js`: `_applySkill(skill)` — логика каждого скилла; DoT (`poisonTicks/Dmg`, `burnTicks/Dmg`) обрабатывается в начале `_tick()`; стан: `mob.stunTicks` пропускает атаку
- `HUD.js`: `#skill-zone` между `#hud` и `#battle-strip`; `setInterval 100ms` обновляет кулдаун-бар
- Событие `player:skillTriggered { skill }` — связывает GameState → Combat → HUD

### Milestone-система (v1.5.2)

- Каждая волна кратная 10 — milestone-рубеж
- **Уведомление**: флэш-оверлей (`#milestone-overlay`) с CSS-анимацией (scale-in → hold → fade, 3.2с); показывается на каждом рубеже
- **Золотой бонус** (`wave × 50`, умножается на `goldMult`) — только при новом `maxWaveReached`
- `state.maxWaveReached` не сбрасывается при престиже; при загрузке старых сейвов инициализируется из `currentWave`
- Логика в `Combat.js` после `combat:waveCleared`; событие `combat:milestone { wave, isNewRecord, bonusGold }`

### Сохранение

- Ключ: `idle_rpg_save`, формат v2 (v1 читается для совместимости)
- Автосейв каждые 30с + `beforeunload`
- Офлайн-прогресс: до 8 часов
- Поля: `maxWaveReached` (v1.5.2+)

---

## Ассеты

### Спрайты (public/sprites/, 128×128 PNG)

**Мобы (10):** goblin, slime, skeleton, orc, troll, dragonling, demon, lich, dragon, archdemon

**Боссы (10):** boss_slime_king, boss_goblin_chief, boss_bone_king, boss_orc_warlord, boss_troll_ancient, boss_fire_dragon, boss_lich_king, boss_demon_lord, boss_dragon_ancient, boss_chaos_lord

**Герои (5):** hero_novice, hero_warrior, hero_rogue, hero_archer, hero_mage

### Фоны (public/backgrounds/)

10 JPG фонов (`bg_01_10` → `bg_91_100`) + 10 PNG земли (`ground_01_10` → `ground_91_100`), по тирам волн.

---

## Планы развития

### Локализация (итеративно, v1.9.0+)

Инфраструктура готова (`src/i18n/`). Принцип: `t('key')` в JS-компонентах при рендере; `data-i18n="key"` + `applyTranslations()` для статических HTML.

- [x] **Итерация 1** — i18n система + главное меню (v1.9.0)
- [ ] **Итерация 2** — HUD + BattleStrip + skill-zone
- [ ] **Итерация 3** — ClassTree + StatsPanel + модалки
- [ ] **Итерация 4** — inline-строки в index.html

### Бэклог — геймплей

#### Реализовано (v1.0–1.11)

- [x] Инвентарь и экипировка — 3 слота, дроп, редкости common/rare/epic, продажа
- [x] Боевые статы: dodge, lifesteal, thorns, magicShield, pierce, deathblow, poison (DoT)
- [x] Кросс-ветковые способности — 15 классов depth 2–4
- [x] Milestone-уведомления + золотой бонус за рекорд волны
- [x] Floating text: MISS, БЛОК, +heal, ЩИТ СЛОМАН, screen shake на боссе
- [x] Флаги мобов (shield/regen/armored/swift) + элиты (wave % 5, HP×3, ATK×1.8)
- [x] Активные скиллы — 1 способность на ветку с кулдауном (v1.7.0)
- [x] 68 именных классов Мастерства depth-5; depth 6–10 авто-генерация (v1.10.0)
- [x] Открытие классов → +1 ПО; mystery-ноды; радиальный граф (v1.11.0)

#### 🔴 Высокий приоритет

- [ ] **Поджог (burn) — DoT, игнорирует броню** — стат `burn` (0–50%): каждый удар накладывает горение (моб получает `atk × burn%` в следующие 2 тика, броня игнорируется). Антибронебойность на поздних волнах. Паттерн идентичен poison — `/add-stat` + 3 класса:
  - `berserker` → **Воин Пламени** (depth 3, 3-й ребёнок; `atk: 0.30, burn: 0.06, spd: 0.10`)
  - `flame_warrior` → **Огненный Берсерк** + **Повелитель Огня** (depth 4)
  - `pyromaniac`, `explosive_expert` (mage, depth 4) — кросс +0.04 burn

- [ ] **Ачивки — расширение** — базовый механизм есть (v1.11: класс → +1 ПО). Добавить 10–12 явных целей с ПО-наградой и экраном прогресса. Даёт игроку короткие цели (5–15 мин) между "открыть класс" и "престиж". Примерный список:
  - "Первый босс" (волна 10) → +2 ПО
  - "Волна 50" → +5 ПО; "Волна 100" → +10 ПО
  - "10 000 убийств" → +3 ПО
  - "Открыты все классы depth 3" (16 классов) → +5 ПО
  - "Первый престиж" → +3 ПО
  - "Экипированы все 3 слота" → +2 ПО
  - Хранятся в `completedAchievements: Set` в GameState; кнопка 🏆 в HUD

#### 🟡 Средний приоритет

- [ ] **Улучшение предметов** — за золото поднять редкость: common→rare→epic с ростом бонусов. Даёт смысл держать конкретный предмет вместо бесконечного рероллинга дропа.

- [ ] **Сплэш (splash) — AoE урон** — стат `splash` (0–75%): `splash%` от урона по основной цели наносится всем остальным. Синергии: poison+splash = яд на всех; lifesteal работает только по основной цели.
  - `sniper` → **Шрапнельный Стрелок** (depth 3; `atk: 0.20, splash: 0.10, crit: 0.10`)
  - `shrapnel` → **Дробовик** + **Бомбардир Света** (depth 4)
  - `destroyer` (warrior, depth 3) — кросс +0.06 splash (cleave)

- [ ] **Многоударность (multi-strike)** — `multiStrike: N`; бьёт N первых мобов; lifesteal по суммарному урону; в `Combat.js`: `mobs[0]` → `mobs.slice(0, N)`.

- [ ] **Событийные волны** — раз в ~7 волн случайный модификатор: "Двойная волна", "Ускоренные мобы", "Золотая волна (×3 золото)".

#### 🟢 Низкий приоритет

- [ ] **Звук** — Web Audio API: фоновая музыка по тиру фона + SFX ударов/крита/смерти/уровня
- [ ] **Анимации спрайтов** — spritesheet вместо static PNG (idle/attack/hit/death)
- [ ] **Мобильная адаптация** — responsive layout для экранов < 768px
- [ ] **Волны 101–200** — новые мобы (Celestial-тир), фоны, 10 новых боссов
- [ ] **Новые классы depth 1–4** — ветки Некромант / Берсерк

### Бэклог — технический

- [ ] **Рефакторинг Combat.js** — вынести формулы урона в `DamageCalc.js` (файл ~387 строк, логика размазана)
- [ ] **Локализация итерации 2–4** — см. секцию выше

> Технический долг v1.0–1.7 закрыт: rAF + panic cap, event namespacing, destroy() во всех UI-модулях, валидатор баланса (`npm run balance`), texture atlas (`npm run atlas`), рефакторинг GameScene (764→76 строк) + 3 mixin.
