# Idle RPG — Living Architecture

> Живой документ. Обновлять при каждом значимом изменении структуры или планов.
> Последнее обновление: 2026-06-07 (v1.16.0: офлайн-симуляция прогресса по волнам + экран «С возвращением»)

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
  main.js              — точка входа, монтирование Phaser + UI + MainMenu + ClassTreeGraph + AchievementsPanel
  i18n/
    index.js            — getLang(), setLang(), t(key); язык в localStorage
    ru.js               — русские строки (сейчас только главное меню)
    en.js               — английские строки (сейчас только главное меню)
  core/
    GameState.js        — центральное состояние + EventBus + скиллы + discoveredClasses + checkAchievements()
    GameStateSave.js    — mixin: save/load/autosave/hardReset (completedAchievements, bossKillCount, poisonKillCount)
    Combat.js           — игровой цикл (rAF + накопленный dt), DoT, скиллы, powerMult масштабирование
  data/
    classes.js          — ~190 ручных классов (depth 1–5, в т.ч. 44 престиж-связанных) + generateDeepClasses()
    mobs.js             — данные мобов, боссов, флаги, иконки
    items.js            — генерация предметов, редкости, бонусы
    changelog.js        — GAME_VERSION + история версий
    skills.js           — SKILLS_BY_BRANCH (5 активных скиллов по веткам)
    achievements.js     — 20 достижений: id, name, desc, pp, check(state), progress(state), hidden?
  phaser/
    GameScene.js        — тонкий оркестратор: init, create, update, event wiring
    scene/
      SceneFX.js        — combat callbacks, floating text, эффекты, helpers
      SceneBackground.js— фон, земля, арена, факелы, wave banner
      SceneEntities.js  — игрок и мобы: спрайты, HP-бары, обновление визуалов
  ui/
    HUD.js              — верхняя панель + скилл-кнопка + кнопки Ачивки/Классы
    BattleStrip.js      — полоса боя: HP-бар, чипы с флагами, tooltip
    ClassTree.js        — ⚠️ НЕИСПОЛЬЗУЕМЫЙ файл (не импортируется в main.js)
    ClassTreeGraph.js   — радиальный граф (depth 0–5): SVG-рёбра, pan/zoom, инфо-панель, пульс-кнопка
    AchievementsPanel.js— модалка достижений: список, прогресс-бары, тост-уведомления
    StatsPanel.js       — правая панель: статы + магазин апгрейдов
    PrestigeShop.js     — модалка магазина престижа (10 апгрейдов)
    SettingsMenu.js     — настройки (статистика, сброс, changelog, экспорт/импорт)
    InventoryPanel.js   — инвентарь: 3 слота, список предметов, продажа
    MainMenu.js         — главное меню: Продолжить/Начать заново, changelog, RU/EN

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
┌─────────────────────────────── #hud (52px) ───────────────────────────────┐
│  класс · уровень · XP · золото · волна · убийства · 🏆Ачивки · 🌿Классы  │
│  ⭐Переродиться · 🏆 Y ПО · ⚙️                                            │
├─────────────────────────────── #skill-zone (40px) ─────────────────────────┤
│  [кнопка скилла: иконка · название · кулдаун-бар]  описание скилла         │
├─────────────────────────────── #battle-strip (52px) ──────────────────────┤
│  [HP игрока] ⚔️  [прогресс волны X/N]  [чипы врагов 👑]                   │
├────────────────────────────────────────────────────────────────────────────┤
│            #game-container · Phaser canvas 620×480 · #stats-panel (300px) │
│            центрирован flexbox                 статы + магазин апгрейдов   │
├────────────────────────────────────────────────────────────────────────────┤
│                          #combat-log (96px)                                 │
└────────────────────────────────────────────────────────────────────────────┘

Модалки: #class-modal-overlay · #prestige-modal-overlay · #settings-overlay
         #achievements-overlay · #radial-graph-overlay
Главное меню: #main-menu-overlay (position:absolute inset:0 z-index:500, внутри #app для масштабирования)
```

**Десктоп**: `#app` (1280×720) масштабируется `transform: scale()` (`main.js → handleResize`).

**Мобилка (v1.14.0, `@media (max-width:820px)`)**: reflow вместо scale. `handleResize()` снимает transform на `matchMedia('(max-width:820px)')`; `#app` → резиновый `100dvh` flex-column; HUD/skill/battle-strip переносятся; canvas `object-fit:contain`; `#stats-panel` → bottom-sheet (`body.stats-sheet-open`); нижний таб-бар `#mobile-tabbar` (`ui/MobileNav.js`) заменяет nav-иконки HUD; модалки резиновые (`calc(100vw-20px)`, `max-height:88dvh`).

