# Дизайн: Visual Polish + UX Clarity + Game Feel (v2.1)

**Дата:** 2026-06-22  
**Статус:** Approved  
**Версии:** v2.0 → v2.1  
**Ветки git:** `feat/visual-polish` → `feat/ux-clarity` → `feat/game-feel`

---

## Контекст

После v2.0 (рогалайк-петля) визуальный и UX-слой игры накопил системные проблемы:
- Мёртвая зона снизу браузера (чёрное пространство)
- Герой и враги слишком мелкие в canvas
- HUD перегружен — информация и кнопки действий неразличимы
- Дерево классов (~3000 нодов) нечитаемо в виде радиального облака точек
- Журнал битвы почти невидим
- Нет онбординга и фидбэка на ключевые моменты (level up, zone clear)

Три ветки последовательно устраняют эти проблемы, каждая — независимо сливаемая.

---

## Ветка 1: `feat/visual-polish`

### 1.1 Layout — убрать мёртвую зону

**Проблема:** `#app` 1280×720 центрируется через `translate(0, 261px)` когда браузер выше 720px — снизу и сверху пустой чёрный фон без смысла.

**Решение:** `transformOrigin: 'top center'` + тело страницы заполняется тематическим градиентом.

```css
/* index.html <style> — заменить body background */
body {
  background: radial-gradient(ellipse at top, #0d0318 0%, #020008 60%, #000005 100%);
}
```

В `main.js → handleResize()`:
```js
// изменить transformOrigin
app.style.transformOrigin = 'top center';
app.style.transform = `scale(${scale})`;
// убрать translate из transform
```

**Файлы:** `index.html`, `src/main.js`

---

### 1.2 Phaser камера — крупнее герой и враги

**Проблема:** Герой `setScale(70/256 ≈ 0.27)` — занимает ~70px из 480px высоты canvas, слишком мелко.

**Решение:** `camera.setZoom(1.6)` в `SceneEntities.js` при создании сцены. Спрайты вырастут ×1.6, детализация станет видна. Позиции мобов пересчитать под новый зум (мобы спавнятся в диапазоне x: 350–560 в мировых координатах — при zoom 1.6 камера показывает меньший участок, поэтому диапазон спавна нужно сузить до x: 250–400).

```js
// SceneEntities.js — внутри create() или аналогичного метода
this.cameras.main.setZoom(1.6);
```

**Файлы:** `src/phaser/scene/SceneEntities.js`

---

### 1.3 Floating damage — цветовая схема и размер

**Проблема:** Цифры урона мелкие, все одного цвета.

**Решение:** В `SceneFX.js` расширить функцию показа урона параметром `type`:

| type | цвет | размер | префикс |
|------|------|--------|---------|
| `normal` | `#ffffff` | 20px | — |
| `crit` | `#f1c40f` | 28px | `⚡` |
| `poison` | `#2ecc71` | 18px | `☠` |
| `burn` | `#e67e22` | 18px | `🔥` |
| `player_hit` | `#e74c3c` | 20px | `-` |

Tween: `y -= 60px` за 800ms, `alpha: 0` в конце. Крит — дополнительный `scale: 1.3 → 1.0` в первые 200ms.

**Файлы:** `src/phaser/scene/SceneFX.js`

---

### 1.4 Hit-реакция спрайтов

**Проблема:** Попадание никак визуально не отражается на спрайтах.

**Решение:**

- **Герой получает урон:** `setTint(0xff3333)` → через 80ms `clearTint()`
- **Моб получает урон:** `setTint(0xff6666)` → через 80ms `clearTint()`
- **Моб умирает:** tween `scaleX: 0, scaleY: 0, alpha: 0` за 250ms с `ease: 'Back.In'`, затем destroy

```js
// SceneFX.js
_flashHit(sprite, color = 0xff3333) {
  sprite.setTint(color);
  this.time.delayedCall(80, () => sprite.clearTint());
}

_deathTween(mobVisual) {
  this.tweens.add({
    targets: mobVisual.sprite,
    scaleX: 0, scaleY: 0, alpha: 0,
    duration: 250, ease: 'Back.In',
    onComplete: () => mobVisual.sprite.destroy()
  });
}
```

Подключить в `onPlayerHit` и `onMobDeath` callbacks (уже существуют в SceneFX).

**Файлы:** `src/phaser/scene/SceneFX.js`

---

### Файлы ветки 1

```
index.html
src/main.js
src/phaser/scene/SceneEntities.js
src/phaser/scene/SceneFX.js
```

---

## Ветка 2: `feat/ux-clarity`

### 2.1 HUD — визуальная иерархия

**Проблема:** Все элементы HUD имеют одинаковый визуальный вес, информация и кнопки действий неразличимы.

**Новая структура HUD (три зоны):**

