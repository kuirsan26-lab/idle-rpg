"""
Собирает все спрайты из public/sprites/ в один texture atlas.
Выход: public/sprites/atlas.png + public/sprites/atlas.json

Мобы/боссы — 128×128, герои — 256×256.

Запуск: python scripts/build_atlas.py
Требует: Pillow  (pip install pillow)
"""

import json
import sys
from pathlib import Path
from PIL import Image

ROOT      = Path(__file__).parent.parent
SPRITES   = ROOT / "public" / "sprites"
OUT_PNG   = SPRITES / "atlas.png"
OUT_JSON  = SPRITES / "atlas.json"

# Маппинг: frame key → (filename, size)
SPRITES_MAP = [
    # Мобы 128×128
    ("mob_slime",       "slime.png",       128),
    ("mob_goblin",      "goblin.png",      128),
    ("mob_skeleton",    "skeleton.png",    128),
    ("mob_orc",         "orc.png",         128),
    ("mob_troll",       "troll.png",       128),
    ("mob_dragonling",  "dragonling.png",  128),
    ("mob_demon",       "demon.png",       128),
    ("mob_lich",        "lich.png",        128),
    ("mob_dragon",      "dragon.png",      128),
    ("mob_archdemon",   "archdemon.png",   128),
    # Боссы 128×128
    ("mob_boss_slime_king",     "boss_slime_king.png",     128),
    ("mob_boss_goblin_chief",   "boss_goblin_chief.png",   128),
    ("mob_boss_bone_king",      "boss_bone_king.png",      128),
    ("mob_boss_orc_warlord",    "boss_orc_warlord.png",    128),
    ("mob_boss_troll_ancient",  "boss_troll_ancient.png",  128),
    ("mob_boss_fire_dragon",    "boss_fire_dragon.png",    128),
    ("mob_boss_demon_lord",     "boss_demon_lord.png",     128),
    ("mob_boss_lich_king",      "boss_lich_king.png",      128),
    ("mob_boss_dragon_ancient", "boss_dragon_ancient.png", 128),
    ("mob_boss_chaos_lord",     "boss_chaos_lord.png",     128),
    # Герои 256×256
    ("hero_novice",  "hero_novice.png",  256),
    ("hero_warrior", "hero_warrior.png", 256),
    ("hero_rogue",   "hero_rogue.png",   256),
    ("hero_archer",  "hero_archer.png",  256),
    ("hero_mage",    "hero_mage.png",    256),
]

ATLAS_W = 640  # фиксированная ширина (5 × 128)

def build():
    # Вычислить layout: bin-packing по строкам с учётом разных размеров
    frames = {}
    missing = []
    rects = []  # (key, img, x, y, w, h)

    # Простой shelf-packer: идём по строкам, как влезет
    x, y, row_h = 0, 0, 0
    for key, fname, sz in SPRITES_MAP:
        src = SPRITES / fname
        if not src.exists():
            missing.append(fname)
            print(f"  ⚠  пропущен: {fname}")
            continue

        img = Image.open(src).convert("RGBA")
        if img.size != (sz, sz):
            img = img.resize((sz, sz), Image.LANCZOS)

        if x + sz > ATLAS_W:
            x = 0
            y += row_h
            row_h = 0

        rects.append((key, img, x, y, sz, sz))
        frames[key] = {
            "frame":            {"x": x, "y": y, "w": sz, "h": sz},
            "rotated":          False,
            "trimmed":          False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": sz, "h": sz},
            "sourceSize":       {"w": sz, "h": sz},
        }
        x += sz
        row_h = max(row_h, sz)

    total_h = y + row_h
    atlas = Image.new("RGBA", (ATLAS_W, total_h), (0, 0, 0, 0))
    for key, img, px, py, w, h in rects:
        atlas.paste(img, (px, py))

    atlas.save(OUT_PNG, "PNG", optimize=True)

    atlas_json = {
        "frames": frames,
        "meta": {
            "app":     "build_atlas.py",
            "version": "1.1",
            "image":   "atlas.png",
            "format":  "RGBA8888",
            "size":    {"w": ATLAS_W, "h": total_h},
            "scale":   "1",
        }
    }
    OUT_JSON.write_text(json.dumps(atlas_json, indent=2), encoding="utf-8")

    print(f"\n✅  Атлас собран: {ATLAS_W}×{total_h}px, {len(frames)} фреймов")
    print(f"   PNG  → {OUT_PNG}")
    print(f"   JSON → {OUT_JSON}")
    if missing:
        print(f"   ⚠  пропущено файлов: {len(missing)}")
    return len(missing) == 0

if __name__ == "__main__":
    print("Сборка texture atlas...\n")
    ok = build()
    sys.exit(0 if ok else 1)
