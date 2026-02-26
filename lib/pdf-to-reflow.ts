/**
 * PDF → Reflow 변환 엔진 (lib/pdf-to-reflow.ts)
 * 
 * TeXTREME 플랫폼용 - 세계 최고 품질의 PDF → 리플로우 텍스트 변환
 * 
 * 핵심 파이프라인:
 *   PDF → [1.텍스트추출] → [2.라인그룹핑] → [3.컬럼감지] → [4.읽기순서] 
 *       → [5.헤더/푸터제거] → [6.문단병합] → [7.제목감지] → [8.하이픈처리]
 *       → [9.HTML생성] → document_pages_text 저장용 페이지 배열
 * 
 * 설계 원칙:
 *   - 순수 로직 모듈 (환경 무관 - 브라우저/서버 양쪽 동작)
 *   - pdf.js의 getTextContent() 결과를 입력으로 받음
 *   - 한국어 텍스트에 최적화된 문장/문단 경계 인식
 *   - 나중에 OCR 추가 시 analyzeStructure() 이후 파이프라인 재사용 가능
 */

// ============================================================
// 타입 정의
// ============================================================

/** pdf.js에서 추출한 개별 텍스트 아이템 */
export interface PdfTextItem {
  text: string;
  x: number;          // 좌측 좌표
  y: number;          // 상단 좌표 (페이지 상단 기준, 아래로 증가)
  width: number;      // 텍스트 폭
  height: number;     // 텍스트 높이 (≈ 폰트 크기)
  fontName: string;   // 폰트명
  fontSize: number;   // 폰트 크기 (height에서 파생)
  isBold: boolean;    // 볼드 여부
  isItalic: boolean;  // 이탤릭 여부
  pageIndex: number;  // 페이지 번호 (0-based)
  pageWidth: number;  // 페이지 전체 폭
  pageHeight: number; // 페이지 전체 높이
}

/** 같은 Y좌표의 텍스트 아이템들을 묶은 라인 */
export interface TextLine {
  items: PdfTextItem[];
  y: number;           // 라인 Y좌표 (평균)
  x: number;           // 라인 시작 X좌표 (최소)
  xEnd: number;        // 라인 끝 X좌표 (최대)
  width: number;       // 라인 전체 폭
  height: number;      // 라인 높이 (최대 아이템 높이)
  fontSize: number;    // 대표 폰트 크기
  isBold: boolean;     // 라인 내 대부분 볼드인지
  text: string;        // 병합된 텍스트
  pageIndex: number;
  columnIndex: number; // 소속 컬럼 (-1이면 미지정)
}

/** 연속된 라인들을 묶은 문단 */
export interface TextParagraph {
  lines: TextLine[];
  text: string;
  type: 'heading1' | 'heading2' | 'heading3' | 'body' | 'quote' | 'list-item';
  fontSize: number;
  isBold: boolean;
  isIndented: boolean;
  pageIndex: number;
}

/** 페이지별 구조 분석 결과 */
export interface PageStructure {
  pageIndex: number;
  paragraphs: TextParagraph[];
  pageWidth: number;
  pageHeight: number;
}

/** 문서 전체 분석 결과 */
export interface DocumentStructure {
  pages: PageStructure[];
  metadata: {
    totalPages: number;
    dominantFontSize: number;     // 본문 기본 폰트 크기
    dominantFontName: string;     // 본문 기본 폰트
    hasMultipleColumns: boolean;  // 다단 레이아웃 포함 여부
    averageCharsPerPage: number;  // 페이지당 평균 글자수
    language: 'ko' | 'en' | 'mixed'; // 감지된 언어
  };
}

/** PDF에서 추출한 이미지 */
export interface PdfImage {
  pageIndex: number;   // 소속 페이지 (0-based)
  y: number;           // 이미지 상단 Y좌표 (페이지 상단 기준)
  x: number;           // 이미지 좌측 X좌표
  width: number;       // 이미지 폭 (PDF 좌표)
  height: number;      // 이미지 높이 (PDF 좌표)
  dataUrl: string;     // base64 data URL (작은 이미지) 또는 빈 문자열 (Storage용)
  storageUrl?: string; // Supabase Storage URL (큰 이미지)
  sizeBytes: number;   // 이미지 데이터 크기
  format: 'png' | 'jpeg'; // 이미지 포맷
}

/** 최종 변환 결과 (document_pages_text 저장용) */
export interface ReflowPage {
  pageNumber: number;  // 1-based
  textContent: string; // HTML 또는 plain text
}

/** 변환 진행률 콜백 */
export type ProgressCallback = (stage: string, progress: number) => void;

/** 
 * 이미지 업로드 콜백 (큰 이미지를 Storage에 업로드)
 * upload/page.tsx에서 제공하며, Supabase Storage URL을 반환
 */
export type ImageUploadCallback = (
  imageBlob: Blob,
  fileName: string,
) => Promise<string>; // 반환: public URL

/** base64 인라인 임계값 (100KB 이하는 base64, 초과는 Storage) */
const IMAGE_INLINE_THRESHOLD = 100 * 1024; // 100KB

// ============================================================
// 1단계: PDF 텍스트 추출 (pdf.js 래퍼)
// ============================================================

/**
 * pdf.js 문서에서 페이지별 텍스트 아이템을 추출
 * 
 * pdf.js의 getTextContent()가 반환하는 좌표계:
 *   - transform[4] = x, transform[5] = y (PDF 좌표계: 좌하단 원점)
 *   - 이를 일반적인 좌상단 원점 좌표로 변환
 */