```
┌──────────────────┬───────────────────────┬────────────────────────────────┐
│ [КЛАСС Ур.N]     │  ⬟ ЗОНА · ВОЛНА N/20  │ [⚡ Завершить] [💜 Зеркало] │ [🏆][🗺][🌿][🎒][⚙️] │
│ [━━━XP━━━] 💜 N  │                       │                                │
└──────────────────┴───────────────────────┴────────────────────────────────┘
```

- **Левая треть (info):** класс-кнопка + XP-бар горизонтальный + Души
- **Центр (context):** зона + волна крупнее (`font-size: 15px`, `letter-spacing: 2px`)
- **Правая область:** кнопки действий отделены `border-left: 1px solid #3a1a1a` от утилит

XP-бар: заменить текст `0 / 100 XP` на `<div class="xp-bar-track"><div class="xp-bar-fill" style="width: N%"></div></div>`.

**Файлы:** `src/ui/HUD.js`, `index.html`

---

### 2.2 Дерево классов — горизонтальная таблица

**Проблема:** Радиальное облако ~3000 точек нечитаемо.

**Решение:** Заменить canvas-рендер ClassTreeGraph на **DOM-таблицу с горизонтальным скроллом**.

```
[Depth 1]  │  [Depth 2]  │  [Depth 3]  │  [Depth 4]  │  [Depth 5]  │  [▶ 6-10]
─────────────────────────────────────────────────────────────────────────────────
[Новичок] ──→ [Воин]    ──→ [Берсерк] ──→ [Страж]   ──→ [Паладин]
               │          ──→ [Рыцарь]  ──→ [Защитник]──→ [Гладиатор]
              [Плут]    ──→ [Убийца]  ──→ ...
              [Лучник]  ──→ ...
              [Маг]     ──→ ...
```

Каждая нода — `<div class="cls-node cls-branch-{branch}">`:
- Полное имя класса
- Цвет рамки по ветке (воин=`#e74c3c`, плут=`#2ecc71`, лучник=`#3498db`, маг=`#9b59b6`)
- CSS-класс состояния: `cls-current` (gold glow), `cls-available` (яркий), `cls-locked` (opacity 0.4)

Depth 6–10: скрыты за кнопкой «▶ Показать продвинутые (N классов)» — раскрываются дополнительными колонками inline.

Клик на ноду — карточка с деталями остаётся как в текущей реализации.

**Файлы:** `src/ui/ClassTreeGraph.js`

---

### 2.3 Журнал битвы — видимый и анимированный

**Проблема:** Заголовок «ЖУРНАЛ БИТВЫ» едва виден, строки крошечные без цветовых подсказок.

**Решение:**
- Высота `#combat-log` → 110px (было 96px)
- Фон: `#08040f`, `border-top: 1px solid #3a1a1a`
- Каждая новая строка — `animation: logSlideIn 200ms ease`

```css
@keyframes logSlideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

Цвета строк по типу:

| type | CSS класс | цвет |
|------|-----------|------|
| атака по врагу | `log-attack` | `#c0392b` |
| урон по игроку | `log-hit` | `#8b2020` |
| убийство | `log-kill` | `#9b59b6` |
| уровень | `log-level` | `#f39c12` |
| скилл | `log-skill` | `#3498db` |

Pulse-индикатор `◆` в заголовке: `animation: pulse 1.5s infinite` пока идёт бой.

**Файлы:** `src/ui/HUD.js`, `index.html`

---

### 2.4 Скилл-зона — явный кулдаун-бар

Сделать кулдаун-бар более заметным:
- Высота: 4px → 6px
- Цвет: `linear-gradient(90deg, #9b59b6, #8b0000)`
- Добавить текст `«N.Nс»` справа от бара (`font-size: 11px`, `color: #888`)

**Файлы:** `src/ui/HUD.js`

---

### Файлы ветки 2

```
src/ui/HUD.js
src/ui/ClassTreeGraph.js
index.html
```

---

## Ветка 3: `feat/game-feel`

### 3.1 Онбординг первого запуска

**Новый файл:** `src/ui/Tutorial.js`

Условие: `!state.tutorialDone` — поле добавляется в save (не сбрасывается при `hardReset`).

4 тултипа, переход по клику:

| № | Текст | Целевой элемент |
|---|-------|----------------|
| 1 | «Твой герой сражается автоматически. Просто наблюдай!» | `#game-container` |
| 2 | «Зарабатывай золото 🪙 и трать его на прокачку справа» | `#stats-panel` |
| 3 | «Скилл готов — нажми для активации!» | `#skill-btn` |
| 4 | «Победи босса зоны → получи Души 💜 → прокачай Зеркало Теней» | `#hud` |

