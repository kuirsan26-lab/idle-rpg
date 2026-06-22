# Дизайн: Dark Fantasy v2.0 — Зоны + Рогалайк-петля

**Дата:** 2026-06-21  
**Статус:** Approved  
**Версии:** v1.17 → v1.18 → v2.0  
**Ветки git:** `feat/dark-fantasy-ui` → `feat/zone-system` → `feat/roguelite-loop`

---

## Обзор

Три фазы радикального апгрейда «Путь Героя»:

| Фаза | Версия | Ветка | Суть |
|------|--------|-------|------|
| 1 | v1.17 | `feat/dark-fantasy-ui` | Тёмный визуальный скин — CSS, цвета, UI-детали |
| 2 | v1.18 | `feat/zone-system` | Зональная структура (Лес → Подземелье → Вулкан → Небеса → Бездна) |
| 3 | v2.0  | `feat/roguelite-loop` | Рогалайк-петля + Души + Дерево постоянных перков |

Каждая фаза — рабочая и играбельная версия. Мёрж в `master` после завершения каждой.

---

## Фаза 1 — Dark Fantasy UI (v1.17, ветка `feat/dark-fantasy-ui`)

### Цветовая палитра

| Роль | Цвет |
|------|------|
| Основной фон | `#080810` |
| Акцент (красный) | `#8b0000` / `#e74c3c` |
| Текст (пергамент) | `#e8d5b7` |
| Магия / Души | `#9b59b6` |
| Золото | `#f39c12` |
| Вторичный фон | `#0d0510` |
| Рамки | `#3a1a1a` |

### Изменения UI-компонентов

**HUD (`ui/HUD.js` + `index.html`):**
- Фон: `linear-gradient(#12060a, #0d0510)`, нижняя граница — красный градиент
- Угловые руны `✦` на `#app` через `::before`/`::after`
- Иконка класса: круглая, `radial-gradient`, красная рамка, `box-shadow` свечение
- HP/XP полоски: 6px, красный/фиолетовый градиенты
- Счётчик Душ 💜 рядом с золотом (показывает `0`, логика в Фазе 3)

**BattleStrip (`ui/BattleStrip.js`):**
- Фон `#0d0510`, красная левая рамка у карточки игрока
- Прогресс волны: красный градиент, текст `◆ Зона I · Волна 7/20 ◆`
- Чипы врагов: красная рамка; босс — `box-shadow` свечение

**StatsPanel (`ui/StatsPanel.js`):**
- Заголовки: `letter-spacing:3px`, `uppercase`, `color:#8b0000`, `::before { content:'◆' }`
- Цвета значений: ATK=`#e74c3c`, DEF=`#3498db`, SPD=`#f39c12`, CRIT=`#9b59b6`
- Ховер строки: `rgba(139,0,0,0.05)`

**Combat Log (`ui/HUD.js`):**
- Фон `#06030a`, заголовок `ЖУРНАЛ БИТВЫ` (серый, letter-spacing)
- Строки по типу: урон=`#8b2020`, убийство=`#6a0080`, уровень=`#7a6010`, последнее=`#c0392b`

**Arena (`phaser/scene/SceneBackground.js` + `SceneFX.js`):**
- Фон: `linear-gradient(#050210, #0a0318, #12040a)`
- `radial-gradient` красное свечение под линией земли
- Floating damage: `color:#e74c3c`, `text-shadow:0 0 8px #8b0000`

**Все модалки/оверлеи:**
- Фон `#0d0510`, рамка `#3a1a1a`, красная верхняя или нижняя граница шапки
- Кнопки: тёмные с красной рамкой

**Типографика:**
- Основной: `Georgia, serif`
- Заголовки: Google Fonts `Cinzel` (готика) — подключить в `index.html`

### Затронутые файлы

```
index.html
src/ui/HUD.js
src/ui/StatsPanel.js
src/ui/BattleStrip.js
src/ui/ClassTreeGraph.js
src/ui/InventoryPanel.js
src/ui/PrestigeShop.js
src/ui/AchievementsPanel.js
src/ui/MainMenu.js
src/ui/OfflineModal.js
src/phaser/scene/SceneBackground.js
src/phaser/scene/SceneFX.js
```