### Поток данных

```
GameState (EventBus)
  │
  ├── Combat.js          читает state.player, пишет HP, gold, XP, wave; вызывает checkAchievements()
  │     └── колбэки → GameScene, BattleStrip, HUD
  │
  ├── GameScene.js       слушает state.on('classChanged', 'waveStarted', ...)
  ├── StatsPanel.js      слушает state.on('statsChanged', 'goldChanged', ...)
  ├── HUD.js             слушает state.on('goldChanged', 'levelUp', 'ppChanged', ...)
  ├── AchievementsPanel  слушает state.on('achievementUnlocked')
  └── BattleStrip.js     обновляется через combat-колбэки
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
| `player:ppChanged` | изменилось количество ПО (всегда из achievementUnlocked) | HUD (счётчик ПО, кнопка престижа) |
| `player:achievementUnlocked` | выполнено достижение `{ ach }` | AchievementsPanel (обновить список + тост) |

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

- **~190 ручных классов** (depth 1–5): Новичок → Воин/Плут/Лучник/Маг → … → 68+ именных depth-5 + 20 престиж-маркеров (12 ⭐ d4, 8 ⭐⭐ d5) + 24 depth-5 детей ⭐
- **~3000 генерируемых** (depth 6–10): `generateDeepClasses()` при старте — запускается от ручных depth-5 как сидов
- `CLASS_MAP` — `Map<id, cls>`, `CHILDREN_MAP` — `Map<parentId, childId[]>`
- `getCumulativeBonuses(classId)` — суммирует бонусы всей цепочки по `parentId` (не по `requires`)
- Требования: `DEPTH_LEVEL_REQ` (уровень) + `DEPTH_GOLD_COST` (золото)

**Престиж-классы (v1.13.0):**
- Поле `prestige: 1|2` + `requires: ['id1', 'id2']` — оба родителя должны быть в `discoveredClasses`
- Глубина `depth` вычисляется по `parentId`-цепочке (как у обычных); `getCumulativeBonuses` не меняется
- **⭐ depth-4 престиж (12 классов):** require два depth-3 из разных веток; имеют 2 ручных depth-5 ребёнка каждый
- **⭐⭐ depth-5 престиж (8 классов):** require два depth-4 (включая ⭐ prestiж-4); seed для авто-генерации depth 6–10
- Ветки: Воин (4⭐+3⭐⭐), Лучник (2⭐+2⭐⭐), Маг (3⭐+2⭐⭐), Плут (3⭐+1⭐⭐)
- В `ClassTreeGraph.js`: рёбра requires скрыты (`stroke:none`) до открытия класса; плавное появление при доступности; ⭐/⭐⭐ стиль нод
- Неизвестные ноды: фон `color+'18'`, пунктирная обводка `color+'38'` — видны как тусклые кружки

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
| BURN | 0% | **50%** | — | класс: flame_warrior-ветка warrior + fire_arrow-ветка archer + arsonist (rogue, кросс) + pyromaniac/bombardier (mage, кросс) |

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
DoT начало тика: poisonTicks → hp -= dmg (игнорирует блок; учитывает DEF), burnTicks → hp -= dmg (игнорирует DEF полностью), ticks--; убийство через _killMob()
onPlayerAttack: burn → if rand < burn% → mob.burnTicks=4, mob.burnDmg=atk*0.12 (не стакается, обновляет таймер)
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

### Престиж

- **Доступен при `maxWaveReached >= 10`** (первый босс убит) — не зависит от ПО
- **ПО начисляются только за достижения** — волновая формула и +1 ПО за класс удалены
- `canPrestige()` = `this.maxWaveReached >= 10`
- `prestige()` не начисляет ПО — только сбрасывает прогресс; ПО копятся отдельно через `checkAchievements()`

**Магазин (10 апгрейдов, `src/ui/PrestigeShop.js`):**

| Апгрейд | Стоимость |
|---------|-----------|
| Стартовое золото I (+1000g) | 2 ПО |
| Стартовое золото II (+5000g) | 5 ПО |
| Стартовое золото III (+25000g) | 12 ПО |
| Бонус XP ×5 (по +5%) | 3 ПО |
| Бонус золота ×5 (по +5%) | 3 ПО |
| Базовый ATK ×5 (по +5%) | 5 ПО |
| Базовый HP ×5 (по +5%) | 5 ПО |
| Скорость ветерана ×3 (по +2%) | 7 ПО |
| Сохранить улучшения | 30 ПО |
| Стартовая волна | 15 ПО |
| 🤖 Авто-продажа (group `auto`) | 5 ПО |
| 🤖 Авто-покупка | 15 ПО |
| 🤖 Авто-каст | 20 ПО |

**Инвариант:** Σ(ачивки) = 127 ПО == Σ(магазин по разу) = 127 ПО. Полный выкуп всех рангов = 205 ПО.

### Достижения

22 достижения в `src/data/achievements.js`, итого 127 ПО (== стоимость магазина по разу). Хранятся в `state.completedAchievements: Set<id>`.

**Логика проверки:** `state.checkAchievements()` вызывается после каждого убийства, смерти, смены класса, экипировки предмета, очистки волны, загрузки сейва. Ачивка засчитывается один раз — при следующем успешном `ach.check(state)`.

**Ключевые ачивки:**

| ID | Название | Условие | ПО |
|----|---------|---------|-----|
| first_blood | Первая кровь | 1 убийство | 1 |
| survivor | Выживший | wave 10 пройдена | 2 |
| wave_50 | Ветеран | wave 50 | 5 |
| wave_100 | Легенда | wave 100 | 10 |
| boss_hunter | Охотник на боссов | 10 боссов убито | 3 |
| master | Мастер | depth 5 класс | 5 |
| chosen | Избранный | depth 4 престиж | 5 |
| ascension | Вознесение | depth 5 престиж | 10 |
| phantom (hidden) | Призрак | dodge ≥ 60% | 4 |
| poison_master (hidden) | Мастер ядов | 1000 убийств ядом | 5 |

**Новые поля GameState:** `bossKillCount`, `poisonKillCount` (сохраняются, не сбрасываются при престиже).

**AchievementsPanel (`src/ui/AchievementsPanel.js`):** открывается по `window.game.openAchievements()` / кнопкой 🏆 в HUD. Hidden-ачивки показываются как `???` до выполнения. Прогресс-бары для ачивок с `ach.progress(state)`.

### Активные скиллы

| Ветка | Скилл | Эффект | Кулдаун |
|-------|-------|--------|---------|
| novice | ✨ Концентрация | +25% maxHp лечение | 20с |
| warrior | 🛡️ Удар щитом | стан первого врага 1с (5 тиков) | 8с |
| rogue | ☠️ Отравить | следующая атака ×1.8 + яд 3 тика | 10с |
| archer | 🏹 Залп | 50% ATK по всем мобам | 12с |
| mage | 🔥 Огненный шар | 80% ATK по всем + горение 3 тика | 15с |

**Пассивное масштабирование по глубине класса:**
- `powerMult = 1 + 0.12 × max(0, depth - 1)` — применяется в `Combat._applySkill()` к урону, лечению, количеству тиков DoT, стану
- depth 1 → ×1.0, depth 5 → ×1.48, prestige depth 5 → ×1.60 (нет UI, прозрачно для игрока)

**Реализация:**
- `src/data/skills.js` — `SKILLS_BY_BRANCH`: таблица скиллов по ветке; `SKILL_UPGRADES` + `getSkillParams(branch, level)` — прокачка
- `GameState`: `getBranch()`, `getActiveSkill()`, `getSkillParams()`, `getSkillLevel()`, `buySkillUpgrade()`, `triggerSkill()`, `getSkillCharges()`, `getSkillCooldownPct()` — заряды через `_skillCharges` + ленивую дозарядку (`_syncSkillCharges`), кулдаун через `performance.now()`
- `Combat.js`: `_applySkill(skill)` читает `getSkillParams()` + powerMult; `_explode()` для fireball L5; DoT (`poisonTicks/Dmg`, `burnTicks/Dmg`) в начале `_tick()`; стан: `mob.stunTicks`
- `HUD.js`: `#skill-zone` между `#hud` и `#battle-strip`; кнопка усиления `#skill-upgrade-btn`, чекбокс авто-каста `#skill-autocast`; `setInterval 100ms` обновляет кулдаун-бар + заряды
- Событие `player:skillTriggered { skill }` — связывает GameState → Combat → HUD; `player:skillLevelChanged` — обновляет UI

