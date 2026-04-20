"""
Собирает все спрайты из public/sprites/ в один texture atlas.
Выход: public/sprites/atlas.png + public/sprites/atlas.json

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
FRAME_SZ  = 128   # все спрайты 128×128
COLS      = 5     # сетка 5×5 = 640×640

# Маппинг: frame key (как в GameScene) → filename
SPRITES_MAP = {
    # Мобы
    "mob_slime":       "slime.png",
    "mob_goblin":      "goblin.png",
    "mob_skeleton":    "skeleton.png",
    "mob_orc":         "orc.png",
    "mob_troll":       "troll.png",
    "mob_dragonling":  "dragonling.png",
    "mob_demon":       "demon.png",
    "mob_lich":        "lich.png",
    "mob_dragon":      "dragon.png",
    "mob_archdemon":   "archdemon.png",
    # Боссы
    "mob_boss_slime_king":     "boss_slime_king.png",
    "mob_boss_goblin_chief":   "boss_goblin_chief.png",
    "mob_boss_bone_king":      "boss_bone_king.png",
    "mob_boss_orc_warlord":    "boss_orc_warlord.png",
    "mob_boss_troll_ancient":  "boss_troll_ancient.png",
    "mob_boss_fire_dragon":    "boss_fire_dragon.png",
    "mob_boss_demon_lord":     "boss_demon_lord.png",
    "mob_boss_lich_king":      "boss_lich_king.png",
    "mob_boss_dragon_ancient": "boss_dragon_ancient.png",
    "mob_boss_chaos_lord":     "boss_chaos_lord.png",
    # Герои
    "hero_novice":  "hero_novice.png",
    "hero_warrior": "hero_warrior.png",
    "hero_rogue":   "hero_rogue.png",
    "hero_archer":  "hero_archer.png",
    "hero_mage":    "hero_mage.png",
}

def build():
    entries = list(SPRITES_MAP.items())
    rows    = (len(entries) + COLS - 1) // COLS
    W, H    = COLS * FRAME_SZ, rows * FRAME_SZ

    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    frames = {}
    missing = []

    for idx, (key, fname) in enumerate(entries):
        src = SPRITES / fname
        if not src.exists():
            missing.append(fname)
            print(f"  ⚠  пропущен: {fname}")
            continue

        img = Image.open(src).convert("RGBA")
        if img.size != (FRAME_SZ, FRAME_SZ):
            img = img.resize((FRAME_SZ, FRAME_SZ), Image.LANCZOS)

        col = idx % COLS
        row = idx // COLS
        x, y = col * FRAME_SZ, row * FRAME_SZ
        atlas.paste(img, (x, y))

        frames[key] = {
            "frame":           {"x": x, "y": y, "w": FRAME_SZ, "h": FRAME_SZ},
            "rotated":         False,
            "trimmed":         False,
            "spriteSourceSize":{"x": 0, "y": 0, "w": FRAME_SZ, "h": FRAME_SZ},
            "sourceSize":      {"w": FRAME_SZ, "h": FRAME_SZ},
        }

    atlas.save(OUT_PNG, "PNG", optimize=True)

    atlas_json = {
        "frames": frames,
        "meta": {
            "app":     "build_atlas.py",
            "version": "1.0",
            "image":   "atlas.png",
            "format":  "RGBA8888",
            "size":    {"w": W, "h": H},
            "scale":   "1",
        }
    }
    OUT_JSON.write_text(json.dumps(atlas_json, indent=2), encoding="utf-8")

    print(f"\n✅  Атлас собран: {W}×{H}px, {len(frames)} фреймов")
    print(f"   PNG  → {OUT_PNG}")
    print(f"   JSON → {OUT_JSON}")
    if missing:
        print(f"   ⚠  пропущено файлов: {len(missing)}")
    return len(missing) == 0

if __name__ == "__main__":
    print("Сборка texture atlas...\n")
    ok = build()
    sys.exit(0 if ok else 1)
