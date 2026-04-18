"""
Генерация спрайтов земли (620x170 PNG с fade-прозрачностью вверху)
Запуск: python -X utf8 scripts/generate_grounds.py
"""
import requests, base64, time, os, io
from PIL import Image
import numpy as np

API_KEY   = "AQVN2nhLHwVLNaRTkkycJvNJ8cKIZOOLY61YaTqF"
FOLDER_ID = "b1gh0fjpoqnud7i9u3cr"
MODEL_URI = f"art://{FOLDER_ID}/yandex-art/latest"
ASYNC_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync"
OPS_URL   = "https://llm.api.cloud.yandex.net/operations/"
HEADERS   = {"Authorization": f"Api-Key {API_KEY}", "Content-Type": "application/json"}

ROOT = "c:/Users/ksmer/Desktop/Проекты/React/hobby/test/public/backgrounds"
os.makedirs(ROOT, exist_ok=True)

# 620x170 → aspect ratio ~4:1 (widthRatio:4, heightRatio:1)
TASKS = [
  ("ground_01_10", "pixel art dark fantasy forest ground floor strip, mossy earth, gnarled tree roots, fallen leaves, dark soil, top-down perspective, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_11_20", "pixel art dark fantasy swamp ground floor strip, dark muddy earth, reeds, small puddles, toxic ooze, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_21_30", "pixel art dark fantasy dungeon stone floor strip, cracked ancient stone tiles, moss in cracks, worn cobblestones, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_31_40", "pixel art dark fantasy graveyard ground floor strip, dark soil, withered grass, half-buried bones, dead roots, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_41_50", "pixel art dark fantasy volcanic ground floor strip, cracked black rock, glowing lava cracks, ash and ember, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_51_60", "pixel art dark fantasy fortress stone floor strip, old dark cobblestones, cracks, iron grate, dungeon floor, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_61_70", "pixel art dark fantasy demonic ground floor strip, obsidian black stone, glowing red rune cracks, hellfire embers, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_71_80", "pixel art dark fantasy void ground floor strip, dark floating stone platform, cosmic purple dust, dark crystal shards, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_81_90", "pixel art dark fantasy infernal citadel floor strip, dark stone tiles, rivers of lava between, fire glow, game terrain texture, seamless horizontal, retro 16bit style"),
  ("ground_91_100", "pixel art dark fantasy chaos realm ground floor strip, reality-torn dark ground, chaotic energy cracks glowing, dark void fissures, game terrain texture, seamless horizontal, retro 16bit style"),
]

def submit(prompt, seed):
    body = {
        "modelUri": MODEL_URI,
        "generationOptions": {"seed": str(seed), "aspectRatio": {"widthRatio": "4", "heightRatio": "1"}},
        "messages": [{"weight": "1", "text": prompt}]
    }
    r = requests.post(ASYNC_URL, headers=HEADERS, json=body)
    return r.json().get("id")

def poll(op_id):
    while True:
        r = requests.get(OPS_URL + op_id, headers=HEADERS).json()
        if r.get("done"):
            return r["response"]["image"]
        time.sleep(3)

def process(b64, outname):
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("RGBA")

    # Ресайз до 620x170 (полоска земли под персонажами)
    img = img.resize((620, 170), Image.LANCZOS)

    # Применяем градиентную прозрачность: верхние 60px плавно исчезают
    data = np.array(img)
    fade_height = 60
    for row in range(fade_height):
        alpha = int(255 * (row / fade_height))
        data[row, :, 3] = np.minimum(data[row, :, 3], alpha)

    result = Image.fromarray(data)
    path = f"{ROOT}/{outname}.png"
    result.save(path)
    print(f"  saved {outname}.png  {result.size}")

print(f"Отправляем {len(TASKS)} запросов...")
ops = []
for i, (name, prompt) in enumerate(TASKS):
    op_id = submit(prompt, seed=200 + i)
    ops.append((name, op_id))
    print(f"  [{i+1:2d}/{len(TASKS)}] {name:20s} -> {op_id}")
    time.sleep(0.3)

print(f"\nЖдём результаты ({len(ops)} операций)...")
for i, (name, op_id) in enumerate(ops):
    print(f"  [{i+1:2d}/{len(ops)}] polling {name}...", end=" ", flush=True)
    b64 = poll(op_id)
    process(b64, name)

print("\nГотово!")
