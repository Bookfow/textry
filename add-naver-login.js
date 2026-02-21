const fs = require('fs');

// ━━━ 1. API Route: 네이버 인증 시작 ━━━
fs.mkdirSync('app/api/auth/naver', { recursive: true });
fs.mkdirSync('app/api/auth/naver/callback', { recursive: true });

fs.writeFileSync('app/api/auth/naver/route.ts', `import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const redirectAfter = searchParams.get('redirect') || '/home'

  const clientId = process.env.NAVER_CLIENT_ID
  const origin = new URL(request.url).origin
  const redirectUri = origin + '/api/auth/naver/callback'
  const state = Buffer.from(JSON.stringify({ redirect: redirectAfter })).toString('base64url')

  const url = 'https://nid.naver.com/oauth2.0/authorize'
    + '?response_type=code'
    + '&client_id=' + clientId
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&state=' + state

  return NextResponse.redirect(url)
}
`, 'utf8');
console.log('1. /api/auth/naver/route.ts 생성');

// ━━━ 2. API Route: 네이버 콜백 ━━━
fs.writeFileSync('app/api/auth/naver/callback/route.ts', `import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const authError = searchParams.get('error')

  let redirectPath = '/home'
  try {
    if (state) {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
      redirectPath = parsed.redirect || '/home'
    }
  } catch {}

  if (authError || !code) {
    return NextResponse.redirect(origin + '/login?error=naver_denied')
  }

  try {
    // 1. 액세스 토큰 교환
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: state || '',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Naver token error:', tokenData)
      return NextResponse.redirect(origin + '/login?error=naver_token')
    }

    // 2. 네이버 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    })
    const profileData = await profileRes.json()
    if (profileData.resultcode !== '00') {
      console.error('Naver profile error:', profileData)
      return NextResponse.redirect(origin + '/login?error=naver_profile')
    }

    const naver = profileData.response
    const email = naver.email
    if (!email) {
      return NextResponse.redirect(origin + '/login?error=naver_no_email')
    }

    const nickname = naver.nickname || naver.name || email.split('@')[0]
    const avatarUrl = naver.profile_image || null

    // 3. Supabase Admin 클라이언트
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 기존 사용자 확인
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = userList?.users?.find((u: any) => u.email === email)

    if (!existingUser) {
      // 신규 사용자 생성
      const randomPw = 'naver_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPw,
        email_confirm: true,
        user_metadata: { username: nickname, avatar_url: avatarUrl, provider: 'naver' },
      })
      if (createErr || !newUser?.user) {
        console.error('Create user error:', createErr)
        return NextResponse.redirect(origin + '/login?error=naver_create')
      }

      // profiles 테이블에 추가
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        email,
        username: nickname,
        avatar_url: avatarUrl,
      }, { onConflict: 'id' })
    }

    // 4. 매직링크로 세션 생성
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !linkData) {
      console.error('Magic link error:', linkErr)
      return NextResponse.redirect(origin + '/login?error=naver_link')
    }

    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.redirect(origin + '/login?error=naver_hash')
    }

    // auth/callback으로 리다이렉트 (Supabase가 세션 생성)
    const verifyUrl = origin + '/auth/callback?token_hash=' + tokenHash + '&type=magiclink&next=' + encodeURIComponent(redirectPath)
    return NextResponse.redirect(verifyUrl)

  } catch (err) {
    console.error('Naver callback error:', err)
    return NextResponse.redirect(origin + '/login?error=naver_unknown')
  }
}
`, 'utf8');
console.log('2. /api/auth/naver/callback/route.ts 생성');

// ━━━ 3. 로그인 페이지에 네이버 버튼 추가 ━━━
const loginFile = 'app/login/page.tsx';
let login = fs.readFileSync(loginFile, 'utf8');

if (!login.includes('네이버')) {
  const target = `            Google로 시작하기
          </button>
        </div>`;

  const replacement = `            Google로 시작하기
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/naver'}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-[#03C75A] hover:bg-[#02b351] text-white font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            네이버로 시작하기
          </button>
        </div>`;

  if (login.includes(target)) {
    login = login.replace(target, replacement);
    fs.writeFileSync(loginFile, login, 'utf8');
    console.log('3. 로그인 페이지 네이버 버튼 추가');
  } else {
    console.log('3. ERROR: 로그인 페이지 삽입 위치 못찾음');
    const idx = login.indexOf('Google');
    if (idx >= 0) console.log('Google 주변:', JSON.stringify(login.substring(idx, idx + 80)));
  }
} else {
  console.log('3. 이미 있음');
}

// ━━━ 4. 회원가입 페이지에도 네이버 버튼 추가 ━━━
const signupFile = 'app/signup/page.tsx';
if (fs.existsSync(signupFile)) {
  let signup = fs.readFileSync(signupFile, 'utf8');
  if (!signup.includes('네이버')) {
    const t2 = `            Google로 시작하기
          </button>
        </div>`;
    const r2 = `            Google로 시작하기
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/naver'}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E7D8C9] dark:border-[#3A302A] bg-[#03C75A] hover:bg-[#02b351] text-white font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            네이버로 시작하기
          </button>
        </div>`;
    if (signup.includes(t2)) {
      signup = signup.replace(t2, r2);
      fs.writeFileSync(signupFile, signup, 'utf8');
      console.log('4. 회원가입 페이지 네이버 버튼 추가');
    } else {
      console.log('4. 회원가입 페이지 삽입 위치 못찾음');
    }
  } else {
    console.log('4. 이미 있음');
  }
} else {
  console.log('4. 회원가입 파일 없음');
}

console.log('\n=== 완료 ===');
console.log('필수 설정:');
console.log('1. Vercel 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET');
console.log('2. Vercel 환경변수: SUPABASE_SERVICE_ROLE_KEY (이미 있으면 OK)');
console.log('3. 네이버 개발자센터 Callback URL: https://textry-v1.vercel.app/api/auth/naver/callback');
