#!/usr/bin/env python3
"""
수집된 추가 텍스트 → EPUB 변환 v3
- 고전소설: 춘향가, 심청전, 홍길동전 개별 epub
- 불완전 작품 제외
- 200자 미만 항목 자동 필터링

사용법:
  pip install ebooklib
  python convert_additional.py
"""

from ebooklib import epub
import os, re, uuid

INPUT_DIR = "collected_additional"
OUTPUT_DIR = "epub_additional"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 200자 미만 개별 항목 필터링
MIN_ENTRY_CHARS = 200


def text_to_html(text):
    parts = []
    for p in text.split("\n"):
        p = p.strip()
        if not p:
            parts.append("<br/>")
        elif p.startswith("═") or p.startswith("─"):
            parts.append("<hr/>")
        else:
            p = p.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            parts.append(f"<p>{p}</p>")
    return "\n".join(parts)


def create_epub_from_file(txt_path, title, author, description, epub_filename):
    if not os.path.exists(txt_path):
        return False, "파일 없음"

    with open(txt_path, "r", encoding="utf-8") as f:
        content = f.read()

    if len(content) < 300:
        return False, f"너무 짧음 ({len(content)}자)"

    return _build_epub(content, title, author, description, epub_filename)


def create_epub_from_text(content, title, author, description, epub_filename):
    if len(content) < 300:
        return False, f"너무 짧음 ({len(content)}자)"

    return _build_epub(content, title, author, description, epub_filename)


def _build_epub(content, title, author, description, epub_filename):
    book = epub.EpubBook()
    book.set_identifier(str(uuid.uuid4()))
    book.set_title(title)
    book.set_language("ko")
    book.add_author(author)
    book.add_metadata("DC", "description", description)
    book.add_metadata("DC", "publisher", "한국 고전문학 전자책 프로젝트")

    style = epub.EpubItem(
        uid="style", file_name="style/default.css", media_type="text/css",
        content="""
body { font-family: serif; line-height: 1.8; margin: 1em; color: #333; }
h1 { font-size: 1.6em; text-align: center; margin: 2em 0 0.5em; color: #222; }
h2 { font-size: 1.2em; text-align: center; margin: 1.5em 0 0.3em; color: #555; }
p { text-indent: 1em; margin: 0.3em 0; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
        """.encode("utf-8"),
    )
    book.add_item(style)

    sections = re.split(r"─{10,}", content)
    chapters = []
    skipped = 0

    for i, section in enumerate(sections):
        section = section.strip()
        if not section or len(section) < 10:
            continue
        if len(section) < MIN_ENTRY_CHARS and i > 0:
            skipped += 1
            continue

        lines = section.split("\n")
        ch_title = lines[0].strip() if lines else f"제 {i+1} 부"
        if len(ch_title) > 50:
            ch_title = ch_title[:50] + "…"
        body = "\n".join(lines[1:]) if len(lines) > 1 else section

        html = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko">