Тултип: `position: fixed` `<div>` с тёмным фоном и красной рамкой, стрелка CSS указывает на цель. Фон-оверлей `rgba(0,0,0,0.4)` кроме целевого элемента (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.4)`).

После 4-го тултипа: `state.tutorialDone = true`, `state.save()`.

**Файлы:** `src/ui/Tutorial.js` (новый), `src/core/GameStateSave.js`, `src/main.js`

---

### 3.2 Level Up — момент торжества

При событии `levelUp` из `GameState`:

**В Phaser (SceneFX.js):** Золотое кольцо от позиции героя:
```js
const ring = this.add.graphics();
ring.lineStyle(3, 0xf39c12, 1);
ring.strokeCircle(heroX, heroY, 10);
this.tweens.add({
  targets: ring,
  scaleX: 8, scaleY: 8, alpha: 0,
  duration: 600, ease: 'Quad.Out',
  onComplete: () => ring.destroy()
});
```

**В DOM (HUD.js):** Баннер поверх `#game-container` на 1.5с:
```css
#levelup-banner {
  position: absolute; top: 38%; left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif; font-size: 22px;
  color: #f39c12; text-shadow: 0 0 20px #f39c12;
  pointer-events: none; z-index: 50;
  animation: levelupAnim 1.5s ease forwards;
}
@keyframes levelupAnim {
  0%   { opacity: 0; transform: translateX(-50%) scale(0.7); }
  30%  { opacity: 1; transform: translateX(-50%) scale(1.1); }
  70%  { opacity: 1; transform: translateX(-50%) scale(1.0); }
  100% { opacity: 0; transform: translateX(-50%) scale(1.0); }
}
```

**Файлы:** `src/ui/HUD.js`, `src/phaser/scene/SceneFX.js`, `index.html`

---

### 3.3 Zone Complete — момент победы

При событии `zoneCompleted` — overlay на 2.5с (или клик):

```
✦ ЗОНА ПРОЙДЕНА ✦
[название зоны]
+N 💜 Душ
[Следующая зона →]
```

После закрытия — автооткрытие ZoneMap для выбора следующей зоны.

Добавить `#zone-complete-overlay` в `index.html`, управление из `ZoneMap.js`.

**Файлы:** `src/ui/ZoneMap.js`, `index.html`

---

### 3.4 «Завершить ран» — контекстная видимость

Кнопка скрыта (`display: none`) пока `!state.zonesProgress?.forest?.bossDefeated`. После первого босса появляется с `animation: fadeIn 400ms ease`.

```js
// HUD._update() вызывается при событии zoneCompleted
const canEnd = state.zonesProgress?.forest?.bossDefeated === true;
this._endRunBtn.style.display = canEnd ? 'flex' : 'none';
```

**Файлы:** `src/ui/HUD.js`

---

### 3.5 Idle-индикатор в BattleStrip

Когда `combat.mobs.length === 0` и волна не активна:

```css
@keyframes dotPulse {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 1; }
}
.idle-dot:nth-child(2) { animation-delay: 0.3s; }
.idle-dot:nth-child(3) { animation-delay: 0.6s; }
```

Текст: `◆ · · · СЛЕДУЮЩАЯ ВОЛНА  [таймер N.Nс]`

**Файлы:** `src/ui/BattleStrip.js`

---

### Файлы ветки 3

```
src/ui/Tutorial.js  (новый файл)
src/ui/HUD.js
src/ui/BattleStrip.js
src/ui/ZoneMap.js
src/phaser/scene/SceneFX.js
src/core/GameStateSave.js
src/main.js
index.html
```

---

## Критерии готовности

### feat/visual-polish
- [ ] Нет чёрной мёртвой зоны ниже игры в браузере 1280×900+
- [ ] Герой и мобы визуально крупнее (~1.6× предыдущего размера)
- [ ] Критический удар — жёлтые цифры с ⚡, обычный — белые
- [ ] DoT (яд/горение) — цветные цифры с иконками
- [ ] Герой мигает красным при получении урона
- [ ] Моб при смерти — анимация исчезновения (не мгновенное)

### feat/ux-clarity
- [ ] HUD: XP отображён полосой, не текстом
- [ ] HUD: кнопки действий отделены от утилит визуально
- [ ] Дерево классов: горизонтальная DOM-таблица, имена видны, скролл работает
- [ ] Depth 6–10 скрыты за кнопкой «Показать продвинутые»
- [ ] Журнал битвы: строки цветные, slideIn анимация работает
- [ ] Кулдаун-бар скилла: 6px высота, цветной, рядом счётчик секунд

### feat/game-feel
- [ ] Первый запуск (без save): 4 тултипа появляются по порядку
- [ ] `state.tutorialDone` сохраняется, тултипы не повторяются
- [ ] Level up: золотое кольцо в canvas + баннер над ареной 1.5с
- [ ] Победа над боссом зоны: overlay «ЗОНА ПРОЙДЕНА» → ZoneMap
- [ ] «Завершить ран»: скрыта до первого босса
- [ ] BattleStrip: анимированный idle-индикатор вместо «Ожидание...»

---

## Порядок реализации

1. `feat/visual-polish` → мерж → v2.1.0
2. `feat/ux-clarity` → мерж → v2.1.1
3. `feat/game-feel` → мерж → v2.1.2
