# /add-stat — Добавить новый боевой стат

Добавляет новый стат в боевую систему по установленному паттерну (как dodge/lifesteal/thorns/magicShield/pierce/deathblow).

## Аргумент

`$ARGUMENTS` — имя стата, например `/add-stat poison`. Если не передан — спроси.

## Контекст архитектуры

Боевые статы проходят через 4 слоя:
1. **`src/core/GameState.js`** — `getStats()`: расчёт итогового значения из класс-бонусов + экипировки + cap
2. **`src/core/Combat.js`** — горячий путь `_tick()`: применение эффекта стата в бою
3. **`src/ui/StatsPanel.js`** — отображение в правой панели (скрыта при значении 0)
4. **`index.html`** — HTML-строка стата в `#stats-panel`
5. **`src/data/classes.js`** — бонусы классов (если уже есть запланированные классы)

### Два типа специальных статов (важно перед началом)

**Тип A — класс + экипировка** (dodge, lifesteal, thorns, magicShield):
```js
newStat: Math.min(CAP, (cb.newStat || 0) * 100 + (eq.newStat || 0) * 100),
```

**Тип B — только класс, без экипировки** (pierce, deathblow):
```js
newStat: Math.min(CAP, (cb.newStat || 0) * 100),
```

Уточни с пользователем тип нового стата (может ли он появляться на экипировке?).

**Важно:** upgrade shop (`upgBonuses`) не применяется ни к одному специальному стату — только к atk/def/hp/spd/crit/critDmg.

## Шаги выполнения

### 1. Уточнить параметры стата

Прочитай `ARCHITECTURE.md` секцию «Боевые статы игрока» и «Бэклог — геймплей» для контекста.

Для нового стата уточни:
- **Тип A или B** (с экипировкой или только класс)
- **Cap** (максимальное значение в %): например 60% для poison, 50% для burn
- **Когда применяется**: при атаке игрока, при получении урона, или DoT в начале тика

### 2. GameState.js — добавить в getStats()

Прочитай `src/core/GameState.js`. Найди блок с `dodge`/`lifesteal`/`thorns` в методе `getStats()` (строки ~174–179).

Добавь по типу:
```js
// Тип A (класс + экипировка), с cap:
newStat: Math.min(60, (cb.newStat || 0) * 100 + (eq.newStat || 0) * 100),

// Тип B (только класс), с cap:
newStat: Math.min(60, (cb.newStat || 0) * 100),

// Без cap:
newStat: (cb.newStat || 0) * 100 + (eq.newStat || 0) * 100,
```

### 3. Combat.js — реализовать механику

Прочитай `src/core/Combat.js`. Определи точку применения.

**Структура `_tick()` (для правильного размещения):**
```
1. if (!state.isAlive) { ... } return    ← respawn-логика
2. if (waveState === 'paused') { ... } return
3. attackCooldown -= dt
4. const stats = state.getStats()        ← кеш статов, ОДИН раз
5. if (mobs.length === 0) { ... } return ← волна пройдена
6. [DoT-обработка мобов — сюда для poison/burn]
7. Атака игрока (lifesteal — сюда)
8. Атаки мобов по игроку (dodge/thorns/magicShield — сюда)
```

**При атаке игрока** (рядом с lifesteal, после `_emit('onPlayerAttack', ...)`):
```js
if (stats.newStat > 0) {
  // логика (используй уже закешированный `stats`, не вызывай getStats() повторно)
}
```

**При получении урона** (рядом с dodge/thorns в блоке атак мобов):
```js
if (stats.newStat > 0) { ... }
```

**DoT на мобах** (шаг 6 — после кеша stats, после проверки пустой волны, до атаки игрока):
```js
for (const mob of this.mobs) {
  if ((mob.newStatTicks ?? 0) > 0) {
    const dot = mob.newStatDmg ?? 0;
    mob.hp -= dot;
    mob.newStatTicks--;
    if (mob.hp <= 0) { this._killMob(mob); }
  }
}
```

**Инициализация DoT-полей при спавне** — добавь поля в `_spawnWave()` в структуру каждого моба:
```js
this.mobs.push({
  id:             this.nextMobId++,
  data,
  hp:             data.maxHp,
  attackCooldown: 1000 + Math.random() * 800,
  newStatTicks:   0,   // ← добавить
  newStatDmg:     0,   // ← добавить
});
```

Без этого DoT-поля будут `undefined` при первом тике и вызовут NaN в HP.

### 4. StatsPanel.js — отобразить стат

Прочитай `src/ui/StatsPanel.js`. Найди блок `_setStatRow` (строки ~43–48).

Добавь строку — имя в JS camelCase, ID в HTML lowercase:
```js
// magicShield → 'stat-row-magicshield', 'stat-magicshield'
// poison      → 'stat-row-poison',      'stat-poison'
this._setStatRow('stat-row-newstat', 'stat-newstat', s.newStat > 0, s.newStat.toFixed(1));
```

**Правило ID:** camelCase → всё в lowercase, без дефисов (`magicShield` → `magicshield`, `deathblow` → `deathblow`).

### 5. index.html — HTML-строка стата

Прочитай `index.html`. Найди блок скрытых stat-row (строки с `id="stat-row-dodge"` и далее). Добавь по точному паттерну:

```html
<div class="stat-row" id="stat-row-newstat" style="display:none">
  <span class="sname">🆕 Название</span>
  <span><span class="sval" id="stat-newstat">0</span><span class="smult">%</span></span>
</div>
```

**Обязательно:** `class="sval"` на span значения, `class="smult"` на отдельный `%`-span. Нельзя писать `0%` внутри одного span — `_setStatRow` обновляет только элемент `stat-newstat`, знак `%` должен быть снаружи.

### 6. data/classes.js — добавить бонусы (если нужно)

Если в ARCHITECTURE.md запланированы классы с этим статом — добавь поле в `bonuses` нужных классов. Значение как дробь (0–1):
```js
bonuses: { atk: 0.20, newStat: 0.06 }
// getStats() умножает на 100 → итог 6%
```

### 7. Проверка

```bash
npm run balance
npm run dev
```

Протестируй механику вручную в браузере: стат должен появиться в StatsPanel при выборе класса с бонусом, и применяться в бою корректно.

## Горячий путь — правила

- `getStats()` кешируется **один раз в начале `_tick()`** — внутри тика используй только переменную `stats`
- `player:statsChanged` — дорогое событие, не эмитить при каждом ударе/тике DoT
- DoT-состояние хранится в структуре моба (`mob.poisonTicks`, `mob.burnTicks`), не в глобальном стейте
