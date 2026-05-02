# Idle RPG — Living Architecture

> Живой документ. Обновлять при каждом значимом изменении структуры или планов.
> Последнее обновление: 2026-04-25 (v1.5.2: milestone-уведомления, maxWaveReached, золотой бонус)

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
| Спрайты | YandexART 2.0, 128×128 RGBA PNG |
| Фоны | YandexART 2.0, 620×480 JPG |

---

## Файловая структура

```
src/
  main.js              (108 строки)  — точка входа, монтирование Phaser + UI
  core/
    GameState.js       (515)  — центральное состояние + EventBus
    Combat.js          (306)  — игровой цикл (rAF + накопленный dt)
  data/
    classes.js         (269)  — 60 ручных классов + generateDeepClasses()
    mobs.js            (270)  — данные мобов, боссов, флаги, иконки
    items.js            (95)  — генерация предметов, редкости, бонусы
    changelog.js       (107)  — GAME_VERSION + история версий
  phaser/
    GameScene.js       (764)  — Phaser-сцена: спрайты, анимации, фоны, эффекты ⚠️ кандидат на разбивку
  ui/
    HUD.js             (208)  — верхняя панель (класс, XP, золото, волна)
    BattleStrip.js     (342)  — полоса боя: HP-бар, чипы с флагами, tooltip
    ClassTree.js       (256)  — HTML-дерево классов (280px, левая колонка)
    StatsPanel.js      (124)  — правая панель: статы + магазин апгрейдов
    PrestigeShop.js    (108)  — модалка магазина престижа (10 апгрейдов)
    SettingsMenu.js    (311)  — настройки (статистика, сброс, changelog, экспорт/импорт)
    InventoryPanel.js  (185)  — инвентарь: 3 слота, список предметов, продажа

public/
  sprites/             — 25 PNG: 10 мобов + 10 боссов + 5 героев
  backgrounds/         — 10 JPG (bg_01_10 … bg_91_100) + 10 PNG (ground_*)
```

---

## Архитектура

### Layout (1280×720, index.html)

```
┌─────────────────────────── #hud (52px) ───────────────────────────┐
│  класс · уровень · XP · золото · волна · убийства · prestige · ⚙️  │
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

- **60 ручных классов** (depth 1–4): Новичок → Воин/Плут/Лучник/Маг → ...
- **~4000 генерируемых** (depth 5–10): `generateDeepClasses()` при старте
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

**Реализация в `Combat.js`:**
```
onPlayerAttack: lifesteal → currentHp += dmg * lifesteal/100, cap maxHp
onPlayerHit:    dodge     → if rand < dodge% → emit miss, skip takeDamage()
onPlayerHit:    thorns    → mob.hp -= dmg * thorns/100 после takeDamage(); если моб умер → _killMob()
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
- Ачивки (в планах) будут давать ПО напрямую — дополнительный источник помимо раунда
- Магазин: 10 апгрейдов (стартовое золото, XP×5, золото×5, ATK×5, HP×5, скорость×3, сохранить улучшения 30 ПО, стартовая волна 20 ПО)

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

### В работе / ближайшее

- [x] **Game loop: rAF + panic cap** — заменить `setInterval(200ms)` в `Combat.js` на `requestAnimationFrame` + accumulated delta + panic cap ≤10 сек (устраняет шквал обновлений после фоновой вкладки)

### Бэклог — технический долг (из best practices)

- [x] **Event namespacing** — переименовать события в `player:*` и `combat:*` (защита от коллизий при росте кодовой базы)
- [x] **destroy() в UI-модулях** — добавить метод с `state.off(...)` во все UI-компоненты (предотвращает утечки памяти)
- [x] **Валидация баланса классов** — `scripts/validate_balance.js` (`npm run balance`): считает power score каждой ветки по глубинам, флажит выбросы >15% от среднего
- [x] **Texture atlas** — `scripts/build_atlas.py` (`npm run atlas`): 25 спрайтов → один 640×640 PNG; GameScene грузит через `load.atlas()`

### Бэклог — геймплей

#### Реализовано
- [x] **Инвентарь и экипировка** — 3 слота (weapon/armor/accessory), дроп 12%/50% босс, редкости common/rare/epic, оверлей `#inventory-overlay`, продажа предметов
- [x] **Уворот (dodge)** — только класс (rogue-ветка); cap 75%; реализован в `getStats()` и `Combat.js`
- [x] **Вампиризм (lifesteal)** — только класс (bloodthirst-ветка); heal после каждой атаки, cap maxHp
- [x] **Шипы (thorns)** — только класс (paladin-ветка); отражение после `takeDamage()`; убийство шипами обработано корректно
- [x] **Маг. щит (magicShield)** — только класс (mage-ветка); снижает входящий урон на %; cap 75%
- [x] **Кросс-ветковые способности** — 11 классов depth 2–4 получили уникальные механики из других веток: Убийца→deathblow, Ниндзя→pierce, Тень→lifesteal, Призрак→magicShield, Инквизитор→magicShield, Тёмный Судья→deathblow, Охотник на Ведьм→magicShield, Гладиатор→thorns, Охотник за Головами→deathblow, Пират→lifesteal, Шаман→dodge
- [x] **Milestone-уведомления** — флэш-оверлей при первом прохождении волн 10/20/30...; золотой бонус `wave×50` (с goldMult) за новый рекорд; `state.maxWaveReached` сохраняется навсегда

