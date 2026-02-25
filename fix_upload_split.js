const fs = require('fs')
const file = 'app/(main)/upload/page.tsx'
let c = fs.readFileSync(file, 'utf8')
let changed = 0

// ━━━ 수정 1: splitLongChapter 헬퍼 함수 추가 ━━━
// 'use client' 바로 다음에 추가
if (!c.includes('splitLongChapter')) {
  const splitFn = `

// ─── epub 긴 챕터 자동 분할 ───
function splitLongChapter(text: string, targetChars = 2000): string[] {
  if (text.length <= targetChars * 1.3) return [text]
  const paragraphs = text.split('\\n\\n')
  const pages: string[] = []
  let current = ''
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (current.length > 0 && (current.length + trimmed.length + 2) > targetChars) {
      if (current.length >= 500) {
        pages.push(current.trim())
        current = trimmed
      } else {
        current += '\\n\\n' + trimmed
      }
    } else {
      current += (current ? '\\n\\n' : '') + trimmed
    }
  }
  if (current.trim()) {
    if (pages.length > 0 && current.trim().length < 500) {
      pages[pages.length - 1] += '\\n\\n' + current.trim()
    } else {
      pages.push(current.trim())
    }
  }
  return pages.length > 0 ? pages : [text]
}
`

  // 'use client' 뒤에 삽입
  c = c.replace("'use client'", "'use client'" + splitFn)
  console.log('✓ 수정1: splitLongChapter 함수 추가')
  changed++
} else {
  console.log('○ 수정1: 이미 splitLongChapter 있음')
}

// ━━━ 수정 2: epub 챕터 저장 시 분할 적용 ━━━
// 기존: chapters[i].content를 그대로 저장
// 변경: splitLongChapter로 분할 후 저장

const oldEpubSave = `try { setProgressMessage('챕터 저장 중...'); const batchSize = 10; const rows: any[] = []; for (let i = 0; i < epubData.chapters.length; i++) { rows.push({ document_id: docData.id, page_number: i + 1, text_content: epubData.chapters[i].content }); if (rows.length >= batchSize || i === epubData.chapters.length - 1) { await supabase.from('document_pages_text').insert(rows); rows.length = 0 }; setProgress(70 + Math.round(((i + 1) / epubData.chapters.length) * 25)); setProgressMessage(\`챕터 저장 중... \${i + 1}/\${epubData.chapters.length}\`) } }`

const newEpubSave = `try {
          setProgressMessage('챕터 저장 중...')
          // 긴 챕터 자동 분할
          const allPages: string[] = []
          for (const chapter of epubData.chapters) {
            const splits = splitLongChapter(chapter.content)
            for (const s of splits) allPages.push(s)
          }
          const batchSize = 10
          const rows: any[] = []
          for (let i = 0; i < allPages.length; i++) {
            rows.push({ document_id: docData.id, page_number: i + 1, text_content: allPages[i] })
            if (rows.length >= batchSize || i === allPages.length - 1) {
              await supabase.from('document_pages_text').insert(rows)
              rows.length = 0
            }
            setProgress(70 + Math.round(((i + 1) / allPages.length) * 25))
            setProgressMessage(\`페이지 저장 중... \${i + 1}/\${allPages.length}\`)
          }
          // 분할로 페이지 수가 바뀌었으면 page_count 업데이트
          if (allPages.length !== epubData.chapters.length) {
            await supabase.from('documents').update({ page_count: allPages.length }).eq('id', docData.id)
          }
        }`

if (c.includes(oldEpubSave)) {
  c = c.replace(oldEpubSave, newEpubSave)
  console.log('✓ 수정2: epub 챕터 저장 로직에 분할 적용')
  changed++
} else {
  console.log('✗ 수정2: epub 저장 패턴 못 찾음 — 수동 확인 필요')
}

fs.writeFileSync(file, c)
console.log(`\n완료! ${changed}개 수정됨`)
