const fs = require('fs')
const file = 'app/(main)/upload/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 기존 splitLongChapter 함수를 개선된 버전으로 교체
const oldFn = `// ─── epub 긴 챕터 자동 분할 ───
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
}`

const newFn = `// ─── epub 긴 챕터 자동 분할 ───
function splitByDelim(text: string, delim: string, target: number): string[] {
  const parts = text.split(delim)
  const pages: string[] = []
  let cur = ''
  for (const part of parts) {
    const t = part.trim()
    if (!t) continue
    if (cur.length > 0 && (cur.length + t.length + delim.length) > target) {
      if (cur.length >= 500) { pages.push(cur.trim()); cur = t }
      else { cur += delim + t }
    } else { cur += (cur ? delim : '') + t }
  }
  if (cur.trim()) {
    if (pages.length > 0 && cur.trim().length < 500) pages[pages.length - 1] += delim + cur.trim()
    else pages.push(cur.trim())
  }
  return pages.length > 0 ? pages : [text]
}
function splitLongChapter(text: string, targetChars = 2000): string[] {
  if (text.length <= targetChars * 1.3) return [text]
  // 1차: \\n\\n 분할
  const first = splitByDelim(text, '\\n\\n', targetChars)
  // 2차: 여전히 긴 페이지는 \\n 분할
  const second: string[] = []
  for (const p of first) {
    if (p.length > targetChars * 1.3) { for (const s of splitByDelim(p, '\\n', targetChars)) second.push(s) }
    else second.push(p)
  }
  // 3차: 그래도 길면 마침표 기준 강제 분할
  const final: string[] = []
  for (const p of second) {
    if (p.length > targetChars * 2) {
      let rem = p
      while (rem.length > targetChars * 1.3) {
        let cut = -1
        for (let i = targetChars; i >= targetChars * 0.5; i--) {
          if (rem[i] === '.' || rem[i] === '다' || rem[i] === '요') { cut = i + 1; break }
        }
        if (cut === -1) cut = targetChars
        final.push(rem.substring(0, cut).trim())
        rem = rem.substring(cut).trim()
      }
      if (rem) final.push(rem)
    } else final.push(p)
  }
  return final.length > 0 ? final : [text]
}`

if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn)
  fs.writeFileSync(file, c)
  console.log('✓ splitLongChapter 함수 개선 완료 (\\n\\n → \\n → 마침표 3단계)')
} else if (c.includes('splitLongChapter')) {
  console.log('△ splitLongChapter 있지만 패턴 불일치 — 수동 확인 필요')
} else {
  console.log('✗ splitLongChapter 없음 — fix_upload_split.js 먼저 실행 필요')
}
