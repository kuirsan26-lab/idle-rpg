# Hero Pixel Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить 5 статичных спрайтов героев на анимированный пиксель-арт (idle/attack/hit/death), сгенерированный через Pixellab MCP, с синхронизацией под боевые события.

**Architecture:** Герои выносятся из общего мобового атласа в отдельные спрайтшиты (`public/sprites/heroes/`). В `GameScene` добавляется загрузка спрайтшитов, определение Phaser-анимаций и переключение `playerBody` со статичного `Image` на анимированный `Sprite`. Привязка состояний — через уже существующие combat-колбэки в `SceneFX`. Обязателен fallback на текущую отрисовку при отсутствии ассета.

**Tech Stack:** Phaser 3.80, Vite 5, Python 3 + Pillow (импорт-скрипт), Pixellab MCP (HTTP).

## Global Constraints

- Размер кадра героя: **96×96** px.
- Вид персонажа: **сбоку, лицом вправо** (герой на `x=100`, мобы справа `x≈520`).
- Хранение: **отдельные спрайтшиты** в `public/sprites/heroes/`, НЕ мобовый `atlas.png`.
- Фильтрация: **NEAREST только для текстур героев**; глобальный `pixelArt:true` НЕ включать (мобы остаются сглаженными).
- Состояния: **idle** (loop), **attack** (one-shot → idle), **hit** (one-shot → idle), **death** (one-shot, замереть на последнем кадре).
- **Fallback обязателен:** нет пиксель-ассета героя → текущий путь `Image` (атлас) → `Graphics`. Игра не падает.
- **Не трогать:** `core/Combat.js`, мобов/боссов/фоны, `public/sprites/atlas.png`, `scripts/build_atlas.py`, сохранения, UI-панели.
- Тест-фреймворка в проекте нет. Верификация = `npm run build` без ошибок + живой просмотр в `npm run dev` (визуал проверяет пользователь). НЕ вводить новый тест-фреймворк.
- Ветка: `feat/hero-pixel-animations` (уже создана). Коммиты частые, по одной задаче.
- Спрайты-константы высоты героя сейчас: `spr.setScale(110 / spr.height)` в `SceneEntities._buildPlayerSprite`.

---

## Файловая структура

- **Create:** `public/sprites/heroes/hero_<branch>.png` + `.json` (×5) — спрайтшиты героев.
- **Create:** `scripts/import_pixellab_hero.py` — импорт вывода Pixellab → спрайтшит + JSON.
- **Create:** `src/phaser/scene/heroAnims.js` — данные раскадровки (маппинг состояние → диапазон кадров, frameRate) + хелпер регистрации анимаций. Изолирует конфиг анимаций от логики сцены.
- **Modify:** `src/phaser/GameScene.js` — `preload()` (загрузка спрайтшитов), `create()` (регистрация анимаций + NEAREST).
- **Modify:** `src/phaser/scene/SceneEntities.js` — `_buildPlayerSprite`/`_drawPlayerBody`/`_updatePlayerVisual` (sprite-body + fallback), новый `_hasHeroAnim`.
- **Modify:** `src/phaser/scene/SceneFX.js` — новый `_playHeroAnim(state)` + вызовы в `_onPlayerAttack`/`_onPlayerHit`/`_onPlayerDeath`/`_onRespawn`.
- **Modify (в конце):** `CLAUDE.md`, `ARCHITECTURE.md`, `data/changelog.js`, `package.json` version — по `/ship`-workflow.

---

## Task 0: Проба Pixellab (спайк, после рестарта сессии)

**Требует:** перезапущенной сессии, где инструменты Pixellab MCP доступны (`/mcp` показывает `pixellab`). БЕЗ этого задачу не начинать.

**Files:**
- Create: `docs/superpowers/plans/pixellab-facts.md` (результат спайка — факты для последующих задач)

**Interfaces:**
- Produces: документированный формат вывода Pixellab, который потребляют Task 1–2 (имена инструментов, размер/сетка кадров, как отдаются кадры, доступные шаблоны анимаций).

- [ ] **Step 1: Проверить доступность инструментов**

Убедиться, что инструменты Pixellab загружены. Через ToolSearch: `select:` по именам из `/mcp`, либо keyword-поиск `pixellab`. Если пусто — сессия не перезапущена, СТОП.