<head><title>{ch_title}</title>
<link rel="stylesheet" type="text/css" href="style/default.css"/></head>
<body><h1>{ch_title}</h1>{text_to_html(body)}</body></html>"""

        ch = epub.EpubHtml(title=ch_title, file_name=f"chapter_{i:03d}.xhtml", lang="ko")
        ch.content = html.encode("utf-8")
        ch.add_item(style)
        book.add_item(ch)
        chapters.append(ch)

    if not chapters:
        return False, "챕터 생성 실패"

    book.toc = chapters
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav"] + chapters

    epub_path = os.path.join(OUTPUT_DIR, epub_filename)
    epub.write_epub(epub_path, book, {})

    info = f"{len(chapters)}챕터"
    if skipped > 0:
        info += f", {skipped}편 필터링"
    return True, info


def extract_work_from_collection(txt_path, work_name):
    """합본 파일에서 특정 작품만 추출 (═══ 또는 ─── 구분선 + 제목 기준)"""
    if not os.path.exists(txt_path):
        return None

    with open(txt_path, "r", encoding="utf-8") as f:
        content = f.read()

    # ═══ (이중선) 또는 ─── (단선) 모두 구분선으로 인식
    sections = re.split(r"[═─]{10,}", content)
    print(f"    [디버그] {os.path.basename(txt_path)}: {len(sections)}개 섹션 발견")
    for i, section in enumerate(sections):
        section = section.strip()
        if not section:
            continue
        # 처음 5줄 안에서 작품명 검색 (메타정보 줄 고려)
        first_lines = "\n".join(section.split("\n")[:5])
        if work_name in first_lines:
            print(f"    [디버그] '{work_name}' 발견 (섹션 {i}, {len(section)}자)")
            if len(section) > MIN_ENTRY_CHARS:
                return section
            else:
                print(f"    [디버그] 너무 짧음 ({len(section)}자 < {MIN_ENTRY_CHARS})")

    print(f"    [디버그] '{work_name}' 미발견")
    return None


def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║  추가 텍스트 → EPUB 변환 v3                        ║")
    print("║  고전소설 개별 분리 + 불완전 작품 제외              ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    success = fail = 0

    # ─── 시집 ───
    simple_books = [
        ("김소월_진달래꽃.txt", "진달래꽃", "김소월", "김소월 시집 전집 (1925) — 127편"),
        ("윤동주_하늘과바람과별과시.txt", "하늘과 바람과 별과 시", "윤동주", "윤동주 유고 시집 — 전편"),
        ("한용운_님의침묵.txt", "님의 침묵", "한용운", "한용운 시집 (1926) — 88편"),
        ("이상화_시선집.txt", "이상화 시선집", "이상화", "빼앗긴 들에도 봄은 오는가 외"),
        ("이광수_논설수필선집.txt", "이광수 논설·수필 선집", "이광수", "민족개조론, 어린 벗에게"),
        ("방정환_선집.txt", "방정환 선집", "방정환", "어린이 찬미"),
        ("독립선언서_모음.txt", "독립선언서 모음", "손병희 외", "3·1 독립선언서, 대한독립선언서"),
    ]

    for txt_file, title, author, desc in simple_books:
        txt_path = os.path.join(INPUT_DIR, txt_file)
        if not os.path.exists(txt_path):
            print(f"  ⏭️  {author} - {title} → 파일 없음")
            continue
        epub_file = txt_file.replace(".txt", ".epub")
        print(f"  변환: {author} - {title}...", end=" ", flush=True)
        ok, info = create_epub_from_file(txt_path, title, author, desc, epub_file)
        if ok:
            success += 1
            print(f"✅ → {epub_file} ({info})")
        else:
            fail += 1
            print(f"❌ ({info})")

    # ─── 고전소설: 개별 분리 ───
    print(f"\n  📚 고전소설 개별 분리:")

    # 춘향가
    moeum1 = os.path.join(INPUT_DIR, "고전소설모음1_판소리계.txt")
    text = extract_work_from_collection(moeum1, "춘향가")
    if text:
        print(f"  변환: 춘향가...", end=" ", flush=True)
        ok, info = create_epub_from_text(
            f"춘향가\n작자 미상\n\n{'='*40}\n\n{text}",
            "춘향가", "작자 미상", "판소리 춘향가 전문", "춘향가.epub"
        )
        if ok:
            success += 1
            print(f"✅ → 춘향가.epub ({info})")
        else:
            fail += 1
            print(f"❌ ({info})")
    else:
        print(f"  ⏭️  춘향가 → 추출 실패")
        fail += 1

    # 심청전
    text = extract_work_from_collection(moeum1, "심청전")
    if text:
        print(f"  변환: 심청전...", end=" ", flush=True)
        ok, info = create_epub_from_text(
            f"심청전\n작자 미상\n\n{'='*40}\n\n{text}",
            "심청전", "작자 미상", "심청전 완판본 전문", "심청전.epub"
        )
        if ok:
            success += 1
            print(f"✅ → 심청전.epub ({info})")
        else:
            fail += 1
            print(f"❌ ({info})")
    else:
        print(f"  ⏭️  심청전 → 추출 실패")
        fail += 1

    # 홍길동전
    moeum2 = os.path.join(INPUT_DIR, "고전소설모음2_영웅풍자.txt")
    text = extract_work_from_collection(moeum2, "홍길동전")
    if text:
        print(f"  변환: 홍길동전...", end=" ", flush=True)
        ok, info = create_epub_from_text(
            f"홍길동전\n허균\n\n{'='*40}\n\n{text}",
            "홍길동전", "허균", "경판 30장본", "홍길동전.epub"
        )
        if ok:
            success += 1
            print(f"✅ → 홍길동전.epub ({info})")
        else:
            fail += 1
            print(f"❌ ({info})")
    else:
        print(f"  ⏭️  홍길동전 → 추출 실패")
        fail += 1

    # ─── 결과 ───
    print(f"\n{'═'*55}")
    print(f"  변환 완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: {OUTPUT_DIR}/")
    print(f"{'═'*55}")
    print(f"\n  📊 최종 라이브러리: 기존 38권 + 추가 {success}권 = 총 {38+success}권")


if __name__ == "__main__":
    main()
