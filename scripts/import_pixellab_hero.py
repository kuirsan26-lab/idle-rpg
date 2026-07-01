#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Импорт вывода Pixellab (распакованный download-zip) → спрайтшит героя + JSON.

Pixellab отдаёт zip с кадрами анимаций по путям, описанным в metadata.json:
    <Char>/animations/<action_folder>/<dir>/frame_NNN.png
Имена action-папок — это шаблоны/действия, не наши имена состояний. Маппинг:
    idle   ← breathing-idle       → папка "animating"
    hit    ← taking-punch          → папка "taking_a_punch"
    death  ← falling-back-death    → папка "falling_backward"
    attack ← v3 custom             → любая ОСТАВШАЯСЯ папка (слаг из action_description)

Кадры Pixellab (~92×92) паддятся по центру до 96×96 (пиксели сохраняются;
если кадр больше цели — NEAREST-даунскейл). Все состояния склеиваются в один
горизонтальный ряд в порядке idle → attack → hit → death.

Пример:
    python -X utf8 scripts/import_pixellab_hero.py \
        --branch warrior \
        --extracted public/sprites/heroes/_raw/warrior/extracted \
        --direction east

Вывод: public/sprites/heroes/hero_<branch>.png + hero_<branch>.json
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

# action-папки известных шаблонов → состояние
KNOWN_FOLDERS = {
    "animating": "idle",
    "taking_a_punch": "hit",
    "falling_backward": "death",
}
# порядок состояний в спрайтшите
STATE_ORDER = ["idle", "attack", "hit", "death"]
# частота кадров по умолчанию (кадр/сек)
DEFAULT_FRAME_RATE = {"idle": 6, "attack": 12, "hit": 12, "death": 8}


def resolve_states(animations: dict) -> dict:
    """Из metadata animations {folder: {dir: [...]}} построить {state: folder}."""
    mapping = {}
    leftover = []
    for folder in animations:
        state = KNOWN_FOLDERS.get(folder)
        if state:
            mapping[state] = folder
        else:
            leftover.append(folder)
    # attack — единственная незнакомая папка
    if len(leftover) == 1:
        mapping["attack"] = leftover[0]
    elif len(leftover) > 1:
        raise SystemExit(
            f"[ERR] Неоднозначная attack-папка, кандидатов >1: {leftover}. "
            f"Оставьте только одну кастомную анимацию или переименуйте."
        )
    return mapping


def pad_or_resize(img: Image.Image, size: int) -> Image.Image:
    """Привести кадр к size×size RGBA: паддинг по центру, либо NEAREST-даунскейл."""
    img = img.convert("RGBA")
    w, h = img.size
    if w > size or h > size:
        scale = min(size / w, size / h)
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.NEAREST)
        w, h = img.size
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - w) // 2, (size - h) // 2))
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description="Pixellab → hero spritesheet + JSON")
    ap.add_argument("--branch", required=True, help="novice|warrior|rogue|archer|mage")
    ap.add_argument("--extracted", required=True,
                    help="папка с распакованным zip (содержит metadata.json)")
    ap.add_argument("--direction", default="east",
                    help="направление кадров (east = лицом вправо)")
    ap.add_argument("--size", type=int, default=96, help="размер кадра в px (кв.)")
    ap.add_argument("--out-dir", default="public/sprites/heroes",
                    help="куда писать hero_<branch>.png/.json")
    args = ap.parse_args()

    root = Path(args.extracted)
    meta_path = root / "metadata.json"
    if not meta_path.exists():
        raise SystemExit(f"[ERR] нет {meta_path}")

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    state0 = meta["states"][0]
    animations = state0["frames"]["animations"]

    state_folder = resolve_states(animations)
    missing = [s for s in STATE_ORDER if s not in state_folder]
    if missing:
        raise SystemExit(f"[ERR] в metadata нет состояний: {missing} "
                         f"(нашлись: {list(state_folder)})")

    # собрать кадры по состояниям
    frames = []          # список Image
    states_json = {}     # state -> {start, count, frameRate}
    cursor = 0
    for state in STATE_ORDER:
        folder = state_folder[state]
        dirs = animations[folder]
        if args.direction not in dirs:
            raise SystemExit(f"[ERR] состояние {state} ({folder}) не имеет "
                             f"направления {args.direction}: есть {list(dirs)}")
        paths = dirs[args.direction]
        for rel in paths:
            img = Image.open(root / rel)
            frames.append(pad_or_resize(img, args.size))
        states_json[state] = {
            "start": cursor,
            "count": len(paths),
            "frameRate": DEFAULT_FRAME_RATE[state],
        }
        cursor += len(paths)

    # склеить в горизонтальный ряд
    sheet = Image.new("RGBA", (args.size * len(frames), args.size), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * args.size, 0))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"hero_{args.branch}.png"
    json_path = out_dir / f"hero_{args.branch}.json"
    sheet.save(png_path)
    json_path.write_text(json.dumps(
        {"frameSize": args.size, "states": states_json},
        indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[OK] {png_path}  ({sheet.width}x{sheet.height}, {len(frames)} кадров)")
    for state in STATE_ORDER:
        s = states_json[state]
        print(f"     {state:6s} <- {state_folder[state]:40s} "
              f"start={s['start']:2d} count={s['count']} fps={s['frameRate']}")
    print(f"[OK] {json_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