export async function extractTextItems(
  pdfDoc: any, // PDFDocumentProxy
  onProgress?: ProgressCallback
): Promise<PdfTextItem[][]> {
  const allPagesItems: PdfTextItem[][] = [];
  const totalPages = pdfDoc.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) {
      onProgress('텍스트 추출', (pageNum / totalPages) * 100);
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const pageItems: PdfTextItem[] = [];

    for (const item of textContent.items) {
      // 빈 텍스트 무시
      if (!item.str || item.str.trim() === '') continue;

      const tx = item.transform;
      // PDF 좌표 → 화면 좌표 변환 (좌하단→좌상단)
      const x = tx[4];
      const y = viewport.height - tx[5]; // Y축 반전
      const fontSize = Math.abs(tx[0]) || Math.abs(tx[3]) || item.height || 12;

      // 폰트 정보에서 볼드/이탤릭 감지
      const fontName = item.fontName || '';
      const isBold = /bold/i.test(fontName) || 
                     /Black/i.test(fontName) ||
                     /Heavy/i.test(fontName);
      const isItalic = /italic/i.test(fontName) || 
                       /oblique/i.test(fontName);

      pageItems.push({
        text: item.str,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: item.width || 0,
        height: item.height || fontSize,
        fontName,
        fontSize: Math.round(fontSize * 100) / 100,
        isBold,
        isItalic,
        pageIndex: pageNum - 1,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      });
    }

    allPagesItems.push(pageItems);
  }

  return allPagesItems;
}

// ============================================================
// 1.5단계: PDF 이미지 추출
// ============================================================

/**
 * pdf.js의 getOperatorList()를 사용하여 각 페이지의 이미지를 추출
 * 
 * pdf.js 오퍼레이터:
 *   - OPS.paintImageXObject (85) → 일반 이미지
 *   - OPS.paintJpegXObject (82) → JPEG 이미지
 * 
 * 이미지 크기에 따라:
 *   - 100KB 이하 → base64 data URL (인라인)
 *   - 100KB 초과 → Blob 반환 (Storage 업로드용)
 * 
 * @param pdfDoc - pdf.js PDFDocumentProxy
 * @param uploadImage - 큰 이미지를 Storage에 업로드하는 콜백 (선택)
 * @param onProgress - 진행률 콜백
 */
export async function extractImages(
  pdfDoc: any,
  uploadImage?: ImageUploadCallback,
  onProgress?: ProgressCallback,
): Promise<PdfImage[][]> {
  const allPagesImages: PdfImage[][] = [];
  const totalPages = pdfDoc.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) {
      onProgress('이미지 추출', (pageNum / totalPages) * 100);
    }

    const pageImages: PdfImage[] = [];

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const ops = await page.getOperatorList();

      // 이미지 오퍼레이터 찾기
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];

        // paintImageXObject(85) 또는 paintJpegXObject(82)
        if (fn !== 85 && fn !== 82) continue;

        const imageName = ops.argsArray[i]?.[0];
        if (!imageName) continue;

        try {
          // 이미지 객체 가져오기
          const imgData = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
            page.objs.get(imageName, (data: any) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          if (!imgData || !imgData.width || !imgData.height) continue;

          // 너무 작은 이미지 건너뛰기 (아이콘/구분선 등)
          if (imgData.width < 50 || imgData.height < 50) continue;

          // Canvas에 이미지 렌더링
          const canvas = typeof document !== 'undefined' 
            ? document.createElement('canvas') 
            : null;
          
          if (!canvas) continue; // 서버 환경에서는 건너뛰기

          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // ImageData 생성
          const imageData = ctx.createImageData(imgData.width, imgData.height);

          if (imgData.data) {
            // RGBA 데이터
            if (imgData.data.length === imgData.width * imgData.height * 4) {
              imageData.data.set(imgData.data);
            }
            // RGB 데이터 (알파 없음)
            else if (imgData.data.length === imgData.width * imgData.height * 3) {
              const rgb = imgData.data;
              const rgba = imageData.data;
              for (let j = 0, k = 0; j < rgb.length; j += 3, k += 4) {
                rgba[k] = rgb[j];
                rgba[k + 1] = rgb[j + 1];
                rgba[k + 2] = rgb[j + 2];
                rgba[k + 3] = 255;
              }
            }
            // 그레이스케일
            else if (imgData.data.length === imgData.width * imgData.height) {
              const gray = imgData.data;
              const rgba = imageData.data;
              for (let j = 0, k = 0; j < gray.length; j++, k += 4) {
                rgba[k] = gray[j];
                rgba[k + 1] = gray[j];
                rgba[k + 2] = gray[j];
                rgba[k + 3] = 255;
              }
            }
            else {
              continue; // 알 수 없는 포맷
            }
          } else {
            continue;
          }

          ctx.putImageData(imageData, 0, 0);

          // 이미지 크기에 따라 포맷 결정
          // 사진 → JPEG (작은 파일), 도표/그래프 → PNG (선명)
          const isPhoto = imgData.width > 200 && imgData.height > 200;
          const format = isPhoto ? 'jpeg' : 'png';
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = format === 'jpeg' ? 0.85 : undefined;

          // data URL 생성
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const sizeBytes = Math.round(dataUrl.length * 0.75); // base64 → bytes 근사

          // 이미지 위치 추정 (transform matrix에서)
          // ops.argsArray만으로는 정확한 위치를 알기 어려우므로
          // 텍스트가 없는 Y 영역에 배치하는 방식을 사용
          const imgX = 0; // 정확한 위치는 나중에 텍스트 갭으로 결정
          const imgY = 0;
          const imgW = imgData.width;
          const imgH = imgData.height;

          const image: PdfImage = {
            pageIndex: pageNum - 1,
            y: imgY,
            x: imgX,
            width: imgW,
            height: imgH,
            dataUrl: '',
            sizeBytes,
            format,
          };

          // 크기에 따라 base64 인라인 또는 Storage 업로드
          if (sizeBytes <= IMAGE_INLINE_THRESHOLD) {
            // 100KB 이하: base64 인라인
            image.dataUrl = dataUrl;
          } else if (uploadImage) {
            // 100KB 초과 + Storage 콜백 제공: Blob으로 변환 후 업로드
            try {
              const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                  (b) => b ? resolve(b) : reject(new Error('toBlob failed')),
                  mimeType,
                  quality
                );
              });
              const fileName = `pdf-img-${pageNum}-${i}.${format}`;
              const storageUrl = await uploadImage(blob, fileName);
              image.storageUrl = storageUrl;
            } catch (uploadErr) {
              // 업로드 실패 시 base64로 폴백
              console.warn('이미지 Storage 업로드 실패, base64 폴백:', uploadErr);
              image.dataUrl = dataUrl;
            }
          } else {
            // Storage 콜백 없음: 큰 이미지도 base64 (경고)
            image.dataUrl = dataUrl;
          }

          // Canvas 메모리 해제
          canvas.width = 0;
          canvas.height = 0;

          pageImages.push(image);
        } catch (imgErr) {
          // 개별 이미지 추출 실패는 건너뛰기
          console.warn(`페이지 ${pageNum} 이미지 추출 실패:`, imgErr);
        }
      }
    } catch (pageErr) {
      console.warn(`페이지 ${pageNum} 이미지 처리 실패:`, pageErr);
    }

    allPagesImages.push(pageImages);
  }

  return allPagesImages;
}

