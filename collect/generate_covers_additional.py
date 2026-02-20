#!/usr/bin/env python3
"""
추가 8권 표지 자동 생성 — Leonardo.ai API
수채화 스타일, 기존 38권과 동일한 설정

사용법:
  1. API_KEY 확인
  2. python generate_covers_additional.py
  3. covers_additional/ 폴더에 PNG 저장
  4. python add_text_to_covers_additional.py  (텍스트 오버레이)
"""

import requests
import time
import os
import json
import sys

# ═══════════════════════════════════════════════════════
API_KEY = "4e775ec5-8394-4100-b2b2-63370d3cf921"
# ═══════════════════════════════════════════════════════

BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"
HEADERS = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": f"Bearer {API_KEY}",
}

# Phoenix 1.0
MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"

NEGATIVE_PROMPT = (
    "photorealistic, photograph, photo, 3d render, CGI, modern, contemporary, "
    "neon, digital art, anime, cartoon, comic, plastic, glossy, hyperrealistic, "
    "text, title, words, letters, watermark, logo, signature, "
    "deformed hands, extra fingers, bad anatomy, blurry, low quality, ugly"
)

STYLE_SUFFIX = (
    ", delicate watercolor illustration on textured paper, soft bleeding edges, "
    "gentle color washes with visible water stains, muted and warm palette, "
    "generous white negative space, contemplative and poetic atmosphere, "
    "fine art book cover, vertical 2:3 composition"
)

BOOKS = [
    # ── 시집 ──────────────────────────────────────────
    {
        "id": "A01", "author": "김소월", "title": "진달래꽃",
        "epub": "김소월_진달래꽃.epub",
        "prompt": "A mountainside covered in soft pink and magenta azalea blossoms cascading down like a river, watercolor petals drifting in wind across generous white space, a narrow winding mountain path disappearing into spring mist, layers of pale pink lavender and sage green washes, bittersweet beauty of parting, Korean spring hillside poetry"
    },
    {
        "id": "A02", "author": "윤동주", "title": "하늘과바람과별과시",
        "epub": "윤동주_하늘과바람과별과시.epub",
        "prompt": "A vast deep indigo night sky filled with countless tiny golden stars as unpainted white paper dots, gentle wind suggested by flowing curved brushstrokes through tall silver grass below, a narrow solitary path leading toward the horizon, profound stillness and quiet yearning, deep navy watercolor wash fading into luminous white at the bottom, contemplative nocturnal landscape"
    },
    {
        "id": "A03", "author": "한용운", "title": "님의침묵",
        "epub": "한용운_님의침묵.epub",
        "prompt": "An ancient Buddhist temple bell hanging in silence amid misty green mountains, soft sage and emerald watercolor washes suggesting bamboo groves fading into white fog, a single fallen golden leaf on a stone path below, spiritual absence and devotional longing, muted green ivory and pearl tones, deep atmospheric perspective dissolving into emptiness"
    },
    {
        "id": "A04", "author": "이상화", "title": "이상화시선집",
        "epub": "이상화_시선집.epub",
        "prompt": "A vast golden wheat field stretching to the horizon under a dramatic amber sunset sky, bold warm watercolor washes of gold ochre and burnt sienna, a solitary figure standing small against the immense field, wind bending the stalks in sweeping brushstrokes, passionate resistance and defiant beauty, rich warm earth tones bleeding into pale sky"
    },
    {
        "id": "A05", "author": "이광수", "title": "논설수필선집",
        "epub": "이광수_논설수필선집.epub",
        "prompt": "An open traditional Korean book with flowing ink brushstrokes visible on aged paper, a scholar's desk with a stone inkwell and bamboo brush holder, warm brown and sepia watercolor tones, morning light in soft golden wash from a paper window, intellectual contemplation and reform, classical scholarly still life with generous white space"
    },

    # ── 수필/선언서 ──────────────────────────────────────
    {
        "id": "A06", "author": "방정환", "title": "방정환선집",
        "epub": "방정환_선집.epub",
        "prompt": "Joyful young friends playing in a sunlit spring garden, soft watercolor splashes of sky blue sunny yellow and fresh green, colorful paper pinwheels spinning in a gentle breeze, wildflowers and butterflies scattered in the grass, warmth and innocence, bright cheerful palette with clean white space, whimsical gentle illustration"
    },
    {
        "id": "A07", "author": "손병희 외", "title": "독립선언서모음",
        "epub": "독립선언서_모음.epub",
        "prompt": "A single bold brushstroke of deep crimson red rising vertically on white paper like a pillar of flame, faint traditional Korean calligraphy characters ghosted in pale grey wash behind, a scattering of ink dots like seeds in the wind, solemn determination and historic gravity, dramatic red ink and pale grey on vast white, powerful minimal composition"
    },

    # ── 고전소설 ──────────────────────────────────────────
    {
        "id": "A08", "author": "작자 미상", "title": "심청전",
        "epub": "심청전.epub",
        "prompt": "A young woman in flowing white hanbok standing at the edge of a turbulent indigo sea, dramatic watercolor waves in deep blue and teal swirling around her feet, lotus blossoms floating on the water surface in soft pink, a vast pale sky above with a single crane flying, sacrifice devotion and miraculous beauty, rich blue-teal and white with touches of pink"
    },
]


