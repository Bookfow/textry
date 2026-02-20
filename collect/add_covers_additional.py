#!/usr/bin/env python3
"""
추가 8권 표지 생성 + EPUB 삽입
- Pillow로 그라데이션/패턴 배경 + 제목/작가명 표지 생성
- ebooklib으로 기존 epub에 표지 삽입

사용법:
  pip install Pillow ebooklib requests
  python add_covers_additional.py
"""

from PIL import Image, ImageDraw, ImageFont
from ebooklib import epub
import os, random, math, requests, shutil

# ═══════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════

EPUB_DIR = "epub_additional"
FONT_DIR = "fonts_cache"
COVER_W, COVER_H = 600, 900

# 추가 8권 정보 (epub 파일명, 제목, 작가, 색상 테마)
ADDITIONAL_BOOKS = [
    ("김소월_진달래꽃.epub", "진달래꽃", "김소월", "pink"),
    ("윤동주_하늘과바람과별과시.epub", "하늘과 바람과\n별과 시", "윤동주", "navy"),
    ("한용운_님의침묵.epub", "님의 침묵", "한용운", "green"),
    ("이상화_시선집.epub", "이상화\n시선집", "이상화", "amber"),
    ("이광수_논설수필선집.epub", "논설·수필\n선집", "이광수", "brown"),
    ("방정환_선집.epub", "방정환 선집", "방정환", "sky"),
    ("독립선언서_모음.epub", "독립선언서\n모음", "손병희 외", "red"),
    ("심청전.epub", "심청전", "작자 미상", "teal"),
]

# 색상 테마 (배경 그라데이션 시작/끝, 제목색, 작가색, 장식색)
COLOR_THEMES = {
    "pink":  {"bg1": (180, 60, 90), "bg2": (240, 180, 190), "title": (255, 245, 240), "author": (255, 230, 230), "accent": (220, 100, 120)},
    "navy":  {"bg1": (20, 30, 70), "bg2": (60, 80, 140), "title": (230, 235, 255), "author": (200, 210, 240), "accent": (100, 130, 200)},
    "green": {"bg1": (30, 70, 50), "bg2": (120, 170, 130), "title": (240, 255, 240), "author": (220, 240, 220), "accent": (80, 140, 90)},
    "amber": {"bg1": (140, 80, 20), "bg2": (220, 170, 80), "title": (255, 250, 235), "author": (250, 240, 210), "accent": (200, 140, 40)},
    "brown": {"bg1": (80, 50, 30), "bg2": (160, 120, 80), "title": (250, 245, 235), "author": (240, 230, 210), "accent": (140, 100, 60)},
    "sky":   {"bg1": (40, 100, 160), "bg2": (130, 190, 230), "title": (255, 255, 255), "author": (230, 245, 255), "accent": (80, 150, 210)},
    "red":   {"bg1": (120, 20, 20), "bg2": (180, 60, 50), "title": (255, 245, 240), "author": (255, 220, 210), "accent": (200, 80, 60)},
    "teal":  {"bg1": (20, 80, 80), "bg2": (80, 160, 160), "title": (240, 255, 255), "author": (220, 245, 245), "accent": (60, 140, 140)},
}

FONT_URLS = {
    "MaruBuri-Bold": "https://github.com/google/fonts/raw/main/ofl/maruburi/MaruBuri-Bold.ttf",
    "NanumMyeongjoBold": "https://github.com/google/fonts/raw/main/ofl/nanummyeongjo/NanumMyeongjo-Bold.ttf",
    "NanumPenScript": "https://github.com/google/fonts/raw/main/ofl/nanumpenscript/NanumPenScript-Regular.ttf",
    "NanumBrush": "https://github.com/google/fonts/raw/main/ofl/nanumbrushscript/NanumBrushScript-Regular.ttf",
    "GamjaFlower": "https://github.com/google/fonts/raw/main/ofl/gamjaflower/GamjaFlower-Regular.ttf",
    "SongMyung": "https://github.com/google/fonts/raw/main/ofl/songmyung/SongMyung-Regular.ttf",
}

TITLE_FONT_KEYS = ["NanumPenScript", "NanumBrush", "GamjaFlower", "MaruBuri-Bold", "NanumMyeongjoBold"]
AUTHOR_FONT_KEYS = ["MaruBuri-Bold", "NanumMyeongjoBold", "SongMyung"]


def download_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    downloaded = {}
    for name, url in FONT_URLS.items():
        filepath = os.path.join(FONT_DIR, f"{name}.ttf")
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
        for fb in ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf"]:
            if os.path.exists(fb):
                downloaded["system"] = fb
                break

    print(f"  📝 사용 가능한 폰트: {len(downloaded)}개\n")
    return downloaded