#### 🔴 Высокий приоритет
- [x] **Milestone при первом прохождении волны** — флэш-оверлей + золотой бонус `wave×50` при новом `maxWaveReached`. Реализовано в v1.5.2.
- [x] **Floating text polish** — `MISS` (серый) при dodge, `БЛОК` (синий) при thorns, screen shake при ударе босса, +heal при регене, 🛡 ЩИТ СЛОМАН. Реализовано в v1.6.0.
- [x] **Флаги мобов** — `shield`, `regen`, `armored`, `swift`; боссы 1–2 флага; иконки в BattleStrip и GameScene; tooltip с описанием. Реализовано в v1.6.0.
- [x] **Элиты (wave % 5)** — HP×3, ATK×1.8, гарантированный rare-дроп, жёлтый чип ⚡. Реализовано в v1.6.0.

#### 🟡 Средний приоритет

- [ ] **Яд (poison) — DoT механика** — стат `poison` (0–100%): шанс наложить яд при ударе. Отравленный моб получает `atk * 0.15` урона каждые 2 тика (~400ms) в течение 5 сек, игнорируя броню. Не стакается, освежает таймер. Реализация: добавить `poisonTicksLeft`, `poisonDmgPerTick` в структуру моба; проход по мобам в начале `_tick()`. Новые классы:
  - `alchemist` → **Токсиколог** (depth 3, 3-й ребёнок; `poison: 0.06, goldMult: 0.20, atk: 0.20`)
  - `toxicologist` → **Мастер Ядов** + **Чумной Доктор** (depth 4; оба с `poison: 0.08+`)
  - `poison_arrow` (archer, depth 4) — получает реальный `poison: 0.05` (тематически уже есть)
  - cap: 60%

- [ ] **Поджог (burn) — DoT игнорирующий броню** — стат `burn` (0–50%): каждый удар накладывает горение. Горящий моб получает `atk * burn%` урона в следующие 2 тика, броня не учитывается. Ценность: антибронебойность на поздних волнах где DEF мобов высок. Новые классы:
  - `berserker` → **Воин Пламени** (depth 3, 3-й ребёнок; `atk: 0.30, burn: 0.06, spd: 0.10`)
  - `flame_warrior` → **Огненный Берсерк** + **Повелитель Огня** (depth 4)
  - `pyromaniac` и `explosive_expert` (mage, depth 4) — получают `burn: 0.04` кросс-бонусом
  - cap: 50%

- [ ] **Сплэш (splash) — AoE урон** — стат `splash` (0–75%): `splash%` от урона по основной цели наносится **всем остальным** мобам на волне. Синергии: lifesteal с splash = лечение от всех; poison + splash = яд на всех → требует cap. Новые классы:
  - `sniper` → **Шрапнельный Стрелок** (depth 3, 3-й ребёнок; `atk: 0.20, splash: 0.10, crit: 0.10`)
  - `shrapnel` → **Дробовик** + **Бомбардир Света** (depth 4)
  - `destroyer` (warrior, depth 3) — получает `splash: 0.06` кросс-бонусом (cleave)
  - cap: 75%; синергия lifesteal+splash ограничена: lifesteal работает только по основной цели

- [ ] **Многоударность (multi-strike)** — бонус класса `multiStrike: N`; бьёт `N` первых мобов вместо одного; lifesteal по суммарному урону; синергирует с rogue/archer-веткой; в `Combat.js`: замена `mobs[0]` на цикл `mobs.slice(0, N)`
- [x] **Floating text в GameScene** — MISS, БЛОК, +heal, ЩИТ СЛОМАН, screen shake на боссе. Реализовано в v1.6.0.
- [ ] **Улучшение предметов** — за золото поднять редкость: common→rare→epic (с ростом бонусов); даёт смысл держать конкретный предмет вместо бесконечного рероллинга дропа
- [ ] **Достижения** — 10–15 milestone-целей с наградой в ПО: "Первый босс", "Волна 50", "10K убийств", "Все классы depth 3" и т.д.; дополнительный источник ПО помимо прогрессии волн

#### 🟢 Низкий приоритет
- [ ] **Событийные волны** — раз в ~7 волн случайный модификатор: "Двойная волна", "Ускоренные мобы", "Золотая волна (×3 золото)"; добавляет реиграбельность
- [ ] **Скиллы классов** — 1 активная способность с кулдауном на ветку (не только пассивные бонусы)
- [ ] **Ручные классы depth 5** — заменить авто-генерацию (~28 классов) вручную; текущий паттерн "Великий/Тёмный + имя родителя" выглядит шаблонно

