// lib/epub-parser.ts
// EPUB 파서 — JSZip으로 압축 해제 → OPF → spine 순서대로 XHTML 추출 → 리플로우 마크업 변환

import JSZip from 'jszip'

export interface EpubChapter {
  id: string
  title: string
  content: string // 리플로우 마크업 (h1/h2/h3 + 본문 텍스트)
}

export interface EpubData {
  title: string
  author: string
  language: string
  chapters: EpubChapter[]
}

// ━━━ 경로 정규화 (../ 해석) ━━━
function normalizePath(base: string, relative: string): string {
  if (relative.startsWith('/')) return relative.slice(1)

  const baseParts = base.split('/')
  baseParts.pop() // 파일명 제거
  const relParts = relative.split('/')

  for (const part of relParts) {
    if (part === '..') {
      baseParts.pop()
    } else if (part !== '.') {
      baseParts.push(part)
    }
  }

  return baseParts.join('/')
}

// ━━━ 문단 자동 분할 (p태그 없는 EPUB 대응) ━━━

/**
 * 텍스트를 검사해서 500자 이상 블록이 있으면 문장 단위로 분할
 */
function ensureParagraphs(text: string): string {
  if (!text || text.trim().length === 0) return text

  const blocks = text.split('\n\n')
  const result: string[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // 마크업 태그는 그대로 유지
    if (trimmed.startsWith('<h1>') || trimmed.startsWith('<h2>') || trimmed.startsWith('<h3>') || trimmed === '<hr>') {
      result.push(trimmed)
      continue
    }

    // 500자 미만이면 그대로
    if (trimmed.length < 500) {
      result.push(trimmed)
      continue
    }

    // 500자 이상이면 문장 단위 분할
    const split = splitBySentences(trimmed)
    result.push(split)
  }

  return result.join('\n\n')
}

/**
 * "다." 기준으로 문장을 분리해서 280자/4문장마다 \n\n 삽입
 */
function splitBySentences(text: string): string {
  // 한국어 종결어미 + 마침표/느낌표/물음표 패턴
  const sentencePattern = /([가-힣a-zA-Z0-9\s,'"'""\-–—…·]+?(?:다|요|죠|음|임|함|됨|뇨|까|지|네|세|라|고|며)[.!?])\s*/g

  const sentences: string[] = []
  let lastIndex = 0
  let match

  while ((match = sentencePattern.exec(text)) !== null) {
    const beforeMatch = text.slice(lastIndex, match.index).trim()
    if (beforeMatch) {
      if (sentences.length > 0) {
        sentences[sentences.length - 1] += ' ' + beforeMatch
      } else {
        sentences.push(beforeMatch)
      }
    }
    sentences.push(match[1].trim())
    lastIndex = match.index + match[0].length
  }

  // 남은 텍스트
  const remaining = text.slice(lastIndex).trim()
  if (remaining) {
    if (sentences.length > 0) {
      sentences[sentences.length - 1] += ' ' + remaining
    } else {
      sentences.push(remaining)
    }
  }

  // 문장이 충분하지 않으면 길이 기준 폴백
  if (sentences.length < 3) {
    return splitByLength(text, 280)
  }

  // 280자 또는 4문장마다 \n\n 삽입
  const paragraphs: string[] = []
  let current = ''
  let sentCount = 0

  for (const sentence of sentences) {
    if (current && (current.length + sentence.length > 280 || sentCount >= 4)) {
      paragraphs.push(current.trim())
      current = ''
      sentCount = 0
    }
    current += (current ? ' ' : '') + sentence
    sentCount++
  }
  if (current.trim()) paragraphs.push(current.trim())

  return paragraphs.join('\n\n')
}

/**
 * "다." 패턴이 부족할 때 길이 기준으로 분할하는 폴백
 */