### Автоматизация (v1.15.0)

`state.automation = { autoCast, autoBuy, autoSell }` — не сбрасывается при престиже, сохраняется. Авто-каст/покупка/продажа **разблокируются в магазине престижа за ПО** (`isAutomationUnlocked(key)`); тумблеры заблокированы до покупки. buy-max/×10 — бесплатно.

| Фича | Разблок. | Где работает | UI |
|------|----------|--------------|-----|
| **Авто-каст скилла** | `autoCast` 20 ПО | `Combat._tick()`: `if (autoCast && unlocked && mobs && isSkillReady) triggerSkill()` | чекбокс в `#skill-zone` |
| **Buy-max / ×10** | бесплатно | `GameState.buyUpgradeBulk(id, count\|'max')` | `#upg-buymode` (×1/×10/МАКС) в StatsPanel |
| **Авто-покупка** | `autoBuy` 15 ПО | `Combat._tick()`: `autoBuyStep()` — самый дешёвый доступный апгрейд | чекбокс `#upg-autobuy` |
| **Авто-продажа** | `autoSell` 5 ПО | `rollItemDrop()` → `shouldAutoSell(rarity)` продаёт минуя инвентарь | `#inv-autosell` в инвентаре |

**Инвариант баланса ПО:** Σ(ачивки) = 127 ПО (22 шт.) **== ** Σ(магазин по разу) = 127 ПО. Полный выкуп всех рангов = 205 ПО. Новые ачивки v1.15.0: `unstoppable` (200k убийств, 24 ПО), `deep_diver` (класс depth 7, 20 ПО). Описание скилла — динамическое (`describeSkill`).

