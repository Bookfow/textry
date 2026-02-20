#!/usr/bin/env python3
"""
공유마당 + 위키문헌 저작권 만료 작품 수집 자동화 스크립트
- 공유마당(gongu.copyright.or.kr)에서 txt/hwp 파일 다운로드
- 위키문헌(ko.wikisource.org)에서 텍스트 스크래핑
- 수집된 텍스트를 정리하여 txt 파일로 저장
"""

import os
import sys
import json
import time
import re
import logging
from pathlib import Path
from urllib.parse import quote, urljoin
from dataclasses import dataclass, asdict
from typing import Optional

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("필수 패키지 설치 중...")
    os.system("pip install requests beautifulsoup4 lxml --break-system-packages -q")
    import requests
    from bs4 import BeautifulSoup

# ─── 설정 ───
OUTPUT_DIR = Path("collected_texts")
LOG_FILE = "collection_log.json"
DELAY = 2  # 요청 간 대기 (초) - 예의바른 크롤링

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("collect.log", encoding="utf-8")]
)
log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}


# ─── 작품 데이터 ───
@dataclass
class Book:
    id: int
    author: str
    title: str
    genre: str
    year: int
    priority: str
    # 수집 소스 정보
    gongu_wrt_sn: Optional[str] = None        # 공유마당 저작물 번호
    wikisource_slug: Optional[str] = None      # 위키문헌 URL slug
    # 수집 상태
    status: str = "pending"                     # pending / downloaded / failed
    source_used: Optional[str] = None           # gongu / wikisource
    filepath: Optional[str] = None
    error: Optional[str] = None


