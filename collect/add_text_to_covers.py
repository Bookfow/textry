#!/usr/bin/env python3
"""
표지 이미지에 제목 + 작가명 텍스트 오버레이 v3
- 수채화풍 손글씨/캘리그라피 무료 폰트 자동 다운로드
- 반투명 배경 박스로 가독성 확보
- 위치/폰트 랜덤

사용법:
  pip install Pillow requests
  python add_text_to_covers.py
"""

from PIL import Image, ImageDraw, ImageFont
import os
import random
import sys
import requests

# ═══════════════════════════════════════════════════════
# 1. 무료 캘리그라피/손글씨 폰트 자동 다운로드
# ═══════════════════════════════════════════════════════

FONT_DIR = "fonts_cache"

FONT_URLS = {
    "MaruBuri-Bold": "https://github.com/google/fonts/raw/main/ofl/maruburi/MaruBuri-Bold.ttf",
    "MaruBuri-Regular": "https://github.com/google/fonts/raw/main/ofl/maruburi/MaruBuri-Regular.ttf",
    "NanumMyeongjoBold": "https://github.com/google/fonts/raw/main/ofl/nanummyeongjo/NanumMyeongjo-Bold.ttf",
    "NanumMyeongjo": "https://github.com/google/fonts/raw/main/ofl/nanummyeongjo/NanumMyeongjo-Regular.ttf",
    "NanumPenScript": "https://github.com/google/fonts/raw/main/ofl/nanumpenscript/NanumPenScript-Regular.ttf",
    "NanumBrush": "https://github.com/google/fonts/raw/main/ofl/nanumbrushscript/NanumBrushScript-Regular.ttf",
    "GamjaFlower": "https://github.com/google/fonts/raw/main/ofl/gamjaflower/GamjaFlower-Regular.ttf",
    "Gaegu-Bold": "https://github.com/google/fonts/raw/main/ofl/gaegu/Gaegu-Bold.ttf",
    "SongMyung": "https://github.com/google/fonts/raw/main/ofl/songmyung/SongMyung-Regular.ttf",
}

# 제목용 (캘리/붓글씨/손글씨 — 눈에 띄는 것)
TITLE_FONT_KEYS = [
    "NanumPenScript",
    "NanumBrush",
    "GamjaFlower",
    "MaruBuri-Bold",
    "NanumMyeongjoBold",
]

# 작가명용 (깔끔하고 굵은 것)
AUTHOR_FONT_KEYS = [
    "MaruBuri-Bold",
    "NanumMyeongjoBold",
    "Gaegu-Bold",
    "SongMyung",
]


def download_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    downloaded = {}

    for name, url in FONT_URLS.items():
        ext = url.split(".")[-1]
        filepath = os.path.join(FONT_DIR, f"{name}.{ext}")
        if os.path.exists(filepath):
            downloaded[name] = filepath
            continue
        try:
            print(f"  📥 폰트 다운로드: {name}...", end=" ")
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(resp.content)
                downloaded[name] = filepath
                print("✅")
            else:
                print(f"❌ ({resp.status_code})")
        except Exception as e:
            print(f"❌ ({e})")

    if not downloaded:
        print("  ⚠️  폰트 다운로드 실패, 시스템 폰트 사용")
        for fb in ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf",
                    "C:/Windows/Fonts/batang.ttc", "C:/Windows/Fonts/gulim.ttc"]:
            if os.path.exists(fb):
                downloaded["system"] = fb
                break

    print(f"  📝 사용 가능한 폰트: {len(downloaded)}개\n")
    return downloaded


# ═══════════════════════════════════════════════════════
# 2. 이미지 밝기 분석
# ═══════════════════════════════════════════════════════

def get_region_brightness(img, x, y, w, h):
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(img.width, int(x + w)), min(img.height, int(y + h))
    if x2 <= x1 or y2 <= y1:
        return 200
    region = img.crop((x1, y1, x2, y2)).convert("L")
    pixels = list(region.getdata())
    return sum(pixels) / len(pixels) if pixels else 200


# ═══════════════════════════════════════════════════════
# 3. 텍스트 오버레이
# ═══════════════════════════════════════════════════════

