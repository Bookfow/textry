#!/usr/bin/env python3
"""
실패한 16권 재수집 스크립트
- 위키문헌 slug 수정
- 공유마당 대체 소스 추가
- 일부 작품은 위키문헌 구조가 다름 (시집/챕터 형식)
"""

import os
import sys
import json
import time
import re
import logging
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

OUTPUT_DIR = Path("collected_texts")
LOG_FILE = "retry_log.json"
DELAY = 2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("retry.log", encoding="utf-8")]
)
log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def safe_filename(author, title):
    name = f"{author}_{title}"
    name = re.sub(r'[\\/:*?"<>|]', '', name)
    return name.replace(' ', '_')


def fetch_wikisource(slug):
    """위키문헌에서 텍스트 가져오기"""
    url = f"https://ko.wikisource.org/wiki/{quote(slug)}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        content = soup.find('div', class_='mw-parser-output')
        if not content:
            return None
        for tag in content.find_all(['table', 'style', 'script', 'sup']):
            tag.decompose()
        for tag in content.find_all('div', class_=['catlinks', 'navbox', 'metadata', 'noprint']):
            tag.decompose()
        for tag in content.find_all('span', class_=['mw-editsection']):
            tag.decompose()
        lines = []
        for elem in content.children:
            text = elem.get_text(strip=True) if hasattr(elem, 'get_text') else str(elem).strip()
            if text:
                lines.append(text)
        text = '\n\n'.join(lines)
        if len(text) < 50:
            return None
        return text
    except Exception as e:
        log.warning(f"  위키문헌 실패 ({slug}): {e}")
        return None


def fetch_wikisource_subpages(base_slug, sub_slugs):
    """위키문헌 챕터별 페이지 합치기 (장편소설용)"""
    all_text = []
    for sub in sub_slugs:
        full_slug = f"{base_slug}/{sub}"
        log.info(f"    → 챕터: {sub}")
        text = fetch_wikisource(full_slug)
        if text:
            all_text.append(f"\n\n{'─'*40}\n{sub}\n{'─'*40}\n\n{text}")
        time.sleep(1)
    return '\n'.join(all_text) if all_text else None


def fetch_gongu_file(wrt_sn):
    """공유마당 파일 다운로드"""
    for file_sn in range(1, 6):
        url = f"https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileDownload.do?wrtSn={wrt_sn}&fileSn={file_sn}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            cd = resp.headers.get('Content-Disposition', '')
            ct = resp.headers.get('Content-Type', '')
            if ('.txt' in cd.lower() or 'text/plain' in ct) and len(resp.content) > 50:
                for enc in ['utf-8', 'euc-kr', 'cp949', 'utf-8-sig']:
                    try:
                        return resp.content.decode(enc)
                    except (UnicodeDecodeError, LookupError):
                        continue
        except Exception:
            continue
    return None


def format_and_save(author, title, year, text, source):
    """텍스트 포맷팅 후 저장"""
    header = f"""{'='*60}
{title}
{'='*60}

작가: {author}
발표: {year}년
저작권: 만료 (퍼블릭 도메인)
출처: {source}

{'─'*60}

"""
    formatted = header + text.strip() + "\n"
    filename = safe_filename(author, title) + ".txt"
    filepath = OUTPUT_DIR / author / filename
    ensure_dir(filepath.parent)
    filepath.write_text(formatted, encoding='utf-8')
    return str(filepath)


# ─── 실패 16권 재수집 정보 ───
# 수정된 위키문헌 slug + 대체 소스 전략

