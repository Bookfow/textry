#!/usr/bin/env python3
"""
추가 8권 표지 텍스트 오버레이 + EPUB에 표지 삽입
1단계: covers_additional/ 이미지에 제목+작가명 텍스트 오버레이
2단계: epub_additional/ EPUB 파일에 표지 삽입

사용법:
  pip install Pillow requests
  python add_text_to_covers_additional.py
"""

from PIL import Image, ImageDraw, ImageFont
import os, random, sys, requests, zipfile, io

# ═══════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════

COVER_INPUT_DIR = "covers_additional"
COVER_OUTPUT_DIR = "covers_additional_final"
EPUB_DIR = "epub_additional"
FONT_DIR = "fonts_cache"

BOOKS = [
    ("A01_진달래꽃.png", "진달래꽃", "김소월", "김소월_진달래꽃.epub"),
    ("A02_하늘과바람과별과시.png", "하늘과 바람과 별과 시", "윤동주", "윤동주_하늘과바람과별과시.epub"),
    ("A03_님의침묵.png", "님의 침묵", "한용운", "한용운_님의침묵.epub"),
    ("A04_이상화시선집.png", "이상화 시선집", "이상화", "이상화_시선집.epub"),
    ("A05_논설수필선집.png", "논설·수필 선집", "이광수", "이광수_논설수필선집.epub"),
    ("A06_방정환선집.png", "방정환 선집", "방정환", "방정환_선집.epub"),
    ("A07_독립선언서모음.png", "독립선언서 모음", "손병희 외", "독립선언서_모음.epub"),
    ("A08_심청전.png", "심청전", "작자 미상", "심청전.epub"),
]

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

TITLE_FONT_KEYS = ["NanumPenScript", "NanumBrush", "GamjaFlower", "MaruBuri-Bold", "NanumMyeongjoBold"]
AUTHOR_FONT_KEYS = ["MaruBuri-Bold", "NanumMyeongjoBold", "Gaegu-Bold", "SongMyung"]


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
        for fb in ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf",
                    "C:/Windows/Fonts/batang.ttc", "C:/Windows/Fonts/gulim.ttc"]:
            if os.path.exists(fb):
                downloaded["system"] = fb
                break

    print(f"  📝 사용 가능한 폰트: {len(downloaded)}개\n")
    return downloaded


# ═══════════════════════════════════════════════════════
# 이미지 밝기 분석 + 텍스트 오버레이 (기존 v3 로직 동일)
# ═══════════════════════════════════════════════════════

def get_region_brightness(img, x, y, w, h):
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(img.width, int(x + w)), min(img.height, int(y + h))
    if x2 <= x1 or y2 <= y1:
        return 200
    region = img.crop((x1, y1, x2, y2)).convert("L")
    pixels = list(region.getdata())
    return sum(pixels) / len(pixels) if pixels else 200


def add_text_to_cover(img_path, output_path, title, author, font_dict):
    img = Image.open(img_path).convert("RGBA")
    W, H = img.size

    title_candidates = [font_dict[k] for k in TITLE_FONT_KEYS if k in font_dict]
    author_candidates = [font_dict[k] for k in AUTHOR_FONT_KEYS if k in font_dict]
    if not title_candidates:
        title_candidates = list(font_dict.values())
    if not author_candidates:
        author_candidates = list(font_dict.values())

    title_font_path = random.choice(title_candidates)
    author_font_path = random.choice(author_candidates)

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

    temp_draw = ImageDraw.Draw(img)
    max_title_width = W - 80

    t_bbox = temp_draw.textbbox((0, 0), title, font=title_font)
    tw, th = t_bbox[2] - t_bbox[0], t_bbox[3] - t_bbox[1]

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

    margin = 40
    pad_x, pad_y = 25, 18

    zones = {
        "top": get_region_brightness(img, 0, 0, W, H * 0.3),
        "mid": get_region_brightness(img, 0, H * 0.3, W, H * 0.4),
        "bot": get_region_brightness(img, 0, H * 0.65, W, H * 0.35),
    }
    sorted_zones = sorted(zones.items(), key=lambda x: x[1], reverse=True)
    title_zone = sorted_zones[0][0]

    if title_zone == "top":
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = margin + random.randint(20, 60)
        ax = (W - aw) // 2 + random.randint(-15, 15)
        ay = H - ah - margin - random.randint(20, 50)
    elif title_zone == "bot":
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = H - th - margin - random.randint(40, 80)
        ax = (W - aw) // 2 + random.randint(-15, 15)
        ay = margin + random.randint(20, 50)
    else:
        tx = (W - tw) // 2 + random.randint(-20, 20)
        ty = (H - th) // 2 + random.randint(-20, 20)
        if random.choice([True, False]):
            ax = (W - aw) // 2 + random.randint(-15, 15)
            ay = margin + random.randint(15, 40)
        else:
            ax = (W - aw) // 2 + random.randint(-15, 15)
            ay = H - ah - margin - random.randint(15, 40)

    tx = max(10, min(tx, W - tw - 10))
    ty = max(10, min(ty, H - th - 10))
    ax = max(10, min(ax, W - aw - 10))
    ay = max(10, min(ay, H - ah - 10))

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

    draw.text((tx, ty), title, font=title_font, fill=title_color)
    draw.text((ax, ay), author, font=author_font, fill=author_color)

    result = Image.alpha_composite(img, overlay)
    result.convert("RGB").save(output_path, quality=95)