def add_text_to_cover(img_path, output_path, title, author, font_dict):
    img = Image.open(img_path).convert("RGBA")
    W, H = img.size

    # ── 폰트 선택 ──
    title_candidates = [font_dict[k] for k in TITLE_FONT_KEYS if k in font_dict]
    author_candidates = [font_dict[k] for k in AUTHOR_FONT_KEYS if k in font_dict]
    if not title_candidates:
        title_candidates = list(font_dict.values())
    if not author_candidates:
        author_candidates = list(font_dict.values())

    title_font_path = random.choice(title_candidates)
    author_font_path = random.choice(author_candidates)

    # ── 제목 크기 ──
    if len(title) <= 2:
        title_size = random.randint(200, 240)
    elif len(title) <= 4:
        title_size = random.randint(150, 190)
    elif len(title) <= 7:
        title_size = random.randint(110, 140)
    else:
        title_size = random.randint(80, 110)

    author_size = random.randint(30, 38)

    try:
        title_font = ImageFont.truetype(title_font_path, title_size)
    except:
        title_font = ImageFont.truetype(title_font_path, title_size, index=0)
    try:
        author_font = ImageFont.truetype(author_font_path, author_size)
    except:
        author_font = ImageFont.truetype(author_font_path, author_size, index=0)

    # ── 텍스트 크기 측정 (제목이 이미지 넘으면 자동 축소) ──
    temp_draw = ImageDraw.Draw(img)
    max_title_width = W - 80  # 좌우 여백 40씩

    t_bbox = temp_draw.textbbox((0, 0), title, font=title_font)
    tw, th = t_bbox[2] - t_bbox[0], t_bbox[3] - t_bbox[1]

    # 제목이 너무 넓으면 폰트 크기 줄이기
    while tw > max_title_width and title_size > 40:
        title_size -= 5
        try:
            title_font = ImageFont.truetype(title_font_path, title_size)
        except:
            title_font = ImageFont.truetype(title_font_path, title_size, index=0)
        t_bbox = temp_draw.textbbox((0, 0), title, font=title_font)
        tw, th = t_bbox[2] - t_bbox[0], t_bbox[3] - t_bbox[1]

    a_bbox = temp_draw.textbbox((0, 0), author, font=author_font)
    aw, ah = a_bbox[2] - a_bbox[0], a_bbox[3] - a_bbox[1]

    # ── 레이아웃: 제목과 작가명을 반드시 분리 배치 ──
    margin = 40
    pad_x, pad_y = 25, 18

    # 이미지를 상/중/하 3등분해서 밝기(여백) 분석
    zones = {
        "top": get_region_brightness(img, 0, 0, W, H * 0.3),
        "mid": get_region_brightness(img, 0, H * 0.3, W, H * 0.4),
        "bot": get_region_brightness(img, 0, H * 0.65, W, H * 0.35),
    }
    # 밝을수록 여백일 가능성 높음 → 제목을 가장 밝은 곳에
    sorted_zones = sorted(zones.items(), key=lambda x: x[1], reverse=True)
    title_zone = sorted_zones[0][0]

    # 제목 위치 결정 (가장 밝은 영역)
    if title_zone == "top":
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = margin + random.randint(20, 60)
        # 작가명은 항상 하단
        ax = (W - aw) // 2 + random.randint(-15, 15)
        ay = H - ah - margin - random.randint(20, 50)
    elif title_zone == "bot":
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = H - th - margin - random.randint(40, 80)
        # 작가명은 항상 상단
        ax = (W - aw) // 2 + random.randint(-15, 15)
        ay = margin + random.randint(20, 50)
    else:
        # 중앙이 밝으면 → 제목 중앙, 작가명은 상단 또는 하단 랜덤
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = (H - th) // 2 + random.randint(-20, 20)
        if random.choice([True, False]):
            ax = (W - aw) // 2 + random.randint(-15, 15)
            ay = margin + random.randint(15, 40)
        else:
            ax = (W - aw) // 2 + random.randint(-15, 15)
            ay = H - ah - margin - random.randint(15, 40)

    # 범위 보정
    tx = max(10, min(tx, W - tw - 10))
    ty = max(10, min(ty, H - th - 10))
    ax = max(10, min(ax, W - aw - 10))
    ay = max(10, min(ay, H - ah - 10))

    # ── 색상 결정 (배경 밝기 기반) ──
    title_bright = get_region_brightness(img, tx - pad_x, ty - pad_y, tw + pad_x * 2, th + pad_y * 2)
    author_bright = get_region_brightness(img, ax - pad_x, ay - pad_y, aw + pad_x * 2, ah + pad_y * 2)

    if title_bright > 140:
        title_color = random.choice([(35, 30, 25), (50, 35, 25), (30, 30, 45)])
        title_box_color = (255, 255, 255, random.randint(120, 180))
    else:
        title_color = random.choice([(245, 240, 230), (255, 250, 240), (240, 235, 220)])
        title_box_color = (0, 0, 0, random.randint(100, 160))

    if author_bright > 140:
        author_color = random.choice([(50, 40, 35), (60, 45, 30), (40, 40, 55)])
        author_box_color = (255, 255, 255, random.randint(100, 160))
    else:
        author_color = random.choice([(235, 230, 220), (245, 240, 230), (230, 225, 215)])
        author_box_color = (0, 0, 0, random.randint(80, 140))

    # ── 오버레이 그리기 ──
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    box_style = random.choice(["rounded", "soft_band", "minimal_line"])

    if box_style == "rounded":
        bx1, by1 = tx - pad_x, ty - pad_y
        bx2, by2 = tx + tw + pad_x, ty + th + pad_y
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=12, fill=title_box_color)

        abx1, aby1 = ax - pad_x, ay - pad_y + 5
        abx2, aby2 = ax + aw + pad_x, ay + ah + pad_y - 5
        draw.rounded_rectangle([abx1, aby1, abx2, aby2], radius=8, fill=author_box_color)

    elif box_style == "soft_band":
        band_y1 = min(ty, ay) - pad_y - 15
        band_y2 = max(ty + th, ay + ah) + pad_y + 15
        for i in range(int(band_y2 - band_y1)):
            y = int(band_y1) + i
            dist = min(i, int(band_y2 - band_y1) - i)
            alpha = min(title_box_color[3], int(dist * 2.5))
            alpha = max(0, min(255, alpha))
            color = (*title_box_color[:3], alpha)
            if 0 <= y < H:
                draw.line([(0, y), (W, y)], fill=color)

    elif box_style == "minimal_line":
        line_color = (*title_color, 150)
        draw.line([(tx - 10, ty - 10), (tx + tw + 10, ty - 10)], fill=line_color, width=2)
        draw.line([(tx - 10, ty + th + 10), (tx + tw + 10, ty + th + 10)], fill=line_color, width=2)
        draw.line([(ax, ay + ah + 5), (ax + aw, ay + ah + 5)], fill=(*author_color, 120), width=1)

    # 텍스트
    draw.text((tx, ty), title, font=title_font, fill=title_color)
    draw.text((ax, ay), author, font=author_font, fill=author_color)

    # 합성
    result = Image.alpha_composite(img, overlay)
    result.convert("RGB").save(output_path, quality=95)