### Milestone-система (v1.5.2)

- Каждая волна кратная 10 — milestone-рубеж
- **Уведомление**: флэш-оверлей (`#milestone-overlay`) с CSS-анимацией (scale-in → hold → fade, 3.2с); показывается на каждом рубеже
- **Золотой бонус** (`wave × 50`, умножается на `goldMult`) — только при новом `maxWaveReached`
- `state.maxWaveReached` не сбрасывается при престиже; при загрузке старых сейвов инициализируется из `currentWave`
- Логика в `Combat.js` после `combat:waveCleared`; событие `combat:milestone { wave, isNewRecord, bonusGold }`

### Сохранение

- Ключ: `idle_rpg_save`, формат v2 (v1 читается для совместимости)
- Автосейв каждые 30с + `beforeunload`
- Поля: `maxWaveReached` (v1.5.2+)

### Офлайн-прогресс + экран «С возвращением» (v1.16.0)

- При загрузке `GameStateSave._load` вызывает `_simulateOffline(elapsedSec)` (cap 8 ч, `OFFLINE_MIN_SEC=60`) — **аналитическая** волновая симуляция вместо тиков (заменила старую формулу `dps*0.5`).
- `evalWave(wave)`: время зачистки по DPS (с учётом DEF/крита) + выживаемость по самому опасному мобу волны (DEF/маг.щит/уворот/вампиризм). Модель консервативная — сила фиксируется на момент входа.
- **Фаза 1** — продвижение по волнам, пока выживаемо и хватает бюджета времени; **Фаза 2** — фарм последней взятой волны остатком времени (батч-награды). Капы: `SIM_WAVE_CAP=4000`.
- Начисляет XP/золото/дроп штатными `addXp`/`addGold`/`rollItemDrop`, обновляет `currentWave`/`maxWaveReached`, дёргает `checkAchievements()`.
- Результат → транзиентное `state.offlineSummary` (не сохраняется). `main.js` в `onStart` показывает `OfflineModal` (оверлей `#offline-overlay`) с итогом: волны/уровни/убийства/золото/дроп, затем гасит summary.

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

#### Реализовано (v1.0–1.12+)

- [x] Инвентарь и экипировка — 3 слота, дроп, редкости common/rare/epic, продажа
- [x] Боевые статы: dodge, lifesteal, thorns, magicShield, pierce, deathblow, poison (DoT)
- [x] Кросс-ветковые способности — 15 классов depth 2–4
- [x] Milestone-уведомления + золотой бонус за рекорд волны
- [x] Floating text: MISS, БЛОК, +heal, ЩИТ СЛОМАН, screen shake на боссе
- [x] Флаги мобов (shield/regen/armored/swift) + элиты (wave % 5, HP×3, ATK×1.8)
- [x] Активные скиллы — 1 способность на ветку с кулдауном (v1.7.0)
- [x] 68 именных классов Мастерства depth-5; depth 6–10 авто-генерация (v1.10.0)
- [x] Mystery-ноды; радиальный граф с pan/zoom; кнопка в HUD с пульсом при доступном классе (v1.11.0)
- [x] Престиж-классы (⭐/⭐⭐): 20 классов с `requires[]`, пунктирные рёбра в графе (v1.12.0)
- [x] Достижения: 20 ачивок, 92 ПО, AchievementsPanel, тост-уведомления
- [x] ПП-экономика v2: ПО только за ачивки; `canPrestige()` = wave ≥ 10; магазин перебалансирован
- [x] Пассивный powerMult скиллов по глубине класса (`1 + 0.12 × (depth - 1)`)
- [x] **Горение (burn) — DoT, игнорирует броню**: стат `burn` 0–50%, 4 тика × 12% ATK (v1.13.0)
- [x] 20+ огненных классов depth 3–5; ретрофит 6 mage-классов; Феникс (кросс-ветковый ⭐)
- [x] Расширение престижей: +6 ⭐ d4 и +3 ⭐⭐ d5 для лучника, мага и плута (v1.13.0)
- [x] Граф — видимость нод (`color+'18'` фон) + скрытие prestige-рёбер до открытия (v1.13.0)

