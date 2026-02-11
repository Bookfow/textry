# Textry 개발 일지

**프로젝트:** 문서 스트리밍 플랫폼 (유튜브 방식)  
**개발 기간:** 2026년 2월 5일 - 2월 11일 (7일)  
**배포 URL:** https://textry-v1.vercel.app  
**GitHub:** https://github.com/Bookfow/textry

---

## 🎯 프로젝트 개요

PDF 문서를 업로드하고 유튜브처럼 소비할 수 있는 플랫폼
- 작가: 문서 업로드 → 광고 수익
- 독자: 무료로 읽기 → 좋아요/구독/댓글

---

## 📅 Day 1-2: 기본 설정

### 환경 세팅
- Next.js 16.1.6 (App Router, Turbopack)
- Supabase (PostgreSQL + Storage + Auth)
- Tailwind CSS + shadcn/ui

### 데이터베이스 테이블 생성
1. **profiles** - 사용자 (작가/독자)
2. **documents** - PDF 문서
3. **reading_sessions** - 읽기 기록

### 주요 기능
- 회원가입/로그인
- 역할 선택 (작가/독자)
- PDF 업로드
- Supabase Storage 설정

### 중요 결정사항
- 회원가입 시 profiles 테이블 자동 생성 (Trigger 사용)
- 작가/독자 역할 분리

---

## 📅 Day 3-4: PDF 뷰어 & 수익 모델

### PDF 뷰어 구현
- react-pdf 사용
- 페이지 넘기기
- 줌 인/아웃
- 읽기 진행률 저장

### 광고 시스템
- 3페이지마다 광고 배너
- AdSense 스타일 시뮬레이션

### 수익 대시보드
- 조회수 기반 수익: $0.01/view
- 읽기 시간 기반 수익: $0.05/분
- 총 수익 계산

### 검색 기능
- Browse 페이지
- 제목/설명 검색

### 중요 결정사항
- PDF.js 로컬 에러 무시 (프로덕션 정상)
- 광고는 시뮬레이션 (실제 AdSense 연동 가능)

---

## 📅 Day 5: 소셜 기능

### 좋아요/싫어요 시스템
- document_reactions 테이블
- 중복 방지 (UNIQUE 제약)
- 실시간 카운트 업데이트

### 구독 시스템
- subscriptions 테이블
- 구독자 수 표시
- 구독/구독 취소

### 홈 피드 개편
- **인기 문서**: 좋아요순
- **구독 중인 작가**: 최신순
- **이어 읽기**: 완료 안 한 문서
- **추천**: 읽기 기록 기반

### 중요 결정사항
- 버튼 색상 문제 해결 (hover 전엔 안 보임 → 명시적 색상 지정)
- 홈 피드는 로그인 필수 (비로그인 시 랜딩 페이지로 리다이렉트)

---

## 📅 Day 6: 댓글 & 읽기 목록

### 댓글 시스템
- comments 테이블 (parent_id로 답글 구조)
- comment_likes 테이블
- 댓글 작성/삭제
- 좋아요
- 정렬 (최신순/인기순)

### 답글 시스템 문제 해결
- **문제**: 답글 입력 시 포커스 상실, 내용 사라짐
- **시도**: ReplyInput 분리, useRef, useCallback, uncontrolled component (모두 실패)
- **해결**: Modal(Dialog) 방식 채택
  - shadcn Dialog 컴포넌트 사용
  - 답글 버튼 → 팝업 → 답글 작성
  - 완벽 작동 ✅

### 댓글/답글 삭제
- 본인 댓글만 삭제 가능
- 삭제 확인 알림
- CASCADE 삭제 (댓글 삭제 시 답글도 삭제)

### 읽기 목록
- reading_list 테이블
- 북마크 추가/제거
- 읽기 목록 페이지

### 랜딩 페이지
- 그라디언트 디자인
- 주요 기능 소개
- CTA 버튼
- 로그인 시 /home으로 자동 리다이렉트

### 중요 결정사항
- 답글 Modal 방식이 UX도 더 좋음
- 문제 발생 시 대체 방안 즉시 제시 원칙

---

## 📅 Day 7: 카테고리 & 프로필

### 카테고리 시스템
- lib/categories.ts (기술, IT/컴퓨터, 비즈니스, 소설 등 12개)
- 업로드 시 카테고리 선택
- Browse 페이지 카테고리 필터
- 문서 카드에 아이콘 표시

### 문서 삭제 기능
- 대시보드에서 삭제 버튼
- Storage + DB 동시 삭제
- 삭제 확인 알림

### 프로필 페이지
- `/profile/[userId]`
- 프로필 정보 (이름, 역할, 구독자 수)
- 작가: 업로드한 문서 목록
- 독자: 좋아한 문서 목록
- 프로필 편집 (이름 변경)
- 다른 사람 프로필: 구독 버튼

### 중요 결정사항
- 작가 이름 클릭 → 프로필로 이동
- 댓글 작성자 이름 클릭 → 프로필로 이동
- user.role → profile?.role 수정 (버그 수정)

---

## 📅 Day 8: 검색 & 언어

### 검색 개선
- 제목 + 설명 + **작가명** 검색
- 정렬 옵션 (최신순, 인기순, 조회수순)
- 카테고리 + 검색 조합

### 언어 필터
- documents 테이블에 language 컬럼 추가
- lib/languages.ts (한국어, 영어, 일본어, 중국어 등 13개)
- 업로드 시 언어 선택
- Browse 페이지 언어 필터
- 카테고리 + 언어 조합 필터

### 중요 결정사항
- 카테고리와 언어를 별도 필드로 분리 (추천)
- 전세계 언어 전체는 너무 많음 → 주요 언어만

