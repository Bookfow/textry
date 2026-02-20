#!/usr/bin/env python3
"""
한국 고전문학 38권 표지 자동 생성 — Leonardo.ai API
사용법:
  1. Leonardo.ai 가입 → 좌측 메뉴 API Access → Create New Key
  2. 아래 API_KEY에 발급받은 키 입력
  3. python generate_covers.py
  4. covers/ 폴더에 38장 PNG 저장됨
"""

import requests
import time
import os
import json
import sys

# ═══════════════════════════════════════════════════════
# 여기에 Leonardo.ai API 키를 넣으세요
API_KEY = "4e775ec5-8394-4100-b2b2-63370d3cf921"
# ═══════════════════════════════════════════════════════

BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"
HEADERS = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": f"Bearer {API_KEY}",
}

# Leonardo Phoenix 모델 ID
MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"

# 공통 네거티브 프롬프트
NEGATIVE_PROMPT = (
    "text, title, words, letters, watermark, logo, signature, blurry, "
    "low quality, deformed hands, extra fingers, duplicate, cropped, "
    "out of frame, bad anatomy, disfigured, poorly drawn face, "
    "mutation, mutated, ugly, bad proportions"
)

# ═══════════════════════════════════════════════════════
# 38권 프롬프트
# ═══════════════════════════════════════════════════════
BOOKS = [
    {
        "id": "01", "author": "현진건", "title": "운수 좋은 날",
        "prompt": "A rickshaw puller running desperately through heavy rain on a gloomy 1920s Korean colonial street, dark grey overcast sky, wet cobblestones reflecting dim paper lantern light, traditional Korean tile-roof houses lining the narrow alley, melancholic atmosphere, painterly illustration style, muted palette of deep blues greys and amber highlights, cinematic composition, wide shot, dramatic lighting"
    },
    {
        "id": "02", "author": "현진건", "title": "빈처",
        "prompt": "A dimly lit small Korean room in the 1920s, a lonely woman in white hanbok sitting by a fading oil lamp, worn wooden floor, peeling wallpaper, poverty and quiet solitude, single warm light source contrasting cold blue shadows, emotional painterly illustration, intimate close-up composition, melancholic mood"
    },
    {
        "id": "03", "author": "현진건", "title": "술 권하는 사회",
        "prompt": "A 1920s Korean intellectual in dark clothes sitting alone at a traditional wooden tavern table, a bottle of rice wine and a small cup before him, blurred city lantern lights through a rain-streaked window, sense of despair and isolation, dark atmospheric illustration, film noir mood with warm amber and cold indigo tones, medium shot, dramatic chiaroscuro lighting"
    },
    {
        "id": "04", "author": "현진건", "title": "B사감과 러브레터",
        "prompt": "A sealed handwritten love letter on an old wooden desk in a 1920s Korean girls school dormitory, soft morning light streaming through a window, cherry blossom petals drifting in, ink bottle and fountain pen beside the letter, nostalgic bittersweet mood, soft pink cream and ivory palette, delicate watercolor illustration style, close-up composition, romantic atmosphere"
    },
    {
        "id": "05", "author": "현진건", "title": "고향",
        "prompt": "View through a rain-dotted train window of a desolate Korean countryside in winter, barren rice fields and distant snow-capped mountains, a faint melancholic reflection of a traveler in the glass, muted earth tones of brown ochre and grey, nostalgic and sorrowful mood, painterly illustration, cinematic wide composition, soft diffused winter light"
    },
    {
        "id": "06", "author": "김유정", "title": "봄봄",
        "prompt": "A vibrant Korean countryside scene in full spring bloom, a young farmer in traditional white clothes chasing someone through wildflower meadows, bright greens yellows and pinks everywhere, thatched-roof farmhouse in background, humorous lively energy, Korean folk art inspired illustration style, warm sunlight, wide shot with rolling hills, cheerful pastoral atmosphere"
    },
    {
        "id": "07", "author": "김유정", "title": "동백꽃",
        "prompt": "Vivid red camellia flowers blooming on a hillside in rural Korea, two shy young villagers having a chance encounter among the flowers, soft golden sunlight filtering through trees, warm romantic atmosphere with rustic folk charm, lush botanical details, rich crimson green and gold palette, painterly illustration style, medium shot, dreamy soft focus background"
    },
    {
        "id": "08", "author": "김유정", "title": "금 따는 콩밭",
        "prompt": "A moonlit Korean bean field at night, a figure secretly working the soil under silver moonlight, mysterious and slightly mischievous atmosphere, deep indigo night sky with luminous full moon, rows of bean plants casting long shadows, rural folk tale mood, illustration style with rich night blues and warm gold moonlight accents, wide shot, quiet tension"
    },
    {
        "id": "09", "author": "김유정", "title": "만무방",
        "prompt": "Two rough weathered Korean rural men in 1930s peasant clothing standing tensely on a dusty village path, dramatic storm clouds gathering overhead, dry cracked earth, earthy brown and ochre tones, gritty realism mixed with dark humor, strong character expressions, painterly illustration with bold brushwork, medium shot, harsh directional sunlight"
    },
    {
        "id": "10", "author": "김유정", "title": "산골 나그네",
        "prompt": "A lone traveler with a walking stick on a narrow winding mountain path in rural Korea, brilliant autumn foliage in orange crimson and gold, misty mountain peaks in background, solitary contemplative mood, traditional Korean landscape painting aesthetic, rich warm autumn palette, wide establishing shot, soft atmospheric perspective with layers of mountain ridges"
    },
    {
        "id": "11", "author": "이상", "title": "봉별기",
        "prompt": "A surreal distorted 1930s Seoul narrow alleyway at night, warped perspective and angular shadows, a solitary mans dark silhouette against dim neon signs, expressionist style with geometric fragmentation, psychological tension and urban alienation, dark palette with sudden splashes of crimson red, avant-garde illustration, Dutch angle composition, unsettling atmosphere"
    },
    {
        "id": "12", "author": "이상", "title": "종생기",
        "prompt": "Abstract expressionist illustration of a fractured mirror reflecting a tormented male face in fragments, 1930s Korean modernist aesthetic, geometric shapes cracking and splitting apart, existential dread and self-destruction, monochrome base with deep indigo and blood-red accents, surrealist composition, close-up, sharp angular lines contrasting with soft dissolving edges"
    },
    {
        "id": "13", "author": "윤동주", "title": "서시",
        "prompt": "A solitary young man in a dark coat standing in an open field looking up at a vast starry night sky, gentle wind blowing through tall grass, a single winding dirt path stretching ahead, serene contemplative purity, deep navy blue sky filled with countless luminous stars, poetic and introspective mood, soft watercolor illustration style, wide shot, ethereal gentle lighting"
    },
    {
        "id": "14", "author": "윤동주", "title": "별 헤는 밤",
        "prompt": "A young man sitting alone on a grassy hilltop counting stars on a clear autumn night, distant mountain silhouettes against the starlit sky, warm golden starlight scattered across deep indigo heavens, nostalgic longing for home and childhood, dreamy poetic atmosphere, delicate watercolor and ink illustration style, wide composition, soft glowing star clusters, peaceful melancholy"
    },
    {
        "id": "15", "author": "윤동주", "title": "자화상",
        "prompt": "A young mans reflection distorted in an old moss-covered stone well, rippling water creating dreamlike warping of the face, looking down into the well from above, deep introspection and quiet self-questioning, cool blue-green tones with gentle ambient light from above, poetic self-portrait concept, watercolor illustration style, overhead close-up composition, meditative stillness"
    },
    {
        "id": "16", "author": "김소월", "title": "진달래꽃",
        "prompt": "A mountain path covered with scattered pink and magenta azalea petals, a lone figure walking away into the misty distance, Korean spring mountains with blooming azalea bushes on both sides, bittersweet farewell atmosphere, soft pink lavender and sage green palette, delicate East Asian ink wash painting style with soft watercolor washes, wide shot, tender sorrowful beauty"
    },
    {
        "id": "17", "author": "김소월", "title": "산유화",
        "prompt": "Wild mountain flowers blooming alone on a quiet Korean mountainside, no human presence, peaceful profound solitude, soft morning mist and gentle sunlight, pastel palette of pinks whites and fresh greens, meditative tranquility, minimalist East Asian botanical illustration style, wide contemplative composition, negative space used expressively, zen-like stillness"
    },
    {
        "id": "18", "author": "김소월", "title": "초혼",
        "prompt": "A woman in white hanbok standing on a windswept Korean hillside at twilight calling out into the void, her hair and clothes blown by strong wind, dramatic sky in deep purple orange and crimson, desperate longing and raw grief, ethereal haunting mood, expressive brushwork illustration style, wide shot, dynamic wind movement, powerful emotional atmosphere"
    },
    {
        "id": "19", "author": "한용운", "title": "님의 침묵",
        "prompt": "An empty winding path through a misty Korean bamboo forest, profound silence and absence, a single fallen leaf resting on the stone path, spiritual longing for an absent beloved, muted sage green ivory and pearl white tones, zen-like minimalism, contemplative East Asian ink wash style illustration, deep perspective composition, soft diffused light filtering through bamboo"
    },
    {
        "id": "20", "author": "이효석", "title": "메밀꽃 필 무렵",
        "prompt": "A vast buckwheat flower field glowing white under brilliant full moonlight in Korean countryside, thousands of tiny white flowers stretching to mountain horizon, a narrow winding path through the field with two distant travelers, romantic lyrical atmosphere, luminous silver-white and deep midnight blue palette, magical moonlit illustration, wide cinematic composition, ethereal beauty"
    },
    {
        "id": "21", "author": "이효석", "title": "돈",
        "prompt": "A crumpled paper banknote lying on a worn scratched wooden table in a dim bare Korean room in the 1930s, harsh single overhead light bulb casting stark shadows, moral conflict and human desperation, strong contrast between bright center and dark edges, gritty social realism illustration, close-up dramatic composition, somber grey and sickly yellow-green tones"
    },
    {
        "id": "22", "author": "이효석", "title": "산",
        "prompt": "Majestic Korean mountain peaks rising through morning mist, ancient pine trees clinging to rocky ridges, a small solitary figure hiking upward on a mountain trail, peaceful yet powerful untamed nature, traditional Korean sansuhwa landscape painting aesthetic, deep forest green and misty grey palette with ink wash textures, wide panoramic composition, atmospheric perspective"
    },
    {
        "id": "23", "author": "나도향", "title": "벙어리 삼룡이",
        "prompt": "A mute young man standing alone in a moonlit Korean village courtyard at night, his face expressing deep unspoken emotion, a distant house engulfed in orange flames against the dark sky, tragic one-sided devotion, dramatic contrast between warm firelight and cold blue moonlight, emotional painterly illustration, medium shot, powerful visual tension between two light sources"
    },
    {
        "id": "24", "author": "나도향", "title": "뽕",
        "prompt": "A dense Korean mulberry field in high summer, lush dark green leaves with clusters of ripe purple-black berries, dappled sunlight filtering through the canopy creating mysterious shadows, a hidden sensual encounter suggested by two silhouettes among the trees, forbidden atmosphere, rich verdant palette with deep shadows and golden light spots, naturalistic illustration, medium shot"
    },
    {
        "id": "25", "author": "김동인", "title": "배따라기",
        "prompt": "A traditional Korean wooden fishing boat on turbulent dark ocean waves at sunset, a mournful boatmans song echoing across the water, dramatic orange and deep navy sky with towering clouds, Korean folk tale atmosphere saturated with deep sorrow and fate, expressive maritime illustration with bold brushwork, wide cinematic composition, powerful ocean swells"
    },
    {
        "id": "26", "author": "김동인", "title": "광염소나타",
        "prompt": "A possessed pianist playing furiously on a grand piano in a concert hall consumed by raging flames, music notes and fire swirling together in chaos, artistic obsession and self-destruction, intense crimson orange and black palette, expressionist dramatic illustration, dynamic diagonal composition, violent movement and energy, German Expressionism inspired, overwhelming passion"
    },
    {
        "id": "27", "author": "김동인", "title": "발가락이 닮았다",
        "prompt": "Two pairs of bare feet side by side on a warm wooden floor in a 1930s Korean traditional house, subtle uncanny resemblance between them, soft afternoon light from a paper door, intimate domestic scene concealing a hidden truth, warm amber and honey tones, psychological tension beneath outward calm, realistic illustration, overhead close-up composition, quiet unease"
    },
    {
        "id": "28", "author": "채만식", "title": "레디메이드 인생",
        "prompt": "A dejected 1930s Korean intellectual in a threadbare Western suit sitting on an empty park bench, crumpled newspapers scattered at his feet, grey Japanese colonial era buildings in background, urban despair and satirical hopelessness, sepia and ash grey tones with muted olive accents, social realism illustration, medium shot, overcast flat lighting, defeated posture"
    },
    {
        "id": "29", "author": "채만식", "title": "치숙",
        "prompt": "A split-face portrait of a Korean man in 1930s attire, one half showing a polite smile the other a bitter grimace, social hypocrisy and moral compromise, bold graphic split composition dividing the frame in two, one side warm gold light the other cold blue shadow, sharp satirical mood, stylized illustration with clean lines, close-up face portrait, striking visual contrast"
    },
    {
        "id": "30", "author": "채만식", "title": "탁류",
        "prompt": "Muddy turbulent brown river water rushing through a 1930s Korean port city, a lone womans silhouette standing at the riverbank against the powerful current, swirling debris and dark water, fate corruption and helplessness, murky brown grey and dark teal palette, powerful flowing composition with strong diagonal movement, dramatic illustration, wide shot, threatening atmosphere"
    },
    {
        "id": "31", "author": "채만식", "title": "태평천하",
        "prompt": "A rotund wealthy Korean landlord in fine traditional hanbok lounging comfortably on silk cushions, completely oblivious while scenes of chaos and suffering swirl around him like a vignette, 1930s colonial setting, satirical contrast between grotesque luxury and surrounding misery, rich gold crimson and deep burgundy tones, darkly humorous illustration, centered composition, ironic opulence"
    },
    {
        "id": "32", "author": "최서해", "title": "탈출기",
        "prompt": "A desperate poor Korean family trudging through a blinding Manchurian snowstorm at night, harsh freezing wind blowing snow horizontally, ragged clothes and exhausted postures, raw survival against extreme poverty, cold blue-white and charcoal palette with barely visible figures, expressionist illustration of human endurance, wide shot, brutal winter atmosphere"
    },
    {
        "id": "33", "author": "최서해", "title": "홍염",
        "prompt": "A massive consuming crimson fire engulfing a Korean landlords grand estate at night, a defiant figure silhouetted against the towering blaze, sparks and embers flying into the black sky, revolutionary fury and class rage, intense red orange and black palette, dramatic powerful illustration, low angle shot looking up at the flames, overwhelming destructive energy"
    },
    {
        "id": "34", "author": "이육사", "title": "광야",
        "prompt": "A vast endless frozen wilderness stretching to the horizon under a cold pale winter sky, a single resolute figure standing firm against the biting wind, indomitable spirit and fierce hope for the future, stark minimal composition with immense negative space, icy blue white and steel grey with a thin warm golden line of dawn on the far horizon, epic illustration, ultra-wide shot"
    },
    {
        "id": "35", "author": "이육사", "title": "절정",
        "prompt": "A lone figure standing defiantly on a razor-sharp mountain peak during a fierce blizzard, ultimate human resistance and unbreakable willpower, dramatic vertical composition emphasizing the towering peak, ice-white and steel-grey palette with a single bold red scarf as accent, heroic and defiant mood, powerful illustration, low angle looking up, extreme weather and unyielding spirit"
    },
    {
        "id": "36", "author": "이육사", "title": "청포도",
        "prompt": "A sunlit vineyard of plump green grapes ripening on the vine on a Korean hillside, a brilliant clear blue sky with white clouds, a traveler approaching from a winding road in the far distance, hope and joyful anticipation of a longed-for reunion, fresh green emerald and azure palette, luminous warm sunlight, pastoral illustration style, wide shot, bright optimistic atmosphere"
    },
    {
        "id": "37", "author": "김내성", "title": "마인",
        "prompt": "A shadowy 1930s Seoul detectives office, a magnifying glass hovering over a mysterious handwritten letter on a dark desk, venetian blind shadows casting dramatic stripes across the scene, classic film noir atmosphere with suspense and intrigue, high contrast black and white with warm amber accent light, mystery thriller illustration, close-up dramatic composition, tension and secrecy"
    },
    {
        "id": "38", "author": "안국선", "title": "금수회의록",
        "prompt": "An assembly of anthropomorphic animals in traditional Korean hanbok gathered in a formal debate hall, a majestic tiger as chairman at the podium, a fox a crane and a bear among the delegates, satirical political allegory, traditional Korean minhwa folk painting style with a modern twist, rich earthy reds blues and golds, whimsical yet sharp social commentary illustration, wide interior shot"
    },
]