# ═══════════════════════════════════════════════════════
# 표지 이미지 생성
# ═══════════════════════════════════════════════════════

def draw_gradient(draw, w, h, color1, color2):
    """세로 그라데이션"""
    for y in range(h):
        ratio = y / h
        r = int(color1[0] + (color2[0] - color1[0]) * ratio)
        g = int(color1[1] + (color2[1] - color1[1]) * ratio)
        b = int(color1[2] + (color2[2] - color1[2]) * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def draw_decorations(draw, w, h, accent_color, style):
    """장식 패턴"""
    a = (*accent_color, 60)

    if style == "circles":
        for _ in range(random.randint(5, 12)):
            cx = random.randint(-50, w + 50)
            cy = random.randint(-50, h + 50)
            r = random.randint(30, 150)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=a, width=2)

    elif style == "lines":
        for _ in range(random.randint(4, 8)):
            y = random.randint(0, h)
            draw.line([(0, y), (w, y)], fill=a, width=1)

    elif style == "dots":
        for _ in range(random.randint(30, 80)):
            x = random.randint(0, w)
            y = random.randint(0, h)
            r = random.randint(2, 6)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=a)

    elif style == "frame":
        m = 30
        draw.rectangle([m, m, w - m, h - m], outline=a, width=2)
        draw.rectangle([m + 10, m + 10, w - m - 10, h - m - 10], outline=a, width=1)


def get_multiline_size(draw, text, font):
    """멀티라인 텍스트 크기 계산"""
    lines = text.split("\n")
    total_w = 0
    total_h = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        total_w = max(total_w, lw)
        total_h += lh + 10
    return total_w, total_h - 10


def draw_multiline_centered(draw, text, cx, cy, font, fill):
    """멀티라인 텍스트를 중앙 정렬로 그리기"""
    lines = text.split("\n")
    # 전체 높이 계산
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
    total_h = sum(line_heights) + 10 * (len(lines) - 1)

    y = cy - total_h // 2
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = cx - lw // 2
        draw.text((x, y), line, font=font, fill=fill)
        y += line_heights[i] + 10


