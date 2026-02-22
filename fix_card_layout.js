const fs = require('fs')
const file = 'components/document-card.tsx'
let c = fs.readFileSync(file, 'utf8')

// ━━━ 컴팩트 모드: 좌상단 카테고리+페이지수 제거 ━━━
c = c.replace(
  `            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
                {getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}
              </span>
              {doc.page_count && doc.page_count > 0 && (
                <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm w-fit flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5" /> {doc.page_count}p
                </span>
              )}
            </div>`,
  ``
)

// 컴팩트 모드: 조회수/좋아요 줄에 카테고리+페이지수 추가
c = c.replace(
  `            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }`,
  `            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
                <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>{getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}</span>
                {doc.page_count && doc.page_count > 0 && (
                  <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{doc.page_count}p</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }`
)

// ━━━ 그리드 모드: 좌상단 카테고리+페이지수 제거 ━━━
c = c.replace(
  `          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm">
              {getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}
            </span>
            {doc.page_count && doc.page_count > 0 && (
              <span className="px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm w-fit flex items-center gap-0.5">
                <FileText className="w-2.5 h-2.5" /> {doc.page_count}p
              </span>
            )}
          </div>`,
  ``
)

// 그리드 모드: 조회수/좋아요 줄에 카테고리+페이지수 추가
c = c.replace(
  `          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>`,
  `          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>{getCategoryIcon(doc.category || '')} {getCategoryLabel(doc.category || '')}</span>
              {doc.page_count && doc.page_count > 0 && (
                <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{doc.page_count}p</span>
              )}
            </div>`
)

fs.writeFileSync(file, c)
console.log('카드 레이아웃 수정 완료')
