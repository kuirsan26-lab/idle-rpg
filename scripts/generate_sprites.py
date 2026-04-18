"""
Генерация всех спрайтов и фонов через YandexART 2.0
Запуск: python scripts/generate_sprites.py
"""
import requests, json, base64, time, os
from PIL import Image
import numpy as np

API_KEY   = "AQVN2nhLHwVLNaRTkkycJvNJ8cKIZOOLY61YaTqF"
FOLDER_ID = "b1gh0fjpoqnud7i9u3cr"
MODEL_URI = f"art://{FOLDER_ID}/yandex-art/latest"
ASYNC_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync"
OPS_URL   = "https://llm.api.cloud.yandex.net/operations/"
HEADERS   = {"Authorization": f"Api-Key {API_KEY}", "Content-Type": "application/json"}

ROOT = "c:/Users/ksmer/Desktop/Проекты/React/hobby/test/public"
os.makedirs(f"{ROOT}/sprites",     exist_ok=True)
os.makedirs(f"{ROOT}/backgrounds", exist_ok=True)

# ── Задачи генерации ─────────────────────────────────────────────────────────
# (filename, prompt, w_ratio, h_ratio, is_background)
TASKS = [
  # ── Мобы (прозрачный фон, 128x128) ─────────────────────────────────────────
  ("sprites/slime",      "pixel art green slime monster sprite, fantasy RPG, white background, round blob shape, big cute eyes, simple body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/skeleton",   "pixel art skeleton warrior sprite, fantasy RPG, white background, bones, rusty sword and shield, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/orc",        "pixel art orc warrior sprite, fantasy RPG, white background, green skin, heavy iron armor, battle axe, muscular, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/troll",      "pixel art cave troll sprite, fantasy RPG, white background, grey rocky skin, huge body, wooden club, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/dragonling", "pixel art small dragon sprite, fantasy RPG, white background, orange red scales, small wings spread, sharp claws, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/demon",      "pixel art demon warrior sprite, fantasy RPG, white background, red skin, curved horns, dark spiked armor, flaming sword, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/lich",       "pixel art lich sorcerer sprite, fantasy RPG, white background, undead skeleton in purple tattered robes, glowing eyes, skull-topped staff, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/dragon",     "pixel art red dragon sprite, fantasy RPG, white background, large wings spread, armored scales, breathing fire, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/archdemon",  "pixel art archdemon sprite, fantasy RPG, white background, massive black demon, four wings, glowing red eyes, dark aura, full body, retro 16bit game style, dark fantasy", "1","1", False),
  # ── Боссы (прозрачный фон, 128x128) ────────────────────────────────────────
  ("sprites/boss_slime_king",    "pixel art giant slime king boss sprite, fantasy RPG, white background, huge green blob, golden crown on top, angry eyes, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_goblin_chief",  "pixel art goblin warchief boss sprite, fantasy RPG, white background, large goblin, spiked armor, huge club, war paint, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_bone_king",     "pixel art skeleton bone king boss sprite, fantasy RPG, white background, giant skeleton, ornate bone armor, golden crown, large sword, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_orc_warlord",   "pixel art orc warlord boss sprite, fantasy RPG, white background, massive orc, full plate armor, dual axes, war helm, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_troll_ancient", "pixel art ancient troll boss sprite, fantasy RPG, white background, enormous ancient troll, mossy stone skin, giant tree trunk club, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_fire_dragon",   "pixel art fire dragon boss sprite, fantasy RPG, white background, giant red fire dragon, massive wings, streams of flame, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_demon_lord",    "pixel art demon lord boss sprite, fantasy RPG, white background, towering demon, multiple horns, dark throne aura, hellfire sword, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_lich_king",     "pixel art lich king boss sprite, fantasy RPG, white background, powerful undead king, ice crown, dark plate armor with skulls, scythe, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_dragon_ancient","pixel art ancient dragon boss sprite, fantasy RPG, white background, colossal ancient dragon, scarred black scales, massive wingspan, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/boss_chaos_lord",    "pixel art chaos lord boss sprite, fantasy RPG, white background, ultimate demon god, multiple arms, reality-warping aura, chaos energy, retro 16bit game style, dark fantasy", "1","1", False),
  # ── Герои (прозрачный фон, 128x128) ────────────────────────────────────────
  ("sprites/hero_novice",  "pixel art novice adventurer hero sprite, fantasy RPG, white background, young warrior, simple cloth armor, short sword, full body front view, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/hero_warrior", "pixel art warrior hero sprite, fantasy RPG, white background, armored knight, full plate armor, large sword and shield, heroic stance, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/hero_rogue",   "pixel art rogue hero sprite, fantasy RPG, white background, stealthy assassin, dark leather armor, dual daggers, hood, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/hero_archer",  "pixel art archer hero sprite, fantasy RPG, white background, ranger archer, green cloak, longbow drawn, quiver on back, full body, retro 16bit game style, dark fantasy", "1","1", False),
  ("sprites/hero_mage",    "pixel art mage hero sprite, fantasy RPG, white background, powerful sorcerer, blue robes, glowing staff, magical aura, full body, retro 16bit game style, dark fantasy", "1","1", False),
  # ── Фоны (без удаления фона, 620x480) ──────────────────────────────────────
  ("backgrounds/bg_01_10",  "dark fantasy forest clearing night scene, pixel art style, moonlit ancient trees, glowing mushrooms, atmospheric mist, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_11_20",  "dark fantasy swamp marshland night scene, pixel art style, dead trees, toxic green fog, dark water reflections, atmospheric, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_21_30",  "dark fantasy dungeon cave interior, pixel art style, stone walls, glowing crystals, torches, ancient ruins, atmospheric, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_31_40",  "dark fantasy haunted graveyard night, pixel art style, crumbling tombstones, dead trees, purple moonlight, ghostly fog, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_41_50",  "dark fantasy volcanic wasteland, pixel art style, lava flows, ash clouds, burning rocks, hellish red sky, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_51_60",  "dark fantasy ruined fortress night, pixel art style, crumbling dark stone walls, broken towers, purple lightning, dramatic sky, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_61_70",  "dark fantasy demonic realm, pixel art style, hellfire pillars, dark red sky, obsidian ground, demonic runes glowing, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_71_80",  "dark fantasy void abyss, pixel art style, endless dark void, floating dark rocks, cosmic purple energy, stars, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_81_90",  "dark fantasy infernal citadel, pixel art style, massive black fortress, rivers of lava, dark towers, ominous red clouds, RPG battle arena background, no characters", "4","3", True),
  ("backgrounds/bg_91_100", "dark fantasy chaos realm ultimate final boss arena, pixel art style, reality torn apart, chaotic energy swirls, dark and light colliding, epic, RPG battle arena background, no characters", "4","3", True),
]

