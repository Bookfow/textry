# Textry 환경 설정 가이드

**복원 난이도:** ⭐⭐ (중간)  
**소요 시간:** 약 30분

---

## 📋 필수 요구사항

### 1. 소프트웨어
- **Node.js**: 18.x 이상 (권장: 20.x)
- **npm** 또는 **yarn**
- **Git**: 최신 버전
- **코드 에디터**: VS Code, Cursor 등

### 2. 계정
- **Supabase 계정** (무료)
- **Vercel 계정** (무료, 배포 시)
- **GitHub 계정** (선택사항)

---

## 🔧 Step 1: Node.js 설치 확인
```bash
node -v
# v20.x.x 이상이어야 함

npm -v
# 10.x.x 이상이어야 함
```

**설치 안 되어 있으면:**
- https://nodejs.org 에서 LTS 버전 다운로드

---

## 🗂️ Step 2: 프로젝트 복원

### 방법 1: GitHub에서 클론 (권장)
```bash
# GitHub에서 클론
git clone https://github.com/Bookfow/textry.git

# 프로젝트 폴더로 이동
cd textry

# 패키지 설치
npm install
```

### 방법 2: 압축 파일 사용
```bash
# 압축 해제 후
cd textry

# 패키지 설치
npm install
```

---

## 🗄️ Step 3: Supabase 프로젝트 생성

### 3-1. 새 프로젝트 생성

1. https://supabase.com 접속
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Name**: textry (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 (저장 필수!)
   - **Region**: Northeast Asia (Seoul)
4. **Create new project** 클릭

### 3-2. API 키 확인

1. 프로젝트 대시보드 → **Settings** → **API**
2. 다음 정보 복사:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbG...` (긴 문자열)

---

## 🗃️ Step 4: 데이터베이스 설정

### 4-1. SQL 스키마 실행

1. Supabase 대시보드 → **SQL Editor**
2. **New query** 클릭
3. `2-SUPABASE-SCHEMA.sql` 파일 내용 **전체 복사**
4. SQL Editor에 **붙여넣기**
5. **RUN** 클릭

**⚠️ 중요:**
- 에러 없이 완료되어야 함
- "Success. No rows returned" 정상

### 4-2. Storage 설정

1. Supabase 대시보드 → **Storage**
2. **Create a new bucket** 클릭
3. 설정:
   - **Name**: `documents`
   - **Public bucket**: ✅ 체크
4. **Create bucket** 클릭

### 4-3. Storage 정책 설정

**documents 버킷 클릭 → Policies → New Policy:**

**정책 1: 공개 읽기**
```sql
-- Policy name: Public read access
-- Allowed operation: SELECT
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

**정책 2: 작가 업로드**
```sql
-- Policy name: Authors can upload
-- Allowed operation: INSERT
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
-- Policy name: Authors can delete
-- Allowed operation: DELETE
CREATE POLICY "Authors can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 🔑 Step 5: 환경 변수 설정

### 5-1. .env.local 파일 생성

**프로젝트 루트에 `.env.local` 파일 생성:**
```bash
# Windows
type nul > .env.local

# Mac/Linux
touch .env.local
```

### 5-2. 환경 변수 입력

**`.env.local` 파일을 열고 다음 내용 입력:**
```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_public_key_붙여넣기
```

**예시:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://qurknvhesqtuivipdyyu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmtudmhlc3F0dWl2aXBkeXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3MTk1NzAsImV4cCI6MjA1NDI5NTU3MH0.abc123...
```

**⚠️ 중요:**
- 실제 값으로 교체 필수!
- 따옴표 없이 입력
- 공백 없이 입력

---

## 🚀 Step 6: 로컬 실행
```bash
npm run dev
```

**브라우저에서 접속:**
- http://localhost:3000

**확인 사항:**
✅ 랜딩 페이지 보임
✅ 회원가입 작동
✅ 로그인 작동
✅ PDF 업로드 작동 (작가 계정)

---

## 📦 Step 7: 빌드 테스트
```bash
npm run build
```

**성공 메시지:**
```
✓ Compiled successfully
```

**에러 발생 시:**
- TypeScript 에러 확인
- 환경 변수 확인
- node_modules 재설치: `rm -rf node_modules && npm install`

---

## 🌐 Step 8: Vercel 배포 (선택사항)

### 8-1. Vercel CLI 설치
```bash
npm install -g vercel
```

### 8-2. 로그인
```bash
vercel login
```

### 8-3. 배포
```bash
# 테스트 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 8-4. 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Production**, **Preview**, **Development** 모두 체크
4. **Save**

### 8-5. 재배포
```bash
vercel --prod
```

---

## 🔍 트러블슈팅

### 문제 1: npm install 실패

**원인:** Node.js 버전 문제

**해결:**
```bash
# Node.js 버전 확인
node -v

# 18.x 미만이면 업데이트 필요
```

### 문제 2: Supabase 연결 실패

**원인:** 환경 변수 오류

**해결:**
1. `.env.local` 파일 확인
2. URL과 키가 정확한지 확인
3. 따옴표 없는지 확인
4. 개발 서버 재시작: `npm run dev`

### 문제 3: PDF 업로드 실패

**원인:** Storage 정책 미설정

**해결:**
1. Supabase → Storage → documents → Policies
2. 3개 정책 모두 생성되었는지 확인
3. Public bucket 체크되었는지 확인

### 문제 4: 로컬에서 PDF 에러

**증상:** DOMMatrix is not defined

**해결:** 
- 정상입니다! 로컬 개발 환경에서만 발생
- 프로덕션 빌드에서는 정상 작동
- 무시하고 계속 개발 가능

### 문제 5: 회원가입 후 프로필 생성 안 됨

**원인:** Trigger 미실행

**해결:**
1. SQL Editor에서 `2-SUPABASE-SCHEMA.sql` 재실행
2. 특히 `handle_new_user()` 함수와 트리거 확인

---

## ✅ 환경 설정 완료 체크리스트

- [ ] Node.js 18+ 설치 확인
- [ ] 프로젝트 다운로드/클론
- [ ] npm install 완료
- [ ] Supabase 프로젝트 생성
- [ ] SQL 스키마 실행 완료
- [ ] Storage 버킷 생성 (documents)
- [ ] Storage 정책 3개 생성
- [ ] .env.local 파일 생성
- [ ] 환경 변수 입력
- [ ] npm run dev 성공
- [ ] 회원가입 테스트 성공
- [ ] 로그인 테스트 성공
- [ ] 작가 계정으로 문서 업로드 테스트 성공

---

## 📞 도움이 필요하면

1. **GitHub Issues**: https://github.com/Bookfow/textry/issues
2. **Supabase Docs**: https://supabase.com/docs
3. **Next.js Docs**: https://nextjs.org/docs

---

**✅ 환경 설정 완료!**
**이제 `4-RESTORE-GUIDE.md`를 참고하여 복원을 시작하세요.**