const fs = require('fs')
const file = 'app/read/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')

// restorePosition에서 document의 page_count도 확인
// 현재: data.current_page > 1이면 복원
// 수정: current_page가 page_count 이상이면 1페이지로
c = c.replace(
  `const restorePosition = async () => {
      try {
        const { data } = await supabase
          .from('reading_sessions')
          .select('current_page')
          .eq('document_id', documentId)
          .eq('reader_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.current_page && data.current_page > 1) {
          setPageNumber(data.current_page)
        }`,
  `const restorePosition = async () => {
      try {
        // 문서의 page_count 가져오기
        const { data: docInfo } = await supabase
          .from('documents')
          .select('page_count')
          .eq('id', documentId)
          .single()

        const { data } = await supabase
          .from('reading_sessions')
          .select('current_page')
          .eq('document_id', documentId)
          .eq('reader_id', user.id)
          .order('last_read_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data?.current_page && data.current_page > 1) {
          // 완독 상태(마지막 페이지)면 처음부터 다시
          if (docInfo?.page_count && data.current_page >= docInfo.page_count) {
            setPageNumber(1)
          } else {
            setPageNumber(data.current_page)
          }
        }`
)

fs.writeFileSync(file, c)
console.log('완독 시 1페이지 복원 수정 완료')
