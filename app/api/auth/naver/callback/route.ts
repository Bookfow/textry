import { NextResponse } from 'next/server'
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
