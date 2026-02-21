const fs = require('fs')
const file = 'app/(main)/document/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 376: {author.username || author.email} → author_name 우선
c = c.replace(
  '{author.username || author.email}',
  '{(doc as any).author_name || author.username || author.email}'
)

// 384: authorName={author.username || author.email}
c = c.replace(
  'authorName={author.username || author.email}',
  'authorName={(doc as any).author_name || author.username || author.email}'
)

// 570: authorName={author.username || author.email} (두번째)
c = c.replace(
  'authorName={author.username || author.email}',
  'authorName={(doc as any).author_name || author.username || author.email}'
)

// 703: authorName={(d as any).profiles?.username ...}
c = c.replace(
  'authorName={(d as any).profiles?.username || (d as any).profiles?.email}',
  'authorName={(d as any).author_name || (d as any).profiles?.username || (d as any).profiles?.email}'
)

// 724: authorName={author?.username || author?.email}
c = c.replace(
  'authorName={author?.username || author?.email}',
  'authorName={(doc as any).author_name || author?.username || author?.email}'
)

// 716: {author?.username || '작가'}의 다른 문서
c = c.replace(
  "{author?.username || '작가'}의 다른 문서",
  "{(doc as any).author_name || author?.username || '작가'}의 다른 문서"
)

fs.writeFileSync(file, c)
console.log('상세페이지 저자명 수정 완료')
