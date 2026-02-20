#!/usr/bin/env python3
"""
한국 고전문학 38권 표지 자동 생성 — Leonardo.ai API
v2: 수채화 스타일 프롬프트

사용법:
  1. API_KEY 입력
  2. python generate_covers_v2.py
  3. covers/작가명/ 폴더에 PNG 저장
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

# 공통 스타일 접미사 — 모든 프롬프트 뒤에 자동 추가
STYLE_SUFFIX = (
    ", delicate watercolor illustration on textured paper, soft bleeding edges, "
    "gentle color washes with visible water stains, muted and warm palette, "
    "generous white negative space, contemplative and poetic atmosphere, "
    "fine art book cover, vertical 2:3 composition"
)

BOOKS = [
    # ── 현진건 ──────────────────────────────────────────
    {
        "id": "01", "author": "현진건", "title": "운수 좋은 날",
        "prompt": "An old rickshaw resting alone in a rain-soaked narrow alley, soft watercolor rain streaks in grey and indigo, warm amber glow bleeding from a distant paper lantern, puddles with faint reflections, sorrowful quiet mood, muted blue-grey and sepia tones with touches of warm orange"
    },
    {
        "id": "02", "author": "현진건", "title": "빈처",
        "prompt": "A single small oil lamp flame glowing in soft orange watercolor wash, surrounded by vast empty white space, faint suggestion of a cold dark room in pale grey washes at the edges, loneliness and fragile warmth, minimal composition, sepia and soft amber on white"
    },
    {
        "id": "03", "author": "현진건", "title": "술 권하는 사회",
        "prompt": "A ceramic rice wine cup and a tilted bottle painted in loose watercolor on white, spilled drops rendered as soft grey-purple stains bleeding into the paper, a faint rain-streaked window wash in the background, quiet despair and isolation, cool grey and warm amber still life"
    },
    {
        "id": "04", "author": "현진건", "title": "B사감과 러브레터",
        "prompt": "A folded paper letter with a thin red thread, surrounded by a few scattered cherry blossom petals, soft pink watercolor washes bleeding gently into white paper, a small ink bottle nearby, tender youthful secrecy, mostly white space with delicate pink rose and pale grey accents"
    },
    {
        "id": "05", "author": "현진건", "title": "고향",
        "prompt": "Distant bare winter mountains in pale grey-brown watercolor washes, empty rice paddies fading into white mist, a single bare tree branch in the foreground, a tiny bird silhouette in the vast pale sky, deep nostalgia and loss, cold muted earth tones dissolving into white"
    },

    # ── 김유정 ──────────────────────────────────────────
    {
        "id": "06", "author": "김유정", "title": "봄봄",
        "prompt": "A lively spring hillside with playful splashes of yellow pink and green watercolor wildflowers, a straw hat tumbling in the wind, energetic loose brushstrokes suggesting movement and humor, bright warm spring palette on white paper, joyful mischievous atmosphere"
    },
    {
        "id": "07", "author": "김유정", "title": "동백꽃",
        "prompt": "Bold red camellia blossoms in expressive watercolor, three blooms on dark branches with deep green leaves, one petal falling softly, rich crimson bleeding into white paper, romantic warmth, classic Korean botanical watercolor with generous white space"
    },
    {
        "id": "08", "author": "김유정", "title": "금 따는 콩밭",
        "prompt": "A moonlit bean field in soft indigo and silver watercolor washes, luminous full moon as a pale circle at the top, delicate vine tendrils in lighter strokes, mysterious quiet night atmosphere, deep blue-violet and soft silver on white, rural nocturnal stillness"
    },
    {
        "id": "09", "author": "김유정", "title": "만무방",
        "prompt": "Two rough straw sandals abandoned on cracked dry earth, painted in earthy brown and ochre watercolor, dramatic dark storm clouds gathering above in grey-purple washes, tension between earth and sky, gritty rural poverty, harsh warm browns against cold grey sky"
    },
    {
        "id": "10", "author": "김유정", "title": "산골 나그네",
        "prompt": "A winding mountain path disappearing into autumn fog, painted in warm orange crimson and gold watercolor washes, layered mountain ridges fading into pale mist, a tiny solitary figure with a walking stick on the path, contemplative solitude, rich autumn palette dissolving into white"
    },

    # ── 이상 ──────────────────────────────────────────
    {
        "id": "11", "author": "이상", "title": "봉별기",
        "prompt": "Abstract fragmented urban shapes in dark watercolor, angular broken lines suggesting narrow alleyways, a single red watercolor stain like a wound amid grey and black geometric washes, psychological unease and alienation, avant-garde composition, mostly dark with sharp white gaps between shapes"
    },
    {
        "id": "12", "author": "이상", "title": "종생기",
        "prompt": "A cracked mirror shape rendered in fractured watercolor washes, shattered into angular pieces of grey indigo and blood-red, each fragment reflecting a different shade, existential fragmentation, abstract expressionist watercolor, dark tones breaking apart against white paper"
    },

    # ── 윤동주 ──────────────────────────────────────────
    {
        "id": "13", "author": "윤동주", "title": "서시",
        "prompt": "A vast night sky in deep navy watercolor wash with tiny white stars left as unpainted paper dots, a single narrow winding path in pale grey below, gentle wind suggested by soft curved wash strokes through grass, serene purity and quiet determination, deep blue fading into white at the bottom"
    },
    {
        "id": "14", "author": "윤동주", "title": "별 헤는 밤",
        "prompt": "Countless soft golden star dots scattered across a deep indigo watercolor sky, a grassy hilltop silhouette at the bottom in dark green-brown wash, one small seated figure gazing upward, peaceful melancholy and longing for home, warm gold stars on cool blue, dreamy gentle atmosphere"
    },
    {
        "id": "15", "author": "윤동주", "title": "자화상",
        "prompt": "A circular stone well viewed from above, the water surface rendered in soft blue-green watercolor ripples, a blurred ghostly face reflected in the water, moss suggested by pale green stains on grey stones, introspection and quiet sorrow, cool blue-green tones with extensive white space around the well"
    },

    # ── 김소월 ──────────────────────────────────────────
    {
        "id": "16", "author": "김소월", "title": "진달래꽃",
        "prompt": "Scattered pink and magenta azalea petals drifting across white paper, soft watercolor petal shapes with bleeding edges, a faint mountain path suggested in pale grey wash behind, bittersweet farewell beauty, soft pink lavender and sage green, petals becoming more sparse toward the edges, tender sorrow"
    },
    {
        "id": "17", "author": "김소월", "title": "산유화",
        "prompt": "A few delicate wild mountain flowers blooming alone on a pale hillside, minimal soft watercolor in pink white and fresh green, vast white empty space surrounding the small cluster of flowers, profound peaceful solitude, quiet beauty unobserved, zen-like minimalism"
    },
    {
        "id": "18", "author": "김소월", "title": "초혼",
        "prompt": "A windswept hillside at twilight with dramatic purple and orange watercolor sky washes, a small figure in white standing at the edge calling out, hair and clothes suggested by wild brushstrokes blown sideways, raw grief and desperate longing, expressive emotional watercolor, vivid sky against pale earth"
    },

    # ── 한용운 ──────────────────────────────────────────
    {
        "id": "19", "author": "한용운", "title": "님의 침묵",
        "prompt": "An empty winding path through soft sage-green watercolor bamboo groves, the path fading into white mist and silence, a single fallen leaf in warm brown on the pale stone path, spiritual absence and longing, muted green ivory and pearl tones, deep perspective dissolving into white emptiness"
    },

    # ── 이효석 ──────────────────────────────────────────
    {
        "id": "20", "author": "이효석", "title": "메밀꽃 필 무렵",
        "prompt": "A vast field of tiny white buckwheat flowers rendered as soft white watercolor dots and dashes against a deep midnight blue wash sky, a luminous pale full moon glowing at the top, a faint winding path through the flowers, magical lyrical moonlit beauty, silver-white and deep blue, dreamlike serenity"
    },
    {
        "id": "21", "author": "이효석", "title": "돈",
        "prompt": "A crumpled paper banknote painted in detailed grey and yellow-green watercolor, lying alone on rough wood grain texture in brown wash, harsh shadow beneath suggesting a single overhead light, moral weight of a small object, somber grey-green and brown, tight close-up still life"
    },
    {
        "id": "22", "author": "이효석", "title": "산",
        "prompt": "Layered Korean mountain ridges receding into pale mist, each ridge a softer lighter wash of blue-green watercolor, ancient pine trees on the nearest ridge in darker strokes, a tiny figure ascending a trail, majestic quiet power of nature, traditional Korean landscape watercolor palette of green grey and white mist"
    },

    # ── 나도향 ──────────────────────────────────────────
    {
        "id": "23", "author": "나도향", "title": "벙어리 삼룡이",
        "prompt": "A distant house engulfed in orange-red watercolor flames against a dark night sky wash, in the foreground a single pair of clenched hands rendered in pale grey, the fire reflected as warm stains on the hands, unspoken tragic devotion, dramatic contrast of warm fire and cold blue-grey night"
    },
    {
        "id": "24", "author": "나도향", "title": "뽕",
        "prompt": "Lush mulberry branches heavy with ripe purple-black berries in rich watercolor, dark green leaves with dappled golden sunlight spots bleeding through, sensual abundance and hidden desire, deep verdant palette with touches of gold and purple, botanical watercolor with mysterious shadows"
    },

    # ── 김동인 ──────────────────────────────────────────
    {
        "id": "25", "author": "김동인", "title": "배따라기",
        "prompt": "A small traditional Korean wooden boat on turbulent dark ocean waves, rendered in expressive indigo and grey watercolor, a dramatic orange-red sunset bleeding across the sky, the boat tiny against vast water, deep sorrow and fate carried by the sea, bold wet-on-wet watercolor technique"
    },
    {
        "id": "26", "author": "김동인", "title": "광염소나타",
        "prompt": "Abstract piano keys dissolving into wild red and orange watercolor flames, musical notes scattering like sparks, the boundary between music and fire blurring in wet washes, artistic obsession and destruction, intense crimson and black watercolor with chaotic energy against white"
    },
    {
        "id": "27", "author": "김동인", "title": "발가락이 닮았다",
        "prompt": "Two small pairs of footprints side by side on a warm wooden floor, rendered in soft brown watercolor, subtle similarity between them, gentle afternoon light suggested by pale gold wash from one side, quiet domestic intimacy hiding a secret, warm amber and honey tones, simple still life"
    },

    # ── 채만식 ──────────────────────────────────────────
    {
        "id": "28", "author": "채만식", "title": "레디메이드 인생",
        "prompt": "A crumpled Western-style hat and scattered newspaper pages on an empty park bench, painted in sepia and ash grey watercolor, bare tree branches above in pale washes, urban intellectual defeat and ironic hopelessness, desaturated muted tones, lonely still life composition"
    },
    {
        "id": "29", "author": "채만식", "title": "치숙",
        "prompt": "A traditional Korean theatrical mask split in half, one side painted in warm gold watercolor with a gentle smile, the other in cold blue-grey with a bitter grimace, social hypocrisy visualized, bold split composition on white, sharp satirical contrast between warmth and coldness"
    },
    {
        "id": "30", "author": "채만식", "title": "탁류",
        "prompt": "Powerful muddy brown river water rushing diagonally across the paper in bold wet watercolor, swirling currents carrying debris, dark teal and murky brown merging in turbulent washes, a small wilted flower caught in the current, fate and corruption as unstoppable current, dynamic flowing composition"
    },
    {
        "id": "31", "author": "채만식", "title": "태평천하",
        "prompt": "An ornate traditional Korean silk cushion and a fine porcelain tea set painted in rich gold and crimson watercolor, surrounded by faint grey watercolor vignettes of suffering figures at the edges almost invisible, grotesque oblivious luxury, ironic contrast between vivid center and ghostly grey margins"
    },

    # ── 최서해 ──────────────────────────────────────────
    {
        "id": "32", "author": "최서해", "title": "탈출기",
        "prompt": "Faint silhouettes of a family trudging through a white blizzard, rendered as barely visible grey-blue watercolor shapes dissolving into vast white paper, harsh diagonal snow streaks, freezing wind and desperate survival, cold blue-white and charcoal, figures almost lost in the storm"
    },
    {
        "id": "33", "author": "최서해", "title": "홍염",
        "prompt": "A massive consuming fire rendered in bold crimson orange and scarlet watercolor, flames rising and spreading upward across the paper, sparks as scattered red dots against black smoke wash, revolutionary rage and destruction, intense red palette dominating white paper, raw powerful energy"
    },

    # ── 이육사 ──────────────────────────────────────────
    {
        "id": "34", "author": "이육사", "title": "광야",
        "prompt": "A vast empty frozen plain stretching to the horizon in pale icy blue-white watercolor wash, a single tiny dark figure standing resolute in the lower third, immense white sky above, a thin warm golden-pink line of dawn at the far horizon, indomitable hope amid desolation, stark minimal composition"
    },
    {
        "id": "35", "author": "이육사", "title": "절정",
        "prompt": "A single sharp mountain peak rendered in steel-grey watercolor rising dramatically upward, fierce blizzard suggested by white streaks and spattered droplets, a tiny figure at the summit, one small red accent like a scarf against all the grey and white, defiant unyielding spirit, bold vertical composition"
    },
    {
        "id": "36", "author": "이육사", "title": "청포도",
        "prompt": "A cluster of translucent green grapes on the vine, painted in luminous emerald and jade watercolor with sunlight glowing through them, a bright azure sky wash above, a faint winding road in pale ochre below, joyful hope and anticipation, fresh green and blue palette, sunlit warmth"
    },

    # ── 김내성 ──────────────────────────────────────────
    {
        "id": "37", "author": "김내성", "title": "마인",
        "prompt": "A magnifying glass hovering over a mysterious handwritten letter, rendered in sepia and dark brown watercolor, venetian blind shadow stripes in grey wash across the scene, a single amber light stain suggesting a desk lamp, suspense and secrecy, noir atmosphere in watercolor, warm amber and cool grey"
    },

    # ── 안국선 ──────────────────────────────────────────
    {
        "id": "38", "author": "안국선", "title": "금수회의록",
        "prompt": "Whimsical watercolor animals in traditional Korean clothing gathered in assembly, a dignified tiger at center with a fox crane and bear around a table, Korean minhwa folk art style with soft watercolor rendering, satirical yet charming, warm earthy reds blues and golds on white, playful political allegory"
    },
]


def generate_image(prompt, negative_prompt=NEGATIVE_PROMPT):
    """이미지 생성 요청"""
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
    resp = requests.post(
        f"{BASE_URL}/generations",
        headers=HEADERS,
        json=payload,
    )
    if resp.status_code != 200:
        print(f"    ❌ 생성 요청 실패: {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    gen_id = data.get("sdGenerationJob", {}).get("generationId")
    return gen_id


def wait_for_generation(generation_id, max_wait=180, interval=5):
    """생성 완료 대기 → 이미지 URL 반환"""
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
            if images:
                return images[0].get("url")
            return None
        elif status == "FAILED":
            print(f"    ❌ 생성 실패")
            return None
        else:
            print(f"    ⏳ 대기 중... ({elapsed}초)", end="\r")
    print(f"    ❌ 타임아웃 ({max_wait}초)")
    return None


def download_image(url, filepath):
    """이미지 다운로드"""
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

    os.makedirs("covers", exist_ok=True)

    # 작가별 폴더 생성
    authors = set(book["author"] for book in BOOKS)
    for author in authors:
        os.makedirs(os.path.join("covers", author), exist_ok=True)

    # 진행 상황 로드 (이어하기 지원)
    log_file = "covers/generation_log.json"
    completed = {}
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            completed = json.load(f)
        print(f"📂 이전 진행 상황 로드: {len(completed)}권 완료\n")

    print("╔══════════════════════════════════════════════════════╗")
    print("║  한국 고전문학 38권 표지 — 수채화 스타일 (v2)       ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    success = len(completed)
    fail = 0

    for book in BOOKS:
        bid = book["id"]
        author = book["author"]
        title = book["title"]
        filename = f"{bid}_{title}.png".replace(" ", "_")
        filepath = os.path.join("covers", author, filename)

        if bid in completed:
            print(f"  ✅ #{bid} {author} - {title} (이미 완료, 스킵)")
            continue

        print(f"\n{'─'*55}")
        print(f"  #{bid} {author} - {title}")
        print(f"{'─'*55}")

        # 1. 생성 요청
        print(f"  📤 생성 요청 중...")
        gen_id = generate_image(book["prompt"])
        if not gen_id:
            fail += 1
            time.sleep(3)
            continue

        # 2. 완료 대기
        print(f"  ⏳ 생성 대기 중...")
        image_url = wait_for_generation(gen_id)
        if not image_url:
            fail += 1
            time.sleep(3)
            continue

        # 3. 다운로드
        print(f"  📥 다운로드 중...")
        if download_image(image_url, filepath):
            success += 1
            completed[bid] = {
                "author": author,
                "title": title,
                "file": f"{author}/{filename}",
                "url": image_url,
            }
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(completed, f, ensure_ascii=False, indent=2)
            print(f"  ✅ 저장: covers/{author}/{filename}")
        else:
            fail += 1

        time.sleep(3)

    print(f"\n{'═'*55}")
    print(f"  완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: covers/")
    print(f"{'═'*55}")


if __name__ == "__main__":
    main()