- [ ] **Step 2: Сгенерировать пробного героя (воин)**

Вызвать инструмент генерации Pixellab на одном персонаже:
- Промпт-направление: `side view, facing right, dark fantasy warrior, sword and shield, muted palette, full body`.
- Размер: 96×96 (или ближайший поддерживаемый; зафиксировать реальный).
- Запросить анимации: idle, attack, hit, death (какие шаблоны поддерживает — зафиксировать).

- [ ] **Step 3: Зафиксировать факты в `pixellab-facts.md`**

Записать: точные имена инструментов и их параметры; реальный размер кадра; формат вывода (URL / base64 / набор PNG / готовый spritesheet); число кадров на состояние; доступные шаблоны анимаций; как скачать результат в файл.

- [ ] **Step 4: Сохранить сырой вывод воина**

Скачать кадры воина в `public/sprites/heroes/_raw/warrior/` (временная папка для Task 1).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/pixellab-facts.md public/sprites/heroes/_raw/warrior/
git commit -m "spike: pixellab output format + raw warrior frames"
```

---

## Task 1: Импорт-скрипт (Pixellab → спрайтшит + JSON)

**Files:**
- Create: `scripts/import_pixellab_hero.py`
- Uses: `docs/superpowers/plans/pixellab-facts.md` (формат из Task 0)

**Interfaces:**
- Produces: `public/sprites/heroes/hero_<branch>.png` (сетка 96×96, кадры в один ряд) + `hero_<branch>.json` вида:
  ```json
  {
    "frameSize": 96,
    "states": {
      "idle":   { "start": 0, "count": 4, "frameRate": 6 },
      "attack": { "start": 4, "count": 4, "frameRate": 12 },
      "hit":    { "start": 8, "count": 2, "frameRate": 12 },
      "death":  { "start": 10, "count": 4, "frameRate": 8 }
    }
  }
  ```
  (реальные `count`/`start` — по выводу Pixellab из Task 0; структуру сохранить.)

- [ ] **Step 1: Написать скрипт упаковки**

`import_pixellab_hero.py` принимает `--branch warrior --raw public/sprites/heroes/_raw/warrior --idle 4 --attack 4 --hit 2 --death 4`:
- читает кадры из raw-папки (порядок по имени файла),
- ресайзит каждый до 96×96 через `Image.NEAREST` (сохранить пиксели),
- склеивает в горизонтальный спрайтшит (одна строка), прозрачный фон RGBA,
- пишет `hero_<branch>.png` + `hero_<branch>.json` с диапазонами состояний (маппинг: аргументы `--idle/--attack/--hit/--death` = число кадров на состояние по порядку idle→attack→hit→death, `frameRate` по умолчанию 6/12/12/8).

- [ ] **Step 2: Прогнать на воине**

Run: `python -X utf8 scripts/import_pixellab_hero.py --branch warrior --raw public/sprites/heroes/_raw/warrior --idle 4 --attack 4 --hit 2 --death 4`
Expected: созданы `public/sprites/heroes/hero_warrior.png` + `.json`; в консоли — размеры и число кадров.

- [ ] **Step 3: Визуально проверить спрайтшит**

Открыть `hero_warrior.png` — кадры ровные, 96×96, фон прозрачный, порядок idle→attack→hit→death.

- [ ] **Step 4: Commit**

```bash
git add scripts/import_pixellab_hero.py public/sprites/heroes/hero_warrior.png public/sprites/heroes/hero_warrior.json
git commit -m "feat: pixellab hero import script + warrior spritesheet"
```

---

## Task 2: Данные анимаций + регистрация (heroAnims.js)

**Files:**
- Create: `src/phaser/scene/heroAnims.js`

**Interfaces:**
- Consumes: `hero_<branch>.json` формат из Task 1.
- Produces:
  - `HERO_BRANCHES = ['novice','warrior','rogue','archer','mage']`
  - `HERO_STATES = ['idle','attack','hit','death']`
  - `heroAnimKey(branch, state)` → `hero_<branch>_<state>`
  - `registerHeroAnims(scene, branch, sheetJson)` — создаёт Phaser-анимации + ставит NEAREST на текстуру `hero_anim_<branch>`.

- [ ] **Step 1: Написать модуль**

```js
// src/phaser/scene/heroAnims.js
import Phaser from 'phaser';

