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

**Hybrid rendering**: Phaser canvas для визуала боя, HTML/CSS для всех UI-панелей (дерево классов, статы, апгрейды, HUD, battle strip).

### Layout (index.html, 1280×720)

```
#hud (52px)          — класс, уровень, XP, золото, волна, убийства, кнопки prestige/⚙️
#battle-strip (52px) — [карточка игрока HP] ⚔️ [прогресс волны] [чипы врагов]
#main-area (flex)
  #class-tree-panel (280px) — HTML-панель дерева классов
  #game-container (flex:1)  — Phaser canvas (620×480), центрирован flexbox
  #stats-panel (300px)      — статы + магазин апгрейдов
#combat-log (96px)   — последние события боя
```

Модалки: `#class-modal-overlay`, `#prestige-modal-overlay`, `#settings-overlay`.

### Core flow

```
main.js
 ├── GameState (core/GameState.js)    — центральное состояние + EventEmitter
 ├── CombatSystem (core/Combat.js)    — игровой цикл (setInterval 200ms)
 ├── GameScene (phaser/GameScene.js)  — Phaser scene, рендер персонажа и мобов
 ├── ClassTreePanel (ui/ClassTree.js) — HTML-панель дерева классов
 ├── StatsPanel (ui/StatsPanel.js)    — правая панель (статы + магазин)
 ├── HUD (ui/HUD.js)                  — верхняя панель + боевой журнал
 ├── BattleStrip (ui/BattleStrip.js)  — полоса «кто с кем дерётся»
 └── SettingsMenu (ui/SettingsMenu.js)— меню настроек (статистика, сброс, экспорт/импорт)
```

### Phaser init (critical)

`scene: []` (пустой) + ручной `phaserGame.scene.add('GameScene', GameScene, true, { state, combat })` после события `ready`. **Не** передавать `GameScene` напрямую в `scene:[]` — Phaser автостартует без данных и крашится.

### Class tree (data/classes.js)

- **60 ручных классов** (depth 1–4): Новичок → Воин/Плут/Лучник/Маг → …
- **~4000 генерируемых классов** (depth 5–10): `generateDeepClasses()` при старте
- `CLASS_MAP` (Map<id,cls>), `CHILDREN_MAP` (Map<parentId, childId[]>) — O(1) поиск
- `getCumulativeBonuses(classId)` — суммирует бонусы всей цепочки предков
- `DEPTH_LEVEL_REQ` и `DEPTH_GOLD_COST` — требования для разблокировки по глубине

### State → UI communication

`GameState extends EventBus`. UI-компоненты подписываются через `state.on(event, fn)`.
Ключевые события: `statsChanged`, `goldChanged`, `levelUp`, `classChanged`, `death`, `prestige`, `waveStarted`, `hpChanged`, `respawn`.

### Combat loop

`CombatSystem` тикает каждые 200ms. После смерти игрока — таймер `RESPAWN_MS`, затем `_spawnWave()` **с той же волной** (волна не инкрементируется). Волна засчитывается только когда все мобы мертвы и игрок жив.

**Откат волны**: счётчик `deathsOnWave` инкрементируется при каждой смерти и сбрасывается при прохождении волны. Если `deathsOnWave >= MAX_DEATHS_PER_WAVE (3)` — при следующем респавне `currentWave--` и спавн предыдущей волны. Минимум — волна 1.

Колбэки наблюдателей: `onWaveSpawn`, `onMobDeath`, `onPlayerAttack`, `onPlayerHit`, `onPlayerDeath`, `onRespawn`, `onWaveRollback`.

Мобы в `combat.mobs[]` — чистые данные. Их визуальные аналоги живут в `GameScene.mobVisuals` (Map<mobId, visual>).

### Prestige system

`canPrestige()` — уровень ≥ 99 ИЛИ разблокирован класс depth 10. До выполнения условий в HUD показывается прогресс-бар `⭐ Ур. X / 99`. При достижении условия бар скрывается, появляется кнопка «Переродиться». Штраф за смерть — **5% золота** (`gold * 0.95`).

### BattleStrip (ui/BattleStrip.js)

Обновляется через те же combat-колбэки. Показывает HP-бар игрока (цвет: зелёный/оранжевый/красный), чипы врагов сгруппированные по имени с мини HP-барами, прогресс волны (X/N убитых). Боссы — отдельный стиль с 👑.

### SettingsMenu (ui/SettingsMenu.js)

Две вкладки: **Статистика** (8 метрик в сетке) и **Управление** (сохранить/экспортировать/импортировать/сбросить). Сброс — 3 шага с автоотменой через 5с. Экспорт — `localStorage` → JSON-файл. Импорт — файл → JSON → `localStorage` → reload.

`window.game.openSettings()` — публичный хук для кнопки в HUD.

### Save system

`GameState.save()` / `GameState._load()` — localStorage (`idle_rpg_save`, версия `v:1`). Автосейв каждые 30с + `beforeunload`. При загрузке считает офлайн-прогресс (до 8 часов).

## Update policy

**Обновлять CLAUDE.md** после каждого значимого изменения: новые файлы/модули, изменения архитектуры, новые паттерны, исправления критических багов.
