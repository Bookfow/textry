"""
TeXTREME PDF→EPUB 변환 API 품질 테스트
======================================
Gemini Flash 한글 텍스트 + 이미지 위치 추출 테스트
(Claude Haiku 결과는 이전 테스트에서 확보됨 → 최종 요약에서 비교)

사용법:
  1. GEMINI_API_KEY 설정
  2. PDF 파일 경로 설정
  3. python test_api_comparison.py 실행

필요 라이브러리:
  pip install pymupdf google-generativeai Pillow
"""

import os
import sys
import json
import time
import base64
from pathlib import Path

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# API 키 (직접 입력하거나 환경변수로 설정)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBp9oAS-c_bRTBKEbRoTIyAJcOwx05fIvY")

# 테스트할 PDF 경로
PDF_PATH = r"C:\Users\user\test\30가지 심리학 UX 디자인.pdf"  # 수정 필요

# 테스트할 페이지 번호 (1-based)
# 13: 텍스트만 있는 페이지
# 19: 뉴스기사 스크린샷 + 텍스트 혼합
# 21: 네이버 지식인 캡처 + 텍스트 혼합
TEST_PAGES = [13, 19, 21]

# 이미지 렌더링 DPI
RENDER_DPI = 200

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 공통 프롬프트
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXTRACTION_PROMPT = """이 PDF 페이지 이미지에서 콘텐츠를 추출해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 반환하세요.

{
  "elements": [
    {
      "type": "heading" | "paragraph" | "list_item" | "quote" | "image_placeholder",
      "level": 1 | 2 | 3,
      "text": "추출된 텍스트",
      "image_description": "이미지인 경우 설명"
    }
  ]
}

규칙:
1. "heading": 제목이나 소제목. level로 크기 구분 (1=대제목, 2=중제목, 3=소제목)
2. "paragraph": 일반 본문 텍스트
3. "list_item": 불릿 포인트나 번호 매기기 항목
4. "quote": 인용문이나 강조 박스
5. "image_placeholder": 페이지에 삽입된 이미지/스크린샷/도표가 있는 위치
   - text는 비워두고, image_description에 이미지 내용을 설명
   - 이미지 속에 텍스트가 있다면 image_description에 포함
6. 페이지 번호, 헤더/푸터는 제외
7. 텍스트는 원문 그대로 정확히 추출 (요약하지 말 것)
8. 볼드체 텍스트는 그대로 유지

JSON만 반환하세요."""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PDF → 이미지 변환
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def pdf_pages_to_images(pdf_path: str, pages: list[int], dpi: int = 200) -> dict[int, bytes]:
    """PDF 페이지들을 PNG 이미지로 변환"""
    import fitz  # pymupdf
    
    doc = fitz.open(pdf_path)
    images = {}
    
    for page_num in pages:
        page = doc[page_num - 1]  # 0-based index
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        images[page_num] = img_bytes
        print(f"  📄 Page {page_num}: {pix.width}x{pix.height}px ({len(img_bytes):,} bytes)")
    
    doc.close()
    return images


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Gemini Flash API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_gemini(image_bytes: bytes, model: str = "gemini-2.0-flash") -> dict:
    """Gemini Flash로 텍스트 추출 테스트"""
    import google.generativeai as genai
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    model_instance = genai.GenerativeModel(model)
    
    # 이미지를 PIL로 변환
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_bytes))
    
    start_time = time.time()
    
    response = model_instance.generate_content(
        [img, EXTRACTION_PROMPT],
        generation_config=genai.GenerationConfig(
            temperature=0,
            max_output_tokens=4000,
        )
    )
    
    elapsed = time.time() - start_time
    
    # 토큰 사용량 추출
    usage = {
        "input_tokens": getattr(response.usage_metadata, 'prompt_token_count', 'N/A'),
        "output_tokens": getattr(response.usage_metadata, 'candidates_token_count', 'N/A'),
        "elapsed_seconds": round(elapsed, 2)
    }
    
    return {
        "text": response.text,
        "usage": usage
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Claude Haiku API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_claude(image_bytes: bytes, model: str = "claude-haiku-4-5-20251001") -> dict:
    """Claude Haiku로 텍스트 추출 테스트"""
    import anthropic
    
    client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
    
    img_b64 = base64.b64encode(image_bytes).decode()
    
    start_time = time.time()
    
    response = client.messages.create(
        model=model,
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": img_b64
                        }
                    },
                    {
                        "type": "text",
                        "text": EXTRACTION_PROMPT
                    }
                ]
            }
        ]
    )
    
    elapsed = time.time() - start_time
    
    usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "elapsed_seconds": round(elapsed, 2)
    }
    
    return {
        "text": response.content[0].text,
        "usage": usage
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 결과 분석
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def parse_json_response(text: str) -> dict | None:
    """API 응답에서 JSON 추출"""
    # 마크다운 코드블록 제거
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # 첫 줄(```json)과 마지막 줄(```) 제거
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # JSON 부분만 추출 시도
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start:end])
            except:
                return None
    return None


