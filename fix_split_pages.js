// fix_split_pages.js
// 긴 텍스트를 ~2000자 단위로 분할하고 page_count 업데이트
// 실행: cd C:\Users\user\Downloads && node fix_split_pages.js

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://qurknvhesqtuivipdyyu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmtudmhlc3F0dWl2aXBkeXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MTY5MywiZXhwIjoyMDg2MTI3NjkzfQ.jGkb2UH8q0c9awPB8lMQ_N8NPM_idtbg4oU7B9YD7n4'
);

const CHARS_PER_PAGE = 2000;

async function splitPages() {
  // EPUB 문서 중 page_count <= 3인 것 가져오기
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, page_count')
    .eq('file_type', 'epub')
    .lte('page_count', 3);

  if (error) { console.error('문서 조회 실패:', error); return; }
  console.log(`📚 처리 대상: ${docs.length}개 문서\n`);

  let totalFixed = 0;

  for (const doc of docs) {
    // 기존 텍스트 가져오기
    const { data: pages, error: pErr } = await supabase
      .from('document_pages_text')
      .select('page_number, text_content')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true });

    if (pErr || !pages || pages.length === 0) {
      console.log(`⏭️ ${doc.title} — 텍스트 없음`);
      continue;
    }

    // 전체 텍스트 합치기
    const allText = pages.map(p => p.text_content).join('\n\n');

    if (allText.length <= CHARS_PER_PAGE) {
      console.log(`✅ ${doc.title} — ${allText.length}자 (분할 불필요)`);
      // page_count만 1로 맞추기
      await supabase.from('documents').update({ page_count: 1 }).eq('id', doc.id);
      continue;
    }

    // 텍스트를 \n\n 블록 단위로 분할
    const blocks = allText.split('\n\n');
    const newPages = [];
    let currentPage = '';

    for (const block of blocks) {
      // 현재 페이지에 블록을 추가했을 때 CHARS_PER_PAGE를 초과하면 새 페이지
      if (currentPage.length > 0 && currentPage.length + block.length + 2 > CHARS_PER_PAGE) {
        newPages.push(currentPage.trim());
        currentPage = block;
      } else {
        currentPage = currentPage ? currentPage + '\n\n' + block : block;
      }
    }
    if (currentPage.trim()) {
      newPages.push(currentPage.trim());
    }

    if (newPages.length <= pages.length) {
      console.log(`✅ ${doc.title} — ${pages.length}페이지 유지 (${allText.length}자)`);
      continue;
    }

    // 기존 텍스트 삭제
    await supabase
      .from('document_pages_text')
      .delete()
      .eq('document_id', doc.id);

    // 새 페이지 삽입
    const inserts = newPages.map((text, i) => ({
      document_id: doc.id,
      page_number: i + 1,
      text_content: text
    }));

    // 50개씩 배치 삽입
    for (let i = 0; i < inserts.length; i += 50) {
      const batch = inserts.slice(i, i + 50);
      const { error: iErr } = await supabase.from('document_pages_text').insert(batch);
      if (iErr) console.error(`  삽입 오류:`, iErr.message);
    }

    // page_count 업데이트
    await supabase.from('documents').update({ page_count: newPages.length }).eq('id', doc.id);

    console.log(`📖 ${doc.title} — ${pages.length}p → ${newPages.length}p (${allText.length}자)`);
    totalFixed++;
  }

  console.log(`\n✅ 완료! ${totalFixed}개 문서 분할됨`);
}

splitPages().catch(console.error);
