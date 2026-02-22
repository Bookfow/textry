const fs = require('fs')
const file = 'components/document-card.tsx'
let c = fs.readFileSync(file, 'utf8')

// 컴팩트 + 그리드 모두 동일한 패턴 — 전역 제거
// 호버 설명 오버레이 블록 제거 (2곳)
const overlay = `            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 w-full">
                <p className="text-white text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {doc.description || '설명이 없습니다'}
                </p>
              </div>
            </div>`

while (c.includes(overlay)) {
  c = c.replace(overlay, '')
}

// 그리드 모드 (들여쓰기 다를 수 있음)
const overlay2 = `          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 w-full">
              <p className="text-white text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {doc.description || '설명이 없습니다'}
              </p>
            </div>
          </div>`

while (c.includes(overlay2)) {
  c = c.replace(overlay2, '')
}

fs.writeFileSync(file, c)
console.log('호버 설명 오버레이 제거 완료')
