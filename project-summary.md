# Textry 프로젝트 요약

## 📌 프로젝트 개요
Next.js 14 + Supabase 기반 문서 스트리밍 플랫폼
- YouTube 스타일 UI/UX
- 실시간 문서 읽기 및 공유
- 작가-독자 상호작용

## 🛠 기술 스택
- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **UI Components**: shadcn/ui
- **배포**: Vercel

## ✅ 완성된 기능 (총 20개)

### 인증 & 프로필
1. 회원가입/로그인 (Supabase Auth)
2. 프로필 관리 (username, avatar)
3. 작가/독자 역할 구분

### 문서 관리
4. 문서 업로드 (TXT, PDF, DOCX, MD)
5. 썸네일 업로드 (5MB, 3:4 비율)
6. 썸네일 수정 (대시보드)
7. 문서 삭제
8. 카테고리/언어 설정
9. 문서 설명 & 메타데이터

### UI/UX
10. YouTube 스타일 레이아웃
11. 햄버거 메뉴 + 사이드바 토글
12. 반응형 디자인 (모바일/태블릿/데스크톱)
13. 헤더 고정, 사이드바 고정
14. 검색/필터 (카테고리, 언어, 정렬)
15. 책 모양 카드 디자인 (3:4 비율)

### 소셜 기능
16. 댓글/답글 시스템
17. 좋아요/싫어요
18. 구독 시스템
19. 읽기 목록
20. 대시보드 (통계, 내 문서)

## 📂 주요 파일 구조
```
textry/
├── app/
│   ├── layout.tsx (루트, AuthProvider)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── (main)/
│       ├── layout.tsx (메인 레이아웃, 사이드바+헤더)
│       ├── home/page.tsx (추천 문서)
│       ├── browse/page.tsx (문서 둘러보기)
│       ├── upload/page.tsx (문서 업로드)
│       ├── dashboard/page.tsx (대시보드)
│       ├── reading-list/page.tsx (읽기 목록)
│       ├── read/[id]/page.tsx (문서 읽기)
│       ├── profile/[userId]/page.tsx (프로필)
│       └── author/[authorId]/page.tsx (작가 페이지)
│
├── components/
│   ├── sidebar.tsx (사이드바, 토글 기능)
│   ├── main-header.tsx (헤더, 검색/필터)
│   ├── profile-menu.tsx (프로필 드롭다운)
│   ├── notifications-bell.tsx (알림)
│   ├── comments-section.tsx (댓글/답글)
│   └── ui/ (shadcn/ui 컴포넌트들)
│
├── lib/
│   ├── supabase.ts (Supabase 클라이언트, 타입 정의)
│   ├── auth-context.tsx (AuthProvider)
│   ├── categories.ts (카테고리 정의)
│   └── languages.ts (언어 정의)
│
└── .env.local
    ├── NEXT_PUBLIC_SUPABASE_URL
    └── NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 🗄 데이터베이스 스키마

### profiles
- id (UUID, PK)
- email (TEXT)
- username (TEXT)
- avatar_url (TEXT)
- role ('reader' | 'author')
- subscribers_count (INTEGER)

### documents
- id (UUID, PK)
- title (TEXT)
- description (TEXT)
- category (TEXT)
- language (TEXT)
- file_path (TEXT)
- thumbnail_url (TEXT)
- author_id (UUID, FK)
- file_size (BIGINT)
- total_reading_time (INTEGER)
- view_count (INTEGER)
- likes_count (INTEGER)
- dislikes_count (INTEGER)
- is_published (BOOLEAN)

### comments
- id (UUID, PK)
- document_id (UUID, FK)
- user_id (UUID, FK)
- parent_id (UUID, FK, nullable)
- content (TEXT)
- likes_count (INTEGER)

### subscriptions
- subscriber_id (UUID, FK)
- author_id (UUID, FK)

### reading_list
- user_id (UUID, FK)
- document_id (UUID, FK)

### reading_progress
- user_id (UUID, FK)
- document_id (UUID, FK)
- progress (INTEGER)
- last_position (INTEGER)

## 📦 Supabase Storage

### documents 버킷
- 경로: `{user_id}/{timestamp}.{ext}`
- 제한: 100MB
- Public: false

### thumbnails 버킷
- 경로: `{user_id}/{timestamp}.{ext}`
- 제한: 5MB
- Public: true
- 권장: 600x800px (3:4 비율)

### avatars 버킷
- 경로: `{user_id}/{timestamp}.{ext}`
- 제한: 2MB
- Public: true

## 🎨 UI 설정

### 색상
- Primary: Blue (600)
- Secondary: Purple (600)
- Gradient: Blue → Purple

### 반응형 Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px (사이드바 토글 기준)
- xl: 1280px (사이드바 자동 펼침)

### 사이드바
- 닫힘: 16px (아이콘만)
- 열림: 240px (아이콘 + 텍스트)
- 모바일: 햄버거 메뉴로 열기/닫기
- 데스크톱(xl+): 화면 크기에 따라 자동 조정

## 📋 카테고리
- technology (💻 기술)
- it (🖥️ IT/컴퓨터)
- business (💼 비즈니스)
- novel (📖 소설)
- essay (✍️ 에세이)
- science (🔬 과학)
- art (🎨 예술)
- education (🎓 교육)
- health (💪 건강)
- food (🍳 요리)
- travel (✈️ 여행)
- other (📝 기타)

## 🌍 언어
- ko (🇰🇷 한국어)
- en (🇺🇸 English)
- ja (🇯🇵 日本語)
- zh (🇨🇳 中文)
- es (🇪🇸 Español)
- fr (🇫🇷 Français)
- de (🇩🇪 Deutsch)
- other (🌐 기타)

## 🚀 배포 정보
- Platform: Vercel
- 도메인: [배포 후 설정]
- 환경변수: Vercel Dashboard에서 설정

## 📝 주요 타입 정의 (lib/supabase.ts)
```typescript
export type Profile = {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  role: 'reader' | 'author'
  subscribers_count: number
  created_at: string
}