# ═══════════════════════════════════════════════════════
# EPUB에 표지 삽입 (zipfile 기반)
# ═══════════════════════════════════════════════════════

def add_cover_to_epub(epub_path, cover_image_path):
    """EPUB에 표지 이미지 삽입"""
    with open(cover_image_path, "rb") as f:
        img_data = f.read()

    temp_path = epub_path + ".tmp"

    # 1단계: 기존 epub 복사 + 표지 파일 추가
    with zipfile.ZipFile(epub_path, 'r') as zin, \
         zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            zout.writestr(item, zin.read(item.filename))
        zout.writestr("OEBPS/images/cover.jpg", img_data)

        cover_xhtml = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title>
<style>body{margin:0;padding:0;text-align:center;}
img{max-width:100%;max-height:100%;}</style></head>
<body><img src="images/cover.jpg" alt="Cover"/></body></html>"""
        zout.writestr("OEBPS/cover.xhtml", cover_xhtml.encode("utf-8"))

    # 2단계: content.opf 수정 (별도로 열어서 처리)
    opf_path = None
    opf_data = None
    with zipfile.ZipFile(temp_path, 'r') as zin:
        for n in zin.namelist():
            if n.endswith(".opf"):
                opf_path = n
                opf_data = zin.read(n).decode("utf-8")
                break

    if opf_path and opf_data:
        import re as re_mod
        modified = False

        if "cover-image" not in opf_data:
            opf_data = opf_data.replace(
                "</manifest>",
                '  <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg"/>\n'
                '  <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>\n'
                '</manifest>'
            )
            modified = True

        if "<spine" in opf_data and "cover-page" not in opf_data:
            opf_data = re_mod.sub(
                r'(<spine[^>]*>)',
                r'\1\n    <itemref idref="cover-page"/>',
                opf_data
            )
            modified = True

        if 'name="cover"' not in opf_data:
            opf_data = opf_data.replace(
                "</metadata>",
                '  <meta name="cover" content="cover-image"/>\n</metadata>'
            )
            modified = True

        if modified:
            temp2 = epub_path + ".tmp2"
            with zipfile.ZipFile(temp_path, 'r') as zin, \
                 zipfile.ZipFile(temp2, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    if item.filename == opf_path:
                        zout.writestr(item, opf_data.encode("utf-8"))
                    else:
                        zout.writestr(item, zin.read(item.filename))
            # 모든 zip 핸들이 닫힌 상태에서 교체
            os.remove(temp_path)
            os.rename(temp2, temp_path)

    # 최종 교체
    os.remove(epub_path)
    os.rename(temp_path, epub_path)


# ═══════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║  추가 8권 텍스트 오버레이 + EPUB 표지 삽입          ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    print("🔤 폰트 준비 중...")
    font_dict = download_fonts()
    if not font_dict:
        print("❌ 사용 가능한 폰트가 없습니다!")
        sys.exit(1)

    os.makedirs(COVER_OUTPUT_DIR, exist_ok=True)

    success_text = fail_text = 0
    success_epub = fail_epub = 0

    for img_file, title, author, epub_file in BOOKS:
        input_path = os.path.join(COVER_INPUT_DIR, img_file)
        output_path = os.path.join(COVER_OUTPUT_DIR, img_file.replace(".png", ".jpg"))
        epub_path = os.path.join(EPUB_DIR, epub_file)

        # 1단계: 텍스트 오버레이
        if not os.path.exists(input_path):
            print(f"  ⏭️  {author} - {title} → 원본 이미지 없음")
            fail_text += 1
            continue

        print(f"  🎨 텍스트: {author} - {title}...", end=" ", flush=True)
        try:
            add_text_to_cover(input_path, output_path, title, author, font_dict)
            success_text += 1
            print("✅", end="")
        except Exception as e:
            fail_text += 1
            print(f"❌ ({e})")
            continue

        # 2단계: EPUB에 삽입
        if os.path.exists(epub_path):
            try:
                add_cover_to_epub(epub_path, output_path)
                success_epub += 1
                print(f" → EPUB 삽입 ✅")
            except Exception as e:
                fail_epub += 1
                print(f" → EPUB 삽입 ❌ ({e})")
        else:
            print(f" → EPUB 없음 ⏭️")
            fail_epub += 1

    print(f"\n{'═'*55}")
    print(f"  텍스트 오버레이: 성공 {success_text} / 실패 {fail_text}")
    print(f"  EPUB 표지 삽입: 성공 {success_epub} / 실패 {fail_epub}")
    print(f"  표지 확인: {COVER_OUTPUT_DIR}/")
    print(f"  EPUB 위치: {EPUB_DIR}/")
    print(f"{'═'*55}")


if __name__ == "__main__":
    main()