---

## 📅 Day 9: 알림 & 마무리

### 알림 시스템
- notifications 테이블
- 작가가 문서 업로드 → 구독자들에게 알림 (Trigger 자동)
- 헤더에 알림 벨 🔔
- 안 읽은 알림 개수 배지
- 알림 클릭 → 문서로 이동
- 모두 읽음 처리

### 프로필 메뉴
- 헤더에 프로필 아바타 (첫 글자)
- 드롭다운 메뉴
  - 내 프로필
  - 로그아웃
- 기존 로그아웃 버튼 제거

### 로그아웃 리다이렉트
- 로그아웃 시 랜딩 페이지(/)로 이동
- 로그인 페이지(/login) 아님

### 중요 결정사항
- 간단한 알림 (DB + 아이콘)
- 실시간 알림, 푸시 알림은 추후
- 10초마다 알림 새로고침

---

## 🎯 최종 완성 기능 (18개)

### 사용자 기능
1. ✅ 회원가입/로그인 (작가/독자)
2. ✅ PDF 뷰어 & 읽기
3. ✅ 좋아요/싫어요
4. ✅ 구독 시스템
5. ✅ 댓글 & 답글
6. ✅ 읽기 목록
7. ✅ 프로필 페이지
8. ✅ 알림 시스템
9. ✅ 프로필 메뉴

### 콘텐츠 발견
10. ✅ 홈 피드 (인기/구독/이어읽기)
11. ✅ 카테고리 시스템
12. ✅ 언어 필터
13. ✅ 검색 (제목/설명/작가명 + 정렬)
14. ✅ 랜딩 페이지

### 작가 기능
15. ✅ 문서 업로드
16. ✅ 대시보드 (통계 + 수익)
17. ✅ 문서 삭제

### 수익 모델
18. ✅ 광고 시스템

---

## 🔧 기술적 해결 과정

### 1. 답글 입력 문제
- **증상**: 입력 시 포커스 상실, 내용 사라짐
- **원인**: React state 업데이트로 리렌더링
- **해결**: Modal 방식 채택

### 2. 버튼 색상 문제
- **증상**: hover 전엔 버튼 안 보임
- **원인**: variant="outline"만 사용
- **해결**: 명시적 색상 클래스 추가

### 3. user.role 접근 에러
- **증상**: 작가 버튼 안 보임
- **원인**: user.role이 아니라 profile.role
- **해결**: profile?.role로 변경

### 4. 로그아웃 후 /home 접근
- **증상**: 로그아웃 후에도 홈 피드 일부 보임
- **원인**: useEffect 리다이렉트 타이밍
- **해결**: authLoading 체크 후 리다이렉트

### 5. Link import 누락
- **증상**: 빌드 에러
- **원인**: import Link from 'next/link' 누락
- **해결**: import 추가

---

## 📊 데이터베이스 구조

### 테이블 (9개)
1. profiles
2. documents
3. reading_sessions
4. document_reactions
5. subscriptions
6. comments
7. comment_likes
8. reading_list
9. notifications

### Storage Bucket
- documents (PDF 파일)

---

## 🚀 배포 히스토리

### Vercel 프로젝트
- 초기: textry (삭제)
- 최종: textry-v1
- URL: https://textry-v1.vercel.app

### GitHub
- Repository: Bookfow/textry
- Branch: main

---

## ⚠️ 알려진 이슈 & 해결

### PDF.js DOMMatrix 에러
- **환경**: 로컬 개발 (npm run dev)
- **증상**: DOMMatrix is not defined
- **해결**: 프로덕션 빌드에서는 정상 작동
- **조치**: 무시 가능

### Fast Refresh 경고
- **환경**: Turbopack
- **증상**: Fast Refresh 관련 경고
- **해결**: Next.js 16 버전 이슈
- **조치**: 무시 가능

---

## 🎓 배운 점 & 팁

### React 상태 관리
- 입력창 문제는 Modal로 우회 가능
- useRef vs controlled component 선택 중요

### Supabase
- Trigger로 자동화 가능 (알림, 프로필 생성)
- RLS 정책 필수
- CASCADE 삭제 유용

### Next.js App Router
- 동적 라우팅: [id], [userId]
- 클라이언트 컴포넌트: 'use client'
- useRouter vs router.push vs Link

### shadcn/ui
- 필요한 컴포넌트만 설치
- Dialog, Select, DropdownMenu 유용

---

## 📝 개발 원칙

1. **문제 발생 시 대체 방안 즉시 제시**
2. **사용자 요청: 끝내자고 하기 전까지 계속**
3. **"완" = 완료 (간단하게)**
4. **빌드 에러는 즉시 해결**
5. **배포 후 항상 테스트**

---

## 🎯 향후 개선 가능 사항

### 기술
- 실시간 알림 (Supabase Realtime)
- 푸시 알림 (브라우저)
- 이메일 알림
- 실제 AdSense 연동
- 이미지 업로드 (커버 이미지)
- 문서 수정 기능

### 기능
- 태그 시스템
- 플레이리스트/컬렉션
- 북마크 (페이지 단위)
- 하이라이트/메모
- 공유 기능
- 통계 그래프
- 관리자 페이지

### UX
- 다크 모드
- 반응형 개선
- 로딩 스켈레톤
- 에러 바운더리
- Toast 알림

---

## 📞 참고 정보

- **Supabase Project ID**: qurknvhesqtuivipdyyu
- **Node.js**: 20.x
- **개발 포트**: 3000
- **Vercel CLI**: `vercel --prod`

---

**✅ MVP 완성: 2026년 2월 11일**
**✅ 7일간의 개발 여정 완료**