# ═══════════════════════════════════════════════════════
# 38권 목록
# ═══════════════════════════════════════════════════════
BOOKS = [
    ("01", "현진건", "운수 좋은 날"), ("02", "현진건", "빈처"),
    ("03", "현진건", "술 권하는 사회"), ("04", "현진건", "B사감과 러브레터"),
    ("05", "현진건", "고향"), ("06", "김유정", "봄봄"),
    ("07", "김유정", "동백꽃"), ("08", "김유정", "금 따는 콩밭"),
    ("09", "김유정", "만무방"), ("10", "김유정", "산골 나그네"),
    ("11", "이상", "봉별기"), ("12", "이상", "종생기"),
    ("13", "윤동주", "서시"), ("14", "윤동주", "별 헤는 밤"),
    ("15", "윤동주", "자화상"), ("16", "김소월", "진달래꽃"),
    ("17", "김소월", "산유화"), ("18", "김소월", "초혼"),
    ("19", "한용운", "님의 침묵"), ("20", "이효석", "메밀꽃 필 무렵"),
    ("21", "이효석", "돈"), ("22", "이효석", "산"),
    ("23", "나도향", "벙어리 삼룡이"), ("24", "나도향", "뽕"),
    ("25", "김동인", "배따라기"), ("26", "김동인", "광염소나타"),
    ("27", "김동인", "발가락이 닮았다"), ("28", "채만식", "레디메이드 인생"),
    ("29", "채만식", "치숙"), ("30", "채만식", "탁류"),
    ("31", "채만식", "태평천하"), ("32", "최서해", "탈출기"),
    ("33", "최서해", "홍염"), ("34", "이육사", "광야"),
    ("35", "이육사", "절정"), ("36", "이육사", "청포도"),
    ("37", "김내성", "마인"), ("38", "안국선", "금수회의록"),
]


def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║  38권 표지 텍스트 오버레이 v3                       ║")
    print("║  손글씨 폰트 + 반투명 배경 박스                     ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    print("🔤 폰트 준비 중...")
    font_dict = download_fonts()
    if not font_dict:
        print("❌ 사용 가능한 폰트가 없습니다!")
        sys.exit(1)

    input_dir = "covers"
    output_dir = "covers_final"
    success = fail = 0

    for bid, author, title in BOOKS:
        filename = f"{bid}_{title}.png".replace(" ", "_")
        input_path = os.path.join(input_dir, author, filename)

        if not os.path.exists(input_path):
            print(f"  ⚠️  #{bid} {author} - {title} → 원본 없음, 스킵")
            fail += 1
            continue

        out_dir = os.path.join(output_dir, author)
        os.makedirs(out_dir, exist_ok=True)
        output_path = os.path.join(out_dir, filename)

        try:
            add_text_to_cover(input_path, output_path, title, author, font_dict)
            success += 1
            print(f"  ✅ #{bid} {author} - {title}")
        except Exception as e:
            fail += 1
            print(f"  ❌ #{bid} {author} - {title} → {e}")

    print(f"\n{'═'*55}")
    print(f"  완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: {output_dir}/")
    print(f"{'═'*55}")


if __name__ == "__main__":
    main()
