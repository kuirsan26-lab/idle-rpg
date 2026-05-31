# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # установить зависимости (Phaser 3 + Vite)
npm run dev       # запустить dev-сервер (порт 3000, fallback 3001)
npm run build     # сборка в dist/
npm run preview   # предпросмотр production сборки
```

## Architecture

**Hybrid rendering**: Phaser canvas для визуала боя, HTML/CSS для всех UI-панелей (статы, апгрейды, HUD, battle strip, инвентарь, граф классов).

### Layout (index.html, 1280×720)

Весь UI живёт в фиксированном слое `#app` (1280×720). На десктопе он целиком масштабируется одним `transform: scale()` под размер окна (`main.js` → `handleResize()`). На мобильных — см. секцию **Responsive / Mobile**.

```
#hud (52px)          — класс, уровень, XP, золото, волна, убийства + кнопки: prestige, 🏆 ачивки, 🌿 классы, 🎒 инвентарь, ⚙️
#skill-zone (40px)   — активный скилл ветки (кнопка #skill-btn + кулдаун-бар)
#battle-strip (52px) — [карточка игрока HP] ⚔️ [прогресс волны] [чипы врагов]
#main-area (flex)
  #game-container (flex:1)  — Phaser canvas (620×480), центрирован flexbox
  #stats-panel (300px)      — статы + магазин апгрейдов
#combat-log (96px)   — последние события боя
```

Класс-дерево теперь — **оверлей-граф** (`ClassTreeGraph`), не панель в main-area. `ui/ClassTree.js` — легаси, не импортируется.

Оверлеи/модалки: `#class-modal-overlay`, `#prestige-modal-overlay`, `#prestige-shop-overlay`, `#settings-overlay`, `#inventory-overlay`, `#achievements-overlay`, `#milestone-overlay`, `#main-menu-overlay`.

### Responsive / Mobile (c v1.14.0)

Десктоп: `#app` (1280×720) масштабируется одним `transform: scale()` (`main.js → handleResize`).

Мобилка (`@media (max-width: 820px)` в `index.html`): макет становится **резиновым** (reflow, не scale).
- `handleResize()` снимает `transform` при `matchMedia('(max-width:820px)')` — иначе фиксированный слой «съёжился» бы. Слушает и `resize`, и `mqMobile.change`.
- `#app` → `position:fixed; inset:0; 100dvh`, flex-column; `#hud`/`#skill-zone`/`#battle-strip` переносятся (`flex-wrap`); canvas — `object-fit: contain` на 100% контейнера (внутреннее разрешение 620×480 не меняется).
- **Нижний таб-бар** (`ui/MobileNav.js` → `#mobile-tabbar`, последний ребёнок `#app`): Статы / Классы / Инвентарь / Ачивки / Ещё. Кнопки дёргают `window.game.openX()`. nav-иконки из HUD скрыты на мобилке.
- `#stats-panel` → выезжающий снизу **bottom-sheet** (`body.stats-sheet-open` + `#mobile-sheet-backdrop`), тогглится кнопкой «Статы».
- Модалки получают `width: calc(100vw-20px); max-height: 88dvh; overflow:auto`; paper-doll и pshop-grid → одна колонка.
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` для iPhone.

### Core flow

```
main.js
 ├── GameState (core/GameState.js)       — состояние + EventEmitter + скилы (getBranch/triggerSkill)
 │    └── [mixin] GameStateSave (core/GameStateSave.js) — save/load/autosave/hardReset
 ├── CombatSystem (core/Combat.js)       — цикл боя, _applySkill, DOT (яд/горение), стан
 ├── GameScene (phaser/GameScene.js)     — тонкий Phaser-оркестратор (76 строк)
 │    ├── [mixin] SceneBackground (phaser/scene/SceneBackground.js) — фон, арена, оверлей
 │    ├── [mixin] SceneEntities (phaser/scene/SceneEntities.js)     — визуалы игрока + мобов
 │    └── [mixin] SceneFX (phaser/scene/SceneFX.js)                — FX + combat callbacks
 ├── StatsPanel (ui/StatsPanel.js)       — правая панель (статы + магазин)
 ├── HUD (ui/HUD.js)                     — верхняя панель + журнал + кнопка скилла
 ├── BattleStrip (ui/BattleStrip.js)     — полоса «кто с кем дерётся»
 ├── SettingsMenu (ui/SettingsMenu.js)   — меню настроек (статистика/управление/changelog)
 ├── PrestigeShop (ui/PrestigeShop.js)   — магазин очков престижа (ПО)
 ├── InventoryPanel (ui/InventoryPanel.js) — инвентарь + paper-doll снаряжения
 ├── ClassTreeGraph (ui/ClassTreeGraph.js) — оверлей-граф дерева классов
 ├── AchievementsPanel (ui/AchievementsPanel.js) — достижения + toast
 └── MainMenu (ui/MainMenu.js)           — стартовое меню (новая игра / продолжить / язык)
