const fs = require('fs')
const file = 'app/read/[id]/page.tsx'
let c = fs.readFileSync(file, 'utf8')
let changed = 0

// ━━━ 수정 1: > 1 → > 0 (1페이지짜리 문서 대응) ━━━
// 이미 적용되었을 수 있으니 양쪽 다 체크
if (c.includes('data.current_page > 1')) {
  c = c.replace('data.current_page > 1', 'data.current_page > 0')
  console.log('✓ 수정1: current_page > 1 → > 0')
  changed++
} else if (c.includes('data.current_page > 0')) {
  console.log('○ 수정1: 이미 > 0 적용됨')
} else {
  console.log('✗ 수정1: 패턴 못 찾음')
}

// ━━━ 수정 2: setRestoredFromComplete(true) 추가 ━━━
if (c.includes('setRestoredFromComplete(true)')) {
  console.log('○ 수정2: 이미 setRestoredFromComplete(true) 있음')
} else if (c.includes('// 완독 상태(마지막 페이지)면 처음부터 다시')) {
  c = c.replace(
    /if \(docInfo\?\.page_count && data\.current_page >= docInfo\.page_count\) \{\s*\n\s*setPageNumber\(1\)/,
    `if (docInfo?.page_count && data.current_page >= docInfo.page_count) {
            setPageNumber(1)
            setRestoredFromComplete(true)`
  )
  console.log('✓ 수정2: setRestoredFromComplete(true) 추가')
  changed++
} else {
  console.log('✗ 수정2: 패턴 못 찾음')
}

// ━━━ 수정 3 (핵심): end 광고 useEffect를 타이밍 안전하게 변경 ━━━
// 문제: restorePosition은 비동기(DB 쿼리 2번)라 느리고,
// end 광고 useEffect는 documentReady 변경으로 먼저 실행됨
// → restoredFromComplete가 아직 false인 상태에서 광고 발동
//
// 해결: restoredFromComplete를 dependency에 추가하고,
// 추가로 "아직 복원 체크 안 끝남" 상태를 구분하는 플래그 사용

// 3-a: restoredFromComplete를 dependency 배열에 추가
const oldDeps = '[pageNumber, numPages, showAdOverlay, documentReady, tierConfig, adCount, lastAdTime, lastAdPage, endAdShown]'
const newDeps = '[pageNumber, numPages, showAdOverlay, documentReady, tierConfig, adCount, lastAdTime, lastAdPage, endAdShown, restoredFromComplete]'
if (c.includes(oldDeps)) {
  c = c.replace(oldDeps, newDeps)
  console.log('✓ 수정3a: dependency에 restoredFromComplete 추가')
  changed++
} else if (c.includes(newDeps)) {
  console.log('○ 수정3a: 이미 dependency에 있음')
} else {
  console.log('✗ 수정3a: dependency 패턴 못 찾음')
}

// 3-b: 복원 완료 전까지 end 광고를 막는 플래그 추가
// restoredFromComplete 대신, 복원 체크 자체가 끝났는지를 추적
if (!c.includes('restoreChecked')) {
  // useState 추가: restoredFromComplete 바로 뒤에
  c = c.replace(
    'const [restoredFromComplete, setRestoredFromComplete] = useState(false)',
    `const [restoredFromComplete, setRestoredFromComplete] = useState(false)
  const [restoreChecked, setRestoreChecked] = useState(false)`
  )

  // restorePosition 함수 끝에 setRestoreChecked(true) 추가
  // try-catch 뒤, restorePosition() 호출 전
  c = c.replace(
    /} catch \{\}\s*\n\s*\}\s*\n\s*restorePosition\(\)/,
    `} catch {}
      setRestoreChecked(true)
    }
    restorePosition()`
  )

  // 비로그인 사용자도 처리: user가 없으면 바로 restoreChecked = true
  // useEffect 시작 부분에서 user 없으면 바로 세팅
  c = c.replace(
    'if (!user || !documentId || loading) return',
    `if (!user || !documentId || loading) {
      if (!user && !loading) setRestoreChecked(true)
      return
    }`
  )

  // end 광고 조건에 restoreChecked 추가
  c = c.replace(
    'if (numPages === 0 || showAdOverlay || !documentReady) return',
    'if (numPages === 0 || showAdOverlay || !documentReady || !restoreChecked) return'
  )

  // dependency에 restoreChecked 추가
  c = c.replace(newDeps, newDeps.replace(']', ', restoreChecked]'))

  console.log('✓ 수정3b: restoreChecked 플래그 추가 (복원 완료 전 end 광고 차단)')
  changed++
} else {
  console.log('○ 수정3b: 이미 restoreChecked 있음')
}

fs.writeFileSync(file, c)
console.log(`\n완료! ${changed}개 수정됨`)