def generate_image(prompt, negative_prompt=NEGATIVE_PROMPT):
    """이미지 생성 요청"""
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "modelId": MODEL_ID,
        "width": 600,
        "height": 896,  # 8로 나누어 떨어지는 2:3 비율
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


def wait_for_generation(generation_id, max_wait=120, interval=5):
    """생성 완료 대기 → 이미지 URL 반환"""
    url = f"{BASE_URL}/generations/{generation_id}"
    elapsed = 0
    while elapsed < max_wait:
        time.sleep(interval)
        elapsed += interval
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200:
            print(f"    ⏳ 조회 실패: {resp.status_code}")
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
        print("=" * 60)
        print("  ⚠️  API 키를 입력하세요!")
        print()
        print("  1. https://app.leonardo.ai 접속 → 로그인")
        print("  2. 좌측 메뉴 → API Access")
        print("  3. Create New Key → 키 복사")
        print("  4. 이 파일의 API_KEY 변수에 붙여넣기")
        print("=" * 60)
        sys.exit(1)

    os.makedirs("covers", exist_ok=True)

    # 작가별 폴더 미리 생성
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
    print("║  한국 고전문학 38권 표지 자동 생성 (Leonardo.ai)    ║")
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

        # 이미 완료된 건 스킵
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
            print(f"  ❌ 생성 요청 실패, 다음으로 넘어갑니다.")
            time.sleep(3)
            continue

        # 2. 완료 대기
        print(f"  ⏳ 생성 대기 중... (generation_id: {gen_id[:12]}...)")
        image_url = wait_for_generation(gen_id)
        if not image_url:
            fail += 1
            print(f"  ❌ 이미지 생성 실패")
            time.sleep(3)
            continue

        # 3. 다운로드
        print(f"  📥 다운로드 중...")
        if download_image(image_url, filepath):
            success += 1
            completed[bid] = {
                "author": author,
                "title": title,
                "file": filename,
                "url": image_url,
            }
            # 진행 상황 저장
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(completed, f, ensure_ascii=False, indent=2)
            print(f"  ✅ 저장 완료: {filepath}")
        else:
            fail += 1
            print(f"  ❌ 다운로드 실패")

        # API 레이트 리밋 방지
        time.sleep(3)

    print(f"\n{'═'*55}")
    print(f"  완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: covers/")
    print(f"{'═'*55}")


if __name__ == "__main__":
    main()