**Не трогается в Фазе 1:** вся игровая логика (`core/`, `data/`), структура HTML (те же id/классы).

---

## Фаза 2 — Zone System (v1.18, ветка `feat/zone-system`)

### 5 зон

| # | Зона | Название | Волны | Мобы | Финальный босс |
|---|------|----------|-------|------|----------------|
| 1 | forest | Тёмный Лес | 1–20 + босс | goblin, slime, skeleton | Лесной Страж |
| 2 | catacombs | Катакомбы | 1–20 + босс | skeleton, orc, demon | Король Мёртвых |
| 3 | volcano | Вулкан. Пещеры | 1–20 + босс | troll, dragonling, demon | Огненный Элементаль |
| 4 | skyfort | Небесная Крепость | 1–20 + босс | dragonling, dragon, lich | Архангел Тьмы |
| 5 | abyss | Бездна | 1–20 + босс | lich, dragon, archdemon | Хаос-Лорд |

Скейлинг мобов остаётся `1 + k*ln(globalWave)`, где `globalWave` — суммарные волны всех зон.

### Новый файл: `src/data/zones.js`

```js
export const ZONES = [
  {
    id: 'forest',
    name: 'Тёмный Лес',
    waves: 20,
    mobPool: ['goblin', 'slime', 'skeleton'],
    bossId: 'boss_forest_guardian',
    bgKey: 'bg_01_10',
    unlocked: true,
  },
  {
    id: 'catacombs',
    name: 'Катакомбы',
    waves: 20,
    mobPool: ['skeleton', 'orc', 'demon'],
    bossId: 'boss_undead_king',
    bgKey: 'bg_11_20',
    unlocked: false,
  },
  // volcano, skyfort, abyss — аналогично
];
```

### Новый файл: `src/ui/ZoneMap.js`

- Оверлей `#zone-map-overlay` (паттерн как `#class-modal-overlay`)
- 5 карточек зон вертикально: открытые кликабельны, закрытые — тусклые с 🔒
- Карточка: название, биом-иконка, прогресс `волны пройдено / 20`, статус босса ☠/✓
- `window.game.openZoneMap()` — открыть из HUD
- При первом запуске нового рана — открывается автоматически

### Изменения `src/core/GameState.js`

```js
// Новые поля
currentZoneId: 'forest',
zonesProgress: {
  forest:    { wavesCleared: 0, bossDefeated: false },
  catacombs: { wavesCleared: 0, bossDefeated: false },
  volcano:   { wavesCleared: 0, bossDefeated: false },
  skyfort:   { wavesCleared: 0, bossDefeated: false },
  abyss:     { wavesCleared: 0, bossDefeated: false },
},

// Новые методы
enterZone(zoneId)        // сменить активную зону, сбросить currentWave
completeZone(zoneId)     // отметить bossDefeated, разблокировать следующую
getCurrentZone()         // → объект из ZONES
```

### Изменения `src/core/Combat.js`

- `_spawnWave()`: мобов берёт из `state.getCurrentZone().mobPool`
- Если `currentWave > zone.waves`: спавн финального босса (`zone.bossId`)
- Победа над боссом: `state.completeZone(zoneId)` → событие `zoneCompleted`
- `onZoneCompleted` колбэк для `ZoneMap` и `BattleStrip`

### Изменения `ui/BattleStrip.js`

- Прогресс: `Зона {N} · Волна {currentWave}/{zone.waves}`
- `currentWave` внутри зоны (1–20), не глобальный

### Сохранение (`src/core/GameStateSave.js`)

- Добавляется `zonesProgress` в save-объект
- При загрузке без этого поля — генерируется дефолт (только `forest.unlocked=true`)

---

## Фаза 3 — Roguelite Loop (v2.0, ветка `feat/roguelite-loop`)

### Петля

```
Старт рана → Зона 1 → ... → Зона 5 → Хаос-Лорд побеждён
                                              ↓
                                     Экран итогов рана
                                              ↓
                                       +Души начислены
                                              ↓
                                    Зеркало Теней (перки)
                                              ↓
                                    Новый ран → Зона 1
```

Альтернативный конец рана: кнопка «Завершить ран» доступна после победы над боссом Зоны 1.

