const fs = require('fs')
const file = 'app/(main)/document/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 첫번째: author_name 있으면 아바타 숨기기 (36px)
c = c.replace(
  '{author.avatar_url ? (\n                        <Image src={author.avatar_url} alt="" width={36} height={36}',
  '{author.avatar_url && !(doc as any).author_name ? (\n                        <Image src={author.avatar_url} alt="" width={36} height={36}'
)

// 첫번째 이니셜도 author_name 사용
c = c.replace(
  '{(author.username || author.email)[0].toUpperCase()}',
  '{((doc as any).author_name || author.username || author.email)[0].toUpperCase()}'
)

// 두번째: author_name 있으면 아바타 숨기기 (56px)
c = c.replace(
  '{author.avatar_url ? (\n                        <Image src={author.avatar_url} alt="" width={56} height={56}',
  '{author.avatar_url && !(doc as any).author_name ? (\n                        <Image src={author.avatar_url} alt="" width={56} height={56}'
)

// 두번째 이니셜도 author_name 사용
c = c.replace(
  '{(author.username || author.email)[0].toUpperCase()}',
  '{((doc as any).author_name || author.username || author.email)[0].toUpperCase()}'
)

fs.writeFileSync(file, c)
console.log('아바타 수정 완료')