# ── Отправка всех запросов ───────────────────────────────────────────────────
def submit(name, prompt, wr, hr, seed):
    body = {
        "modelUri": MODEL_URI,
        "generationOptions": {"seed": str(seed), "aspectRatio": {"widthRatio": wr, "heightRatio": hr}},
        "messages": [{"weight": "1", "text": prompt}]
    }
    r = requests.post(ASYNC_URL, headers=HEADERS, json=body)
    return r.json().get("id")

# ── Опрос статуса ────────────────────────────────────────────────────────────
def poll(op_id):
    while True:
        r = requests.get(OPS_URL + op_id, headers=HEADERS).json()
        if r.get("done"):
            return r["response"]["image"]
        time.sleep(3)

# ── Обработка изображения ────────────────────────────────────────────────────
def process(b64, outpath, is_bg):
    raw = base64.b64decode(b64)
    img = Image.open(__import__("io").BytesIO(raw)).convert("RGBA")

    if is_bg:
        img = img.resize((620, 480), Image.LANCZOS).convert("RGB")
        img.save(f"{ROOT}/{outpath}.jpg", quality=92)
        print(f"  saved {outpath}.jpg  {img.size}")
    else:
        data = np.array(img)
        r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
        data[(r > 230) & (g > 230) & (b > 230), 3] = 0   # убрать белый фон
        img2 = Image.fromarray(data).resize((128, 128), Image.LANCZOS)
        img2.save(f"{ROOT}/{outpath}.png")
        print(f"  saved {outpath}.png  {img2.size}")

# ── MAIN ─────────────────────────────────────────────────────────────────────
print(f"Отправляем {len(TASKS)} запросов...")
ops = []
for i, (name, prompt, wr, hr, is_bg) in enumerate(TASKS):
    op_id = submit(name, prompt, wr, hr, seed=10 + i)
    ops.append((name, op_id, is_bg))
    print(f"  [{i+1:2d}/{len(TASKS)}] {name:40s} → {op_id}")
    time.sleep(0.3)   # небольшая задержка между запросами

print(f"\nЖдём результаты ({len(ops)} операций)...")
for i, (name, op_id, is_bg) in enumerate(ops):
    print(f"  [{i+1:2d}/{len(ops)}] polling {name}...", end=" ", flush=True)
    b64 = poll(op_id)
    process(b64, name, is_bg)

print("\n✅ Готово!")