```

Данные: `data/classes.js`, `data/skills.js`, `data/mobs.js`, `data/items.js`, `data/achievements.js`, `data/changelog.js`. i18n: `i18n/{ru,en,index}.js`.

### Phaser init (critical)

`scene: []` (пустой) + ручной `phaserGame.scene.add('GameScene', GameScene, true, { state, combat })` после события `ready`. **Не** передавать `GameScene` напрямую в `scene:[]` — Phaser автостартует без данных и крашится.

### Class tree (data/classes.js)

- **128 ручных классов** (depth 1–5): Новичок → Воин/Плут/Лучник/Маг → … → 68 именных depth-5 мастер-классов
- **~3000 генерируемых классов** (depth 6–10): `generateDeepClasses()` при старте — запускается от ручных depth-5 как сидов
- `CLASS_MAP` (Map<id,cls>), `CHILDREN_MAP` (Map<parentId, childId[]>) — O(1) поиск
- `getCumulativeBonuses(classId)` — суммирует бонусы всей цепочки предков
- `DEPTH_LEVEL_REQ` и `DEPTH_GOLD_COST` — требования для разблокировки по глубине

### State → UI communication

`GameState extends EventBus`. UI-компоненты подписываются через `state.on(event, fn)`.
Ключевые события: `statsChanged`, `goldChanged`, `levelUp`, `classChanged`, `death`, `prestige`, `waveStarted`, `hpChanged`, `respawn`.

### Combat loop

`CombatSystem` тикает каждые 200ms. После смерти игрока — таймер `RESPAWN_MS`, затем `_spawnWave()` **с той же волной** (волна не инкрементируется). Волна засчитывается только когда все мобы мертвы и игрок жив.

**Откат волны**: счётчик `deathsOnWave` инкрементируется при каждой смерти и сбрасывается при прохождении волны. Если `deathsOnWave >= MAX_DEATHS_PER_WAVE (3)` — при следующем респавне `currentWave--` и спавн предыдущей волны. Минимум — волна 1.

Колбэки наблюдателей: `onWaveSpawn`, `onMobDeath`, `onPlayerAttack`, `onPlayerHit`, `onPlayerDeath`, `onRespawn`, `onWaveRollback`, `onSkillUsed`, `onMobDot`.

### Active Skills (data/skills.js)

По одному активному скиллу на ветку класса. Нажать кнопку `#skill-btn` в `#skill-zone` (строка между HUD и battle-strip).

| Ветка   | Скилл          | Эффект                                | CD    |
|---------|----------------|---------------------------------------|-------|
| novice  | Концентрация   | +25% макс. HP                         | 20 s  |
| warrior | Удар щитом     | Стан первого врага (5 тиков = 1 сек)  | 8 s   |
| rogue   | Отравить       | +80% урон + яд 3 тика (15% ATK/тик)  | 10 s  |
| archer  | Залп           | 50% ATK по всем врагам                | 12 s  |
| mage    | Огненный шар   | 80% ATK по всем + горение 3 тика      | 15 s  |

`state.triggerSkill()` — активировать. `state.isSkillReady()` / `state.getSkillCooldownPct()` / `state.getSkillCharges()` — состояние. Эффекты масштабируются множителем глубины `pm = 1 + 0.12*(depth-1)` (depth5 → ×1.48) в `Combat._applySkill`.
Скилл-эффекты в Combat: `_pendingPoison`, `mob.stunTicks`, `mob.poisonTicks/poisonDmg`, `mob.burnTicks/burnDmg`.

**Прокачка скиллов (v1.15.0):** `state.skillLevels` (по ветке, не сбрасывается при престиже). 5 уровней: 1-3 за золото, 4-5 за ПО (`SKILL_UPGRADES` в `data/skills.js`). `getSkillParams(branch, level)` резолвит эффективные параметры (heal%, cd, урон, тики, стан, цели, заряды), которые читает `Combat._applySkill`. Заряды (warrior/archer L5: +1 заряд) — `_skillCharges` + ленивая дозарядка `_syncSkillCharges()`. Спец-эффекты: баф ATK +20% (`_atkBuffEnd`, focus L4), щит возрождения (`_respawnShield`, focus L5, поглощается в `takeDamage`), стак яда (rogue L5), крит/DoT на залп (archer L2/L3), взрыв при смерти `_explode()` (mage L5). `state.buySkillUpgrade()` / `getNextSkillUpgrade()`. UI: `#skill-upgrade-btn` в `#skill-zone`.

