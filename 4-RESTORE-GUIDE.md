# Textry 완벽 복원 가이드

**이 가이드는 프로젝트를 처음부터 완벽하게 복원하는 방법입니다.**

**복원 시간:** 약 1시간  
**난이도:** ⭐⭐⭐ (중상)

---

## 🎯 복원 시나리오

### 시나리오 1: 새 컴퓨터에서 시작
- GitHub에서 클론
- Supabase 새 프로젝트 생성
- 환경 변수 설정
- 배포

### 시나리오 2: 프로젝트 삭제 후 복구
- GitHub에서 클론
- 기존 Supabase 재사용 또는 새로 생성
- 환경 변수 복구
- 배포

### 시나리오 3: 다른 사람에게 전달
- GitHub 공유 또는 ZIP 파일 전달
- 수신자가 Supabase 생성
- 환경 변수 각자 설정
- 각자 배포

---

## 📦 준비물

### 필수 파일
1. ✅ `1-DEVELOPMENT-LOG.md` (개발 과정)
2. ✅ `2-SUPABASE-SCHEMA.sql` (데이터베이스 스키마)
3. ✅ `3-ENVIRONMENT-SETUP.md` (환경 설정)
4. ✅ `4-RESTORE-GUIDE.md` (이 파일)

### 백업 데이터 (선택사항)
- `.env.local` (환경 변수)
- Supabase Database Dump (유저 데이터)

---

## 🚀 복원 절차

### Phase 1: 코드 복원 (10분)

#### 1-1. GitHub에서 클론
```bash
# GitHub에서 다운로드
git clone https://github.com/Bookfow/textry.git
cd textry

# 또는 ZIP 다운로드 후
unzip textry-main.zip
cd textry-main
```

#### 1-2. 패키지 설치
```bash
npm install
```

**예상 시간:** 2-3분

**성공 확인:**
```
added XXX packages
```

---

### Phase 2: Supabase 설정 (20분)

#### 2-1. 프로젝트 생성

**Supabase 대시보드:**
1. https://supabase.com/dashboard
2. **New Project**
3. 이름: `textry` (또는 원하는 이름)
4. 비밀번호: **강력한 비밀번호 설정** (메모!)
5. Region: **Northeast Asia (Seoul)**
6. **Create Project**

**대기:** 2-3분 (프로젝트 생성 중)

#### 2-2. API 키 복사

**Settings → API:**
- **Project URL** 복사 → 메모장 저장
- **anon public key** 복사 → 메모장 저장

#### 2-3. 데이터베이스 스키마 실행

**SQL Editor → New query:**

1. `2-SUPABASE-SCHEMA.sql` 파일 열기
2. **전체 내용 복사** (Ctrl+A → Ctrl+C)
3. SQL Editor에 **붙여넣기** (Ctrl+V)
4. **RUN** 클릭

**성공 메시지:**
```
Success. No rows returned
```

**⚠️ 에러 발생 시:**
- 전체 내용이 복사되었는지 확인
- 이전 쿼리 실행 기록 지우고 재시도
- Supabase 프로젝트가 완전히 생성되었는지 확인 (대기 필요)

#### 2-4. Storage 버킷 생성

**Storage → Create a new bucket:**
- Name: `documents`
- **Public bucket** ✅ 체크
- **Create bucket**

#### 2-5. Storage 정책 설정

**documents 버킷 → Policies → New Policy:**

**정책 1: 공개 읽기**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

**정책 2: 작가 업로드**
```sql
CREATE POLICY "Authors can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**정책 3: 작가 삭제**
```sql
CREATE POLICY "Authors can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

### Phase 3: 환경 변수 설정 (5분)

#### 3-1. .env.local 파일 생성

**프로젝트 루트에 파일 생성:**
```bash
# Windows
echo. > .env.local

# Mac/Linux
touch .env.local
```

#### 3-2. 환경 변수 입력

**`.env.local` 파일 열고 입력:**
```env
NEXT_PUBLIC_SUPABASE_URL=아까_복사한_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=아까_복사한_anon_public_key
```

**예시:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ 주의:**
- 따옴표 없이 입력
- 공백 없이 입력
- 실제 값으로 교체

---

### Phase 4: 로컬 테스트 (10분)

#### 4-1. 개발 서버 실행
```bash
npm run dev
```

**성공 메시지:**
```
▲ Next.js 16.1.6
Local: http://localhost:3000
```

#### 4-2. 브라우저 테스트

**http://localhost:3000 접속:**

**✅ 테스트 체크리스트:**
- [ ] 랜딩 페이지 로드
- [ ] 회원가입 → 독자 계정 생성
- [ ] 로그인 성공
- [ ] 로그아웃 → 랜딩 페이지로 이동
- [ ] 회원가입 → 작가 계정 생성
- [ ] 작가 로그인
- [ ] PDF 업로드 (샘플 PDF 필요)
- [ ] 업로드한 문서 보기
- [ ] 좋아요/싫어요 작동
- [ ] 댓글 작성
- [ ] 프로필 메뉴 작동

**⚠️ PDF 에러 무시:**
- 로컬에서 "DOMMatrix is not defined" 에러는 정상
- 프로덕션에서는 정상 작동

---

### Phase 5: 빌드 테스트 (5분)
```bash
npm run build
```

**성공 메시지:**
```
✓ Compiled successfully in XXs
```

**빌드 실행:**
```bash
npm start
```

**http://localhost:3000 접속하여 재테스트**

---

### Phase 6: Vercel 배포 (10분)

#### 6-1. Vercel CLI 설치
```bash
npm install -g vercel
```

#### 6-2. Vercel 로그인
```bash
vercel login
```

