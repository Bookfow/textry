// fix_author_browse.js
// 저자명 클릭 시 author_name 없는 도서는 author_id로 필터하도록 수정
// 실행: cd C:\Users\user\textry && node fix_author_browse.js

const fs = require('fs');

// ═══════════════════════════════════════════
// 1. browse/page.tsx — author_id 필터 지원 추가
// ═══════════════════════════════════════════
const browsePath = 'app/(main)/browse/page.tsx';
let browse = fs.readFileSync(browsePath, 'utf8');

// 1-1. authorIdFilter 변수 추가
browse = browse.replace(
  `const authorFilter = searchParams.get('author') || ''`,
  `const authorFilter = searchParams.get('author') || ''
  const authorIdFilter = searchParams.get('author_id') || ''`
);

// 1-2. authorIdName 상태 추가
browse = browse.replace(
  `const [loadingMore, setLoadingMore] = useState(false)`,
  `const [loadingMore, setLoadingMore] = useState(false)
  const [authorIdName, setAuthorIdName] = useState('')`
);

// 1-3. useEffect 의존성에 authorIdFilter 추가
browse = browse.replace(
  `}, [sort, category, authorFilter, user])`,
  `}, [sort, category, authorFilter, authorIdFilter, user])`
);

// 1-4. loadDocuments에서 authorIdFilter 쿼리 추가
browse = browse.replace(
  `if (authorFilter) query = query.eq('author_name', authorFilter)`,
  `if (authorFilter) query = query.eq('author_name', authorFilter)

      if (authorIdFilter) query = query.eq('author_id', authorIdFilter)`
);

// 1-5. 프로필 데이터에서 authorIdName 설정
browse = browse.replace(
  `if (profilesData) {
          setAuthors(prev => {
            const newMap = new Map(prev)
            profilesData.forEach(p => newMap.set(p.id, p))
            return newMap
          })
        }`,
  `if (profilesData) {
          setAuthors(prev => {
            const newMap = new Map(prev)
            profilesData.forEach(p => newMap.set(p.id, p))
            return newMap
          })
          if (authorIdFilter && isInitial) {
            const uploaderProfile = profilesData.find(p => p.id === authorIdFilter)
            if (uploaderProfile) {
              setAuthorIdName(uploaderProfile.username || uploaderProfile.email || '')
            }
          }
        }`
);

// 1-6. 제목에 authorIdFilter 표시
browse = browse.replace(
  `{authorFilter ? \`\${authorFilter}의 문서\` : category === 'all' ? '전체 문서' : \`\${getCategoryIcon(category)} \${getCategoryLabel(category)}\`}`,
  `{authorFilter ? \`\${authorFilter}의 문서\` : authorIdFilter ? \`\${authorIdName || '작가'}의 문서\` : category === 'all' ? '전체 문서' : \`\${getCategoryIcon(category)} \${getCategoryLabel(category)}\`}`
);

fs.writeFileSync(browsePath, browse);
console.log('✅ browse/page.tsx 수정 완료');


// ═══════════════════════════════════════════
// 2. document/[id]/page.tsx — 저자 링크 분기 처리
// ═══════════════════════════════════════════
const docPath = 'app/(main)/document/[id]/page.tsx';
let doc = fs.readFileSync(docPath, 'utf8');

// 패턴1: author.username (히어로 영역)
let count = 0;
while (doc.includes('/browse?author=${encodeURIComponent((doc as any).author_name || author.username || author.email)}')) {
  doc = doc.replace(
    '/browse?author=${encodeURIComponent((doc as any).author_name || author.username || author.email)}',
    '${(doc as any).author_name ? `/browse?author=${encodeURIComponent((doc as any).author_name)}` : `/browse?author_id=${author.id}`}'
  );
  count++;
  if (count > 20) break;
}

// 패턴2: author?.username (저자소개 탭, 전체보기 링크)
while (doc.includes('/browse?author=${encodeURIComponent((doc as any).author_name || author?.username || author?.email)}')) {
  doc = doc.replace(
    '/browse?author=${encodeURIComponent((doc as any).author_name || author?.username || author?.email)}',
    '${(doc as any).author_name ? `/browse?author=${encodeURIComponent((doc as any).author_name)}` : `/browse?author_id=${author?.id}`}'
  );
  count++;
  if (count > 20) break;
}

fs.writeFileSync(docPath, doc);
console.log(`✅ document/[id]/page.tsx 수정 완료 — 저자 링크 ${count}개 변경`);
console.log('');
console.log('📌 변경 내용:');
console.log('   - browse: ?author_id=UUID 쿼리 파라미터 지원');
console.log('   - document: author_name 있으면 /browse?author=저자명');
console.log('                author_name 없으면 /browse?author_id=UUID');
console.log('');
console.log('🚀 배포: git add -A && git commit -m "feat: author_id 기반 browse 필터 지원" && git push');
