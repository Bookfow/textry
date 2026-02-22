const fs = require('fs')
const file = 'components/document-card.tsx'
let c = fs.readFileSync(file, 'utf8')

// ━━━ 컴팩트 모드 ━━━

// 1. 표지 위 찜/좋아요 버튼 제거
c = c.replace(
  `            <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
              <button onClick={handleToggleList}
                className={\`p-1.5 rounded-full backdrop-blur-sm transition-colors \${inList ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}\`}
                title={inList ? '찜 해제' : '찜하기'}>
                <Heart className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleLike}
                className={\`p-1.5 rounded-full backdrop-blur-sm transition-colors \${liked ? 'bg-blue-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}\`}
                title={liked ? '좋아요 취소' : '좋아요'}>
                <ThumbsUp className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="absolute top-2 left-2 flex flex-col gap-1">
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

// 2. 컴팩트 하단: 제목+저자+통계 → 버튼+통계+카테고리
c = c.replace(
  `          <div>
            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
              {doc.title}
            </h3>
            {displayAuthor && (
              <p className="text-[11px] text-gray-500 truncate mb-1">{displayAuthor}</p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }`,
  `          <div>
            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
              {doc.title}
            </h3>
            {displayAuthor && (
              <p className="text-[11px] text-gray-500 truncate mb-1">{displayAuthor}</p>
            )}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <button onClick={handleToggleList}
                  className={\`p-1 rounded-full transition-colors \${inList ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}\`}
                  title={inList ? '찜 해제' : '찜하기'}>
                  <Heart className="w-3.5 h-3.5" fill={inList ? 'currentColor' : 'none'} />
                </button>
                <button onClick={handleLike}
                  className={\`p-1 rounded-full transition-colors \${liked ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}\`}
                  title={liked ? '좋아요 취소' : '좋아요'}>
                  <ThumbsUp className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
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

// ━━━ 그리드 모드 ━━━

// 1. 표지 위 찜/좋아요 버튼 제거
c = c.replace(
  `          <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
            <button onClick={handleToggleList}
              className={\`p-1.5 rounded-full backdrop-blur-sm transition-colors \${inList ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}\`}
              title={inList ? '찜 해제' : '찜하기'}>
              <Heart className="w-4 h-4" fill={inList ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleLike}
              className={\`p-1.5 rounded-full backdrop-blur-sm transition-colors \${liked ? 'bg-blue-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}\`}
              title={liked ? '좋아요 취소' : '좋아요'}>
              <ThumbsUp className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="absolute top-2 left-2 flex flex-col gap-1">
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

// 2. 그리드 하단: 통계줄 → 버튼+통계+카테고리
c = c.replace(
  `        <div>
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
            {doc.title}
          </h3>
          {displayAuthor && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">{displayAuthor}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{likesCount.toLocaleString()}</span>
            </div>
            {progress !== null && lastReadAt && (
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-blue-600 font-medium">{progress}%</span>
                <span className="flex items-center gap-0.5 text-gray-400">
                  <Clock className="w-3 h-3" />{getTimeAgo(lastReadAt)}
                </span>
              </div>
            )}
          </div>
        </div>`,
  `        <div>
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors dark:text-white">
            {doc.title}
          </h3>
          {displayAuthor && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-1">{displayAuthor}</p>
          )}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <button onClick={handleToggleList}
                className={\`p-1 rounded-full transition-colors \${inList ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}\`}
                title={inList ? '찜 해제' : '찜하기'}>
                <Heart className="w-3.5 h-3.5" fill={inList ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleLike}
                className={\`p-1 rounded-full transition-colors \${liked ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}\`}
                title={liked ? '좋아요 취소' : '좋아요'}>
                <ThumbsUp className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>
            {progress !== null && lastReadAt && (
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-blue-600 font-medium">{progress}%</span>
                <span className="flex items-center gap-0.5 text-gray-400">
                  <Clock className="w-3 h-3" />{getTimeAgo(lastReadAt)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400">
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
        </div>`
)

fs.writeFileSync(file, c)
console.log('카드 레이아웃 수정 완료')