### Бэклог — технический

- [ ] **🔴 Рефакторинг крупных файлов** — разбить файлы >400 строк на модули для снижения стоимости чтения при разработке. Приоритет: сначала `GameScene.js`, затем `GameState.js`.

  **`GameScene.js` (764 строки) → 3 файла:**
  - `phaser/GameScene.js` (~220 строк) — init, create, update, event wiring, background/arena
  - `phaser/MobVisuals.js` (~230 строк) — `_createMobVisual`, `_createMobBody`, `_drawMobBody`, `_updateMobHpBar`, `_onWaveSpawn`, `_onMobDeath`, `_onPlayerAttack`
  - `phaser/SceneEffects.js` (~200 строк) — `_spawnDmgText`, `_drawAttackFX`, `_spawnDeathParticles`, `_onPlayerHit`, `_onPlayerDeath`, `_onRespawn`, `_onThornsReflect`, `_onMobRegen`, `_onShieldBreak`, `_showWaveBanner`

  **`GameState.js` (515 строк) → 2 файла:**
  - `core/gameConfig.js` (~80 строк) — `BASE_STATS`, `LEVEL_GROWTH`, `UPGRADE_BONUS`, `UPGRADES_LIST`, `PRESTIGE_UPGRADES`, `PRESTIGE_UPGRADES_MAP`, `xpForLevel`, `upgradeCost`
  - `core/GameState.js` (~435 строк) — `EventBus` + `GameState` (импортирует константы из gameConfig)

  Итог: ни один файл не превышает ~230 строк; `GameScene.js` из 764 строк → 3×~220.

- [ ] **Анимации спрайтов** — spritesheet вместо static PNG (idle/attack/hit/death)
- [ ] **Звук** — Web Audio API: фоновая музыка по тиру фона + SFX ударов/крита/смерти/уровня
- [ ] **Мобильная адаптация** — responsive layout для экранов < 768px
- [ ] **Рефакторинг Combat.js** — вынести формулы урона в отдельный `DamageCalc.js`

### Бэклог — контент

- [ ] **Волны 101–200** — новые мобы (Celestial-тир), фоны, 10 новых боссов
- [ ] **Новые классы depth 1–4** — добавить ветки Некромант / Берсерк
- [ ] **Расширение дерева: 3-й ребёнок у выбранных классов** — точечное добавление, не у всех. Правило: 3-й ребёнок только там, где несёт новую уникальную механику, и имеет ту же глубину что и остальные два. Таблица запланированных расширений:

  | Родитель | Depth | Новый 3-й ребёнок | Уникальная механика |
  |----------|-------|-------------------|---------------------|
  | `alchemist` | 2 | Токсиколог | poison |
  | `berserker` | 2 | Воин Пламени | burn |
  | `sniper` | 2 | Шрапнельный Стрелок | splash |
  | `toxicologist` | 3 | Мастер Ядов, Чумной Доктор | poison (глубже) |
  | `flame_warrior` | 3 | Огненный Берсерк, Повелитель Огня | burn (глубже) |
  | `shrapnel` | 3 | Дробовик, Бомбардир Света | splash (глубже) |

  Depth 5–10 для новых веток генерируются автоматически через `generateDeepClasses()` — бонусы `poison`/`burn`/`splash` будут масштабироваться как и остальные.

---

## Сравнение с best practices индустрии

### Соответствует

- **EventBus / GameState** — правильная развязка систем через события, не прямые ссылки
- **Hybrid rendering** — Phaser canvas только для боя, весь UI на HTML/CSS (рекомендованный подход)
- **Offline progress** — есть cap 8 часов (индустриальная норма)
- **Автосейв** — каждые 30с + `beforeunload` (стандарт)
- **DOM-ивенты cached** — UI-компоненты хранят ссылки на элементы в конструкторе, не ищут в цикле

### Расхождения (tech debt)

Все выявленные проблемы устранены: rAF + panic cap, event namespacing (`player:` / `combat:`), `destroy()` во всех UI-модулях, валидатор баланса классов (`npm run balance`), texture atlas (`npm run atlas`).

---

## Известные ограничения / долг

| # | Описание |
|---|---------|
| 1 | `GameScene.js` (733 строки) — монолит, стоит разбить на `SceneBackground`, `SceneCharacters` |
| 2 | Все моды апгрейдов хардкодированы в `PrestigeShop.js`, нет data-файла |
| 3 | Нет обработки ошибок при загрузке спрайтов (fallback только для текстур) |
| 4 | `generateDeepClasses()` выполняется синхронно при старте — может тормозить на слабых устройствах |
| 5 | `SettingsMenu._importSave()` проверяет только `data.v !== 1`, но формат сейва v2 — импорт своих сейвов падает с ошибкой |