def generate_image(prompt, negative_prompt=NEGATIVE_PROMPT):
    full_prompt = prompt + STYLE_SUFFIX
    payload = {
        "prompt": full_prompt,
        "negative_prompt": negative_prompt,
        "modelId": MODEL_ID,
        "width": 600,
        "height": 896,
        "num_images": 1,
        "alchemy": False,
        "ultra": False,
    }
    resp = requests.post(f"{BASE_URL}/generations", headers=HEADERS, json=payload)
    if resp.status_code != 200:
        print(f"    ❌ 생성 요청 실패: {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    return data.get("sdGenerationJob", {}).get("generationId")


def wait_for_generation(generation_id, max_wait=180, interval=5):
    url = f"{BASE_URL}/generations/{generation_id}"
    elapsed = 0
    while elapsed < max_wait:
        time.sleep(interval)
        elapsed += interval
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200:
            continue
        data = resp.json()
        gen = data.get("generations_by_pk", {})
        status = gen.get("status", "PENDING")
        if status == "COMPLETE":
            images = gen.get("generated_images", [])
            return images[0].get("url") if images else None
        elif status == "FAILED":
            print(f"    ❌ 생성 실패")
            return None
        else:
            print(f"    ⏳ 대기 중... ({elapsed}초)", end="\r")
    print(f"    ❌ 타임아웃 ({max_wait}초)")
    return None


def download_image(url, filepath):
    resp = requests.get(url)
    if resp.status_code == 200:
        with open(filepath, "wb") as f:
            f.write(resp.content)
        return True
    return False


def main():
    if API_KEY == "여기에_API_키_입력":
        print("⚠️  API 키를 입력하세요!")
        sys.exit(1)

    output_dir = "covers_additional"
    os.makedirs(output_dir, exist_ok=True)

    log_file = os.path.join(output_dir, "generation_log.json")
    completed = {}
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            completed = json.load(f)
        print(f"📂 이전 진행 상황 로드: {len(completed)}권 완료\n")

    print("╔══════════════════════════════════════════════════════╗")
    print("║  추가 8권 표지 — 수채화 스타일 (Leonardo AI)        ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    success = len(completed)
    fail = 0

    for book in BOOKS:
        bid = book["id"]
        author = book["author"]
        title = book["title"]
        filename = f"{bid}_{title}.png"
        filepath = os.path.join(output_dir, filename)

        if bid in completed:
            print(f"  ✅ {bid} {author} - {title} (이미 완료, 스킵)")
            continue

        print(f"\n{'─'*55}")
        print(f"  {bid} {author} - {title}")
        print(f"{'─'*55}")

        print(f"  📤 생성 요청 중...")
        gen_id = generate_image(book["prompt"])
        if not gen_id:
            fail += 1
            time.sleep(3)
            continue

        print(f"  ⏳ 생성 대기 중...")
        image_url = wait_for_generation(gen_id)
        if not image_url:
            fail += 1
            time.sleep(3)
            continue

        print(f"  📥 다운로드 중...")
        if download_image(image_url, filepath):
            success += 1
            completed[bid] = {
                "author": author,
                "title": title,
                "epub": book["epub"],
                "file": filename,
                "url": image_url,
            }
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(completed, f, ensure_ascii=False, indent=2)
            print(f"  ✅ 저장: {output_dir}/{filename}")
        else:
            fail += 1

        time.sleep(3)

    print(f"\n{'═'*55}")
    print(f"  완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: {output_dir}/")
    print(f"{'═'*55}")
    print(f"\n  👉 다음 단계: python add_text_to_covers_additional.py")


if __name__ == "__main__":
    main()