**브라우저에서 로그인 완료**

#### 6-3. 배포
```bash
# 첫 배포
vercel
```

**질문 답변:**
- Set up and deploy? **Y**
- Which scope? **본인 계정 선택**
- Link to existing project? **N**
- Project name? **textry** (또는 원하는 이름)
- Directory? **./** (Enter)
- Override settings? **N**

**배포 URL 확인:**
```
https://textry-xxx.vercel.app
```

#### 6-4. 환경 변수 설정

**Vercel 대시보드:**
1. 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 변수 추가:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: 아까 복사한 Supabase URL
   - Environments: **Production, Preview, Development** 모두 체크
4. 변수 추가:
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: 아까 복사한 anon key
   - Environments: **Production, Preview, Development** 모두 체크
5. **Save**

#### 6-5. 프로덕션 배포
```bash
vercel --prod
```

**배포 완료 URL:**
```
https://textry-xxx.vercel.app
```

#### 6-6. 프로덕션 테스트

**배포 URL 접속하여 전체 기능 테스트!**

---

## 🎉 복원 완료!

### 최종 체크리스트

- [ ] GitHub에서 코드 복원
- [ ] npm install 성공
- [ ] Supabase 프로젝트 생성
- [ ] SQL 스키마 실행
- [ ] Storage 설정 (버킷 + 정책)
- [ ] .env.local 파일 생성
- [ ] 환경 변수 입력
- [ ] npm run dev 성공
- [ ] 로컬 테스트 완료
- [ ] npm run build 성공
- [ ] Vercel 배포 성공
- [ ] 환경 변수 Vercel 설정
- [ ] 프로덕션 테스트 완료

---

## 📊 복원 후 확인 사항

### 데이터베이스
- **Tables**: 9개 (profiles, documents, reading_sessions, document_reactions, subscriptions, comments, comment_likes, reading_list, notifications)
- **Storage**: documents 버킷
- **Policies**: RLS 정책 활성화

### 기능
- ✅ 회원가입/로그인
- ✅ 작가/독자 구분
- ✅ PDF 업로드
- ✅ PDF 뷰어
- ✅ 좋아요/싫어요
- ✅ 구독
- ✅ 댓글/답글
- ✅ 읽기 목록
- ✅ 알림
- ✅ 프로필
- ✅ 검색/필터
- ✅ 카테고리/언어

---

## 🔄 기존 데이터 복원 (선택사항)

### 데이터베이스 덤프 복원

**백업 파일이 있는 경우:**

1. Supabase → Database → Backups
2. **Restore from custom backup**
3. SQL 파일 업로드
4. **Restore**

**⚠️ 주의:**
- 기존 데이터가 모두 덮어써짐
- 복원 전 백업 권장

---

## 🐛 복원 중 문제 해결

### 문제 1: SQL 스키마 실행 실패

**증상:** 에러 메시지 표시

**해결:**
1. SQL Editor 비우기
2. `2-SUPABASE-SCHEMA.sql` 전체 복사
3. 다시 붙여넣기
4. RUN

### 문제 2: 환경 변수 인식 안 됨

**증상:** Supabase 연결 실패

**해결:**
1. `.env.local` 파일 위치 확인 (프로젝트 루트)
2. 파일명 정확히 확인 (`.env.local`)
3. 내용 확인 (따옴표 없이, 공백 없이)
4. 개발 서버 재시작

### 문제 3: Vercel 배포 후 작동 안 함

**증상:** 500 에러 또는 빈 화면

**해결:**
1. Vercel → Settings → Environment Variables
2. 2개 변수 모두 설정되었는지 확인
3. Production 체크되었는지 확인
4. 재배포: `vercel --prod`

### 문제 4: PDF 업로드 실패

**증상:** Storage 업로드 실패

**해결:**
1. Supabase → Storage → documents → Policies
2. 3개 정책 모두 생성되었는지 확인
3. Public bucket 체크되었는지 확인
4. 재시도

---

## 📚 추가 리소스

### 문서
- **개발 일지**: `1-DEVELOPMENT-LOG.md`
- **환경 설정**: `3-ENVIRONMENT-SETUP.md`
- **SQL 스키마**: `2-SUPABASE-SCHEMA.sql`

### 링크
- **GitHub**: https://github.com/Bookfow/textry
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs

---

## 🎓 복원 후 다음 단계

### 1. 커스터마이징
- 랜딩 페이지 내용 수정
- 로고 변경
- 색상 테마 변경

### 2. 추가 기능 개발
- 실제 AdSense 연동
- 이미지 업로드
- 통계 그래프
- 관리자 페이지

### 3. 운영
- 도메인 연결
- SEO 최적화
- 분석 도구 연동
- 모니터링 설정

---

## 💾 정기 백업 권장

### 백업할 것
1. **코드**: GitHub (자동)
2. **데이터베이스**: Supabase Backup (주 1회)
3. **환경 변수**: 안전한 곳에 보관
4. **업로드된 파일**: Storage 다운로드 (선택)

### 백업 방법
```bash
# 코드 백업 (GitHub)
git push origin main

# 데이터베이스 백업 (Supabase)
Supabase → Database → Backups → Download
```

---

## ✅ 복원 성공!

**축하합니다! Textry 프로젝트가 성공적으로 복원되었습니다! 🎉**

**이제 개발을 계속하거나 운영을 시작할 수 있습니다.**

**추가 질문이나 문제가 있으면:**
- GitHub Issues: https://github.com/Bookfow/textry/issues
- 또는 Claude와 새로운 대화 시작

---

**백업 날짜:** 2026년 2월 11일  
**버전:** MVP 1.0  
**복원 가이드 버전:** 1.0