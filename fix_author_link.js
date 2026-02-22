const fs = require('fs')

// ━━━ 1. browse/page.tsx — author 파라미터 지원 추가 ━━━
let browse = fs.readFileSync('app/(main)/browse/page.tsx', 'utf8')

// author 파라미터 읽기 추가
browse = browse.replace(
  "const sort = searchParams.get('sort') || 'recent'\n  const category = searchParams.get('category') || 'all'",
  "const sort = searchParams.get('sort') || 'recent'\n  const category = searchParams.get('category') || 'all'\n  const authorFilter = searchParams.get('author') || ''"
)

// loadDocuments dependency에 authorFilter 추가
browse = browse.replace(
  '}, [sort, category, user])',
  '}, [sort, category, authorFilter, user])'
)

// 쿼리에 author_name 필터 추가
browse = browse.replace(
  "if (category !== 'all') query = query.eq('category', category)",
  "if (category !== 'all') query = query.eq('category', category)\n\n      if (authorFilter) query = query.eq('author_name', authorFilter)"
)

// 제목에 저자명 표시
browse = browse.replace(
  "category === 'all' ? '전체 문서' : `${getCategoryIcon(category)} ${getCategoryLabel(category)}`",
  "authorFilter ? `${authorFilter}의 문서` : category === 'all' ? '전체 문서' : `${getCategoryIcon(category)} ${getCategoryLabel(category)}`"
)

// authorName에 author_name 우선 사용
browse = browse.replace(
  "authorName={author?.username || author?.email}",
  "authorName={(doc as any).author_name || author?.username || author?.email}"
)

fs.writeFileSync('app/(main)/browse/page.tsx', browse)
console.log('browse/page.tsx 수정 완료')

// ━━━ 2. document/[id]/page.tsx — 저자 링크 + 다른 도서 쿼리 수정 ━━━
let detail = fs.readFileSync('app/(main)/document/[id]/page.tsx', 'utf8')

// 다른 도서 쿼리: author_id → author_name
detail = detail.replace(
  ".eq('author_id', docData.author_id)\n        .eq('is_published', true)\n        .neq('id', documentId)",
  ".eq('author_name', docData.author_name)\n        .eq('is_published', true)\n        .neq('id', documentId)"
)

// 저자명 클릭 링크들: /author/${author.id} → /browse?author=저자명
// 히어로 영역 (366번 근처)
detail = detail.replace(
  '<Link href={`/author/${author.id}`}>\n                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">',
  '<Link href={`/browse?author=${encodeURIComponent((doc as any).author_name || author.username || author.email)}`}>\n                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">'
)

// 저자소개 탭 아바타 링크 (549번 근처)
detail = detail.replace(
  '<Link href={`/author/${author.id}`}>\n                  {author.avatar_url',
  '<Link href={`/browse?author=${encodeURIComponent((doc as any).author_name || author.username || author.email)}`}>\n                  {author.avatar_url'
)

// 저자소개 탭 이름 링크 (556번 근처)
detail = detail.replace(
  '<Link href={`/author/${author.id}`}>\n                    <p className="text-base font-semibold',
  '<Link href={`/browse?author=${encodeURIComponent((doc as any).author_name || author.username || author.email)}`}>\n                    <p className="text-base font-semibold'
)

// 저자소개 탭 "전체 보기" 링크 (608번 근처)
detail = detail.replace(
  "<Link href={`/author/${author.id}`} className=\"block mt-3 text-center text-xs text-[#B2967D] hover:underline\">\n                      전체 보기 →\n                    </Link>",
  "<Link href={`/browse?author=${encodeURIComponent((doc as any).author_name || author?.username || author?.email)}`} className=\"block mt-3 text-center text-xs text-[#B2967D] hover:underline\">\n                      전체 보기 →\n                    </Link>"
)

// 하단 "전체보기" 링크 (722번 근처)
detail = detail.replace(
  '<Link href={`/author/${author?.id}`} className="flex items-center gap-1 text-sm text-[#B2967D] hover:text-[#a67c52]">',
  '<Link href={`/browse?author=${encodeURIComponent((doc as any).author_name || author?.username || author?.email)}`} className="flex items-center gap-1 text-sm text-[#B2967D] hover:text-[#a67c52]">'
)

fs.writeFileSync('app/(main)/document/[id]/page.tsx', detail)
console.log('document/[id]/page.tsx 수정 완료')

console.log('\n모든 수정 완료!')
