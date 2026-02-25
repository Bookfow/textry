/**
 * epub 긴 페이지 분할 스크립트 (기존 DB 일회성)
 * 
 * - 한 페이지당 약 2000자 기준 (문단 경계에서 자름)
 * - reading_sessions의 current_page도 비례 조정
 * 
 * 실행: node split_long_pages.js
 */
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://qurknvhesqtuivipdyyu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmtudmhlc3F0dWl2aXBkeXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MTY5MywiZXhwIjoyMDg2MTI3NjkzfQ.jGkb2UH8q0c9awPB8lMQ_N8NPM_idtbg4oU7B9YD7n4'
)

const TARGET_CHARS = 2000
const MIN_CHARS = 500

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`)
}

function splitText(text, targetChars) {
  if (text.length <= targetChars * 1.3) return [text]

  const paragraphs = text.split('\n\n')
  const pages = []
  let currentPage = ''

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (currentPage.length > 0 && (currentPage.length + trimmed.length + 2) > targetChars) {
      if (currentPage.length >= MIN_CHARS) {
        pages.push(currentPage.trim())
        currentPage = trimmed
      } else {
        currentPage += '\n\n' + trimmed
      }
    } else {
      currentPage += (currentPage ? '\n\n' : '') + trimmed
    }
  }

  if (currentPage.trim()) {
    if (pages.length > 0 && currentPage.trim().length < MIN_CHARS) {
      pages[pages.length - 1] += '\n\n' + currentPage.trim()
    } else {
      pages.push(currentPage.trim())
    }
  }

  return pages.length > 0 ? pages : [text]
}

async function main() {
  log('=== epub 긴 페이지 분할 시작 ===\n')

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, page_count, file_type')
    .eq('file_type', 'epub')
    .order('title')

  if (error) { log(`DB 조회 실패: ${error.message}`); return }
  log(`epub 문서 ${docs.length}개 발견\n`)

  let totalSplit = 0, totalSkipped = 0

  for (const doc of docs) {
    const { data: pages, error: pErr } = await supabase
      .from('document_pages_text')
      .select('id, page_number, text_content')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true })

    if (pErr || !pages) { log(`  ✗ ${doc.title}: 페이지 조회 실패`); continue }

    let needsSplit = false
    let newPages = []

    for (const page of pages) {
      const splits = splitText(page.text_content, TARGET_CHARS)
      if (splits.length > 1) needsSplit = true
      for (const s of splits) newPages.push(s)
    }

    if (!needsSplit) {
      const maxChars = Math.max(...pages.map(p => p.text_content.length))
      log(`  ○ ${doc.title}: ${pages.length}p, 최장 ${maxChars}자 (분할 불필요)`)
      totalSkipped++
      continue
    }

    const oldCount = pages.length
    const newCount = newPages.length
    log(`  ▶ ${doc.title}: ${oldCount}p → ${newCount}p 분할`)

    const { data: sessions } = await supabase
      .from('reading_sessions')
      .select('id, current_page')
      .eq('document_id', doc.id)

    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        const ratio = session.current_page / oldCount
        const newPage = Math.max(1, Math.round(ratio * newCount))
        await supabase.from('reading_sessions').update({ current_page: newPage }).eq('id', session.id)
      }
      log(`    → reading_sessions ${sessions.length}개 조정`)
    }

    await supabase.from('document_pages_text').delete().eq('document_id', doc.id)

    const rows = newPages.map((text, i) => ({
      document_id: doc.id,
      page_number: i + 1,
      text_content: text,
    }))

    for (let b = 0; b < rows.length; b += 50) {
      const batch = rows.slice(b, b + 50)
      const { error: insertErr } = await supabase.from('document_pages_text').insert(batch)
      if (insertErr) { log(`    ✗ 삽입 실패: ${insertErr.message}`); break }
    }

    await supabase.from('documents').update({ page_count: newCount }).eq('id', doc.id)

    const avgChars = Math.round(newPages.reduce((s, p) => s + p.length, 0) / newPages.length)
    log(`    ✓ 완료 (평균 ${avgChars}자/페이지)`)
    totalSplit++
  }

  log(`\n=== 완료 ===`)
  log(`  분할: ${totalSplit}개`)
  log(`  유지: ${totalSkipped}개`)
}

main().catch(err => { console.error('오류:', err); process.exit(1) })