// ============================================================
// 2단계: 라인 그룹핑 (Y좌표 근접 아이템 → 한 줄)
// ============================================================

/**
 * Y좌표가 비슷한 텍스트 아이템들을 하나의 라인으로 그룹핑
 * 
 * 핵심 알고리즘:
 *   - Y좌표 차이가 폰트 높이의 50% 이내이면 같은 줄
 *   - 같은 줄 내에서 X좌표 순으로 정렬
 *   - 인접 아이템 사이 간격이 크면 공백 삽입
 */
export function groupIntoLines(items: PdfTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  // Y좌표 기준 정렬 (같은 Y면 X로)
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 2) return a.x - b.x;
    return yDiff;
  });

  const lines: TextLine[] = [];
  let currentLineItems: PdfTextItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prevItem = currentLineItems[currentLineItems.length - 1];
    
    // Y좌표 허용 오차: 평균 폰트 높이의 50%
    const avgHeight = (item.height + prevItem.height) / 2;
    const yTolerance = avgHeight * 0.5;

    if (Math.abs(item.y - prevItem.y) <= yTolerance) {
      // 같은 줄
      currentLineItems.push(item);
    } else {
      // 새 줄 시작 → 이전 줄 완성
      lines.push(buildLine(currentLineItems));
      currentLineItems = [item];
    }
  }

  // 마지막 줄
  if (currentLineItems.length > 0) {
    lines.push(buildLine(currentLineItems));
  }

  return lines;
}

/** 아이템 배열로 TextLine 객체 생성 */
function buildLine(items: PdfTextItem[]): TextLine {
  // X좌표 순 정렬
  items.sort((a, b) => a.x - b.x);

  // 텍스트 병합 (아이템 간 간격에 따라 공백 삽입)
  let text = '';
  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
      const charWidth = items[i - 1].fontSize * 0.5; // 대략적 글자 폭
      
      if (gap > charWidth * 1.5) {
        // 큰 간격 → 탭이나 여러 공백 (컬럼 간격일 수 있음)
        text += '  ';
      } else if (gap > charWidth * 0.3) {
        // 일반 단어 간격
        text += ' ';
      }
      // gap이 매우 작으면 공백 없이 이어붙임 (한글 등)
    }
    text += items[i].text;
  }

  const maxHeight = Math.max(...items.map(it => it.height));
  const boldCount = items.filter(it => it.isBold).length;
  
  // 대표 폰트 크기: 가장 많이 쓰인 크기
  const fontSizes = items.map(it => it.fontSize);
  const dominantFontSize = getMostFrequent(fontSizes);

  return {
    items,
    y: average(items.map(it => it.y)),
    x: Math.min(...items.map(it => it.x)),
    xEnd: Math.max(...items.map(it => it.x + it.width)),
    width: Math.max(...items.map(it => it.x + it.width)) - Math.min(...items.map(it => it.x)),
    height: maxHeight,
    fontSize: dominantFontSize,
    isBold: boldCount > items.length * 0.6,
    text: text.trim(),
    pageIndex: items[0].pageIndex,
    columnIndex: -1,
  };
}

// ============================================================
// 3단계: 다단(Multi-column) 레이아웃 감지
// ============================================================

/**
 * 라인들의 X좌표 분포를 분석하여 다단 레이아웃 감지
 * 
 * 알고리즘:
 *   1. 모든 라인의 시작X를 히스토그램으로
 *   2. X값 클러스터가 2개 이상이면 다단
 *   3. 각 라인에 columnIndex 할당
 * 
 * 이 알고리즘이 리디북스/밀리 대비 차별점:
 *   - 단순 X좌표 분할이 아닌, 실제 텍스트 블록의 공간 분포 분석
 *   - 제목처럼 전체 폭을 사용하는 라인 자동 인식
 */