def analyze_result(name: str, result: dict, page_num: int):
    """결과 분석 및 출력"""
    print(f"\n{'='*60}")
    print(f"  {name} — Page {page_num}")
    print(f"{'='*60}")
    
    # 메타 정보
    usage = result["usage"]
    print(f"  ⏱️  응답시간: {usage['elapsed_seconds']}초")
    print(f"  📊 입력토큰: {usage['input_tokens']} / 출력토큰: {usage['output_tokens']}")
    
    # JSON 파싱
    parsed = parse_json_response(result["text"])
    
    if parsed and "elements" in parsed:
        elements = parsed["elements"]
        
        # 타입별 카운트
        type_counts = {}
        for el in elements:
            t = el.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        print(f"\n  📋 추출된 요소:")
        for t, c in type_counts.items():
            emoji = {"heading": "📌", "paragraph": "📝", "list_item": "📎", 
                     "quote": "💬", "image_placeholder": "🖼️"}.get(t, "❓")
            print(f"     {emoji} {t}: {c}개")
        
        # 이미지 위치 정보
        images = [el for el in elements if el.get("type") == "image_placeholder"]
        if images:
            print(f"\n  🖼️  이미지 위치 감지:")
            for i, img in enumerate(images):
                desc = img.get("image_description", img.get("text", "설명 없음"))
                idx = elements.index(img)
                print(f"     [{i+1}] 위치: 요소 #{idx+1}")
                print(f"         설명: {desc[:100]}...")
        
        # 텍스트 미리보기 (처음 3개 요소)
        print(f"\n  📖 텍스트 미리보기 (처음 3개 요소):")
        for i, el in enumerate(elements[:3]):
            t = el.get("type", "?")
            text = el.get("text", "")[:100]
            print(f"     [{t}] {text}...")
        
        # 전체 텍스트 길이
        total_chars = sum(len(el.get("text", "")) for el in elements)
        print(f"\n  📏 총 추출 글자수: {total_chars:,}자")
        
    else:
        print(f"\n  ⚠️ JSON 파싱 실패. 원본 응답:")
        print(f"  {result['text'][:500]}...")
    
    return parsed