export const HERO_BRANCHES = ['novice','warrior','rogue','archer','mage'];
export const HERO_STATES   = ['idle','attack','hit','death'];

export const heroAnimKey = (branch, state) => `hero_${branch}_${state}`;

// sheetJson — содержимое hero_<branch>.json (см. Task 1)
export function registerHeroAnims(scene, branch, sheetJson) {
  const texKey = `hero_anim_${branch}`;
  const tex = scene.textures.get(texKey);
  if (tex) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  for (const state of HERO_STATES) {
    const s = sheetJson.states?.[state];
    if (!s) continue;
    const frames = scene.anims.generateFrameNumbers(texKey, {
      start: s.start, end: s.start + s.count - 1,
    });
    scene.anims.create({
      key: heroAnimKey(branch, state),
      frames,
      frameRate: s.frameRate ?? 8,
      repeat: state === 'idle' ? -1 : 0,
    });
  }
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: сборка проходит (модуль ещё не импортируется — просто синтаксис-чек).

- [ ] **Step 3: Commit**

```bash
git add src/phaser/scene/heroAnims.js
git commit -m "feat: hero animation registration module"
```

---

## Task 3: Загрузка спрайтшитов + анимаций в GameScene

**Files:**
- Modify: `src/phaser/GameScene.js` (`preload`, `create`)

**Interfaces:**
- Consumes: `registerHeroAnims`, `HERO_BRANCHES`, `heroAnimKey` из Task 2.
- Produces: загруженные текстуры `hero_anim_<branch>` + зарегистрированные анимации; хелпер `_hasHeroAnim(branch)`.

- [ ] **Step 1: Загрузить спрайтшиты в preload**

В `GameScene.preload()`, после `this.load.atlas('sprites', ...)`, добавить:

```js
for (const h of ['novice','warrior','rogue','archer','mage']) {
  this.load.spritesheet(`hero_anim_${h}`, `/sprites/heroes/hero_${h}.png`,
    { frameWidth: 96, frameHeight: 96 });
  this.load.json(`hero_json_${h}`, `/sprites/heroes/hero_${h}.json`);
}
```
Отсутствующие файлы дают loaderror, но не крашат; обрабатываются в create через `textures.exists`.

- [ ] **Step 2: Регистрировать анимации в create**

Импорт вверху `GameScene.js`:
```js
import { registerHeroAnims, HERO_BRANCHES, heroAnimKey } from './scene/heroAnims.js';
```
В `GameScene.create()`, ДО `this._createPlayer()`:
```js
for (const branch of HERO_BRANCHES) {
  if (!this.textures.exists(`hero_anim_${branch}`)) continue;
  const json = this.cache.json.get(`hero_json_${branch}`);
  if (json) registerHeroAnims(this, branch, json);
}
```

- [ ] **Step 3: Добавить `_hasHeroAnim` в GameScene**

Метод класса `GameScene`:
```js
_hasHeroAnim(branch) {
  return this.anims.exists(heroAnimKey(branch, 'idle'));
}
```

- [ ] **Step 4: Проверить сборку и запуск**

Run: `npm run build` → без ошибок.
Run (пользователь): `npm run dev` → консоль без крашей; воин ещё рисуется старым способом (body — Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/phaser/GameScene.js
git commit -m "feat: load hero spritesheets and register anims"
```

---

## Task 4: Sprite-body героя + fallback (SceneEntities)

**Files:**
- Modify: `src/phaser/scene/SceneEntities.js` (`_buildPlayerSprite`, `_updatePlayerVisual`, импорт)

**Interfaces:**
- Consumes: `_hasHeroAnim` (Task 3), `heroAnimKey` (Task 2).
- Produces: `this.playerBody` = анимированный `Sprite` (когда ассет есть) с idle; иначе — текущий Image/Graphics.

- [ ] **Step 1: Импорт в SceneEntities.js**

Вверху добавить:
```js
import { heroAnimKey } from './heroAnims.js';
```

- [ ] **Step 2: Переписать `_buildPlayerSprite` с приоритетом анимации**

```js
proto._buildPlayerSprite = function() {
  const branch = this._getBranch();
  if (this._hasHeroAnim(branch)) {
    const spr = this.add.sprite(0, 0, `hero_anim_${branch}`);
    spr.setOrigin(0.5, 1).setY(24);
    spr.setScale(110 / spr.height);
    spr.play(heroAnimKey(branch, 'idle'));
    return spr;
  }
  const key = `hero_${branch}`;
  if (this._hasSprite(key)) {
    const spr = this.add.image(0, 0, 'sprites', key);
    spr.setScale(110 / spr.height).setOrigin(0.5, 1).setY(24);
    return spr;
  }
  const gfx = this.add.graphics();
  this._drawPlayerBodyGfx(gfx);
  return gfx;
};
```

- [ ] **Step 3: Обновить `_updatePlayerVisual` для смены класса**

```js
proto._updatePlayerVisual = function() {
  const branch    = this._getBranch();
  const wantAnim  = this._hasHeroAnim(branch);
  const isSprite  = this.playerBody?.type === 'Sprite';
  if (wantAnim || isSprite) {
    const old = this.playerBody;
    this.playerBody = this._buildPlayerSprite();
    this.playerContainer.replace(old, this.playerBody);
    old.destroy();
  } else {
    this._drawPlayerBody();
  }
  this._updatePlayerLabel();
};
```
(`Container.replace(oldChild, newChild)` сохраняет порядок глубины.)

- [ ] **Step 4: Проверить сборку и запуск**

Run: `npm run build` → без ошибок.
Run (пользователь): играя воином → герой проигрывает idle; смена класса на ещё-не-интегрированного (напр. mage) откатывается на старую отрисовку без краша.

- [ ] **Step 5: Commit**

```bash
git add src/phaser/scene/SceneEntities.js
git commit -m "feat: animated hero sprite body with fallback"
```

---

## Task 5: Привязка состояний к бою (SceneFX)

**Files:**
- Modify: `src/phaser/scene/SceneFX.js` (`_onPlayerAttack`, `_onPlayerHit`, `_onPlayerDeath`, `_onRespawn`, новый `_playHeroAnim`, импорт)

**Interfaces:**
- Consumes: `this.playerBody`, `heroAnimKey`, `_getBranch`.
- Produces: `_playHeroAnim(state)` — проигрывает состояние, возвращает в idle для one-shot (кроме death).

- [ ] **Step 1: Импорт в SceneFX.js**

```js
import { heroAnimKey } from './heroAnims.js';
```

- [ ] **Step 2: Добавить `_playHeroAnim`**

```js
proto._playHeroAnim = function(state) {
  const body = this.playerBody;
  if (!body || body.type !== 'Sprite') return false;   // fallback — молча
  const branch = this._getBranch();
  const key    = heroAnimKey(branch, state);
  if (!this.anims.exists(key)) return false;
  body.play(key, true);
  if (state !== 'idle' && state !== 'death') {
    body.once('animationcomplete', () => {
      if (body.active) body.play(heroAnimKey(branch, 'idle'), true);
    });
  }
  return true;
};
```

- [ ] **Step 3: Вызвать в колбэках**

- `_onPlayerAttack`: в начале метода добавить `this._playHeroAnim('attack');`
- `_onPlayerHit`: сразу после `if (dodged) {...return;}` добавить `this._playHeroAnim('hit');`
- `_onPlayerDeath`: в начале добавить `this._playHeroAnim('death');` (существующий angle-твин оставить).
- `_onRespawn`: добавить `this._playHeroAnim('idle');`

- [ ] **Step 4: Проверить сборку и запуск**

Run: `npm run build` → без ошибок.
Run (пользователь): воин — атака проигрывает attack→idle; урон — hit→idle; смерть — death (замирает); респавн — idle.

- [ ] **Step 5: Commit**

```bash
git add src/phaser/scene/SceneFX.js
git commit -m "feat: wire hero animations to combat events"
```

---

## Task 6: Остальные 4 героя

**Files:**
- Create: `public/sprites/heroes/hero_{novice,rogue,archer,mage}.png` + `.json`

**Interfaces:**
- Consumes: пайплайн Task 0–5 (генерация → импорт → авто-подхват в GameScene).

- [ ] **Step 1: Сгенерировать 4 героев в Pixellab**

Единая арт-директория с воином (side view вправо, тёмное фэнтези, 96×96, те же состояния и число кадров). По классам:
- `novice` — простая одежда, посох/без оружия.
- `rogue` — кинжалы, капюшон.
- `archer` — лук, лёгкая броня.
- `mage` — посох, мантия.
Использовать reference воина для консистентности силуэта/палитры.

- [ ] **Step 2: Скачать raw-кадры**

В `public/sprites/heroes/_raw/<branch>/` для каждого.

- [ ] **Step 3: Прогнать импорт-скрипт для каждого**

Run (пример): `python -X utf8 scripts/import_pixellab_hero.py --branch mage --raw public/sprites/heroes/_raw/mage --idle 4 --attack 4 --hit 2 --death 4` (числа кадров — по факту генерации).
Повторить для novice/rogue/archer.

- [ ] **Step 4: Проверить в игре**

Run (пользователь): `npm run dev`, сменить класс на каждого героя → все проигрывают idle/attack/hit/death.

- [ ] **Step 5: Commit**

```bash
git add public/sprites/heroes/
git commit -m "feat: pixel spritesheets for remaining 4 heroes"
```

---

## Task 7: Полиш, чистка, docs (ship-workflow)

**Files:**
- Modify: `src/phaser/scene/SceneEntities.js` (idle-bob контейнера)
- Delete: `public/sprites/heroes/_raw/`
- Modify: `CLAUDE.md`, `ARCHITECTURE.md`, `src/data/changelog.js`, `package.json`

- [ ] **Step 1: Ослабить/убрать дублирующий idle-bob**

В `SceneEntities._createPlayer` твин `playerContainer y` (idle bob, `PLAYER_Y - 4`) — уменьшить амплитуду (напр. `PLAYER_Y - 2`) или убрать, чтобы idle-анимация читалась. Оценить визуально.

- [ ] **Step 2: Удалить raw-папку**

```bash
git rm -r public/sprites/heroes/_raw
```

- [ ] **Step 3: Обновить документацию**

- `CLAUDE.md` секция «Sprites & backgrounds»: герои — анимированные спрайтшиты в `public/sprites/heroes/`, состояния idle/attack/hit/death, NEAREST-фильтр, модуль `heroAnims.js`, скрипт `import_pixellab_hero.py`, источник Pixellab.
- `ARCHITECTURE.md`: бэклог-пункт «Анимации спрайтов» — частично закрыт (герои); описать пайплайн.
- `src/data/changelog.js`: `GAME_VERSION` bump (напр. `2.2.0`) + запись CHANGELOG (`type: new`).
- `package.json`: синхронизировать `version`.

- [ ] **Step 4: Финальная проверка**

Run: `npm run build` → без ошибок. `npm run balance` → без регрессий.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "polish: hero anim idle tuning, cleanup raw, docs + version bump"
```

- [ ] **Step 6: Мерж в master**

Только после визуального подтверждения пользователя. `git checkout master && git merge --no-ff feat/hero-pixel-animations`.

---

## Self-Review

**Spec coverage:**
- 5 героев → Task 0/1 (воин), Task 6 (остальные). ✓
- 4 состояния idle/attack/hit/death → Task 2 (регистрация), Task 5 (привязка). ✓
- 96×96, side-view, отдельные спрайтшиты, NEAREST → Global Constraints + Task 1/2/3. ✓
- Fallback → Task 4 Step 2 (Image→Graphics), Task 5 Step 2 (молчаливый возврат). ✓
- Не трогаем мобов/атлас/combat → Global Constraints; ни одна задача их не модифицирует. ✓
- Фаза 0 проба Pixellab → Task 0. ✓
- Смена класса → Task 4 Step 3. ✓
- Docs/version → Task 7. ✓

**Placeholder scan:** формат Pixellab помечен как «уточняется в Task 0» — сознательный спайк, не плейсхолдер; числа кадров (`--idle 4` и т.п.) — примерные, корректируются по факту генерации (явно указано). Код-шаги содержат реальный код.

**Type consistency:** `heroAnimKey(branch, state)` → `hero_<branch>_<state>` единообразно в Task 2/3/4/5. `_hasHeroAnim` определён Task 3, используется Task 4. `registerHeroAnims`/`HERO_BRANCHES` определены Task 2, используются Task 3. Текстурные ключи `hero_anim_<branch>` едины в Task 1/2/3/4. ✓