export type Document = {
  id: string
  title: string
  description: string | null
  category: string
  language: string
  file_path: string
  thumbnail_url: string | null
  author_id: string
  file_size: number
  total_reading_time: number
  view_count: number
  likes_count: number
  dislikes_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  document_id: string
  user_id: string
  content: string
  parent_id: string | null
  likes_count: number
  created_at: string
}

export type CommentWithProfile = Comment & {
  profile: Profile
  replies?: CommentWithProfile[]
}
```

## 🔑 주요 기능 작동 방식

### 사이드바 토글
- `app/(main)/layout.tsx`에서 `sidebarOpen` 상태 관리
- 화면 크기 1280px(xl) 기준으로 자동 조정
- 햄버거 메뉴로 수동 토글 가능
- 모바일: 메뉴 클릭 시 사이드바 닫힘
- 데스크톱: 메뉴 클릭 시 사이드바 유지

### 썸네일 시스템
1. 업로드 페이지에서 이미지 선택
2. 미리보기 표시 (FileReader)
3. Supabase Storage에 업로드
4. 공개 URL 획득
5. documents 테이블에 thumbnail_url 저장
6. 대시보드에서 수정 가능

### 댓글/답글
- 최상위 댓글: parent_id = null
- 답글: parent_id = 부모 댓글 ID
- CASCADE 삭제: 댓글 삭제 시 답글도 함께 삭제
- 좋아요: comment_likes 테이블

## 🐛 알려진 이슈 & 해결
- ✅ AuthProvider 에러 → app/layout.tsx에 AuthProvider 추가
- ✅ Progress 컴포넌트 에러 → HTML progress bar로 대체
- ✅ 사이드바 토글 안 됨 → isOpen 상태 제대로 적용
- ✅ 화면 축소 시 사이드바 안 접힘 → resize 이벤트 리스너 추가

## 📅 개발 히스토리
- Day 1-9: 기본 기능 구현 (18개)
- Day 10: 유튜브 스타일 UI + 썸네일 시스템 (20개 완성)

## 🎯 다음 작업 (예정)
- 문서 검색 기능 강화
- 알림 시스템 완성
- 수익 정산 시스템
- 추천 알고리즘
- 읽기 진행률 저장/복원