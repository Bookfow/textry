const fs = require('fs')
const file = 'app/read/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// 수정 1: current_page > 1 → current_page > 0
// 1페이지짜리 문서(심청전 등)는 current_page=1이라 > 1 조건에 안 걸림
// > 0으로 바꿔서 1페이지짜리도 완독 판정 블록에 진입하게 함
//
// 수정 2: setRestoredFromComplete(true) 추가
// 이 플래그가 true여야 end 광고 조건에서 !restoredFromComplete가 false가 되어 광고 안 뜸
// 이전 수정에서 이 플래그 세팅이 빠져있었음

c = c.replace(
  `if (data?.current_page && data.current_page > 1) {
          // 완독 상태(마지막 페이지)면 처음부터 다시
          if (docInfo?.page_count && data.current_page >= docInfo.page_count) {
            setPageNumber(1)
          } else {
            setPageNumber(data.current_page)
          }
        }`,
  `if (data?.current_page && data.current_page > 0) {
          // 완독 상태(마지막 페이지)면 처음부터 다시
          if (docInfo?.page_count && data.current_page >= docInfo.page_count) {
            setPageNumber(1)
            setRestoredFromComplete(true)
          } else {
            setPageNumber(data.current_page)
          }
        }`
)

fs.writeFileSync(file, c)
console.log('수정 완료: 1페이지 문서 완독 복원 + restoredFromComplete 플래그')
