#!/usr/bin/env python3
"""
추가 콘텐츠 12권 자동 수집 v2 — 위키문헌
페이지명 수정 + allpages API로 하위 페이지 탐색

사용법:
  pip install requests beautifulsoup4
  python collect_additional.py
"""

import requests
from bs4 import BeautifulSoup
import os, time, re, sys

OUTPUT_DIR = "collected_additional"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIKI_API = "https://ko.wikisource.org/w/api.php"
HEADERS = {"User-Agent": "KoreanClassicsCollector/2.0 (Educational ebook project)"}


def wiki_get_text(title):
    """위키문헌 페이지 본문 텍스트 가져오기"""
    params = {"action": "parse", "page": title, "prop": "text", "format": "json"}
    try:
        resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=20)
        data = resp.json()
        if "error" in data or "parse" not in data:
            return None
        html = data["parse"]["text"]["*"]
        soup = BeautifulSoup(html, "html.parser")

        # 편집 링크, 각주 등 제거
        for tag in soup.select(".mw-editsection, .reference, .reflist, .noprint, .catlinks, style, script"):
            tag.decompose()

        text = soup.get_text(separator="\n")
        lines = text.split("\n")
        clean = []
        skip = ["이 저작물은", "퍼블릭 도메인", "원본 주소", "분류:", "Public domain",
                "위키문헌", "자매 프로젝트", "↑", "falsefalse", "PD-old",
                "미국에서 퍼블릭", "저작권이 소멸", "1931년에서", "1930년에서",
                "1923년에서", "주의 ", "숨은 분류", "검색", "내용 폭", "레이아웃"]
        for line in lines:
            s = line.strip()
            if not s:
                clean.append("")
                continue
            if any(p in s for p in skip):
                continue
            # 숫자만 있는 줄 (페이지 ID 등) 스킵
            if re.match(r'^\d+[가-힣]{2,4}$', s):
                continue
            clean.append(s)

        result = "\n".join(clean).strip()
        # 앞뒤 빈줄 정리
        while "\n\n\n" in result:
            result = result.replace("\n\n\n", "\n\n")
        return result if len(result) > 20 else None
    except Exception as e:
        print(f"      오류: {e}")
        return None


def wiki_find_subpages(prefix):
    """allpages API로 특정 접두사의 모든 하위 페이지 찾기"""
    pages = []
    params = {
        "action": "query", "list": "allpages",
        "apprefix": prefix + "/",  # 슬래시 포함해서 하위만
        "apnamespace": 0, "aplimit": 200, "format": "json"
    }
    try:
        resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=15)
        data = resp.json()
        for p in data.get("query", {}).get("allpages", []):
            title = p["title"]
            # 2단 이상 하위 페이지는 제외 (예: 님의_침묵/시/뭔가)
            depth = title.count("/") - prefix.count("/")
            if depth == 1:
                pages.append(title)
    except Exception as e:
        print(f"      allpages 오류: {e}")

    # allpages가 prefix/ 형태를 못 찾을 수 있음 → prefix 없이 재시도
    if not pages:
        params["apprefix"] = prefix
        try:
            resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=15)
            data = resp.json()
            for p in data.get("query", {}).get("allpages", []):
                title = p["title"]
                if "/" in title and title.startswith(prefix):
                    pages.append(title)
        except:
            pass

    return pages


def collect_poetry_collection(parent_title, book_title, author, filename):
    """시집 전체 수집 — allpages로 하위 페이지 자동 탐색"""
    print(f"\n  📖 {author} - {book_title}")
    print(f"     소스: {parent_title}")

    subpages = wiki_find_subpages(parent_title)
    if not subpages:
        print(f"     ❌ 하위 페이지를 찾을 수 없습니다 (0편)")
        return False

    print(f"     발견: {len(subpages)}편")

    full_text = f"{book_title}\n{author}\n\n{'='*40}\n\n"
    collected = 0

    for sp in subpages:
        poem_title = sp.split("/")[-1]
        print(f"     수집: {poem_title}...", end=" ", flush=True)
        text = wiki_get_text(sp)
        if text:
            full_text += f"\n{poem_title}\n\n{text}\n\n{'─'*30}\n"
            collected += 1
            print("✅")
        else:
            print("❌")
        time.sleep(0.3)

    if collected > 0:
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"     ✅ 저장: {filename} ({collected}편)")
        return True
    return False


def collect_multiple_pages(pages_dict, book_title, author, filename):
    """여러 개별 페이지를 하나로 묶어 수집"""
    print(f"\n  📖 {author} - {book_title}")
    full_text = f"{book_title}\n{author}\n\n{'='*40}\n\n"
    collected = 0

    for sub_title, wiki_title in pages_dict.items():
        print(f"     수집: {sub_title}...", end=" ", flush=True)
        text = wiki_get_text(wiki_title)
        if text:
            full_text += f"\n{sub_title}\n\n{text}\n\n{'─'*30}\n"
            collected += 1
            print(f"✅ ({len(text)}자)")
        else:
            print("❌")
        time.sleep(0.3)

    if collected > 0:
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"     ✅ 저장: {filename} ({collected}편)")
        return True
    print(f"     ❌ 수집 실패")
    return False