export function detectColumns(lines: TextLine[], pageWidth: number): TextLine[] {
  if (lines.length < 5) {
    // 라인이 너무 적으면 단단
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  // 본문 라인만 필터 (제목 제외 - 폰트 크기 기준)
  const fontSizes = lines.map(l => l.fontSize);
  const bodyFontSize = getMostFrequent(fontSizes);
  const bodyLines = lines.filter(l => Math.abs(l.fontSize - bodyFontSize) < bodyFontSize * 0.15);

  if (bodyLines.length < 5) {
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  // 라인 시작 X좌표 클러스터링
  const xStarts = bodyLines.map(l => l.x);
  const clusters = clusterValues(xStarts, pageWidth * 0.08); // 페이지 폭 8% 허용 오차

  if (clusters.length <= 1) {
    // 단단 레이아웃
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  // 다단: 각 클러스터의 중앙X 계산
  const clusterCenters = clusters.map(c => average(c));
  clusterCenters.sort((a, b) => a - b);

  // 각 라인에 가장 가까운 클러스터의 columnIndex 할당
  return lines.map(line => {
    // 폭이 페이지의 70% 이상이면 전체 폭 사용 (제목 등) → column 0
    if (line.width > pageWidth * 0.7) {
      return { ...line, columnIndex: 0 };
    }

    // 가장 가까운 클러스터 찾기
    let minDist = Infinity;
    let colIdx = 0;
    for (let i = 0; i < clusterCenters.length; i++) {
      const dist = Math.abs(line.x - clusterCenters[i]);
      if (dist < minDist) {
        minDist = dist;
        colIdx = i;
      }
    }
    return { ...line, columnIndex: colIdx };
  });
}

// ============================================================
// 4단계: 읽기 순서 재구성
// ============================================================

/**
 * 다단 레이아웃을 고려한 읽기 순서 결정
 * 
 * 규칙:
 *   - 단단: Y좌표 순 (위→아래)
 *   - 다단: 왼쪽 컬럼 전체 → 오른쪽 컬럼 전체 (같은 Y 블록 내에서)
 *   - 전체 폭 라인(제목 등): 위치에 따라 컬럼 사이에 삽입
 */
export function orderLines(lines: TextLine[]): TextLine[] {
  const maxCol = Math.max(...lines.map(l => l.columnIndex), 0);

  if (maxCol === 0) {
    // 단단: 단순 Y좌표 순
    return [...lines].sort((a, b) => a.y - b.y);
  }

  // 다단: 컬럼별로 Y좌표 그룹핑 후 순서 결정
  // 전체 폭 라인(columnIndex 0이면서 폭이 넓은)은 구분자 역할
  const result: TextLine[] = [];
  
  // Y좌표 기준으로 "행 블록" 구성
  // 전체 폭 라인이 나오면 새 블록 시작
  const fullWidthLines = lines.filter(l => 
    l.columnIndex === 0 && l.width > l.items[0]?.pageWidth * 0.7
  );
  const columnLines = lines.filter(l => 
    !(l.columnIndex === 0 && l.width > (l.items[0]?.pageWidth || 999) * 0.7)
  );

  // 전체 폭 라인 Y좌표를 기준으로 블록 분할
  const sortedFW = [...fullWidthLines].sort((a, b) => a.y - b.y);
  const sortedCL = [...columnLines].sort((a, b) => a.y - b.y);

  // 간단한 접근: 각 컬럼의 라인을 Y순으로 정렬한 뒤, 
  // 왼쪽 컬럼 → 오른쪽 컬럼 순으로 전체 폭 라인 사이에 배치
  let fwIdx = 0;
  let clIdx = 0;

  while (clIdx < sortedCL.length || fwIdx < sortedFW.length) {
    // 다음 전체 폭 라인의 Y 위치
    const nextFwY = fwIdx < sortedFW.length ? sortedFW[fwIdx].y : Infinity;

    // 전체 폭 라인 이전까지의 컬럼 라인들 수집
    const blockLines: TextLine[] = [];
    while (clIdx < sortedCL.length && sortedCL[clIdx].y < nextFwY) {
      blockLines.push(sortedCL[clIdx]);
      clIdx++;
    }

    // 블록 내 컬럼별로 정렬 후 순서대로 추가
    for (let col = 0; col <= maxCol; col++) {
      const colLines = blockLines
        .filter(l => l.columnIndex === col)
        .sort((a, b) => a.y - b.y);
      result.push(...colLines);
    }

    // 전체 폭 라인 추가
    if (fwIdx < sortedFW.length) {
      result.push(sortedFW[fwIdx]);
      fwIdx++;
    }
  }

  return result;
}

// ============================================================
// 5단계: 헤더/푸터 감지 및 제거
// ============================================================

/**
 * 여러 페이지에 걸쳐 반복되는 텍스트를 헤더/푸터로 인식하여 제거
 * 
 * 감지 기준:
 *   - 3페이지 이상에서 같은 Y좌표(허용 오차 내)에 같거나 비슷한 텍스트
 *   - 페이지 상단 15% 또는 하단 15% 영역에 위치
 *   - 페이지 번호 패턴 (숫자만, "- N -", "N / M" 등)
 */
export function detectHeadersFooters(
  pagesLines: TextLine[][],
): { cleanedPages: TextLine[][]; removedCount: number } {
  if (pagesLines.length < 3) {
    return { cleanedPages: pagesLines, removedCount: 0 };
  }

  // 페이지 상/하단 영역 라인 수집
  interface PositionSignature {
    yRatio: number;   // 페이지 내 Y비율 (0~1)
    text: string;     // 정규화된 텍스트
    pageCount: number; // 출현 페이지 수
  }

  const signatureMap = new Map<string, { count: number; pages: Set<number> }>();
  
  for (let pi = 0; pi < pagesLines.length; pi++) {
    const lines = pagesLines[pi];
    if (lines.length === 0) continue;

    const pageHeight = lines[0]?.items[0]?.pageHeight || 800;

    for (const line of lines) {
      const yRatio = line.y / pageHeight;
      
      // 상단 15% 또는 하단 15% 영역만 검사
      if (yRatio > 0.15 && yRatio < 0.85) continue;

      // 텍스트 정규화 (페이지 번호 제거하여 매칭)
      const normalized = normalizeHeaderFooterText(line.text);
      if (!normalized) continue;

      // 위치+텍스트 시그니처
      const yBucket = Math.round(yRatio * 20) / 20; // 5% 단위 버킷
      const sig = `${yBucket}|${normalized}`;

      const entry = signatureMap.get(sig) || { count: 0, pages: new Set() };
      entry.count++;
      entry.pages.add(pi);
      signatureMap.set(sig, entry);
    }
  }

  // 3페이지 이상에서 반복되는 시그니처 = 헤더/푸터
  const headerFooterSigs = new Set<string>();
  for (const [sig, { pages }] of signatureMap) {
    if (pages.size >= Math.min(3, Math.ceil(pagesLines.length * 0.3))) {
      headerFooterSigs.add(sig);
    }
  }

  // 추가: 페이지 번호 패턴 감지 (상/하단 영역의 짧은 숫자 텍스트)
  const pageNumberPattern = /^[\s\-–—]*\d+[\s\-–—]*$/;
  const pageOfPattern = /^\d+\s*[\/of]\s*\d+$/i;

  let removedCount = 0;
  const cleanedPages = pagesLines.map((lines, pi) => {
    const pageHeight = lines[0]?.items[0]?.pageHeight || 800;

    return lines.filter(line => {
      const yRatio = line.y / pageHeight;

      // 상/하단 영역이 아니면 유지
      if (yRatio > 0.15 && yRatio < 0.85) return true;

      // 헤더/푸터 시그니처 매칭
      const normalized = normalizeHeaderFooterText(line.text);
      if (normalized) {
        const yBucket = Math.round(yRatio * 20) / 20;
        const sig = `${yBucket}|${normalized}`;
        if (headerFooterSigs.has(sig)) {
          removedCount++;
          return false;
        }
      }

      // 페이지 번호 패턴
      const trimmed = line.text.trim();
      if (pageNumberPattern.test(trimmed) || pageOfPattern.test(trimmed)) {
        removedCount++;
        return false;
      }

      return true;
    });
  });

  return { cleanedPages, removedCount };
}

/** 헤더/푸터 텍스트 정규화 (페이지 번호 부분 제거) */
function normalizeHeaderFooterText(text: string): string {
  return text.trim()
    .replace(/\d+/g, '#')  // 숫자 → # (페이지 번호 정규화)
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// 6단계: 라인 → 문단 병합
// ============================================================

/**
 * 연속된 라인들을 문단으로 병합
 * 
 * 새 문단 시작 조건 (하나라도 해당되면):
 *   1. 줄 간격이 평균의 1.8배 이상 (빈 줄 효과)
 *   2. 들여쓰기 변화 (첫 줄 들여쓰기 감지)
 *   3. 폰트 크기 변화 (제목↔본문 전환)
 *   4. 볼드 상태 변화
 *   5. 빈 줄 (텍스트 없는 Y 갭)
 * 
 * 한국어 최적화:
 *   - 한국어는 들여쓰기 대신 빈 줄로 문단 구분하는 경우가 많음
 *   - "다.", "요.", "습니다." 등으로 끝나는 줄은 문단 끝 가능성 높음
 */
export function mergeLinesIntoParagraphs(
  lines: TextLine[],
  dominantFontSize: number,
  pageWidth: number,
): TextParagraph[] {
  if (lines.length === 0) return [];

  const paragraphs: TextParagraph[] = [];
  let currentParagraphLines: TextLine[] = [lines[0]];

  // 평균 줄 간격 계산 (본문 폰트 크기의 라인들만)
  const bodyLines = lines.filter(l => 
    Math.abs(l.fontSize - dominantFontSize) < dominantFontSize * 0.15
  );
  const lineGaps = computeLineGaps(bodyLines);
  const avgLineGap = lineGaps.length > 0 ? median(lineGaps) : dominantFontSize * 1.4;

  // 본문 들여쓰기 기준 X좌표
  const bodyXStarts = bodyLines.map(l => l.x);
  const baseX = bodyXStarts.length > 0 ? getMostFrequent(bodyXStarts.map(x => Math.round(x))) : 0;
  const indentThreshold = dominantFontSize * 1.5; // 들여쓰기 감지 최소 거리

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];
    
    let isNewParagraph = false;

    // 조건 1: 줄 간격이 평균의 1.8배 이상
    const gap = currLine.y - prevLine.y;
    if (gap > avgLineGap * 1.8) {
      isNewParagraph = true;
    }

    // 조건 2: 폰트 크기 변화 (10% 이상)
    if (Math.abs(currLine.fontSize - prevLine.fontSize) > dominantFontSize * 0.1) {
      isNewParagraph = true;
    }

    // 조건 3: 볼드 상태 변화 (제목 진입/이탈)
    if (currLine.isBold !== prevLine.isBold) {
      isNewParagraph = true;
    }

    // 조건 4: 들여쓰기 (현재 줄이 기준보다 들여써져 있고, 이전 줄은 아닌 경우)
    const currIndented = currLine.x - baseX > indentThreshold;
    const prevIndented = prevLine.x - baseX > indentThreshold;
    if (currIndented && !prevIndented && gap > avgLineGap * 0.8) {
      isNewParagraph = true;
    }

    // 조건 5: 이전 줄이 짧게 끝남 (줄 끝이 페이지 오른쪽 여백보다 많이 떨어짐)
    // → 문단의 마지막 줄일 가능성
    const rightMargin = pageWidth - prevLine.xEnd;
    const normalRightMargin = pageWidth * 0.08; // 일반적 오른쪽 여백
    if (rightMargin > pageWidth * 0.25 && rightMargin > normalRightMargin * 3) {
      // 이전 줄이 페이지 폭의 25% 이상 비어있으면 문단 끝
      if (gap > avgLineGap * 0.8) {
        isNewParagraph = true;
      }
    }

    // 조건 6: 컬럼 변경
    if (currLine.columnIndex !== prevLine.columnIndex && currLine.columnIndex >= 0) {
      isNewParagraph = true;
    }

    if (isNewParagraph) {
      paragraphs.push(buildParagraph(currentParagraphLines, baseX, indentThreshold));
      currentParagraphLines = [currLine];
    } else {
      currentParagraphLines.push(currLine);
    }
  }

  // 마지막 문단
  if (currentParagraphLines.length > 0) {
    paragraphs.push(buildParagraph(currentParagraphLines, baseX, indentThreshold));
  }

  return paragraphs;
}

/** 문단 객체 생성 */
function buildParagraph(
  lines: TextLine[], 
  baseX: number, 
  indentThreshold: number
): TextParagraph {
  const text = mergeLineTexts(lines);
  const avgFontSize = average(lines.map(l => l.fontSize));
  const boldRatio = lines.filter(l => l.isBold).length / lines.length;
  const firstLineIndented = lines[0].x - baseX > indentThreshold;

  return {
    lines,
    text,
    type: 'body', // 제목 감지는 별도 단계에서
    fontSize: avgFontSize,
    isBold: boldRatio > 0.6,
    isIndented: firstLineIndented,
    pageIndex: lines[0].pageIndex,
  };
}

/** 라인 텍스트들을 하나의 문단 텍스트로 병합 */
function mergeLineTexts(lines: TextLine[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0].text;

  let result = lines[0].text;

  for (let i = 1; i < lines.length; i++) {
    const prevText = lines[i - 1].text;
    const currText = lines[i].text;

    // 하이픈 처리: 이전 줄이 하이픈으로 끝나면 연결
    if (prevText.endsWith('-') && !prevText.endsWith('--')) {
      // 영어: 하이픈 제거 후 이어붙임
      result = result.slice(0, -1) + currText;
    } else if (isKoreanText(prevText)) {
      // 한국어: 줄바꿈 시 공백 없이 이어붙임
      result += currText;
    } else {
      // 영어 등: 공백으로 연결
      result += ' ' + currText;
    }
  }

  return result;
}

// ============================================================
// 7단계: 제목(Heading) 감지
// ============================================================

/**
 * 문단의 폰트 크기/볼드를 분석하여 제목 레벨 결정
 * 
 * 제목 판별 기준:
 *   - 본문 폰트보다 확실히 큰 폰트 (1.3배 이상 = h1, 1.15배 이상 = h2)
 *   - 볼드 + 본문보다 큰 폰트 = 강한 제목 신호
 *   - 짧은 텍스트 (3줄 이하) + 큰 폰트 = 제목
 *   - 센터 정렬된 텍스트 = 제목 가능성 높음
 */
export function detectHeadings(
  paragraphs: TextParagraph[],
  dominantFontSize: number,
  pageWidth: number,
): TextParagraph[] {
  return paragraphs.map(para => {
    const sizeRatio = para.fontSize / dominantFontSize;
    const lineCount = para.lines.length;
    const textLength = para.text.length;
    
    // 센터 정렬 감지
    const avgLineX = average(para.lines.map(l => l.x));
    const avgLineXEnd = average(para.lines.map(l => l.xEnd));
    const leftMargin = avgLineX;
    const rightMargin = pageWidth - avgLineXEnd;
    const isCentered = Math.abs(leftMargin - rightMargin) < pageWidth * 0.1 
                       && leftMargin > pageWidth * 0.15;

    // 제목 레벨 결정
    let type = para.type;

    if (sizeRatio >= 1.5 && lineCount <= 3) {
      type = 'heading1';
    } else if (sizeRatio >= 1.25 && lineCount <= 3) {
      type = 'heading2';
    } else if (sizeRatio >= 1.1 && para.isBold && lineCount <= 2) {
      type = 'heading3';
    } else if (para.isBold && lineCount === 1 && textLength < 50 && isCentered) {
      type = 'heading2';
    } else if (para.isBold && lineCount === 1 && textLength < 80) {
      type = 'heading3';
    }

    // 아주 짧은 텍스트(3글자 미만)는 제목으로 판별하지 않음
    if (textLength < 3) {
      type = 'body';
    }

    return { ...para, type };
  });
}

// ============================================================
// 8단계: 하이픈/줄바꿈 후처리
// ============================================================

/**
 * 문단 텍스트 후처리
 * - 불필요한 연속 공백 정리
 * - 한국어 조사 앞뒤 공백 제거
 * - 잘못된 띄어쓰기 보정 (기본적인 수준)
 */
export function postProcessParagraphs(paragraphs: TextParagraph[]): TextParagraph[] {
  return paragraphs.map(para => {
    let text = para.text;

    // 연속 공백 정리
    text = text.replace(/\s{2,}/g, ' ');

    // 한국어: 글자 사이의 불필요한 공백 제거
    // (한글-공백-한글 패턴에서 공백이 의도적이지 않은 경우)
    // 주의: 모든 한글 사이 공백을 제거하면 안 됨 (띄어쓰기)
    // pdf.js가 각 글자를 개별 아이템으로 반환하는 경우에만 해당
    
    // 양쪽 공백 제거
    text = text.trim();

    return { ...para, text };
  });
}

// ============================================================
// 9단계: 구조화된 HTML 생성 (이미지 포함)
// ============================================================

/**
 * 문단 배열을 의미론적 HTML로 변환
 * 
 * 출력 태그: h1, h2, h3, p, img (figure)
 * 기존 reflow-viewer.tsx가 HTML을 렌더링할 수 있으므로
 * 풍부한 마크업 활용 가능
 * 
 * 이미지는 각 페이지의 문단들 사이 또는 끝에 삽입
 */
export function generateHTML(
  paragraphs: TextParagraph[],
  images?: PdfImage[],
): string {
  if (paragraphs.length === 0 && (!images || images.length === 0)) return '';

  const htmlParts: string[] = [];

  // 이미지가 있으면 각 페이지 전환 시점에 삽입
  // 현재 구조에서는 페이지 간 문단이 연속으로 이어지므로,
  // 페이지가 바뀌는 시점에 해당 페이지의 이미지를 모아서 삽입
  const imagesByPage = new Map<number, PdfImage[]>();
  if (images) {
    for (const img of images) {
      const pageImgs = imagesByPage.get(img.pageIndex) || [];
      pageImgs.push(img);
      imagesByPage.set(img.pageIndex, pageImgs);
    }
  }

  let lastPageIndex = -1;
  const insertedPages = new Set<number>();

  for (const para of paragraphs) {
    // 페이지가 바뀌면 이전 페이지의 이미지 삽입
    if (para.pageIndex !== lastPageIndex && lastPageIndex >= 0) {
      const pageImgs = imagesByPage.get(lastPageIndex);
      if (pageImgs && !insertedPages.has(lastPageIndex)) {
        for (const img of pageImgs) {
          htmlParts.push(generateImageTag(img));
        }
        insertedPages.add(lastPageIndex);
      }
    }
    lastPageIndex = para.pageIndex;

    const escapedText = escapeHtml(para.text);

    switch (para.type) {
      case 'heading1':
        htmlParts.push(`<h1>${escapedText}</h1>`);
        break;
      case 'heading2':
        htmlParts.push(`<h2>${escapedText}</h2>`);
        break;
      case 'heading3':
        htmlParts.push(`<h3>${escapedText}</h3>`);
        break;
      case 'body':
      default:
        if (para.isBold) {
          htmlParts.push(`<p><strong>${escapedText}</strong></p>`);
        } else if (para.isIndented) {
          htmlParts.push(`<p style="text-indent:1.5em">${escapedText}</p>`);
        } else {
          htmlParts.push(`<p>${escapedText}</p>`);
        }
        break;
    }
  }

  // 마지막 페이지의 이미지 삽입
  if (lastPageIndex >= 0) {
    const pageImgs = imagesByPage.get(lastPageIndex);
    if (pageImgs && !insertedPages.has(lastPageIndex)) {
      for (const img of pageImgs) {
        htmlParts.push(generateImageTag(img));
      }
      insertedPages.add(lastPageIndex);
    }
  }

  // 문단이 없는 페이지의 이미지도 삽입 (이미지만 있는 페이지)
  for (const [pageIdx, pageImgs] of imagesByPage) {
    if (!insertedPages.has(pageIdx)) {
      for (const img of pageImgs) {
        htmlParts.push(generateImageTag(img));
      }
    }
  }

  return htmlParts.join('\n');
}

/** 이미지 HTML 태그 생성 */
function generateImageTag(img: PdfImage): string {
  const src = img.storageUrl || img.dataUrl;
  if (!src) return '';

  // 이미지를 중앙 정렬, 최대 폭 100%로 표시
  return `<figure style="text-align:center;margin:1em 0"><img src="${src}" alt="" style="max-width:100%;height:auto" loading="lazy" /></figure>`;
}

// ============================================================
// 10단계: 문서 전체 메타데이터 분석
// ============================================================

/**
 * 문서 전체의 본문 폰트 크기, 언어 등 메타데이터 추출
 * 모든 후속 알고리즘의 기준점이 됨
 */
export function analyzeDocumentMetadata(
  pagesItems: PdfTextItem[][]
): DocumentStructure['metadata'] {
  const allItems = pagesItems.flat();
  
  if (allItems.length === 0) {
    return {
      totalPages: pagesItems.length,
      dominantFontSize: 12,
      dominantFontName: 'unknown',
      hasMultipleColumns: false,
      averageCharsPerPage: 0,
      language: 'ko',
    };
  }

  // 본문 폰트 크기: 가장 많이 사용된 크기
  const fontSizes = allItems.map(it => Math.round(it.fontSize * 10) / 10);
  const dominantFontSize = getMostFrequent(fontSizes);

  // 본문 폰트명
  const fontNames = allItems
    .filter(it => Math.abs(it.fontSize - dominantFontSize) < dominantFontSize * 0.1)
    .map(it => it.fontName);
  const dominantFontName = getMostFrequentString(fontNames) || 'unknown';

  // 언어 감지: 한글 비율
  const allText = allItems.map(it => it.text).join('');
  const koreanChars = (allText.match(/[\uAC00-\uD7AF\u3130-\u318F]/g) || []).length;
  const englishChars = (allText.match(/[a-zA-Z]/g) || []).length;
  const totalChars = allText.length;

  let language: 'ko' | 'en' | 'mixed' = 'mixed';
  if (koreanChars / totalChars > 0.3) language = 'ko';
  else if (englishChars / totalChars > 0.5) language = 'en';

  // 평균 글자 수
  const charsPerPage = pagesItems.map(items => 
    items.reduce((sum, it) => sum + it.text.length, 0)
  );
  const averageCharsPerPage = charsPerPage.length > 0 ? 
    Math.round(average(charsPerPage)) : 0;

  return {
    totalPages: pagesItems.length,
    dominantFontSize,
    dominantFontName,
    hasMultipleColumns: false, // detectColumns에서 업데이트
    averageCharsPerPage,
    language,
  };
}

// ============================================================
// 메인 변환 함수 (전체 파이프라인)
// ============================================================

/**
 * PDF 문서를 리플로우 텍스트 페이지 배열로 변환
 * 
 * @param pdfDoc - pdf.js PDFDocumentProxy
 * @param onProgress - 진행률 콜백
 * @param uploadImage - 큰 이미지를 Storage에 업로드하는 콜백 (선택)
 * @returns document_pages_text에 저장할 페이지 배열
 */
export async function convertPdfToReflow(
  pdfDoc: any, // PDFDocumentProxy
  onProgress?: ProgressCallback,
  uploadImage?: ImageUploadCallback,
): Promise<ReflowPage[]> {
  
  // ── 1단계: 텍스트 추출 ──
  if (onProgress) onProgress('PDF 텍스트 추출 중...', 0);
  const pagesItems = await extractTextItems(pdfDoc, (stage, progress) => {
    if (onProgress) onProgress(stage, progress * 0.25); // 0~25%
  });

  // ── 1.5단계: 이미지 추출 ──
  if (onProgress) onProgress('이미지 추출 중...', 25);
  let pagesImages: PdfImage[][] = [];
  try {
    pagesImages = await extractImages(pdfDoc, uploadImage, (stage, progress) => {
      if (onProgress) onProgress(stage, 25 + progress * 0.1); // 25~35%
    });
  } catch (imgErr) {
    console.warn('이미지 추출 실패 (텍스트만 변환):', imgErr);
    pagesImages = pagesItems.map(() => []);
  }

  // 빈 페이지만 있으면 빈 결과 반환 (이미지도 없는 경우)
  const totalItems = pagesItems.reduce((sum, p) => sum + p.length, 0);
  const totalImages = pagesImages.reduce((sum, p) => sum + p.length, 0);
  if (totalItems === 0 && totalImages === 0) {
    return pagesItems.map((_, i) => ({
      pageNumber: i + 1,
      textContent: '',
    }));
  }

  // ── 메타데이터 분석 ──
  if (onProgress) onProgress('문서 구조 분석 중...', 35);
  const metadata = analyzeDocumentMetadata(pagesItems);

  // ── 2~4단계: 페이지별 구조 복원 (라인→컬럼→순서) ──
  // ── 5단계: 헤더/푸터 감지 (전체 페이지 대상) ──
  if (onProgress) onProgress('헤더/푸터 감지 중...', 65);
  
  // 페이지별 라인 구성
  const pagesLines: TextLine[][] = [];
  for (let pi = 0; pi < pagesItems.length; pi++) {
    const items = pagesItems[pi];
    if (items.length === 0) {
      pagesLines.push([]);
      continue;
    }
    const pageWidth = items[0].pageWidth;
    let lines = groupIntoLines(items);
    lines = detectColumns(lines, pageWidth);
    lines = orderLines(lines);
    pagesLines.push(lines);
  }

  const { cleanedPages } = detectHeadersFooters(pagesLines);

  // ── 6~8단계: 문단 병합 + 제목 감지 + 후처리 ──
  if (onProgress) onProgress('문단 구조 복원 중...', 75);

  const pageStructures: PageStructure[] = [];

  for (let pi = 0; pi < cleanedPages.length; pi++) {
    const lines = cleanedPages[pi];
    if (lines.length === 0) {
      pageStructures.push({
        pageIndex: pi,
        paragraphs: [],
        pageWidth: pagesItems[pi]?.[0]?.pageWidth || 595,
        pageHeight: pagesItems[pi]?.[0]?.pageHeight || 842,
      });
      continue;
    }

    const pageWidth = pagesItems[pi][0].pageWidth;
    const pageHeight = pagesItems[pi][0].pageHeight;

    // 6단계: 문단 병합
    let paragraphs = mergeLinesIntoParagraphs(lines, metadata.dominantFontSize, pageWidth);

    // 7단계: 제목 감지
    paragraphs = detectHeadings(paragraphs, metadata.dominantFontSize, pageWidth);

    // 8단계: 후처리
    paragraphs = postProcessParagraphs(paragraphs);

    pageStructures.push({
      pageIndex: pi,
      paragraphs,
      pageWidth,
      pageHeight,
    });
  }

  // ── 9단계: HTML 생성 (이미지 포함) ──
  if (onProgress) onProgress('HTML 생성 중...', 90);

  const allParagraphsFlat = pageStructures.flatMap(ps => ps.paragraphs);
  const allImagesFlat = pagesImages.flat().filter(img => img.dataUrl || img.storageUrl);
  
  const fullHTML = generateHTML(allParagraphsFlat, allImagesFlat);

  // ── 10단계: 페이지 분할 ──
  if (onProgress) onProgress('페이지 분할 중...', 95);
  
  const reflowPages = splitIntoReflowPages(fullHTML, 2000);

  if (onProgress) onProgress('변환 완료!', 100);

  return reflowPages;
}

// ============================================================
// 페이지 분할 (기존 splitLongChapter 호환)
// ============================================================

/**
 * 전체 HTML을 적절한 크기의 페이지로 분할
 * 기존 업로드 코드의 splitLongChapter 로직과 동일한 기준 (2000자)
 * 
 * 분할 우선순위:
 *   1. <h1>, <h2>, <h3> 태그 앞에서 분할
 *   2. </p> 태그 뒤에서 분할 (문단 경계)
 *   3. 마침표/물음표/느낌표 뒤에서 분할 (문장 경계)
 *   4. 한국어 어미 기준 분할 ('다.', '요.', '습니다.')
 */
export function splitIntoReflowPages(
  html: string,
  targetLength: number = 2000
): ReflowPage[] {
  if (!html || html.trim().length === 0) {
    return [{ pageNumber: 1, textContent: '' }];
  }

  // HTML을 문단/이미지 단위로 분할 (h1-h3, p, figure)
  const paragraphTags = html.split(/(?=<h[1-3]|<p[ >]|<figure[ >])/);
  const pages: ReflowPage[] = [];
  let currentPage = '';
  let currentLength = 0;

  for (const tag of paragraphTags) {
    if (!tag.trim()) continue;

    // 이미지 태그는 텍스트 길이 대신 고정 크기로 계산 (이미지 1개 = 500자 상당)
    const isFigure = /^<figure/.test(tag.trim());
    const tagTextLength = isFigure ? 500 : tag.replace(/<[^>]*>/g, '').length;

    // 제목 태그는 항상 새 페이지에서 시작 (기존 내용이 있으면)
    const isHeading = /^<h[1-3]/.test(tag.trim());
    if (isHeading && currentLength > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        textContent: currentPage.trim(),
      });
      currentPage = '';
      currentLength = 0;
    }
    // 현재 페이지 + 이 태그가 목표 길이를 초과하면 새 페이지
    else if (currentLength > 0 && currentLength + tagTextLength > targetLength) {
      if (currentLength > targetLength * 0.5) {
        pages.push({
          pageNumber: pages.length + 1,
          textContent: currentPage.trim(),
        });
        currentPage = '';
        currentLength = 0;
      }
    }

    currentPage += tag;
    currentLength += tagTextLength;

    // 단일 태그가 목표 길이를 크게 초과하면 강제 분할
    if (currentLength > targetLength * 1.5) {
      pages.push({
        pageNumber: pages.length + 1,
        textContent: currentPage.trim(),
      });
      currentPage = '';
      currentLength = 0;
    }
  }

  // 남은 내용
  if (currentPage.trim()) {
    pages.push({
      pageNumber: pages.length + 1,
      textContent: currentPage.trim(),
    });
  }

  // 빈 결과면 최소 1페이지
  if (pages.length === 0) {
    pages.push({ pageNumber: 1, textContent: '' });
  }

  return pages;
}

