# 전자책 서비스 초기 라이브러리 수집 도구

저작권 만료 한국 문학 작품을 공유마당 + 위키문헌에서 자동 수집하여 epub으로 변환합니다.

## 구조

```
├── run.sh              # 전체 파이프라인 (수집 + 변환)
├── collect_books.py    # 텍스트 수집 스크립트
├── convert_to_epub.py  # txt → epub 변환 스크립트
├── collected_texts/    # 수집된 txt 파일 (작가별 폴더)
├── epub_output/        # 생성된 epub 파일
├── collection_log.json # 수집 결과 로그
└── conversion_log.json # 변환 결과 로그
```

## 사용법

```bash
# 전체 50권 수집 + 변환
chmod +x run.sh
./run.sh

# 우선순위 A만 (교과서 수록작 등 23권)
./run.sh --priority-a

# 테스트 (3권만)
./run.sh --test
```

## 수집 소스

| 소스 | URL | 설명 |
|------|-----|------|
| 공유마당 | gongu.copyright.or.kr | 한국저작권위원회 운영, txt/hwp 파일 제공 |
| 위키문헌 | ko.wikisource.org | 위키미디어 프로젝트, 정제된 텍스트 |

수집 우선순위: 위키문헌 → 공유마당 파일 다운로드 → 공유마당 페이지 텍스트

## 저작권 기준

- **기준**: 1963년 1월 1일 이전 사망 작가 → 저작권 확실 만료
- **근거**: 한미 FTA 이전(2013.7.1) 이미 보호기간(사후 50년) 만료 → 소급 적용 없음
- 목록의 모든 작가는 1957년 이전 사망으로 안전

## 작품 목록 수정

`collect_books.py`의 `BOOKS` 리스트에서 작품을 추가/수정/삭제할 수 있습니다.

```python
Book(번호, "작가", "제목", "장르", 발표년도, "우선순위",
     gongu_wrt_sn="공유마당번호",
     wikisource_slug="위키문헌_URL_slug")
```

### 공유마당 번호 찾기
1. gongu.copyright.or.kr 접속
2. 작품 검색
3. URL의 `wrtSn=` 값이 번호

### 위키문헌 slug 찾기
1. ko.wikisource.org에서 작품 검색
2. URL의 `/wiki/` 뒤 부분이 slug (공백은 `_`로)

## 주의사항

- 크롤링 예의를 위해 요청 간 2초 딜레이 설정
- 공유마당/위키문헌 서버 상태에 따라 일부 실패 가능 (재실행하면 됨)
- `collection_log.json`에서 실패 목록 확인 후 수동 보완 가능
