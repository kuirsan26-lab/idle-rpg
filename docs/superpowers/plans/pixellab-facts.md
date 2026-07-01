# Pixellab — факты по выводу (Task 0 спайк)

**Дата:** 2026-07-01
**Тест-персонаж:** Hero Warrior — `810b728b-185d-4c74-a008-892059f993aa`

## Бюджет генераций

- Trial-подписка: **40 генераций**, кредитов $0.
- `create_character` (standard) = **1 генерация**, любое число направлений.
- `animate_character` template/v3 = **1 генерация / направление**. `pro` = 20–40 (не используем).
- Наш план: 1 create + 4 анимации (только `east`) = **5 ген/герой** → 25 ген на 5 героев. Влезаем.

## Инструменты и параметры

### create_character
- `description` — облик (напр. `dark fantasy warrior, heavy plate armor, sword and round shield, muted grim palette`).
- `view: "side"` — вид сбоку (eye-level). **Обязательно для нашего сайд-скроллера.**
- `n_directions: 4` → возвращает **south, east, north, west**.
- `size: 64` → реальный размер кадра **92×92 px** (canvas ~40% больше «персонажа»). Близко к целевым 96 — import-скрипт доресайзит до 96 через NEAREST.
- `detail: "high detail"`, `outline: "single color black outline"` — читаемый силуэт.
- Возвращает `id` сразу; статус — через `get_character`. Генерация ~2–3 мин.

### Направление «лицом вправо»
- **`east` = лицом ВПРАВО** (проверено: меч виден справа). `west` = влево.
- Герой в игре стоит на `x=100` и бьёт мобов справа → нужен **east**.
- Анимируем только `east` (`directions: ["east"]`) — экономит генерации.

### animate_character
- Прикрепляет анимацию к персонажу. `get_character` показывает `pending jobs` с прогрессом.
- **template mode** (`template_animation_id`): готовые шаблоны скелета. Использованы:
  - idle → `breathing-idle`
  - hit → `taking-punch`
  - death → `falling-back-death`
- **v3 mode** (`mode: "v3"`, `action_description`, `frame_count`): кастомная анимация. Использована для:
  - attack → `swinging sword forward in a strong melee attack`, `frame_count: 6` (→ 7 кадров: 1 reference + 6).
- Доступные humanoid-шаблоны (48 шт.): backflip, breathing-idle, cross-punch, crouched-walking,
  crouching, drinking, falling-back-death, fight-stance-idle-8-frames, fireball, flying-kick,
  front-flip, getting-up, high-kick, hurricane-kick, jumping-1/2, lead-jab, leg-sweep,
  picking-up, pull-heavy-object, pushing, roundhouse-kick, running-*, sad-walk, scary-walk,
  surprise-uppercut, taking-punch, throw-object, two-footed-jump, walk*, walking* и др.
- Джобы дольше estimate: реально ~7–8 мин на 4 анимации.
- **Лимит одновременных джоб = 8** (на аккаунт). Ставить анимации волнами ≤8.
- **v3-анимацию (attack) нельзя ставить до завершения create** — ей нужен rotation-кадр как
  стартовый (иначе `404: Character rotation image not found`). Template-анимации (idle/hit/death)
  можно ставить сразу после `create_character` (запустятся по готовности).
- Практика для батча 5 героев: сначала template-анимации, attack (v3) — отдельной волной
  после того, как все `create` завершились.

## Скачивание результата

- Статичные повороты: публичные URL на `backblaze.pixellab.ai/.../rotations/<dir>.png` (из `get_character`).
- Полный результат (повороты + кадры анимаций): `GET https://api.pixellab.ai/mcp/characters/<id>/download`
  - Требует заголовок `Authorization: Bearer <token>`.
  - Отдаёт **HTTP 423** пока джобы не завершены → `curl --fail` + retry-loop.

## Структура download-архива

Формат — **ZIP** (`file` определяет как «Microsoft OOXML» — это zip-контейнер), `export_version: 3.0`:

```
<Char_Name>/
  rotations/{south,east,north,west}.png       # статичные позы
  animations/<action_folder>/<dir>/frame_NNN.png  # кадры, 0-based, по имени
metadata.json                                  # каталог всех путей + размер кадра
```

- Кадры — **92×92 PNG RGBA**, выровнены по единому канвасу (позиция персонажа стабильна между
  кадрами → можно паддить/ресайзить одинаково без сдвига анимации).
- `<action_folder>` = имя шаблона/действия (НЕ переданный `animation_name`):
  - idle (breathing-idle) → **`animating`** (4 кадра)
  - hit (taking-punch) → **`taking_a_punch`** (6 кадров)
  - death (falling-back-death) → **`falling_backward`** (7 кадров)
  - attack (v3 custom) → слаг из `action_description`, напр. `swinging_sword_forward_in_a_strong_melee_attack` (7 кадров)
- `metadata.json` → `states[0].frames.animations` = `{ folder: { dir: [paths...] } }`, `states[0].character.size`.

### Вывод для import-скрипта (Task 1)

- Читать `metadata.json`, брать кадры по путям (не хардкодить имена файлов).
- Attack-папка **различается у каждого героя** (оружие разное) → определять attack как
  «анимацию, не входящую в {animating, taking_a_punch, falling_backward}».
- Порядок склейки: **idle → attack → hit → death**. Реальные counts воина: **4 / 7 / 6 / 7**.
- Паддить каждый кадр по центру до 96×96 (сохранить пиксели; при frame>96 — NEAREST-даунскейл).