# 50권 목록 (공유마당 wrtSn + 위키문헌 slug 매핑)
BOOKS = [
    # ── 현진건 (1943 사망) ──
    Book(1, "현진건", "운수 좋은 날", "단편소설", 1924, "A",
         gongu_wrt_sn="9002094", wikisource_slug="운수_좋은_날"),
    Book(2, "현진건", "빈처", "단편소설", 1921, "A",
         gongu_wrt_sn="9002093", wikisource_slug="빈처"),
    Book(3, "현진건", "술 권하는 사회", "단편소설", 1921, "A",
         gongu_wrt_sn="9002089", wikisource_slug="술_권하는_사회"),
    Book(4, "현진건", "B사감과 러브레터", "단편소설", 1925, "A",
         gongu_wrt_sn="9002096", wikisource_slug="B사감과_러브레터"),
    Book(5, "현진건", "고향", "단편소설", 1926, "A",
         gongu_wrt_sn="9002097", wikisource_slug="고향_(현진건)"),

    # ── 김유정 (1937 사망) ──
    Book(6, "김유정", "봄봄", "단편소설", 1935, "A",
         gongu_wrt_sn="9002127", wikisource_slug="봄봄"),
    Book(7, "김유정", "동백꽃", "단편소설", 1936, "A",
         gongu_wrt_sn="9002122", wikisource_slug="동백꽃"),
    Book(8, "김유정", "금 따는 콩밭", "단편소설", 1935, "B",
         gongu_wrt_sn="9002121", wikisource_slug="금_따는_콩밭"),
    Book(9, "김유정", "만무방", "단편소설", 1935, "B",
         gongu_wrt_sn="9002124", wikisource_slug="만무방"),
    Book(10, "김유정", "산골 나그네", "단편소설", 1933, "B",
          gongu_wrt_sn="9002129", wikisource_slug="산골_나그네"),

    # ── 이상 (1937 사망) ──
    Book(11, "이상", "날개", "단편소설", 1936, "A",
         gongu_wrt_sn="9002133", wikisource_slug="날개_(소설)"),
    Book(12, "이상", "봉별기", "단편소설", 1936, "A",
         gongu_wrt_sn="9002136", wikisource_slug="봉별기"),
    Book(13, "이상", "종생기", "단편소설", 1937, "B",
         gongu_wrt_sn="9002137", wikisource_slug="종생기"),

    # ── 윤동주 (1945 사망) ──
    Book(14, "윤동주", "서시", "시", 1941, "A",
         gongu_wrt_sn="9003696", wikisource_slug="서시_(윤동주)"),
    Book(15, "윤동주", "별 헤는 밤", "시", 1941, "A",
         gongu_wrt_sn="9003699", wikisource_slug="별_헤는_밤"),
    Book(16, "윤동주", "자화상", "시", 1939, "A",
         wikisource_slug="자화상_(윤동주)"),
    Book(17, "윤동주", "길", "시", 1941, "A",
         gongu_wrt_sn="9030106", wikisource_slug="길_(윤동주)"),

    # ── 김소월 (1934 사망) ──
    Book(18, "김소월", "진달래꽃", "시", 1922, "A",
         gongu_wrt_sn="9002074", wikisource_slug="진달래꽃"),
    Book(19, "김소월", "산유화", "시", 1925, "A",
         wikisource_slug="산유화"),
    Book(20, "김소월", "초혼", "시", 1925, "A",
         wikisource_slug="초혼_(김소월)"),

    # ── 한용운 (1944 사망) ──
    Book(21, "한용운", "님의 침묵", "시", 1926, "A",
         gongu_wrt_sn="9003710", wikisource_slug="님의_침묵"),
    Book(22, "한용운", "알 수 없어요", "시", 1926, "A",
         wikisource_slug="알_수_없어요"),
    Book(23, "한용운", "나룻배와 행인", "시", 1926, "A",
         wikisource_slug="나룻배와_행인"),

    # ── 이효석 (1942 사망) ──
    Book(24, "이효석", "메밀꽃 필 무렵", "단편소설", 1936, "A",
         gongu_wrt_sn="9002225", wikisource_slug="메밀꽃_필_무렵"),
    Book(25, "이효석", "돈", "단편소설", 1933, "B",
         gongu_wrt_sn="9002227", wikisource_slug="돈_(이효석)"),
    Book(26, "이효석", "산", "단편소설", 1936, "B",
         gongu_wrt_sn="9002229"),

    # ── 나도향 (1926 사망) ──
    Book(27, "나도향", "벙어리 삼룡이", "단편소설", 1925, "A",
         gongu_wrt_sn="9002103", wikisource_slug="벙어리_삼룡이"),
    Book(28, "나도향", "물레방아", "단편소설", 1925, "B",
         gongu_wrt_sn="9002105", wikisource_slug="물레방아_(나도향)"),
    Book(29, "나도향", "뽕", "단편소설", 1925, "B",
         gongu_wrt_sn="9002102"),

    # ── 김동인 (1951 사망) ──
    Book(30, "김동인", "감자", "단편소설", 1925, "A",
         gongu_wrt_sn="9002060", wikisource_slug="감자_(소설)"),
    Book(31, "김동인", "배따라기", "단편소설", 1921, "A",
         gongu_wrt_sn="9002056", wikisource_slug="배따라기"),
    Book(32, "김동인", "광화사", "단편소설", 1929, "B",
         gongu_wrt_sn="9002063", wikisource_slug="광화사_(소설)"),
    Book(33, "김동인", "광염소나타", "단편소설", 1929, "B",
         gongu_wrt_sn="9002062", wikisource_slug="광염소나타"),
    Book(34, "김동인", "발가락이 닮았다", "단편소설", 1932, "B",
         gongu_wrt_sn="9002065", wikisource_slug="발가락이_닮았다"),

    # ── 채만식 (1950 사망) ──
    Book(35, "채만식", "레디메이드 인생", "단편소설", 1934, "A",
         gongu_wrt_sn="9002269", wikisource_slug="레디메이드_인생"),
    Book(36, "채만식", "치숙", "단편소설", 1938, "A",
         gongu_wrt_sn="9002275", wikisource_slug="치숙"),
    Book(37, "채만식", "탁류", "장편소설", 1937, "A",
         gongu_wrt_sn="9002276"),
    Book(38, "채만식", "태평천하", "장편소설", 1938, "A",
         gongu_wrt_sn="9002279"),

    # ── 이광수 (1950 사망 추정) ──
    Book(39, "이광수", "무정", "장편소설", 1917, "A",
         gongu_wrt_sn="9002150", wikisource_slug="무정_(소설)"),

    # ── 최서해 (1932 사망) ──
    Book(40, "최서해", "탈출기", "단편소설", 1925, "A",
         gongu_wrt_sn="9002264", wikisource_slug="탈출기"),
    Book(41, "최서해", "홍염", "단편소설", 1927, "B",
         gongu_wrt_sn="9002267", wikisource_slug="홍염_(최서해)"),

    # ── 심훈 (1936 사망) ──
    Book(42, "심훈", "상록수", "장편소설", 1935, "A",
         gongu_wrt_sn="9002184"),

    # ── 이육사 (1944 사망) ──
    Book(43, "이육사", "광야", "시", 1940, "A",
         gongu_wrt_sn="9003720", wikisource_slug="광야_(이육사)"),
    Book(44, "이육사", "절정", "시", 1940, "A",
         wikisource_slug="절정_(이육사)"),
    Book(45, "이육사", "청포도", "시", 1939, "A",
         gongu_wrt_sn="9003719", wikisource_slug="청포도_(이육사)"),

    # ── 강경애 (1944 사망) ──
    Book(46, "강경애", "인간문제", "장편소설", 1934, "B",
         gongu_wrt_sn="9002027"),

    # ── 전영택 (1954 사망) ──
    Book(47, "전영택", "화수분", "단편소설", 1925, "B",
         gongu_wrt_sn="9002248", wikisource_slug="화수분_(소설)"),

    # ── 방정환 (1931 사망) ──
    Book(48, "방정환", "만년샤쓰", "동화", 1927, "B",
         gongu_wrt_sn="9030099", wikisource_slug="만년샤쓰"),

    # ── 김내성 (1957 사망) ──
    Book(49, "김내성", "마인", "장편소설", 1939, "B",
         gongu_wrt_sn="9002042"),

    # ── 안국선 (1926 사망) ──
    Book(50, "안국선", "금수회의록", "소설", 1908, "B",
         gongu_wrt_sn="9002188", wikisource_slug="금수회의록"),
]