function splitByLength(text: string, target: number): string {
  if (text.length <= target) return text

  const paragraphs: string[] = []
  let remaining = text

  while (remaining.length > target) {
    let splitPos = -1
    // target 근처에서 마침표 찾기
    for (let i = Math.min(target, remaining.length - 1); i >= Math.floor(target * 0.5); i--) {
      if (remaining[i] === '.' || remaining[i] === '!' || remaining[i] === '?') {
        splitPos = i + 1
        break
      }
    }

    // 마침표 못 찾으면 공백에서 자르기
    if (splitPos === -1) {
      for (let i = Math.min(target, remaining.length - 1); i >= Math.floor(target * 0.5); i--) {
        if (remaining[i] === ' ' || remaining[i] === ',') {
          splitPos = i + 1
          break
        }
      }
    }

    // 그래도 못 찾으면 강제로 자르기
    if (splitPos === -1) splitPos = target

    paragraphs.push(remaining.slice(0, splitPos).trim())
    remaining = remaining.slice(splitPos).trim()
  }

  if (remaining) paragraphs.push(remaining)

  return paragraphs.join('\n\n')
}

// ━━━ HTML → 리플로우 마크업 변환 ━━━
function htmlToReflowText(html: string): string {
  // DOMParser로 파싱 (XHTML 우선, 실패 시 HTML)
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'application/xhtml+xml')
    // 파싱 에러 체크
    const parseError = doc.querySelector('parsererror')
    if (parseError) throw new Error('XHTML parse error')
  } catch {
    doc = new DOMParser().parseFromString(html, 'text/html')
  }

  const body = doc.body || doc.documentElement
  if (!body) return ''

  const parts: string[] = []

  function walkNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim()
      if (text) parts.push(text)
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as Element
    const tag = el.tagName.toLowerCase()

    // 스크립트/스타일 무시
    if (tag === 'script' || tag === 'style') return

    // 제목 태그 보존
    if (tag === 'h1') {
      const text = (el.textContent || '').trim()
      if (text) parts.push(`<h1>${text}</h1>`)
      return
    }
    if (tag === 'h2') {
      const text = (el.textContent || '').trim()
      if (text) parts.push(`<h2>${text}</h2>`)
      return
    }
    if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const text = (el.textContent || '').trim()
      if (text) parts.push(`<h3>${text}</h3>`)
      return
    }

    // 수평선
    if (tag === 'hr') {
      parts.push('<hr>')
      return
    }

    // 블록 요소: 자식 순회 후 구분
    const blockTags = ['p', 'div', 'section', 'article', 'blockquote', 'li', 'dd', 'dt', 'figcaption', 'pre']
    if (blockTags.includes(tag)) {
      const text = (el.textContent || '').trim()
      if (text) {
        // 자식에 제목이 있으면 재귀 처리
        const hasHeading = el.querySelector('h1, h2, h3, h4, h5, h6')
        if (hasHeading) {
          for (const child of Array.from(el.childNodes)) {
            walkNode(child)
          }
        } else {
          parts.push(text)
        }
      }
      return
    }

    // 인라인 요소: 자식 순회
    for (const child of Array.from(el.childNodes)) {
      walkNode(child)
    }
  }

  walkNode(body)

  // 빈 항목 제거 + 중복 제거
  const filtered = parts.filter(p => p.trim().length > 0)
  let result = filtered.join('\n\n')

  // ★ 문단 자동 분할 적용 (p태그 없는 EPUB 대응)
  result = ensureParagraphs(result)

  return result
}

