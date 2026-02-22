const fs = require('fs')
const file = 'app/(main)/document/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 1. 히어로 영역 구독 버튼: author_name 없을 때만 표시
c = c.replace(
  '{user && user.id !== author.id && (\n                    <div className="hidden sm:block">\n                      <SubscribeButton',
  '{user && user.id !== author.id && !(doc as any).author_name && (\n                    <div className="hidden sm:block">\n                      <SubscribeButton'
)

// 2. 저자소개 탭 구독 버튼: author_name 없을 때만 표시
c = c.replace(
  '{user && user.id !== author.id && (\n                  <SubscribeButton\n                    authorId={author.id}\n                    authorName={(doc as any).author_name || author.username || author.email}\n                    initialSubscribersCount={author.subscribers_count}\n                  />\n                )}',
  '{user && user.id !== author.id && !(doc as any).author_name && (\n                  <SubscribeButton\n                    authorId={author.id}\n                    authorName={author.username || author.email}\n                    initialSubscribersCount={author.subscribers_count}\n                  />\n                )}'
)

fs.writeFileSync(file, c)
console.log('구독 버튼 수정 완료')