# ─── 수집 함수들 ───

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def safe_filename(author: str, title: str) -> str:
    """파일명에 안전한 문자열 생성"""
    name = f"{author}_{title}"
    name = re.sub(r'[\\/:*?"<>|]', '', name)
    name = name.replace(' ', '_')
    return name


def fetch_from_wikisource(slug: str) -> Optional[str]:
    """위키문헌에서 작품 텍스트 스크래핑"""
    url = f"https://ko.wikisource.org/wiki/{quote(slug)}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        # 본문 영역
        content = soup.find('div', class_='mw-parser-output')
        if not content:
            return None

        # 불필요한 요소 제거
        for tag in content.find_all(['table', 'style', 'script', 'sup']):
            tag.decompose()
        for tag in content.find_all('div', class_=['catlinks', 'navbox', 'metadata', 'noprint']):
            tag.decompose()
        for tag in content.find_all('span', class_=['mw-editsection']):
            tag.decompose()

        # 텍스트 추출
        lines = []
        for elem in content.children:
            text = elem.get_text(strip=True) if hasattr(elem, 'get_text') else str(elem).strip()
            if text:
                lines.append(text)

        text = '\n\n'.join(lines)

        # 너무 짧으면 실패로 처리
        if len(text) < 100:
            return None

        return text

    except Exception as e:
        log.warning(f"  위키문헌 실패 ({slug}): {e}")
        return None


def fetch_from_gongu(wrt_sn: str) -> Optional[str]:
    """공유마당에서 텍스트 파일 다운로드"""
    # txt 파일 다운로드 시도 (fileSn=1,2,3,4 중 txt가 있는 것)
    for file_sn in range(1, 6):
        url = f"https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileDownload.do?wrtSn={wrt_sn}&fileSn={file_sn}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)

            # Content-Disposition 헤더로 파일명 확인
            cd = resp.headers.get('Content-Disposition', '')
            content_type = resp.headers.get('Content-Type', '')

            # txt 파일인지 확인
            is_txt = '.txt' in cd.lower() or 'text/plain' in content_type

            if is_txt and len(resp.content) > 100:
                # 인코딩 감지
                text = None
                for enc in ['utf-8', 'euc-kr', 'cp949', 'utf-8-sig']:
                    try:
                        text = resp.content.decode(enc)
                        break
                    except (UnicodeDecodeError, LookupError):
                        continue

                if text and len(text) > 100:
                    return text

        except Exception as e:
            log.warning(f"  공유마당 파일 {file_sn} 실패 (wrtSn={wrt_sn}): {e}")
            continue

    return None


def fetch_gongu_page_text(wrt_sn: str) -> Optional[str]:
    """공유마당 작품 상세 페이지에서 원문보기 텍스트 추출"""
    url = f"https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn={wrt_sn}&menuNo=200019"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        # 원문 텍스트 영역 찾기
        content_area = soup.find('div', class_='view_cont') or soup.find('div', id='wrtContent')
        if content_area:
            text = content_area.get_text(strip=False)
            text = re.sub(r'\n{3,}', '\n\n', text).strip()
            if len(text) > 100:
                return text
    except Exception as e:
        log.warning(f"  공유마당 페이지 실패 (wrtSn={wrt_sn}): {e}")

    return None


