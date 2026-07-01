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
  #battle-info-panel (160px) — левая панель: зона, волна, враги+HP, убийства (BattleInfoPanel.js)
  #game-container (flex:1)   — Phaser canvas (620×480), центрирован flexbox
  #stats-panel (300px)       — статы + магазин апгрейдов
#combat-log (96px)   — последние события боя
```

Класс-дерево теперь — **оверлей-граф** (`ClassTreeGraph`), не панель в main-area. `ui/ClassTree.js` — легаси, не импортируется.

Оверлеи/модалки: `#class-modal-overlay`, `#prestige-modal-overlay`, `#prestige-shop-overlay`, `#settings-overlay`, `#inventory-overlay`, `#achievements-overlay`, `#milestone-overlay`, `#main-menu-overlay`, `#offline-overlay`.

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
 ├── ClassTreeGraph (ui/ClassTreeGraph.js) — горизонтальная DOM-таблица дерева классов (фильтры: Все/Открытые/Доступные)
 ├── BattleInfoPanel (ui/BattleInfoPanel.js) — левая панель арены: зона, враги+HP, счётчик убийств
 ├── Tutorial (ui/Tutorial.js)           — онбординг первого запуска (4 шага, state.tutorialDone)
 ├── AchievementsPanel (ui/AchievementsPanel.js) — достижения + toast
 ├── MainMenu (ui/MainMenu.js)           — стартовое меню (новая игра / продолжить / язык)
 └── OfflineModal (ui/OfflineModal.js)   — экран «С возвращением» (итог офлайн-прогресса)
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

`state.automation = { autoCast, autoBuy, autoSell }` — не сбрасывается при престиже, сохраняется. **Авто-каст/покупка/продажа разблокируются в магазине престижа за ПО** (`isAutomationUnlocked(key)` = `getPrestigeRank(key) > 0`); тумблеры заблокированы (🔒) до покупки. buy-max/×10 — бесплатное удобство, без разблокировки.
- **autoCast** (bool, разблок. `autoCast` 20 ПО): `Combat._tick()` авто-кастит скилл по готовности при наличии врагов. Чекбокс в `#skill-zone`.
- **buy-max / ×10** (бесплатно): `state.buyUpgradeBulk(id, count|'max')`. Режим `#upg-buymode` в StatsPanel (×1/×10/МАКС).
- **autoBuy** (bool, разблок. `autoBuy` 15 ПО): `Combat._tick()` → `state.autoBuyStep()` покупает самый дешёвый доступный апгрейд. Чекбокс `#upg-autobuy`.
- **autoSell** (`'off'|'common'|'rare'`, разблок. `autoSell` 5 ПО): `rollItemDrop()` → `shouldAutoSell()` продаёт дроп минуя инвентарь. `#inv-autosell` в инвентаре.

Описание скилла в `#skill-zone` — динамическое (`describeSkill(branch, level)` из `data/skills.js`), отражает текущий уровень прокачки.

**Баланс ПО (инвариант):** суммарные ПО за ачивки (22 шт. = 127 ПО) **точно равны** стоимости магазина «каждый апгрейд по разу» (127 ПО). Полный выкуп всех рангов = 205 ПО. См. `data/achievements.js` + `PRESTIGE_UPGRADES`.

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
- `sprites/`: goblin, slime, skeleton, orc, troll, dragonling, demon, lich, dragon, archdemon (10 мобов) + 10 боссов (boss_slime_king → boss_chaos_lord) — **128×128 RGBA PNG**, упакованы в `atlas.png`/`atlas.json` через `scripts/build_atlas.py` (поддерживает разные размеры фреймов). Статичные герои 256×256 в атласе остались **только как fallback** — основная отрисовка героев теперь анимированные спрайтшиты в `public/sprites/heroes/` (см. «Hero animations»).
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

### Hero animations (Pixellab, c v2.2.0)

Герои (5 классов) — **анимированные пиксель-спрайтшиты**, отдельно от мобового атласа
(осознанный стиль-микс пиксель-герои vs painterly-мобы).

- **Ассеты:** `public/sprites/heroes/hero_<branch>.png` (сетка **96×96**, один ряд, 24 кадра) +
  `hero_<branch>.json` (`{ frameSize, states: { idle|attack|hit|death: {start,count,frameRate} } }`).
  Ветки: `novice/warrior/rogue/archer/mage`. Вид сбоку, **лицом вправо** (Pixellab dir `east`).
- **Состояния:** idle (loop), attack (one-shot→idle), hit (one-shot→idle), death (one-shot, hold).
  Реальные counts: idle 4 / attack 7 / hit 6 / death 7.
- **Загрузка:** `GameScene.preload` грузит `hero_anim_<branch>` (spritesheet 96×96) + `hero_json_<branch>`.
  `GameScene.create` регистрирует анимации через `registerHeroAnims` (модуль `phaser/scene/heroAnims.js`),
  ставит NEAREST **только на текстуры героев** (глобальный `pixelArt` НЕ включён — мобы сглажены).