def calculate_cost(usage: dict, model_name: str) -> float:
    """비용 계산 (원)"""
    pricing = {
        # (input$/MTok, output$/MTok)
        "gemini-2.0-flash": (0.1, 0.4),
        "gemini-2.5-flash": (0.3, 2.5),
        "gemini-3-flash": (0.5, 3.0),
        "claude-haiku-4-5-20251001": (1.0, 5.0),
        "claude-sonnet-4-5-20250929": (3.0, 15.0),
    }
    
    usd_to_krw = 1300
    inp_price, out_price = pricing.get(model_name, (0, 0))
    
    inp_tokens = usage.get("input_tokens", 0)
    out_tokens = usage.get("output_tokens", 0)
    
    if isinstance(inp_tokens, str):  # 'N/A' 처리
        return 0
    
    cost_usd = (inp_tokens / 1_000_000) * inp_price + (out_tokens / 1_000_000) * out_price
    return round(cost_usd * usd_to_krw, 2)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 메인 실행
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    print("=" * 60)
    print("  TeXTREME API 비교 테스트")
    print("  Gemini Flash 한글 텍스트 + 이미지 위치 추출")
    print("  (Claude Haiku 결과는 이전 테스트에서 확보)")
    print("=" * 60)
    
    # PDF 경로 확인
    if not Path(PDF_PATH).exists():
        print(f"\n❌ PDF 파일을 찾을 수 없습니다: {PDF_PATH}")
        print("   PDF_PATH 변수를 올바른 경로로 수정해주세요.")
        sys.exit(1)
    
    # API 키 확인
    has_gemini = GEMINI_API_KEY and "여기에" not in GEMINI_API_KEY
    has_claude = False  # Claude 결과는 이미 확보됨 — Gemini만 테스트
    
    if not has_gemini:
        print("\n❌ Gemini API 키가 설정되지 않았습니다.")
        print("   GEMINI_API_KEY를 설정해주세요.")
        sys.exit(1)
    
    print(f"\n✅ Gemini API: 설정됨")
    print(f"⏭️  Claude API: 스킵 (이전 테스트 결과 사용)")
    
    # 테스트할 Gemini 모델들
    gemini_models = [
        "gemini-2.5-flash",
        # "gemini-3-flash",    # 필요시 주석 해제
    ]
    
    # Claude 모델 — 스킵 (이전 결과 사용)
    
    # PDF → 이미지 변환
    print(f"\n📄 PDF 페이지 → 이미지 변환 중...")
    images = pdf_pages_to_images(PDF_PATH, TEST_PAGES, RENDER_DPI)
    
    # 결과 저장
    all_results = {}
    
    for page_num in TEST_PAGES:
        img_bytes = images[page_num]
        all_results[page_num] = {}
        
        print(f"\n\n{'#'*60}")
        print(f"  📄 PAGE {page_num} 테스트 시작")
        print(f"{'#'*60}")
        
        # Gemini 테스트
        if has_gemini:
            for model in gemini_models:
                try:
                    print(f"\n  ⏳ {model} 호출 중...")
                    result = test_gemini(img_bytes, model)
                    all_results[page_num][model] = result
                    analyze_result(f"🔵 Gemini ({model})", result, page_num)
                    cost = calculate_cost(result["usage"], model)
                    print(f"  💰 이 페이지 비용: {cost}원")
                except Exception as e:
                    print(f"  ❌ {model} 오류: {e}")
    
    # ━━━ 최종 비교 요약 ━━━
    print(f"\n\n{'='*60}")
    print(f"  📊 최종 비교 요약")
    print(f"{'='*60}")
    
    # 이전 Claude Haiku 테스트 결과 (하드코딩)
    print(f"\n  🟠 claude-haiku-4-5-20251001 (이전 테스트 결과)")
    print(f"     페이지당 평균 비용: 7.6원")
    print(f"     페이지당 평균 시간: 9.0초")
    print(f"     총 추출 글자수: 1,280자")
    print(f"     이미지 감지 수: 2개")
    print(f"     300페이지 예상 원가: 2,267원")
    
    for model_name in gemini_models:
        total_cost = 0
        total_time = 0
        total_chars = 0
        image_detected = 0
        pages_tested = 0
        
        for page_num in TEST_PAGES:
            if model_name in all_results.get(page_num, {}):
                r = all_results[page_num][model_name]
                total_cost += calculate_cost(r["usage"], model_name)
                total_time += r["usage"]["elapsed_seconds"]
                pages_tested += 1
                
                parsed = parse_json_response(r["text"])
                if parsed and "elements" in parsed:
                    total_chars += sum(len(el.get("text", "")) for el in parsed["elements"])
                    image_detected += sum(1 for el in parsed["elements"] if el.get("type") == "image_placeholder")
        
        if pages_tested > 0:
            print(f"\n  🔵 {model_name}")
            print(f"     페이지당 평균 비용: {total_cost/pages_tested:.1f}원")
            print(f"     페이지당 평균 시간: {total_time/pages_tested:.1f}초")
            print(f"     총 추출 글자수: {total_chars:,}자")
            print(f"     이미지 감지 수: {image_detected}개")
            print(f"     300페이지 예상 원가: {total_cost/pages_tested*300:,.0f}원")
    
    # 결과 파일 저장
    output_dir = Path(PDF_PATH).parent
    output_file = output_dir / "api_comparison_results.json"
    
    # JSON 직렬화 가능하도록 정리
    save_data = {}
    for page_num, models in all_results.items():
        save_data[str(page_num)] = {}
        for model_name, result in models.items():
            save_data[str(page_num)][model_name] = {
                "raw_response": result["text"],
                "usage": result["usage"],
                "parsed": parse_json_response(result["text"])
            }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(save_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n\n💾 상세 결과 저장됨: {output_file}")
    print(f"\n✅ 테스트 완료!")


if __name__ == "__main__":
    main()
