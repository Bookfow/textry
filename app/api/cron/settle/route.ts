import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CPM = 2.0 // 예상 CPM $2.00 (AdSense 연동 후 실제 값으로 교체)

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSettlement()
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Settlement error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function runSettlement() {
  // 전월 날짜 범위 계산
  const now = new Date()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = now.getMonth() === 0 ? 12 : now.getMonth() // 전월
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  console.log(`정산 기간: ${monthStr} (${startDate} ~ ${endDate})`)

  // 이미 정산된 월인지 확인
  const { data: existing } = await supabase
    .from('revenue_records')
    .select('id')
    .eq('month', monthStr)
    .limit(1)

  if (existing && existing.length > 0) {
    return { message: `${monthStr}은 이미 정산 완료`, skipped: true }
  }

  // ━━━ 1. 수익화 가능한 작가 조회 (Tier 1+) ━━━
  const { data: authors } = await supabase
    .from('author_tiers')
    .select('author_id, tier, revenue_share')
    .gte('tier', 1)

  if (!authors || authors.length === 0) {
    return { message: '수익화 가능한 작가 없음', settled: 0 }
  }

  const results: any[] = []

  for (const author of authors) {
    // ━━━ 2. 해당 작가 문서의 뷰어 내 광고 노출 수 ━━━
    const { data: authorDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('author_id', author.author_id)

    if (!authorDocs || authorDocs.length === 0) continue

    const docIds = authorDocs.map(d => d.id)

    const { data: adImpressions, count: adCount } = await supabase
      .from('ad_impressions')
      .select('id', { count: 'exact' })
      .in('document_id', docIds)
      .in('ad_position', ['overlay', 'control_bar', 'side_panel'])
      .gte('created_at', startDate)
      .lt('created_at', endDate)

    const impressionCount = adCount || 0

    // ━━━ 3. 광고 수익 계산 ━━━
    const adGrossRevenue = (impressionCount / 1000) * CPM
    const adAuthorShare = adGrossRevenue * author.revenue_share
    const adPlatformShare = adGrossRevenue * (1 - author.revenue_share)

    // ━━━ 4. 프리미엄 읽기 시간 배분 ━━━
    // 해당 작가 문서의 프리미엄 사용자 읽기 시간
    const { data: premiumSessions } = await supabase
      .from('reading_sessions')
      .select('reading_time, reader_id')
      .in('document_id', docIds)
      .gte('last_read_at', startDate)
      .lt('last_read_at', endDate)

    // 프리미엄 사용자만 필터링
    let premiumReadingMinutes = 0
    if (premiumSessions && premiumSessions.length > 0) {
      const readerIds = [...new Set(premiumSessions.map(s => s.reader_id).filter(Boolean))]
      
      if (readerIds.length > 0) {
        const { data: premiumProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('id', readerIds)
          .eq('is_premium', true)
          .gt('premium_expires_at', new Date().toISOString())

        if (premiumProfiles) {
          const premiumIds = new Set(premiumProfiles.map(p => p.id))
          premiumReadingMinutes = premiumSessions
            .filter(s => premiumIds.has(s.reader_id))
            .reduce((sum, s) => sum + Math.round((s.reading_time || 0) / 60), 0)
        }
      }
    }

    // 전체 프리미엄 풀 (월 구독료 기반 추정)
    const { data: premiumUsers, count: premiumCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_premium', true)
      .gt('premium_expires_at', new Date().toISOString())

    const premiumPool = (premiumCount || 0) * 3.99 * 0.7 // 구독료의 70%가 작가 풀
    
    // 전체 프리미엄 읽기 시간 (모든 작가 합산)
    const { data: allPremiumSessions } = await supabase
      .from('reading_sessions')
      .select('reading_time')
      .gte('last_read_at', startDate)
      .lt('last_read_at', endDate)

    const totalPremiumMinutes = allPremiumSessions?.reduce((sum, s) => sum + Math.round((s.reading_time || 0) / 60), 0) || 1

    const premiumAuthorShare = totalPremiumMinutes > 0
      ? premiumPool * (premiumReadingMinutes / totalPremiumMinutes) * author.revenue_share
      : 0
    const premiumPlatformShare = totalPremiumMinutes > 0
      ? premiumPool * (premiumReadingMinutes / totalPremiumMinutes) * (1 - author.revenue_share)
      : 0

    // ━━━ 5. 총 수익 ━━━
    const totalAuthorRevenue = adAuthorShare + premiumAuthorShare
    const totalPlatformRevenue = adPlatformShare + premiumPlatformShare

    // ━━━ 6. revenue_records에 INSERT ━━━
    const { error: insertError } = await supabase
      .from('revenue_records')
      .insert({
        author_id: author.author_id,
        month: monthStr,
        tier: author.tier,
        ad_impressions_count: impressionCount,
        ad_gross_revenue: Number(adGrossRevenue.toFixed(4)),
        ad_author_share: Number(adAuthorShare.toFixed(4)),
        ad_platform_share: Number(adPlatformShare.toFixed(4)),
        premium_reading_minutes: premiumReadingMinutes,
        premium_total_pool: Number(premiumPool.toFixed(4)),
        premium_author_share: Number(premiumAuthorShare.toFixed(4)),
        premium_platform_share: Number(premiumPlatformShare.toFixed(4)),
        total_author_revenue: Number(totalAuthorRevenue.toFixed(4)),
        total_platform_revenue: Number(totalPlatformRevenue.toFixed(4)),
        status: 'pending',
      })

    if (insertError) {
      console.error(`작가 ${author.author_id} 정산 실패:`, insertError)
      continue
    }

    // ━━━ 7. pending_payout_usd 업데이트 ━━━
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('pending_payout_usd')
      .eq('id', author.author_id)
      .single()

    const currentPayout = Number(currentProfile?.pending_payout_usd || 0)
    await supabase
      .from('profiles')
      .update({ pending_payout_usd: Number((currentPayout + totalAuthorRevenue).toFixed(4)) })
      .eq('id', author.author_id)

    results.push({
      author_id: author.author_id,
      tier: author.tier,
      ad_impressions: impressionCount,
      ad_author_share: adAuthorShare.toFixed(2),
      premium_minutes: premiumReadingMinutes,
      premium_author_share: premiumAuthorShare.toFixed(2),
      total: totalAuthorRevenue.toFixed(2),
    })

    console.log(`  ✅ ${author.author_id}: 광고 ${impressionCount}회 → $${totalAuthorRevenue.toFixed(2)}`)
  }

  // ━━━ 8. author_tiers 읽기 시간 업데이트 ━━━
  for (const author of authors) {
    const { data: authorDocs } = await supabase
      .from('documents')
      .select('total_reading_time')
      .eq('author_id', author.author_id)

    const totalHours = (authorDocs?.reduce((sum, d) => sum + d.total_reading_time, 0) || 0) / 3600

    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', author.author_id)
      .single()

    const accountDays = profile
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000))
      : 0

    // 티어 자동 승격 체크
    let newTier = 0
    let newShare = 0
    if (totalHours >= 1000 && accountDays >= 30) { newTier = 2; newShare = 0.80 }
    else if (totalHours >= 100 && accountDays >= 30) { newTier = 1; newShare = 0.70 }

    await supabase
      .from('author_tiers')
      .update({
        total_reading_hours_12m: Number(totalHours.toFixed(2)),
        account_age_days: accountDays,
        tier: Math.max(author.tier, newTier), // 강등 없음
        revenue_share: Math.max(author.revenue_share, newShare),
        tier_updated_at: new Date().toISOString(),
      })
      .eq('author_id', author.author_id)

    if (newTier > author.tier) {
      await supabase
        .from('profiles')
        .update({ author_tier: newTier })
        .eq('id', author.author_id)
      console.log(`  🎉 ${author.author_id}: Tier ${author.tier} → ${newTier} 승격!`)
    }
  }

  return {
    message: `${monthStr} 정산 완료`,
    settled: results.length,
    results,
  }
}