### Automation (v1.15.0)

`state.automation = { autoCast, autoBuy, autoSell }` — не сбрасывается при престиже, сохраняется.
- **autoCast** (bool): `Combat._tick()` авто-кастит скилл по готовности при наличии врагов. Чекбокс в `#skill-zone`.
- **buy-max / ×10**: `state.buyUpgradeBulk(id, count|'max')`. Режим `#upg-buymode` в StatsPanel (×1/×10/МАКС).
- **autoBuy** (bool): `Combat._tick()` → `state.autoBuyStep()` покупает самый дешёвый доступный апгрейд. Чекбокс `#upg-autobuy`.
- **autoSell** (`'off'|'common'|'rare'`): `rollItemDrop()` → `shouldAutoSell()` продаёт дроп минуя инвентарь. `#inv-autosell` в инвентаре.

Мобы в `combat.mobs[]` — чистые данные. Их визуальные аналоги живут в `GameScene.mobVisuals` (Map<mobId, visual>).

### Prestige system (v3, c v1.12.0)

Перерождение открывается **после прохождения волны 10**. ПО (очки престижа) **зарабатываются только за достижения** — прежняя волновая формула `floor(wave^1.45/15)` и «+1 ПО за класс» удалены. ПО — единая валюта для магазина престижа.

**Магазин (10 апгрейдов, `src/ui/PrestigeShop.js`):** стартовое золото I/II/III, бонус XP×5, бонус золота×5, базовый ATK×5, базовый HP×5, скорость ветерана×3, сохранить улучшения (30 ПО), стартовая волна (15 ПО).

`window.game.openPrestigeShop()` — открыть магазин. HUD: кнопка «⭐ Переродиться» + бейдж `🏆 Y ПО` для входа в магазин.

**Формат сохранения v2** (v1 читается для совместимости). Штраф за смерть — нет.

### Items & inventory (data/items.js, ui/InventoryPanel.js)

Дроп предметов с мобов. Три типа: `weapon` / `armor` / `accessory`, три редкости `common` / `rare` / `epic` (множитель бонусов 1.0 / 1.9 / 3.5). `generateItem(wave, forcedRarity)` — генерация (тир по `ceil(wave/10)`, бонусы зависят от типа: weapon→atk/crit/spd, armor→hp/def, accessory→spd/crit/critDmg/xpMult/goldMult). Бонусы — доли (множители к статам), суммируются в `getStats()` через `eq`.

UI — оверлей `#inventory-overlay`: paper-doll (3 слота снаряжения + спрайт героя) + сетка инвентаря (макс. вместимость, продажа по `SELL_VALUE`). `window.game.openInventory()`.

### Achievements (data/achievements.js, ui/AchievementsPanel.js)

20 целей, награды в ПО. `ACHIEVEMENTS` (массив) + `ACHIEVEMENTS_MAP`. `state.checkAchievements()` вызывается из Combat при убийствах/событиях; выполнение даёт ПО и показывает toast (`#ach-toast`). `window.game.openAchievements()` — панель прогресса со шкалами.

### i18n (i18n/{ru,en,index}.js)

`getLang()` / `setLang(lang)` (localStorage) / `t(key)`. Переключение языка — на стартовом экране (`MainMenu`). `ru.js` — основной, `en.js` — перевод.

### Combat balance

**Mob scaling (combat):** `1 + k*ln(wave)`, где `k = 0.55 + 0.10*floor((wave-1)/5)` — нарастающий коэф. каждые 5 волн; DEF по `sqrt(scale)`.
**Mob scaling (rewards):** `1.06^(wave-1)` (XP/Gold) — экспоненциальный, независимо от боевого.

**Player base stats:** `{ hp: 130, atk: 14, def: 7, spd: 1.3 }` (атака ~769ms).

**Level growth:** `{ hp: 18, atk: 2.0, def: 1.0, spd: 0.010 }` за уровень.

**Wave rollback:** при смерти на боссе (wave % 10 === 0) — откат немедленно; иначе — после 3 смертей на волне.

**Расширенные статы (`GameState.getStats()`):** помимо базовых hp/atk/def/spd считаются `crit` (кап 95%), `critDmg`, `dodge` (кап 75%), `lifesteal`, `thorns`, `magicshield`, `pierce`, `deathblow`, `poison` (кап 60%), `burn` (кап 50%), `xpMult`, `goldMult`, `prestMult`. Источники: кумулятивные бонусы класса (`cb`), апгрейды (`upgBonuses`), экипировка (`eq`). **Множитель глубины** усиливает только hp/atk/def/spd — спецстаты не масштабируются (см. v1.13.2). DoT (poison/burn) игнорируют броню. Строки этих статов в `#stats-panel` скрыты, пока значение = 0.