#### 🔴 Высокий приоритет

- [x] **Поджог (burn) — DoT, игнорирует броню** — реализовано в v1.13.0

- [x] **Усиление скиллов — прокачка за золото/ПО** (v1.15.0): `state.skillLevels: {novice,warrior,rogue,archer,mage}`, не сбрасывается при престиже. 5 уровней — 1–3 за золото, 4–5 за ПО. `SKILL_UPGRADES` + `getSkillParams(branch, level)` в `data/skills.js`. UI: кнопка «▲ Ур.N · Xg/ПО» в `#skill-zone`. Система зарядов (`_skillCharges` + ленивая дозарядка), баф ATK (focus L4), щит возрождения (focus L5), стак яда (rogue L5), крит/DoT на залп (archer L2/L3), взрыв при смерти (fireball L5).

    | Ур. | Воин | Плут | Маг | Лучник | Новичок |
    |-----|------|------|-----|--------|---------|
    | 1 | 500g — стан 2 моба | 800g — яд 5 тиков | 1000g — горение 5 тиков | 600g — 70% ATK | 400g — лечит 35% HP |
    | 2 | 1500g — стан 2с | 2000g — урон ×2.2 | 2500g — +30% урон | 1500g — DoT на залп | 1200g — кулдаун 14с |
    | 3 | 4000g — стан всех | 6000g — яд 20%/тик | 6000g — кулдаун 10с | 4000g — крит на залп | 3000g — лечит до 60% HP |
    | 4 | 8 ПО — стан 3с | 10 ПО — кулдаун 6с | 12 ПО — горение -1/тик∞ | 8 ПО — кулдаун 7с | 6 ПО — баф ATK +20% 10с |
    | 5 | 20 ПО — +1 заряд | 25 ПО — яд стакается | 30 ПО — взрыв при смерти | 20 ПО — +1 заряд | 15 ПО — respawn-щит |

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
- [x] **Мобильная адаптация** — responsive reflow ≤820px, нижний таб-бар, bottom-sheet (v1.14.0)
- [ ] **Волны 101–200** — новые мобы (Celestial-тир), фоны, 10 новых боссов
- [ ] **Новые классы depth 1–4** — ветки Некромант / Берсерк

### Бэклог — публикация

#### itch.io (доступно прямо сейчас)

- [ ] **Публикация на itch.io** — HTML5 браузерная игра, загружается как `dist/` zip.
  - Монетизация: "Pay what you want" с минимумом $0 → донаты. itch.io берёт 10% (настраивается).
  - Не требует изменений в коде. Нужно: описание, скриншоты/GIF, теги (idle, rpg, incremental).
  - Можно выставить страницу уже сейчас как "in development".

#### Steam (требует подготовки)

- [ ] **Steam-путь через Electron-обёртку**
  - Electron оборачивает текущую Vite-сборку в нативное приложение (`.exe` / `.app`).
  - Steamworks SDK интегрируется через `steamworks.js` — облачные сейвы, Steam-ачивки, таблицы.
  - Взнос за публикацию: $100 (единоразово на всю жизнь аккаунта).
  - Revenue split: 70% разработчику / 30% Steam.
  - **Что нужно для Steam:** polished главное меню, настройки разрешения, минимум 5 скриншотов + трейлер/GIF, store-page copy.
  - Смена движка (Godot/Defold) — отдельный разговор, оправдан только если планируется полный редизайн.

### Бэклог — технический

- [ ] **Рефакторинг Combat.js** — вынести формулы урона в `DamageCalc.js` (файл ~387 строк, логика размазана)
- [ ] **Локализация итерации 2–4** — см. секцию выше

> Технический долг v1.0–1.7 закрыт: rAF + panic cap, event namespacing, destroy() во всех UI-модулях, валидатор баланса (`npm run balance`), texture atlas (`npm run atlas`), рефакторинг GameScene (764→76 строк) + 3 mixin.