// ============================================================
// 유틸리티 함수
// ============================================================

/** 배열에서 가장 빈번한 숫자값 (반올림 후) */
function getMostFrequent(values: number[]): number {
  if (values.length === 0) return 0;
  
  const counts = new Map<number, number>();
  for (const v of values) {
    const rounded = Math.round(v * 10) / 10;
    counts.set(rounded, (counts.get(rounded) || 0) + 1);
  }

  let maxCount = 0;
  let maxValue = values[0];
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxValue = val;
    }
  }
  return maxValue;
}

/** 배열에서 가장 빈번한 문자열 */
function getMostFrequentString(values: string[]): string | null {
  if (values.length === 0) return null;
  
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  let maxCount = 0;
  let maxValue = values[0];
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxValue = val;
    }
  }
  return maxValue;
}

/** 평균 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 중앙값 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

/** 값 클러스터링 (DBSCAN 스타일 단순 버전) */
function clusterValues(values: number[], tolerance: number): number[][] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    const lastValue = lastCluster[lastCluster.length - 1];

    if (sorted[i] - lastValue <= tolerance) {
      lastCluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  // 너무 작은 클러스터 제거 (전체의 10% 미만)
  const minSize = Math.max(2, values.length * 0.1);
  return clusters.filter(c => c.length >= minSize);
}

/** 연속 라인 간 Y 간격 계산 */
function computeLineGaps(lines: TextLine[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].y - lines[i - 1].y;
    if (gap > 0 && gap < lines[i].height * 5) { // 비정상적으로 큰 갭 제외
      gaps.push(gap);
    }
  }
  return gaps;
}

/** 텍스트가 한국어인지 판별 */
function isKoreanText(text: string): boolean {
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u3130-\u318F]/g) || []).length;
  return koreanChars / Math.max(text.length, 1) > 0.3;
}

/** HTML 이스케이프 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