### Sprites & backgrounds (GameScene.js)

**Все 34 ассета готовы** в `public/`:
- `sprites/`: goblin, slime, skeleton, orc, troll, dragonling, demon, lich, dragon, archdemon (10 мобов) + 10 боссов (boss_slime_king → boss_chaos_lord) — **128×128 RGBA PNG**; 5 героев (hero_novice/warrior/rogue/archer/mage) — **256×256 RGBA PNG**. Все упакованы в `atlas.png`/`atlas.json` через `scripts/build_atlas.py` (поддерживает разные размеры фреймов).
- `backgrounds/`: bg_01_10 → bg_91_100 (10 фонов) — 620×480 JPG

**Глубины (depth) в Phaser scene:**
- `0` — фоновое изображение (`_bgImage`)
- `1` — полоса земли (`_ground`)
- `2` — арена (факелы, декор)
- `3+` — мобы и игрок (создаются динамически)
- `10+` — UI-оверлеи

Когда `_bgImage` существует — процедурное небо (sky/moon/stars/mountains/hills) не рисуется, ground рисуется с alpha 0.75.

**Паттерн подключения спрайта:**
```js
// preload()
this.load.image('mob_goblin', '/sprites/goblin.png');
// _MOB_SPRITES
_MOB_SPRITES = { goblin: 'mob_goblin', ... };
// _createMobBody() — автоматически подхватит через textures.exists(key)
```

**Генерация спрайтов:**
- Мобы/боссы: `python -X utf8 scripts/generate_sprites.py`
- Герои (256×256, flood-fill bg removal): `python -X utf8 scripts/generate_heroes.py`
- После любой генерации — пересобрать атлас: `python -X utf8 scripts/build_atlas.py`

Credentials YandexART 2.0 — в `memory/reference_yandexart.md`.

### BattleStrip (ui/BattleStrip.js)

Обновляется через те же combat-колбэки. Показывает HP-бар игрока (цвет: зелёный/оранжевый/красный), чипы врагов сгруппированные по имени с мини HP-барами, прогресс волны (X/N убитых). Боссы — отдельный стиль с 👑.

### SettingsMenu (ui/SettingsMenu.js)

Две вкладки: **Статистика** (8 метрик в сетке) и **Управление** (сохранить/экспортировать/импортировать/сбросить). Сброс — 3 шага с автоотменой через 5с. Экспорт — `localStorage` → JSON-файл. Импорт — файл → JSON → `localStorage` → reload.

`window.game.openSettings()` — публичный хук для кнопки в HUD.

### ClassTreeGraph (ui/ClassTreeGraph.js)

Оверлей-граф всего дерева классов (canvas/SVG-подобный рендер нодов и связей). Карточка класса показывает бонусы и секцию «Итого с цепочкой ×N» (суммарная сила с множителем глубины). Престиж-классы открываются автоматически при выполнении всех `requires[]` (из любого класса списка, не только прямого родителя). Неоткрытые ноды — тусклые кружки в цвете ветки. `window.game.openClassGraph()`.

### MainMenu & Milestone

`MainMenu` (`#main-menu-overlay`, внутри `#app` для масштабирования) — стартовый экран: «Продолжить» / «Новая игра» (`onNewGame → state.hardReset()`) / переключатель языка / встроенный changelog. `combat.start()` дёргается из `onStart`.

`#milestone-overlay` — анимированный баннер при прохождении волн-вех (×10) и новых рекордах.

### Versioning (data/changelog.js)

Единый источник истины версии — `GAME_VERSION` в `src/data/changelog.js` + `CHANGELOG` (массив записей, `type: new|changed|fixed|balance`). При релизе синхронизировать с `package.json` `version`. «Что нового» в SettingsMenu и MainMenu читаются из этого массива. См. `/ship`-воркфлоу.

### Save system

`GameState.save()` / `GameState._load()` — localStorage (`idle_rpg_save`, версия `v:2`). Автосейв каждые 30с + `beforeunload`. При загрузке считает офлайн-прогресс (до 8 часов). Сохраняются также инвентарь/снаряжение, прогресс достижений, покупки магазина престижа.

## Update policy

**Обновлять CLAUDE.md** после каждого значимого изменения: новые файлы/модули, изменения архитектуры, новые паттерны, исправления критических багов.
