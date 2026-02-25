/**
 * epub 긴 페이지 분할 v2
 * \n\n 분할 실패 시 \n으로도 분할
 * 
 * 실행: node split_long_pages2.js
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

function splitByDelimiter(text, delimiter, targetChars) {
  const parts = text.split(delimiter)
  const pages = []
  let current = ''

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (current.length > 0 && (current.length + trimmed.length + delimiter.length) > targetChars) {
      if (current.length >= MIN_CHARS) {
        pages.push(current.trim())
        current = trimmed
      } else {
        current += delimiter + trimmed
      }
    } else {
      current += (current ? delimiter : '') + trimmed
    }
  }

  if (current.trim()) {
    if (pages.length > 0 && current.trim().length < MIN_CHARS) {
      pages[pages.length - 1] += delimiter + current.trim()
    } else {
      pages.push(current.trim())
    }
  }

  return pages.length > 0 ? pages : [text]
}

function splitText(text, targetChars) {
  if (text.length <= targetChars * 1.3) return [text]

  // 1차: \n\n 으로 분할 시도
  let result = splitByDelimiter(text, '\n\n', targetChars)
  
  // 분할이 안 됐거나 여전히 긴 페이지가 있으면 \n으로 재분할
  const finalPages = []
  for (const page of result) {
    if (page.length > targetChars * 1.3) {
      // \n 으로 2차 분할
      const subSplit = splitByDelimiter(page, '\n', targetChars)
      for (const s of subSplit) finalPages.push(s)
    } else {
      finalPages.push(page)
    }
  }

  // 그래도 긴 페이지가 있으면 강제 분할 (마침표 기준)
  const forcedPages = []
  for (const page of finalPages) {
    if (page.length > targetChars * 2) {
      // 마침표+공백 기준으로 강제 분할
      let remaining = page
      while (remaining.length > targetChars * 1.3) {
        // targetChars 근처에서 마침표 찾기
        let cutIdx = -1
        for (let i = targetChars; i >= targetChars * 0.5; i--) {
          if (remaining[i] === '.' || remaining[i] === '다' || remaining[i] === '요') {
            cutIdx = i + 1
            break
          }
        }
        if (cutIdx === -1) cutIdx = targetChars  // 못 찾으면 그냥 자르기
        
        forcedPages.push(remaining.substring(0, cutIdx).trim())
        remaining = remaining.substring(cutIdx).trim()
      }
      if (remaining) forcedPages.push(remaining)
    } else {
      forcedPages.push(page)
    }
  }

  return forcedPages.length > 0 ? forcedPages : [text]
}

async function main() {
  log('=== epub 긴 페이지 분할 v2 ===\n')

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, page_count, file_type')
    .eq('file_type', 'epub')
    .order('title')

  if (error) { log(`DB 조회 실패: ${error.message}`); return }
  log(`epub 문서 ${docs.length}개\n`)

  let totalSplit = 0, totalSkipped = 0

  for (const doc of docs) {
    const { data: pages, error: pErr } = await supabase
      .from('document_pages_text')
      .select('id, page_number, text_content')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true })

    if (pErr || !pages) { log(`  ✗ ${doc.title}: 조회 실패`); continue }

    // 긴 페이지가 있는지 확인
    const hasLong = pages.some(p => p.text_content.length > TARGET_CHARS * 1.3)
    if (!hasLong) {
      totalSkipped++
      continue
    }

    let newPages = []
    for (const page of pages) {
      const splits = splitText(page.text_content, TARGET_CHARS)
      for (const s of splits) newPages.push(s)
    }

    if (newPages.length === pages.length) {
      const maxChars = Math.max(...pages.map(p => p.text_content.length))
      log(`  △ ${doc.title}: ${pages.length}p, 최장 ${maxChars}자 (분할 실패)`)
      totalSkipped++
      continue
    }

    const oldCount = pages.length
    const newCount = newPages.length
    log(`  ▶ ${doc.title}: ${oldCount}p → ${newCount}p`)

    // reading_sessions 비례 조정
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
      log(`    → sessions ${sessions.length}개 조정`)
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
    const maxChars = Math.max(...newPages.map(p => p.length))
    log(`    ✓ 완료 (평균 ${avgChars}자, 최장 ${maxChars}자)`)
    totalSplit++
  }

  log(`\n=== 완료 ===`)
  log(`  분할: ${totalSplit}개`)
  log(`  유지: ${totalSkipped}개`)
}

main().catch(err => { console.error('오류:', err); process.exit(1) })