def generate_cover(title, author, theme_name, font_dict):
    """표지 이미지 생성 → PIL Image 반환"""
    theme = COLOR_THEMES[theme_name]

    # 배경
    img = Image.new("RGBA", (COVER_W, COVER_H), (255, 255, 255, 255))
    bg_draw = ImageDraw.Draw(img)
    draw_gradient(bg_draw, COVER_W, COVER_H, theme["bg1"], theme["bg2"])

    # 장식
    overlay = Image.new("RGBA", (COVER_W, COVER_H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    deco_style = random.choice(["circles", "lines", "dots", "frame"])
    draw_decorations(ov_draw, COVER_W, COVER_H, theme["accent"], deco_style)
    img = Image.alpha_composite(img, overlay)

    draw = ImageDraw.Draw(img)

    # 폰트 선택
    title_candidates = [font_dict[k] for k in TITLE_FONT_KEYS if k in font_dict]
    author_candidates = [font_dict[k] for k in AUTHOR_FONT_KEYS if k in font_dict]
    if not title_candidates:
        title_candidates = list(font_dict.values())
    if not author_candidates:
        author_candidates = list(font_dict.values())

    title_font_path = random.choice(title_candidates)
    author_font_path = random.choice(author_candidates)

    # 제목 폰트 크기 (줄 수 고려)
    title_lines = title.split("\n")
    max_line_len = max(len(l) for l in title_lines)
    if max_line_len <= 2:
        title_size = 160
    elif max_line_len <= 4:
        title_size = 120
    elif max_line_len <= 7:
        title_size = 90
    else:
        title_size = 70

    author_size = 32

    title_font = ImageFont.truetype(title_font_path, title_size)
    author_font = ImageFont.truetype(author_font_path, author_size)

    # 제목 크기 자동 축소
    tw, th = get_multiline_size(draw, title, title_font)
    max_w = COVER_W - 80
    while tw > max_w and title_size > 40:
        title_size -= 5
        title_font = ImageFont.truetype(title_font_path, title_size)
        tw, th = get_multiline_size(draw, title, title_font)

    # 구분선
    line_y = COVER_H * 0.62
    line_margin = 80
    draw.line(
        [(line_margin, line_y), (COVER_W - line_margin, line_y)],
        fill=(*theme["accent"], 120), width=2
    )

    # 제목 (상단 40%)
    title_cy = int(COVER_H * 0.35)
    draw_multiline_centered(draw, title, COVER_W // 2, title_cy, title_font, theme["title"])

    # 작가명 (하단)
    author_cy = int(COVER_H * 0.72)
    bbox = draw.textbbox((0, 0), author, font=author_font)
    aw = bbox[2] - bbox[0]
    draw.text(
        ((COVER_W - aw) // 2, author_cy),
        author, font=author_font, fill=theme["author"]
    )

    # "한국 고전문학" 라벨 (최하단)
    label_font = ImageFont.truetype(author_font_path, 18)
    label = "한국 고전문학 전자책"
    lbbox = draw.textbbox((0, 0), label, font=label_font)
    lw = lbbox[2] - lbbox[0]
    draw.text(
        ((COVER_W - lw) // 2, COVER_H - 60),
        label, font=label_font, fill=(*theme["author"][:3],)
    )

    return img.convert("RGB")


# ═══════════════════════════════════════════════════════
# EPUB에 표지 삽입
# ═══════════════════════════════════════════════════════

def add_cover_to_epub(epub_path, cover_img):
    """기존 epub 파일에 표지 이미지 삽입"""
    import io

    # 이미지를 bytes로 변환
    img_bytes = io.BytesIO()
    cover_img.save(img_bytes, format="JPEG", quality=90)
    img_data = img_bytes.getvalue()

    # epub 읽기
    book = epub.read_epub(epub_path)

    # 기존 표지 제거 (있으면)
    book.items = [item for item in book.items if not (
        hasattr(item, 'file_name') and 'cover' in item.file_name.lower()
    )]

    # 표지 이미지 추가
    cover_image = epub.EpubImage()
    cover_image.id = "cover-image"
    cover_image.file_name = "images/cover.jpg"
    cover_image.media_type = "image/jpeg"
    cover_image.content = img_data
    book.add_item(cover_image)

    # 표지 메타데이터
    book.add_metadata(None, "meta", "", {"name": "cover", "content": "cover-image"})

    # 표지 HTML 페이지
    cover_html = epub.EpubHtml(
        title="표지", file_name="cover.xhtml", lang="ko"
    )
    cover_html.content = b"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title>
<style>body{margin:0;padding:0;text-align:center;}
img{max-width:100%;max-height:100%;}</style></head>
<body><img src="images/cover.jpg" alt="Cover"/></body></html>"""
    book.add_item(cover_html)

    # spine 맨 앞에 표지 추가
    if hasattr(book, 'spine') and book.spine:
        # spine에서 기존 cover 제거
        book.spine = [s for s in book.spine if s != 'cover' and (
            not hasattr(s, 'file_name') or 'cover' not in s.file_name
        )]
        book.spine.insert(0, cover_html)
    else:
        book.spine = [cover_html]

    # 임시 파일에 저장 후 교체
    temp_path = epub_path + ".tmp"
    epub.write_epub(temp_path, book, {})
    os.replace(temp_path, epub_path)


# ═══════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║  추가 8권 표지 생성 + EPUB 삽입                     ║")
    print("║  그라데이션 배경 + 손글씨 폰트                      ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    print("🔤 폰트 준비 중...")
    font_dict = download_fonts()
    if not font_dict:
        print("❌ 사용 가능한 폰트가 없습니다!")
        return

    success = fail = 0
    cover_dir = os.path.join(EPUB_DIR, "covers")
    os.makedirs(cover_dir, exist_ok=True)

    for epub_file, title, author, theme in ADDITIONAL_BOOKS:
        epub_path = os.path.join(EPUB_DIR, epub_file)
        if not os.path.exists(epub_path):
            print(f"  ⏭️  {author} - {title.split(chr(10))[0]} → epub 없음")
            fail += 1
            continue

        display_title = title.split("\n")[0]
        print(f"  🎨 {author} - {display_title}...", end=" ", flush=True)

        try:
            # 표지 생성
            cover_img = generate_cover(title, author, theme, font_dict)

            # 표지 이미지 별도 저장 (확인용)
            cover_path = os.path.join(cover_dir, epub_file.replace(".epub", ".jpg"))
            cover_img.save(cover_path, quality=90)

            # EPUB에 삽입
            add_cover_to_epub(epub_path, cover_img)

            success += 1
            print(f"✅")
        except Exception as e:
            fail += 1
            print(f"❌ ({e})")

    print(f"\n{'═'*55}")
    print(f"  완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  표지 확인: {cover_dir}/")
    print(f"  EPUB 위치: {EPUB_DIR}/")
    print(f"{'═'*55}")


if __name__ == "__main__":
    main()
