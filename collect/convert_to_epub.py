#!/usr/bin/env python3
"""
수집된 txt 파일 → epub 변환 파이프라인
collected_texts/ 폴더의 모든 txt를 epub으로 변환
"""

import os
import sys
import re
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

try:
    from ebooklib import epub
except ImportError:
    os.system("pip install ebooklib --break-system-packages -q")
    from ebooklib import epub


INPUT_DIR = Path("collected_texts")
OUTPUT_DIR = Path("epub_output")
LOG_FILE = "collection_log.json"


def parse_txt_metadata(text: str) -> dict:
    """txt 파일 헤더에서 메타데이터 추출"""
    meta = {"title": "", "author": "", "year": "", "body": text}

    lines = text.split('\n')
    title_idx = None
    body_start = None

    for i, line in enumerate(lines):
        if line.strip().startswith('=' * 10):
            if title_idx is None:
                title_idx = i + 1
            else:
                # 두번째 === 이후부터 메타 파싱
                pass
        if line.strip().startswith('작가:'):
            meta['author'] = line.split(':', 1)[1].strip()
        if line.strip().startswith('발표:'):
            meta['year'] = line.split(':', 1)[1].strip().replace('년', '')
        if line.strip().startswith('─' * 10):
            body_start = i + 1
            break

    if title_idx and title_idx < len(lines):
        meta['title'] = lines[title_idx].strip()

    if body_start:
        meta['body'] = '\n'.join(lines[body_start:]).strip()

    return meta


def text_to_html_chapters(body: str, max_chars: int = 15000) -> list[tuple[str, str]]:
    """본문을 HTML 챕터들로 분할"""
    paragraphs = [p.strip() for p in body.split('\n\n') if p.strip()]

    if not paragraphs:
        return [("본문", f"<p>{body}</p>")]

    # 짧은 작품은 챕터 분할 안함
    if len(body) < max_chars:
        html = ''.join(f'<p>{p.replace(chr(10), "<br/>")}</p>' for p in paragraphs)
        return [("본문", html)]

    # 긴 작품은 적절히 분할
    chapters = []
    current_html = ""
    current_len = 0
    chapter_num = 1

    for p in paragraphs:
        p_html = f'<p>{p.replace(chr(10), "<br/>")}</p>'
        if current_len + len(p) > max_chars and current_html:
            chapters.append((f"제{chapter_num}장", current_html))
            chapter_num += 1
            current_html = p_html
            current_len = len(p)
        else:
            current_html += p_html
            current_len += len(p)

    if current_html:
        chapters.append((f"제{chapter_num}장", current_html))

    return chapters


def create_epub(meta: dict, output_path: Path) -> bool:
    """메타데이터와 본문으로 epub 생성"""
    book = epub.EpubBook()

    # 메타데이터
    book.set_identifier(str(uuid.uuid4()))
    book.set_title(meta['title'])
    book.set_language('ko')
    book.add_author(meta['author'])
    book.add_metadata('DC', 'date', meta.get('year', ''))
    book.add_metadata('DC', 'rights', '퍼블릭 도메인 (저작권 만료)')
    book.add_metadata('DC', 'source', '공유마당 / 위키문헌')

    # CSS
    style = '''
    @charset "utf-8";
    body { 
        font-family: "Nanum Myeongjo", "Batang", serif;
        line-height: 1.8;
        margin: 1em;
        color: #333;
    }
    h1 { 
        text-align: center;
        font-size: 1.5em;
        margin: 2em 0 1em;
        border-bottom: 1px solid #ccc;
        padding-bottom: 0.5em;
    }
    h2 {
        font-size: 1.2em;
        margin: 1.5em 0 0.5em;
    }
    p { 
        text-indent: 1em;
        margin: 0.5em 0;
    }
    .title-page {
        text-align: center;
        margin-top: 30%;
    }
    .title-page h1 {
        font-size: 2em;
        border: none;
    }
    .title-page .author {
        font-size: 1.2em;
        margin-top: 1em;
        color: #666;
    }
    .title-page .info {
        margin-top: 3em;
        font-size: 0.9em;
        color: #999;
    }
    '''
    css = epub.EpubItem(
        uid="style", file_name="style/default.css",
        media_type="text/css", content=style.encode('utf-8')
    )
    book.add_item(css)

    # 표지 페이지
    title_html = f'''<html><head><link rel="stylesheet" href="style/default.css"/></head>
    <body>
    <div class="title-page">
        <h1>{meta['title']}</h1>
        <p class="author">{meta['author']}</p>
        <p class="info">{meta.get('year', '')}년 발표<br/>저작권 만료 작품</p>
    </div>
    </body></html>'''

    title_page = epub.EpubHtml(title='표지', file_name='title.xhtml', lang='ko')
    title_page.set_content(title_html.encode('utf-8'))
    title_page.add_item(css)
    book.add_item(title_page)

    # 본문 챕터
    chapters = text_to_html_chapters(meta['body'])
    epub_chapters = []

    for i, (ch_title, ch_html) in enumerate(chapters):
        ch = epub.EpubHtml(
            title=ch_title,
            file_name=f'chapter_{i+1:03d}.xhtml',
            lang='ko'
        )
        full_html = f'''<html><head><link rel="stylesheet" href="style/default.css"/></head>
        <body>
        <h1>{ch_title}</h1>
        {ch_html}
        </body></html>'''
        ch.set_content(full_html.encode('utf-8'))
        ch.add_item(css)
        book.add_item(ch)
        epub_chapters.append(ch)

    # 목차
    book.toc = [title_page] + epub_chapters
    book.spine = ['nav', title_page] + epub_chapters

    # 필수 항목
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 저장
    output_path.parent.mkdir(parents=True, exist_ok=True)
    epub.write_epub(str(output_path), book, {})
    return True


def process_all():
    """모든 수집된 txt를 epub으로 변환"""
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  txt → epub 변환 파이프라인                             ║
╚══════════════════════════════════════════════════════════╝
    """)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    txt_files = sorted(INPUT_DIR.rglob("*.txt"))
    if not txt_files:
        print(f"변환할 파일이 없습니다. ({INPUT_DIR}/ 에 txt 파일을 넣어주세요)")
        return

    print(f"발견된 txt 파일: {len(txt_files)}개\n")

    success = 0
    failed = 0
    results = []

    for txt_path in txt_files:
        text = txt_path.read_text(encoding='utf-8')
        meta = parse_txt_metadata(text)

        if not meta['title']:
            meta['title'] = txt_path.stem

        epub_filename = f"{meta['author']}_{meta['title']}.epub".replace(' ', '_')
        epub_filename = re.sub(r'[\\/:*?"<>|]', '', epub_filename)
        epub_path = OUTPUT_DIR / epub_filename

        try:
            create_epub(meta, epub_path)
            print(f"  ✅ {meta['author']} - {meta['title']} → {epub_path.name}")
            success += 1
            results.append({"title": meta['title'], "author": meta['author'], "epub": str(epub_path), "status": "ok"})
        except Exception as e:
            print(f"  ❌ {meta['author']} - {meta['title']}: {e}")
            failed += 1
            results.append({"title": meta['title'], "author": meta['author'], "error": str(e), "status": "failed"})

    # 결과
    print(f"\n{'='*60}")
    print(f"변환 완료: 성공 {success}권 / 실패 {failed}권")
    print(f"epub 저장 위치: {OUTPUT_DIR}/")

    # 변환 로그
    log = {"timestamp": datetime.now().isoformat(), "total": len(txt_files), "success": success, "failed": failed, "results": results}
    Path("conversion_log.json").write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == "__main__":
    process_all()