RETRY_BOOKS = [
    # ── 윤동주 시 (시집 하위 페이지 구조) ──
    {
        "author": "윤동주", "title": "서시", "year": 1941, "genre": "시",
        "slugs": [
            "하늘과_바람과_별과_시_(1948년)/서시",
            "하늘과_바람과_별과_시_(1955년)/서시",
        ],
        "gongu_wrt_sn": "9003696",
    },
    {
        "author": "윤동주", "title": "별 헤는 밤", "year": 1941, "genre": "시",
        "slugs": [
            "하늘과_바람과_별과_시_(1948년)/별_헤는_밤",
            "하늘과_바람과_별과_시_(1955년)/별헤는_밤",
        ],
        "gongu_wrt_sn": "9003699",
    },
    {
        "author": "윤동주", "title": "자화상", "year": 1939, "genre": "시",
        "slugs": [
            "하늘과_바람과_별과_시_(1948년)/자화상",
            "하늘과_바람과_별과_시_(1955년)/자화상",
        ],
    },

    # ── 김소월 시 ──
    {
        "author": "김소월", "title": "산유화", "year": 1925, "genre": "시",
        "slugs": [
            "진달래꽃_(시집)/산유화",
            "산유화_(김소월)",
        ],
    },
    {
        "author": "김소월", "title": "초혼", "year": 1925, "genre": "시",
        "slugs": [
            "진달래꽃_(시집)/초혼",
            "초혼",
        ],
    },

    # ── 한용운 시 ──
    {
        "author": "한용운", "title": "알 수 없어요", "year": 1926, "genre": "시",
        "slugs": [
            "님의_침묵_(시집)/알_수_없어요",
            "알_수_없어요",
        ],
    },
    {
        "author": "한용운", "title": "나룻배와 행인", "year": 1926, "genre": "시",
        "slugs": [
            "님의_침묵_(시집)/나룻배와_행인",
            "나룻배와_행인",
        ],
    },

    # ── 이효석 소설 ──
    {
        "author": "이효석", "title": "돈", "year": 1933, "genre": "단편소설",
        "slugs": [
            "돈_(이효석)",
            "돈",
        ],
        "gongu_wrt_sn": "9002227",
    },
    {
        "author": "이효석", "title": "산", "year": 1936, "genre": "단편소설",
        "slugs": [
            "산_(이효석)",
        ],
        "gongu_wrt_sn": "9002229",
    },

    # ── 채만식 장편 (위키문헌에 챕터별로 있음) ──
    {
        "author": "채만식", "title": "탁류", "year": 1937, "genre": "장편소설",
        "slugs": ["탁류"],
        "is_chaptered": True,
        "chapters": [f"제{i}장" for i in range(1, 38)],  # 37장까지
        "gongu_wrt_sn": "9002276",
    },
    {
        "author": "채만식", "title": "태평천하", "year": 1938, "genre": "장편소설",
        "slugs": ["태평천하"],
        "is_chaptered": True,
        "chapters": [f"제{i}장" for i in range(1, 13)],  # 12장까지
        "gongu_wrt_sn": "9002279",
    },

    # ── 최서해 ──
    {
        "author": "최서해", "title": "홍염", "year": 1927, "genre": "단편소설",
        "slugs": [
            "홍염",
        ],
        "gongu_wrt_sn": "9002267",
    },

    # ── 이육사 시 ──
    {
        "author": "이육사", "title": "절정", "year": 1940, "genre": "시",
        "slugs": [
            "절정",
            "절정_(이육사)",
        ],
    },
    {
        "author": "이육사", "title": "청포도", "year": 1939, "genre": "시",
        "slugs": [
            "청포도",
            "청포도_(이육사)",
        ],
        "gongu_wrt_sn": "9003719",
    },

    # ── 기타 ──
    {
        "author": "강경애", "title": "인간문제", "year": 1934, "genre": "장편소설",
        "slugs": [],
        "gongu_wrt_sn": "9002027",
    },
    {
        "author": "전영택", "title": "화수분", "year": 1925, "genre": "단편소설",
        "slugs": [
            "화수분",
            "화수분_(전영택)",
        ],
        "gongu_wrt_sn": "9002248",
    },
]


def collect_one(book):
    """하나의 작품 수집"""
    author = book['author']
    title = book['title']
    year = book['year']
    log.info(f"{'─'*50}")
    log.info(f"{author} - {title}")

    text = None
    source = None

    # 1. 위키문헌 slug 순서대로 시도
    for slug in book.get('slugs', []):
        log.info(f"  → 위키문헌: {slug}")

        # 챕터 구조 장편소설
        if book.get('is_chaptered'):
            text = fetch_wikisource_subpages(slug, book['chapters'])
            if text:
                source = f"위키문헌 ({slug})"
                log.info(f"  ✓ 위키문헌 챕터 수집 성공 ({len(text):,}자)")
                break
        else:
            text = fetch_wikisource(slug)
            if text:
                source = f"위키문헌 ({slug})"
                log.info(f"  ✓ 위키문헌 성공 ({len(text):,}자)")
                break

        time.sleep(1)

    # 2. 공유마당 파일
    if not text and book.get('gongu_wrt_sn'):
        log.info(f"  → 공유마당 파일: wrtSn={book['gongu_wrt_sn']}")
        text = fetch_gongu_file(book['gongu_wrt_sn'])
        if text:
            source = f"공유마당 (wrtSn={book['gongu_wrt_sn']})"
            log.info(f"  ✓ 공유마당 파일 성공 ({len(text):,}자)")

    # 결과
    if text:
        filepath = format_and_save(author, title, year, text, source)
        log.info(f"  ✅ 저장: {filepath}")
        return {"author": author, "title": title, "status": "downloaded", "source": source, "chars": len(text)}
    else:
        log.warning(f"  ❌ 실패: {author} - {title}")
        return {"author": author, "title": title, "status": "failed"}


def main():
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  실패 16권 재수집 (수정된 slug + 대체 소스)            ║
╚══════════════════════════════════════════════════════════╝
    """)

    ensure_dir(OUTPUT_DIR)
    results = []

    for i, book in enumerate(RETRY_BOOKS):
        result = collect_one(book)
        results.append(result)
        if i < len(RETRY_BOOKS) - 1:
            time.sleep(DELAY)

    # 결과 저장
    success = sum(1 for r in results if r['status'] == 'downloaded')
    failed = sum(1 for r in results if r['status'] == 'failed')

    Path(LOG_FILE).write_text(json.dumps({
        "total": len(results), "success": success, "failed": failed, "results": results
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f"\n{'='*60}")
    print(f"재수집 완료: 성공 {success}권 / 실패 {failed}권")
    if failed > 0:
        print(f"\n여전히 실패:")
        for r in results:
            if r['status'] == 'failed':
                print(f"  - {r['author']} / {r['title']}")
        print(f"\n→ 이 작품들은 수동으로 공유마당에서 직접 다운로드하세요.")
    print(f"\n완료 후 'python convert_to_epub.py' 로 epub 변환하세요.")


if __name__ == "__main__":
    main()
