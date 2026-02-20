#!/bin/bash
# 초기 라이브러리 구축 파이프라인
# 사용법:
#   ./run.sh              전체 50권 수집 + epub 변환
#   ./run.sh --priority-a 우선순위 A만 (23권)
#   ./run.sh --test       테스트 (3권만)

set -e

echo "=========================================="
echo " 전자책 서비스 초기 라이브러리 구축"
echo "=========================================="
echo ""

# 1. 필수 패키지 설치
echo "[1/3] 패키지 확인..."
pip install requests beautifulsoup4 lxml ebooklib --break-system-packages -q 2>/dev/null
echo "  ✓ 패키지 준비 완료"
echo ""

# 2. 텍스트 수집
echo "[2/3] 공유마당 + 위키문헌에서 텍스트 수집..."
python3 collect_books.py $@
echo ""

# 3. epub 변환
echo "[3/3] txt → epub 변환..."
python3 convert_to_epub.py
echo ""

# 결과 요약
echo "=========================================="
echo " 완료!"
echo "=========================================="
echo ""
echo " 수집된 텍스트: collected_texts/"
echo " 생성된 epub:   epub_output/"
echo " 수집 로그:     collection_log.json"
echo " 변환 로그:     conversion_log.json"
echo ""
echo " 다음 단계: epub_output/ 의 파일들을 서비스에 업로드하세요."