// ━━━ 메인 파서 ━━━
export async function parseEpub(arrayBuffer: ArrayBuffer): Promise<EpubData> {
  const zip = await JSZip.loadAsync(arrayBuffer)

  // 1. container.xml에서 OPF 경로 찾기
  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('EPUB container.xml 없음')

  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootfileEl = containerDoc.querySelector('rootfile')
  const opfPath = rootfileEl?.getAttribute('full-path')
  if (!opfPath) throw new Error('EPUB OPF 경로 없음')

  // 2. OPF 파싱
  const opfXml = await zip.file(opfPath)?.async('text')
  if (!opfXml) throw new Error('EPUB OPF 파일 없음')

  const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml')

  // 메타데이터 추출
  const title = opfDoc.querySelector('metadata title')?.textContent ||
                opfDoc.querySelector('dc\\:title, title')?.textContent || '제목 없음'
  const author = opfDoc.querySelector('metadata creator')?.textContent ||
                 opfDoc.querySelector('dc\\:creator, creator')?.textContent || '작자 미상'
  const language = opfDoc.querySelector('metadata language')?.textContent ||
                   opfDoc.querySelector('dc\\:language, language')?.textContent || 'ko'

  // 3. manifest: id → href 매핑
  const manifest = new Map<string, string>()
  const manifestItems = opfDoc.querySelectorAll('manifest item')
  for (const item of Array.from(manifestItems)) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (id && href) manifest.set(id, href)
  }

  // 4. spine: 읽기 순서
  const spineItems = opfDoc.querySelectorAll('spine itemref')
  const spineOrder: string[] = []
  for (const ref of Array.from(spineItems)) {
    const idref = ref.getAttribute('idref')
    if (idref) spineOrder.push(idref)
  }

  // 5. TOC에서 챕터 제목 추출 시도 (NCX 또는 Nav)
  const chapterTitles = new Map<string, string>()

  // NCX TOC 시도
  const tocId = opfDoc.querySelector('spine')?.getAttribute('toc')
  if (tocId && manifest.has(tocId)) {
    const tocHref = manifest.get(tocId)!
    const tocPath = normalizePath(opfPath, tocHref)
    const tocXml = await zip.file(tocPath)?.async('text')
    if (tocXml) {
      const tocDoc = new DOMParser().parseFromString(tocXml, 'application/xml')
      const navPoints = tocDoc.querySelectorAll('navPoint')
      for (const np of Array.from(navPoints)) {
        const label = np.querySelector('navLabel text')?.textContent?.trim()
        const src = np.querySelector('content')?.getAttribute('src')
        if (label && src) {
          const srcFile = src.split('#')[0]
          chapterTitles.set(srcFile, label)
        }
      }
    }
  }

  // Nav TOC 시도 (EPUB 3)
  if (chapterTitles.size === 0) {
    for (const [, href] of manifest) {
      if (href.endsWith('.xhtml') || href.endsWith('.html')) {
        const fullPath = normalizePath(opfPath, href)
        const content = await zip.file(fullPath)?.async('text')
        if (content && content.includes('epub:type="toc"')) {
          const navDoc = new DOMParser().parseFromString(content, 'text/html')
          const links = navDoc.querySelectorAll('nav[epub\\:type="toc"] a, nav a')
          for (const link of Array.from(links)) {
            const linkHref = link.getAttribute('href')
            const linkText = link.textContent?.trim()
            if (linkHref && linkText) {
              const linkFile = linkHref.split('#')[0]
              chapterTitles.set(linkFile, linkText)
            }
          }
          if (chapterTitles.size > 0) break
        }
      }
    }
  }

  // 6. spine 순서대로 XHTML 추출 → 리플로우 마크업 변환
  const chapters: EpubChapter[] = []

  for (let i = 0; i < spineOrder.length; i++) {
    const itemId = spineOrder[i]
    const href = manifest.get(itemId)
    if (!href) continue

    const filePath = normalizePath(opfPath, href)
    const xhtml = await zip.file(filePath)?.async('text')
    if (!xhtml) continue

    const content = htmlToReflowText(xhtml)

    if (!content || content.replace(/\s/g, '').length < 5) continue

    let chapterTitle = chapterTitles.get(href) || ''
    if (!chapterTitle) {
      const h1Match = content.match(/<h1>(.*?)<\/h1>/)
      const h2Match = content.match(/<h2>(.*?)<\/h2>/)
      chapterTitle = h1Match?.[1] || h2Match?.[1] || `챕터 ${chapters.length + 1}`
    }

    chapters.push({
      id: itemId,
      title: chapterTitle,
      content: content,
    })
  }

  return { title, author, language, chapters }
}