### Формула Душ

```js
function calcRunSouls(state) {
  const zonesCleared = Object.values(state.zonesProgress)
    .filter(z => z.bossDefeated).length;
  const zoneBonus  = zonesCleared * 25;
  const waveBonus  = Math.floor(state.globalWave / 10);
  const levelBonus = Math.floor(state.level / 5);
  return zoneBonus + waveBonus + levelBonus;
}
// Пример: 2 зоны (50) + 60 волн (6) + ур.30 (6) = 62 Души
```

### Зеркало Теней — постоянные перки

Новый файл `src/ui/ShadowMirror.js`, оверлей `#shadow-mirror-overlay`.

| id | Название | Макс. ранг | Стоимость/ранг | Эффект |
|----|----------|-----------|----------------|--------|
| dark_strength | Тёмная сила | 10 | 3 💜 | +5% базового ATK |
| cursed_armor | Проклятая броня | 10 | 3 💜 | +5% базового HP |
| shadow_step | Теневой шаг | 5 | 5 💜 | +4% скорости атаки |
| bloodthirst | Жажда крови | 5 | 8 💜 | +2% вампиризма |
| dark_ritual | Тёмный ритуал | 3 | 15 💜 | +10% золота за ран |
| cursed_knowledge | Проклятие знания | 3 | 15 💜 | +15% XP за ран |
| eternal_rage | Вечная ярость | 1 | 50 💜 | Старт с волны 5 Зоны 1 |
| abyss_seal | Печать бездны | 1 | 80 💜 | +1 слот инвентаря |

Перки применяются в `GameState.getStats()` через `state.shadowPerks`.

### Экран итогов рана (`src/ui/RunSummary.js`)

Показывает: зоны пройдено, волн зачищено, мобов убито, лучший предмет дропа, `+X 💜 Душ`.  
Кнопки: «Зеркало теней» → `openShadowMirror()` | «Начать новый ран» → `state.hardReset()` с сохранением перков.

### Изменения `src/core/GameState.js` (Фаза 3)

```js
// Новые постоянные поля (не сбрасываются при hardReset)
souls: 0,
shadowPerks: {},   // { dark_strength: 2, shadow_step: 1, ... }

// hardReset() теперь сохраняет:
// souls, shadowPerks, skillLevels, achievements
// zonesProgress сбрасывается (только forest.unlocked=true), остальные зоны закрываются
```

### Кнопка в HUD

- «⭐ Переродиться» → «⚡ Завершить ран»
- Доступна: `zonesProgress.forest.bossDefeated === true` (минимум 1 зона)
- При нажатии: `calcRunSouls()` → `RunSummary` → при закрытии: `hardReset()`

### Конвертация старых ПО

При первой загрузке v2.0-сейва: `souls += state.prestigePoints`, `prestigePoints = 0`.  
Купленные апгрейды старого магазина ПО (стартовое золото, бонус XP и т.д.) **сбрасываются** — v2.0 breaking change, принимается как плата за новую систему.  
Старый `PrestigeShop` убирается (`src/ui/PrestigeShop.js` удаляется), `prestige` ивент переименовывается в `runEnd`.

---

## Критерии готовности

### v1.17
- [ ] Все компоненты перекрашены, нет светлых фонов
- [ ] Floating damage numbers работают с тёмным стилем
- [ ] Cinzel-шрифт подключён для заголовков
- [ ] Мобильная вёрстка не сломана

### v1.18
- [ ] 5 зон переключаются через ZoneMap
- [ ] Мобы берутся из `zone.mobPool`
- [ ] Волна 21 = финальный босс зоны
- [ ] `zonesProgress` сохраняется/загружается
- [ ] Следующая зона открывается после победы над боссом
- [ ] BattleStrip показывает «Зона N · Волна X/20»

### v2.0
- [ ] «Завершить ран» доступна после Зоны 1
- [ ] Души начисляются по формуле
- [ ] RunSummary показывает итоги
- [ ] ShadowMirror открывается, перки покупаются
- [ ] Перки применяются в `getStats()`
- [ ] `hardReset()` сохраняет перки/души/skillLevels
- [ ] Конвертация старых ПО в Души работает