def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║  추가 콘텐츠 12권 자동 수집 v2                     ║")
    print("║  시집 + 수필 + 고전소설 (위키문헌)                  ║")
    print("╚══════════════════════════════════════════════════════╝")

    success = fail = 0

    # ═══════════════════════════════════════════════════
    print("\n" + "═"*55)
    print("  📚 카테고리 1: 시집")
    print("═"*55)

    # 1-1. 김소월 — 진달래꽃 (시집)
    # 하위 페이지: 진달래꽃 (시집)/먼 후일, 진달래꽃 (시집)/산유화 ...
    if collect_poetry_collection("진달래꽃 (시집)", "진달래꽃", "김소월", "김소월_진달래꽃.txt"):
        success += 1
    else:
        fail += 1

    # 1-2. 윤동주 — 하늘과 바람과 별과 시
    # 두 버전 있음: 연도 없는 것, (1948년), (1955년)
    # 먼저 연도 없는 것 시도, 안되면 1948년 시도
    if collect_poetry_collection("하늘과 바람과 별과 시", "하늘과 바람과 별과 시", "윤동주", "윤동주_하늘과바람과별과시.txt"):
        success += 1
    elif collect_poetry_collection("하늘과 바람과 별과 시 (1948년)", "하늘과 바람과 별과 시", "윤동주", "윤동주_하늘과바람과별과시.txt"):
        success += 1
    else:
        fail += 1

    # 1-3. 한용운 — 님의 침묵
    # 하위 페이지: 님의 침묵/님의 침묵, 님의 침묵/복종 ...
    if collect_poetry_collection("님의 침묵", "님의 침묵", "한용운", "한용운_님의침묵.txt"):
        success += 1
    else:
        fail += 1

    # 1-4. 이육사 시선집
    pages = {
        "광야": "광야_(이육사)",
        "절정": "절정_(시)",
        "청포도": "청포도_(시)",
        "꽃": "꽃_(이육사)",
        "교목": "교목_(시)",
    }
    if collect_multiple_pages(pages, "이육사 시선집", "이육사", "이육사_시선집.txt"):
        success += 1
    else:
        fail += 1

    # 1-5. 이상화 시선집
    pages = {
        "빼앗긴 들에도 봄은 오는가": "빼앗긴_들에도_봄은_오는가",
        "나의 침실로": "나의_침실로",
    }
    if collect_multiple_pages(pages, "이상화 시선집", "이상화", "이상화_시선집.txt"):
        success += 1
    else:
        fail += 1

    # 1-6. 박인환 시선집
    pages = {
        "목마와 숙녀": "목마와_숙녀",
        "세월이 가면": "세월이_가면",
        "인천항": "인천항_(시)",
    }
    if collect_multiple_pages(pages, "박인환 시선집", "박인환", "박인환_시선집.txt"):
        success += 1
    else:
        fail += 1

    # ═══════════════════════════════════════════════════
    print("\n" + "═"*55)
    print("  📝 카테고리 2: 수필/논설")
    print("═"*55)

    # 2-1. 이광수 논설집
    pages = {
        "문학이란 하오": "문학이란 하(何)오",
        "민족개조론": "민족개조론",
        "어린 벗에게": "어린_벗에게",
    }
    if collect_multiple_pages(pages, "이광수 논설·수필 선집", "이광수", "이광수_논설수필선집.txt"):
        success += 1
    else:
        fail += 1

    # 2-2. 방정환 선집
    pages = {
        "어린이 찬미": "어린이_찬미",
        "만년셔츠": "만년셔츠",
        "어린이 선언": "어린이날_선언",
    }
    if collect_multiple_pages(pages, "방정환 선집", "방정환", "방정환_선집.txt"):
        success += 1
    else:
        fail += 1

    # 2-3. 3·1 독립선언서 등 역사 문서
    pages = {
        "3·1 독립선언서": "3·1독립선언서",
        "대한독립선언서": "대한독립선언서",
    }
    if collect_multiple_pages(pages, "독립선언서 모음", "손병희 외", "독립선언서_모음.txt"):
        success += 1
    else:
        fail += 1

    # ═══════════════════════════════════════════════════
    print("\n" + "═"*55)
    print("  🧒 카테고리 3: 한국 고전소설")
    print("═"*55)

    # 3-1. 판소리계 소설
    classic_1 = {
        "춘향가": "춘향가",
        "흥부전": "흥부전",
        "심청전": "심청전",
        "별주부전": "별주부전",
    }
    if collect_multiple_pages(classic_1, "한국 고전소설 모음 1 (판소리계)", "작자 미상", "고전소설모음1_판소리계.txt"):
        success += 1
    else:
        fail += 1

    # 3-2. 영웅/풍자 소설
    classic_2 = {
        "홍길동전 (경판본)": "홍길동전 (30장 경판본)",
        "홍길동전 (현대어)": "홍길동전 36장 완판본/현대어 해석",
        "허생전": "허생전",
        "양반전": "양반전",
        "호질": "호질",
    }
    if collect_multiple_pages(classic_2, "한국 고전소설 모음 2 (영웅·풍자)", "허균·박지원 외", "고전소설모음2_영웅풍자.txt"):
        success += 1
    else:
        fail += 1

    # 3-3. 가정/꿈 소설
    classic_3 = {
        "장화홍련전": "장화홍련전",
        "콩쥐팥쥐전": "콩쥐팥쥐전",
        "사씨남정기": "사씨남정기",
    }
    if collect_multiple_pages(classic_3, "한국 고전소설 모음 3 (가정·꿈)", "김만중 외", "고전소설모음3_가정꿈.txt"):
        success += 1
    else:
        fail += 1

    # ═══════════════════════════════════════════════════
    print(f"\n{'═'*55}")
    print(f"  수집 완료: 성공 {success}권 / 실패 {fail}권")
    print(f"  저장 위치: {OUTPUT_DIR}/")
    print(f"{'═'*55}")
    print(f"\n  다음 단계: python convert_additional.py 로 epub 변환")


if __name__ == "__main__":
    main()
