/**
 * document_pages_text → document_blocks 마이그레이션
 * 
 * 실행: cd C:\Users\user\textry && node ..\Downloads\migrate_to_blocks.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://qurknvhesqtuivipdyyu.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmtudmhlc3F0dWl2aXBkeXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MTY5MywiZXhwIjoyMDg2MTI3NjkzfQ.jGkb2UH8q0c9awPB8lMQ_N8NPM_idtbg4oU7B9YD7n4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function textToBlocks(text, pageNumber) {
  if (!text || text.trim().length === 0) return []

  const blocks = []
  let blockCounter = 0

  function makeBlockId(pageNum, idx) {
    return `p${String(pageNum).padStart(3, '0')}_b${String(idx).padStart(3, '0')}`
  }

  const isHtml = /<(p|h[1-6]|figure|div|br|img|strong|em)[\s>/]/i.test(text)

  if (isHtml) {
    blocks.push({
      block_id: makeBlockId(pageNumber, blockCounter++),
      block_type: 'html',
      content: text.trim(),
      page_number: pageNumber,
      block_order: blocks.length,
    })
    return blocks
  }

  const parts = text.split('\n\n')

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    let blockType = 'body'
    let content = trimmed

    if (trimmed.startsWith('<h1>') && trimmed.endsWith('</h1>')) {
      blockType = 'heading1'
      content = trimmed.slice(4, -5)
    } else if (trimmed.startsWith('<h2>') && trimmed.endsWith('</h2>')) {
      blockType = 'heading2'
      content = trimmed.slice(4, -5)
    } else if (trimmed.startsWith('<h3>') && trimmed.endsWith('</h3>')) {
      blockType = 'heading3'
      content = trimmed.slice(4, -5)
    } else if (trimmed === '<hr>') {
      blockType = 'separator'
      content = ''
    }

    if (!content && blockType !== 'separator') continue

    blocks.push({
      block_id: makeBlockId(pageNumber, blockCounter++),
      block_type: blockType,
      content: content,
      page_number: pageNumber,
      block_order: blocks.length,
    })
  }

  return blocks
}

async function migrate() {
  console.log('=== document_pages_text → document_blocks 마이그레이션 ===\n')

  const { data: documents, error: docErr } = await supabase
    .from('documents')
    .select('id, title, page_count')
    .order('created_at', { ascending: true })

  if (docErr || !documents) {
    console.error('문서 목록 조회 실패:', docErr)
    return
  }

  console.log(`총 ${documents.length}개 문서 발견\n`)

  let totalMigrated = 0
  let totalSkipped = 0
  let totalFailed = 0
  let totalBlocks = 0

  for (const doc of documents) {
    const { count } = await supabase
      .from('document_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id)

    if (count && count > 0) {
      totalSkipped++
      continue
    }

    const { data: pages, error: pageErr } = await supabase
      .from('document_pages_text')
      .select('page_number, text_content')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true })

    if (pageErr || !pages || pages.length === 0) {
      console.log(`  ✗ ${doc.title}: 텍스트 없음`)
      totalFailed++
      continue
    }

    const allBlocks = []
    for (const page of pages) {
      const blocks = textToBlocks(page.text_content, page.page_number)
      for (const block of blocks) {
        allBlocks.push({
          document_id: doc.id,
          ...block,
        })
      }
    }

    if (allBlocks.length === 0) {
      console.log(`  ✗ ${doc.title}: 블록 변환 결과 없음`)
      totalFailed++
      continue
    }

    let insertOk = true
    for (let b = 0; b < allBlocks.length; b += 50) {
      const batch = allBlocks.slice(b, b + 50)
      const { error: insertErr } = await supabase
        .from('document_blocks')
        .insert(batch)
      if (insertErr) {
        console.error(`  ✗ ${doc.title}: 삽입 실패 -`, insertErr.message)
        insertOk = false
        break
      }
    }

    if (insertOk) {
      totalMigrated++
      totalBlocks += allBlocks.length
      console.log(`  ✓ ${doc.title}: ${pages.length}페이지 → ${allBlocks.length}블록`)
    } else {
      totalFailed++
      await supabase.from('document_blocks').delete().eq('document_id', doc.id)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`마이그레이션 완료!`)
  console.log(`  성공: ${totalMigrated}개 문서 (${totalBlocks}개 블록)`)
  console.log(`  건너뜀: ${totalSkipped}개 (이미 변환됨)`)
  console.log(`  실패: ${totalFailed}개`)
}

migrate().catch(err => {
  console.error('마이그레이션 오류:', err)
  process.exit(1)
})
