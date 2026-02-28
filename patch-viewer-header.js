/**
 * EPUB/Reflow 아이콘 바 → 헤더 이동 패치 스크립트
 * 
 * 사용법:
 *   cd C:\Users\user\textry
 *   node patch-viewer-header.js
 * 
 * 이 스크립트는 reflow-viewer.tsx와 page.tsx를 자동으로 수정합니다.
 * epub-viewer.tsx는 이미 수정된 파일을 제공하므로 수동 복사만 하면 됩니다.
 */

const fs = require('fs');
const path = require('path');

function patchFile(filePath, patches) {
  let content = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  
  for (const patch of patches) {
    if (content.includes(patch.find)) {
      content = content.replace(patch.find, patch.replace);
      applied++;
      console.log(`  ✓ ${patch.desc}`);
    } else {
      console.log(`  ✗ 패치 실패: ${patch.desc}`);
      console.log(`    찾을 수 없음: "${patch.find.slice(0, 80)}..."`);
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return applied;
}

// ━━━ reflow-viewer.tsx 패치 ━━━
console.log('\n📝 reflow-viewer.tsx 패치 중...');
const reflowPath = path.join(__dirname, 'components', 'reflow-viewer.tsx');

if (!fs.existsSync(reflowPath)) {
  console.log('  ✗ 파일을 찾을 수 없습니다:', reflowPath);
  process.exit(1);
}

const reflowPatches = [
  {
    desc: 'interface에 hideTopBar 추가',
    find: `  customToc?: { title: string }[] | null\n}`,
    replace: `  customToc?: { title: string }[] | null\n  hideTopBar?: boolean\n}`,
  },
  {
    desc: 'destructured props에 hideTopBar 추가',
    find: `  customToc,\n}: ReflowViewerProps)`,
    replace: `  customToc,\n  hideTopBar,\n}: ReflowViewerProps)`,
  },
  {
    desc: 'CustomEvent 발신/수신 추가',
    find: `  // ━━━ localStorage 복원 ━━━\n  useEffect(() => {`,
    replace: `  // ━━━ CustomEvent: 상태 발신 (page.tsx 헤더 연동) ━━━
  useEffect(() => {
    if (!hideTopBar) return
    const detail = {
      focusMode, showToc, showHighlightPanel, showSettings,
      page: pageNumber, totalPages: numPages,
      highlightCount: highlights.length,
    }
    window.dispatchEvent(new CustomEvent('viewer-state-update', { detail }))
  }, [hideTopBar, focusMode, showToc, showHighlightPanel, showSettings, pageNumber, numPages, highlights.length])

  // ━━━ CustomEvent: 토글 명령 수신 ━━━
  useEffect(() => {
    if (!hideTopBar) return
    const handler = (e: Event) => {
      const { action } = (e as CustomEvent).detail || {}
      switch (action) {
        case 'toc': setShowToc(prev => !prev); break
        case 'focus': setFocusMode(prev => !prev); break
        case 'highlight': setShowHighlightPanel(prev => !prev); break
        case 'settings': setShowSettings(prev => !prev); break
      }
    }
    window.addEventListener('viewer-toggle', handler)
    return () => window.removeEventListener('viewer-toggle', handler)
  }, [hideTopBar])

  // ━━━ localStorage 복원 ━━━
  useEffect(() => {`,
  },
  {
    desc: '상단 바 조건부 렌더링 (열기)',
    find: `      {/* ━━━ 미니멀 상단 바 ━━━ */}\n      <div className="grid grid-cols-5 px-2 py-2 border-b max-w-lg mx-auto w-full"`,
    replace: `      {/* ━━━ 미니멀 상단 바 ━━━ */}\n      {!hideTopBar && <div className="grid grid-cols-5 px-2 py-2 border-b max-w-lg mx-auto w-full"`,
  },
  {
    desc: '상단 바 조건부 렌더링 (닫기)',
    find: `          style={{ color: showSettings ? '#3b82f6' : themeStyle.muted }}>\n          <Settings2 className="w-4 h-4" />\n          <span className="text-xs">설정</span>\n        </button>\n      </div>`,
    replace: `          style={{ color: showSettings ? '#3b82f6' : themeStyle.muted }}>\n          <Settings2 className="w-4 h-4" />\n          <span className="text-xs">설정</span>\n        </button>\n      </div>}`,
  },
];

const reflowApplied = patchFile(reflowPath, reflowPatches);
console.log(`  → ${reflowApplied}/${reflowPatches.length}개 패치 적용됨\n`);


// ━━━ page.tsx 패치 ━━━
console.log('📝 page.tsx 패치 중...');
const pagePath = path.join(__dirname, 'app', 'read', '[id]', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.log('  ✗ 파일을 찾을 수 없습니다:', pagePath);
  process.exit(1);
}

const pagePatches = [
  {
    desc: '아이콘 import 추가',
    find: `  Play,\n} from 'lucide-react'`,
    replace: `  Play,\n  List,\n  Focus,\n  Highlighter,\n  Settings2,\n} from 'lucide-react'`,
  },
  {
    desc: '뷰어 컨트롤 상태 추가',
    find: `  // 시리즈 상태\n  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null)`,
    replace: `  // 시리즈 상태
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null)

  // ━━━ 뷰어 컨트롤 상태 (EPUB/Reflow 헤더 통합) ━━━
  type ViewerControlState = {
    focusMode: boolean
    showToc: boolean
    showHighlightPanel: boolean
    showSettings: boolean
    page: number
    totalPages: number
    highlightCount: number
  }
  const [viewerCtrl, setViewerCtrl] = useState<ViewerControlState>({
    focusMode: false, showToc: false, showHighlightPanel: false,
    showSettings: false, page: 0, totalPages: 0, highlightCount: 0,
  })
  const isViewerMode = fileType === 'epub' || viewMode === 'reflow'

  // ━━━ 뷰어 상태 수신 ━━━
  useEffect(() => {
    if (!isViewerMode) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) setViewerCtrl(detail)
    }
    window.addEventListener('viewer-state-update', handler)
    return () => window.removeEventListener('viewer-state-update', handler)
  }, [isViewerMode])

  const dispatchViewerToggle = (action: string) => {
    window.dispatchEvent(new CustomEvent('viewer-toggle', { detail: { action } }))
  }`,
  },
  {
    desc: '헤더에 뷰어 컨트롤 버튼 추가',
    find: `              {/* ━━━ PDF 전용 컨트롤 ━━━ */}\n              {viewMode !== 'reflow' && !isEpub && document?.content_type !== 'webtoon' && (`,
    replace: `              {/* ━━━ EPUB/Reflow 뷰어 컨트롤 (헤더 통합) ━━━ */}
              {isViewerMode && document?.content_type !== 'webtoon' && (
                <>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <button onClick={() => dispatchViewerToggle('toc')}
                    className={\`p-1.5 rounded-lg transition-colors \${viewerCtrl.showToc ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}\`}
                    title="목차">
                    <List className="w-4 h-4" />
                  </button>
                  <button onClick={() => dispatchViewerToggle('focus')}
                    className={\`p-1.5 rounded-lg transition-colors \${viewerCtrl.focusMode ? 'bg-blue-500/20 text-blue-400' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}\`}
                    title="집중 모드">
                    <Focus className="w-4 h-4" />
                  </button>
                  <button onClick={() => dispatchViewerToggle('highlight')}
                    className={\`p-1.5 rounded-lg transition-colors \${viewerCtrl.showHighlightPanel ? 'bg-amber-500/20 text-amber-400' : viewerCtrl.highlightCount > 0 ? 'text-amber-400 hover:bg-[#2E2620]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}\`}
                    title="형광펜">
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <span className="text-xs text-[#C4A882] tabular-nums px-1">
                    {viewerCtrl.page}/{viewerCtrl.totalPages}
                  </span>
                  <div className="w-px h-4 bg-[#3A302A]" />
                  <button onClick={() => dispatchViewerToggle('settings')}
                    className={\`p-1.5 rounded-lg transition-colors \${viewerCtrl.showSettings ? 'bg-[#B2967D] text-[#1A1410]' : 'text-[#C4A882] hover:text-[#EEE4E1] hover:bg-[#2E2620]'}\`}
                    title="뷰어 설정">
                    <Settings2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* ━━━ PDF 전용 컨트롤 ━━━ */}
              {viewMode !== 'reflow' && !isEpub && document?.content_type !== 'webtoon' && (`,
  },
  {
    desc: 'EpubViewer에 hideTopBar 전달',
    find: `                onError={() => setEpubLoadFailed(true)}\n              />`,
    replace: `                onError={() => setEpubLoadFailed(true)}\n                hideTopBar\n              />`,
  },
  {
    desc: 'ReflowViewer에 hideTopBar 전달',
    find: `                fileType={fileType}\n              />\n            ) : (\n              pdfUrl && (`,
    replace: `                fileType={fileType}\n                hideTopBar\n              />\n            ) : (\n              pdfUrl && (`,
  },
];

const pageApplied = patchFile(pagePath, pagePatches);
console.log(`  → ${pageApplied}/${pagePatches.length}개 패치 적용됨\n`);

// ━━━ 결과 요약 ━━━
const totalPatches = reflowPatches.length + pagePatches.length;
const totalApplied = reflowApplied + pageApplied;

if (totalApplied === totalPatches) {
  console.log('✅ 모든 패치가 성공적으로 적용되었습니다!');
  console.log('\n다음 단계:');
  console.log('  1. epub-viewer.tsx를 components/ 폴더에 복사');
  console.log('  2. npm run build');
  console.log('  3. git add -A && git commit -m "feat: EPUB/Reflow 아이콘 바를 메인 헤더로 통합" && git push');
} else {
  console.log(`⚠️ ${totalPatches - totalApplied}개 패치가 실패했습니다. 수동 확인이 필요합니다.`);
}