def format_text(author: str, title: str, year: int, text: str) -> str:
    """수집된 텍스트에 메타데이터 헤더 추가"""
    header = f"""{'='*60}
{title}
{'='*60}

작가: {author}
발표: {year}년
저작권: 만료 (퍼블릭 도메인)
출처: 공유마당 / 위키문헌

{'─'*60}

"""
    return header + text.strip() + "\n"


def collect_book(book: Book) -> Book:
    """하나의 작품을 수집"""
    log.info(f"[{book.id:02d}/50] {book.author} - {book.title}")

    text = None

    # 1차: 위키문헌 시도 (텍스트 품질이 더 좋음)
    if book.wikisource_slug:
        log.info(f"  → 위키문헌 시도: {book.wikisource_slug}")
        text = fetch_from_wikisource(book.wikisource_slug)
        if text:
            book.source_used = "wikisource"
            log.info(f"  ✓ 위키문헌 성공 ({len(text):,}자)")

    # 2차: 공유마당 파일 다운로드
    if not text and book.gongu_wrt_sn:
        log.info(f"  → 공유마당 다운로드 시도: wrtSn={book.gongu_wrt_sn}")
        text = fetch_from_gongu(book.gongu_wrt_sn)
        if text:
            book.source_used = "gongu_file"
            log.info(f"  ✓ 공유마당 파일 성공 ({len(text):,}자)")

    # 3차: 공유마당 페이지 텍스트
    if not text and book.gongu_wrt_sn:
        log.info(f"  → 공유마당 페이지 텍스트 시도")
        text = fetch_gongu_page_text(book.gongu_wrt_sn)
        if text:
            book.source_used = "gongu_page"
            log.info(f"  ✓ 공유마당 페이지 성공 ({len(text):,}자)")

    # 결과 처리
    if text:
        formatted = format_text(book.author, book.title, book.year, text)
        filename = safe_filename(book.author, book.title) + ".txt"
        filepath = OUTPUT_DIR / book.author / filename
        ensure_dir(filepath.parent)
        filepath.write_text(formatted, encoding='utf-8')
        book.status = "downloaded"
        book.filepath = str(filepath)
        log.info(f"  ✅ 저장: {filepath}")
    else:
        book.status = "failed"
        book.error = "모든 소스에서 텍스트를 가져오지 못함"
        log.warning(f"  ❌ 실패: {book.author} - {book.title}")

    return book


def save_log(books: list[Book]):
    """수집 결과 로그 저장"""
    result = {
        "total": len(books),
        "downloaded": sum(1 for b in books if b.status == "downloaded"),
        "failed": sum(1 for b in books if b.status == "failed"),
        "pending": sum(1 for b in books if b.status == "pending"),
        "books": [asdict(b) for b in books]
    }
    Path(LOG_FILE).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


def print_summary(result: dict):
    """수집 결과 요약 출력"""
    print(f"\n{'='*60}")
    print(f"수집 완료 요약")
    print(f"{'='*60}")
    print(f"전체: {result['total']}권")
    print(f"성공: {result['downloaded']}권 ✅")
    print(f"실패: {result['failed']}권 ❌")
    print(f"대기: {result['pending']}권")

    if result['failed'] > 0:
        print(f"\n실패 목록:")
        for b in result['books']:
            if b['status'] == 'failed':
                print(f"  - {b['author']} / {b['title']}: {b.get('error', '알 수 없음')}")

    print(f"\n수집된 파일: {OUTPUT_DIR}/")
    print(f"로그 파일: {LOG_FILE}")


def main():
    """메인 실행"""
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  공유마당 + 위키문헌 저작권 만료 작품 수집 스크립트     ║
║  총 {len(BOOKS)}권 수집 예정                                     ║
╚══════════════════════════════════════════════════════════╝
    """)

    ensure_dir(OUTPUT_DIR)

    # 우선순위 선택
    if len(sys.argv) > 1 and sys.argv[1] == '--priority-a':
        targets = [b for b in BOOKS if b.priority == "A"]
        print(f"우선순위 A만 수집: {len(targets)}권\n")
    elif len(sys.argv) > 1 and sys.argv[1] == '--test':
        targets = BOOKS[:3]
        print(f"테스트 모드: {len(targets)}권만 수집\n")
    else:
        targets = BOOKS
        print(f"전체 수집: {len(targets)}권\n")

    # 수집 실행
    for i, book in enumerate(targets):
        collect_book(book)
        if i < len(targets) - 1:
            time.sleep(DELAY)

    # 결과 저장
    result = save_log(targets)
    print_summary(result)

    return 0 if result['failed'] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
