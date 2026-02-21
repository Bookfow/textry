import { NextResponse } from 'next/server'

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