- **Отрисовка:** `SceneEntities._buildPlayerSprite` — приоритет: анимированный `Sprite` →
  статичный Image из атласа → Graphics-fallback (`_hasHeroAnim(branch)`). Смена класса пересобирает
  body через `_updatePlayerVisual` (`playerContainer.replace`).
- **Привязка к бою:** `SceneFX._playHeroAnim(state)` дёргается из `_onPlayerAttack/_onPlayerHit/`
  `_onPlayerDeath/_onRespawn`. Молча возвращает false, если body не анимированный Sprite (fallback).
  При death-анимации 88°-наклон контейнера пропускается (чтобы не было двойного падения).
- **Генерация:** через **Pixellab MCP** (`create_character` view=side + `animate_character`
  template/v3, только dir `east`). Скачанный zip → `scripts/import_pixellab_hero.py --branch X
  --extracted <dir>` (читает `metadata.json`, паддит кадры до 96×96, склеивает ряд idle→attack→hit→death).
  Детали формата и лимиты — `docs/superpowers/plans/pixellab-facts.md`.

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

Единый источник истины версии — `GAME_VERSION` в `src/data/changelog.js` + `CHANGELOG` (массив записей, `type: new|changed|fixed|balance`). При релизе синхронизировать с `package.json` `version`. «Что нового» в SettingsMenu и MainMenu читаются из этого массива. См. `/ship`-воркфлоу. Текущая версия: **v2.2.0**.

### Dark Fantasy Theme (c v1.17.0)

Игра использует тёмную тему на основе CSS-переменных (`:root` в `index.html`):
- `--bg-main: #080810`, `--bg-panel: #0d0510`, `--border-red: #8b0000`
- `--text-parchment: #e8d5b7`, `--color-souls: #9b59b6`, `--color-gold: #f39c12`
- Шрифт заголовков: Google Fonts `Cinzel` (подключён в `index.html`)
- FX арены: красные/пурпурные цвета в `SceneFX.js`, тёмное небо в `SceneBackground.js`
- Счётчик Душ (`💜`) в HUD — отображает `state.souls || 0` (логика в v2.0)

### Zone System (c v1.18.0)

5 линейных зон, данные в `src/data/zones.js` (`ZONES`, `ZONES_MAP`, `ZONE_IDS`):

| Зона | id | Мобы | Босс |
|------|----|------|------|
| Тёмный Лес | forest | goblin, slime, skeleton | Страж Леса |
| Катакомбы | catacombs | skeleton, orc, demon | Король Мертвецов |
| Вулкан. Пещеры | volcano | troll, dragonling, demon | Огненный Титан |
| Небесная Крепость | skyfort | dragonling, dragon, lich | Тёмный Архангел |
| Бездна | abyss | lich, dragon, archdemon | Повелитель Хаоса |

**GameState зональные поля:** `currentZoneId`, `zoneWave` (1–21, 21=босс), `globalWave` (суммарно, для скейлинга), `zonesProgress`.

**Методы:** `getCurrentZone()`, `enterZone(zoneId)`, `completeZone(zoneId)`.

**Combat:** `zoneWave > zone.waves` → спавн финального босса через `createZoneBossData(bossId, globalWave)`. После победы над боссом — `completeZone()` разблокирует следующую зону. Откат при смерти: `zoneWave--`, `globalWave--`.

**UI:** `ZoneMap.js` → `#zone-map-overlay`, `window.game.openZoneMap()`. Кнопка 🗺 в HUD.

### Save system

`GameState.save()` / `GameState._load()` — localStorage (`idle_rpg_save`, версия `v:2`). Автосейв каждые 30с + `beforeunload`. Сохраняются также инвентарь/снаряжение, прогресс достижений, покупки магазина престижа.

**Офлайн-прогресс (c v1.16.0):** при загрузке `_load` вызывает `_simulateOffline(elapsedSec)` (cap 8 ч) — аналитическую волновую симуляцию вместо тиков. `evalWave(wave)` оценивает время зачистки (по DPS с учётом DEF/крита) и выживаемость (по самому опасному мобу, с учётом DEF/маг.щита/уворота/вампиризма). Фаза 1 — продвижение по волнам, пока выживаемо и хватает бюджета времени; фаза 2 — фарм последней взятой волны остатком времени (батч-награды). Сила фиксируется на момент загрузки (консервативно). Начисляет XP/золото/дроп штатными `addXp`/`addGold`/`rollItemDrop`, обновляет `currentWave`/`maxWaveReached`. Результат → транзиентное `state.offlineSummary` (не сохраняется), которое `main.js` показывает через `OfflineModal` в `onStart`. Капы: `OFFLINE_MIN_SEC=60`, `SIM_WAVE_CAP=4000`.

### Roadmap (planned)

- **v2.0.0** (`feat/roguelite-loop`): Рогалайк-петля — Души, Зеркало Теней (постоянные перки), экран итогов рана.

## Update policy

**Обновлять CLAUDE.md** после каждого значимого изменения: новые файлы/модули, изменения архитектуры, новые паттерны, исправления критических багов.
