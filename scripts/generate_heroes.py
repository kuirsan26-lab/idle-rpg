"""
Генерация спрайтов героев через YandexART 2.0.
Сохраняет в 256x256 RGBA PNG (вместо старых 128x128) для лучшего качества.
"""
import os, json, base64, time, sys
import urllib.request, urllib.error
from PIL import Image
import numpy as np
from pathlib import Path

FOLDER_ID = os.environ.get("YANDEX_FOLDER_ID")
API_KEY   = os.environ.get("YANDEX_API_KEY")
if not API_KEY or not FOLDER_ID:
    sys.exit("Задай переменные окружения YANDEX_API_KEY и YANDEX_FOLDER_ID перед запуском.")
OUT_DIR   = Path(__file__).parent.parent / "public" / "sprites"
OUT_SIZE  = 256  # было 128 — чётче на экране

HEROES = [
    ("hero_novice", 11,
     "fantasy RPG young adventurer character sprite, leather armor, simple short sword, "
     "determined face, standing combat pose, side view, full body, dark fantasy, "
     "detailed illustration, sharp clean lines, dramatic lighting, transparent background"),

    ("hero_warrior", 22,
     "fantasy RPG heavy knight warrior character sprite, full plate armor, large shield, "
     "broad sword raised, standing combat pose, side view, full body, dark fantasy, "
     "detailed illustration, sharp clean lines, dramatic lighting, transparent background"),

    ("hero_rogue", 33,
     "fantasy RPG rogue assassin character sprite, dark leather armor, dual daggers, "
     "hood and mask, crouching ready pose, side view, full body, dark fantasy, "
     "detailed illustration, sharp clean lines, dramatic lighting, transparent background"),

    ("hero_archer", 44,
     "fantasy RPG elven archer character sprite, light ranger armor, longbow drawn back, "
     "quiver of arrows, focused stance, side view, full body, dark fantasy, "
     "detailed illustration, sharp clean lines, dramatic lighting, transparent background"),

    ("hero_mage", 56,
     "fantasy RPG dark sorcerer mage character sprite, flowing dark robes, ornate staff "
     "with glowing crystal, arcane energy around hands, casting pose, side view, full body, "
     "dark fantasy, detailed illustration, sharp clean lines, dramatic lighting, transparent background"),
]

def _remove_bg(arr):
    """Flood-fill от 4 углов + убрать пиксели близкие к цвету фона."""
    from collections import deque
    h, w = arr.shape[:2]
    # Собрать цвет фона из 4 углов (медиана)
    corners = [arr[0,0,:3], arr[0,w-1,:3], arr[h-1,0,:3], arr[h-1,w-1,:3]]
    bg = np.median(corners, axis=0).astype(np.uint8)
    tol = 30  # допуск отклонения от bg-цвета

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for sy, sx in [(0,0),(0,w-1),(h-1,0),(h-1,w-1)]:
        if not visited[sy, sx]:
            visited[sy, sx] = True
            q.append((sy, sx))

    while q:
        y, x = q.popleft()
        px = arr[y, x, :3]
        if np.all(np.abs(px.astype(int) - bg.astype(int)) <= tol):
            arr[y, x, 3] = 0
            for ny, nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))

    # Дополнительно убрать явно-белый (на случай артефактов)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    arr[(r > 230) & (g > 230) & (b > 230), 3] = 0


def post_json(url, payload, headers):
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def generate(name, seed, prompt):
    print(f"\n→ {name} (seed={seed})")
    headers = {
        "Authorization": f"Api-Key {API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "modelUri": f"art://{FOLDER_ID}/yandex-art/latest",
        "generationOptions": {
            "seed": str(seed),
            "aspectRatio": {"widthRatio": "1", "heightRatio": "1"},
        },
        "messages": [{"weight": "1", "text": prompt}],
    }
    resp = post_json(
        "https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync",
        payload, headers
    )
    op_id = resp.get("id")
    if not op_id:
        print(f"  ✗ нет id операции: {resp}")
        return False

    print(f"  operation_id={op_id}  ожидаем...", end="", flush=True)
    for _ in range(24):  # до 120 сек
        time.sleep(5)
        result = get_json(
            f"https://llm.api.cloud.yandex.net/operations/{op_id}",
            headers
        )
        if result.get("done"):
            break
        print(".", end="", flush=True)
    else:
        print("\n  ✗ timeout")
        return False

    img_b64 = result.get("response", {}).get("image")
    if not img_b64:
        print(f"\n  ✗ нет image в ответе: {result}")
        return False

    # Убрать фон: flood-fill от углов + убрать белый
    raw = base64.b64decode(img_b64)
    img = Image.open(__import__('io').BytesIO(raw)).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    _remove_bg(arr)
    result_img = Image.fromarray(arr).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)

    out_path = OUT_DIR / f"{name}.png"
    result_img.save(out_path)
    print(f"\n  ✓ сохранён: {out_path} ({OUT_SIZE}×{OUT_SIZE}px)")
    return True

if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for name, seed, prompt in HEROES:
        if generate(name, seed, prompt):
            ok += 1
    print(f"\n{'='*40}")
    print(f"Готово: {ok}/{len(HEROES)} спрайтов")
