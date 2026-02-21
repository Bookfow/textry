const fs = require('fs')
const file = 'app/(main)/document/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 368-369: author_name이 있으면 avatar 안 보여주기 (첫번째)
c = c.replace(
  '{author.avatar_url ? (\n                         <Image src={author.avatar_url} alt="" width={36} height={36} className="rounded-full object-cover" />\n                       ) : (\n                         <div className="w-9 h-9 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">\n                           {(author.username || author.email)[0].toUpperCase()}',
  '{author.avatar_url && !(doc as any).author_name ? (\n                         <Image src={author.avatar_url} alt="" width={36} height={36} className="rounded-full object-cover" />\n                       ) : (\n                         <div className="w-9 h-9 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">\n                           {((doc as any).author_name || author.username || author.email)[0].toUpperCase()}'
)

// 549-550: 두번째 아바타도 동일하게 수정
c = c.replace(
  '{author.avatar_url ? (\n                         <Image src={author.avatar_url} alt="" width={56} height={56} className="rounded-full object-cover" />\n                       ) : (\n                         <div className="w-9 h-9 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">\n                           {(author.username || author.email)[0].toUpperCase()}',
  '{author.avatar_url && !(doc as any).author_name ? (\n                         <Image src={author.avatar_url} alt="" width={56} height={56} className="rounded-full object-cover" />\n                       ) : (\n                         <div className="w-9 h-9 bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] rounded-full flex items-center justify-center text-[#1A1410] font-bold text-sm">\n                           {((doc as any).author_name || author.username || author.email)[0].toUpperCase()}'
)

fs.writeFileSync(file, c)
console.log('아바타 수정 완료')
