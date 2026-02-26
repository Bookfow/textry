/**
 * PDF → Reflow 변환 엔진 (lib/pdf-to-reflow.ts)
 * 
 * TeXTREME 플랫폼용 - 세계 최고 품질의 PDF → 리플로우 텍스트 변환
 * 
 * 핵심 파이프라인:
 *   PDF → [1.텍스트추출] → [1.5.이미지추출] → [★ OCR 보강] → [2.라인그룹핑] 
 *       → [3.컬럼감지] → [4.읽기순서] → [5.헤더/푸터제거] → [6.문단병합] 
 *       → [7.제목감지] → [8.하이픈처리] → [9.HTML생성] → 페이지 분할
 * 
 * OCR 전략:
 *   - 각 페이지에서 pdf.js 텍스트 추출 시도
 *   - 추출된 텍스트가 부족하면 (50자 미만) 해당 페이지를 이미지로 렌더링
 *   - Tesseract.js로 한국어+영어 OCR 실행
 *   - OCR 결과를 기존 파이프라인에 합류
 */

// ============================================================
// 타입 정의
// ============================================================

/** pdf.js에서 추출한 개별 텍스트 아이템 */
export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
}

/** 같은 Y좌표의 텍스트 아이템들을 묶은 라인 */
export interface TextLine {
  items: PdfTextItem[];
  y: number;
  x: number;
  xEnd: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  text: string;
  pageIndex: number;
  columnIndex: number;
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
    dominantFontSize: number;
    dominantFontName: string;
    hasMultipleColumns: boolean;
    averageCharsPerPage: number;
    language: 'ko' | 'en' | 'mixed';
  };
}

/** PDF에서 추출한 이미지 */
export interface PdfImage {
  pageIndex: number;
  y: number;
  x: number;
  width: number;
  height: number;
  dataUrl: string;
  storageUrl?: string;
  sizeBytes: number;
  format: 'png' | 'jpeg';
}

/** 최종 변환 결과 */
export interface ReflowPage {
  pageNumber: number;
  textContent: string;
}

/** 변환 진행률 콜백 */
export type ProgressCallback = (stage: string, progress: number) => void;

/** 이미지 업로드 콜백 */
export type ImageUploadCallback = (
  imageBlob: Blob,
  fileName: string,
) => Promise<string>;

/** base64 인라인 임계값 */
const IMAGE_INLINE_THRESHOLD = 100 * 1024;

/** 이미지 렌더링 최소 임계값 (이보다 적으면 무조건 이미지) */
const MIN_TEXT_THRESHOLD = 30;

/** 그래픽 오퍼레이터 비율 임계값 (이 이상이면 이미지로 렌더링) */
const GRAPHIC_OPS_RATIO = 0.15;

// ============================================================
// ★ Tesseract.js OCR 모듈
// ============================================================

/**
 * 페이지를 캔버스로 렌더링하여 Tesseract.js OCR 실행
 * 
 * @param page - pdf.js 페이지 객체
 * @param pageIndex - 0-based 페이지 인덱스
 * @returns OCR로 추출된 PdfTextItem 배열
 */
async function ocrPage(
  page: any,
  pageIndex: number,
): Promise<PdfTextItem[]> {
  try {
    // 브라우저 환경 확인
    if (typeof document === 'undefined') return [];

    // 페이지를 캔버스에 렌더링 (OCR용 해상도: 2x)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Tesseract.js 동적 import
    const Tesseract = await import('tesseract.js');

    // 한국어 + 영어 OCR 실행
    const result: any = await Tesseract.recognize(
      canvas,
      'kor+eng',
    );

    // 캔버스 메모리 해제
    canvas.width = 0;
    canvas.height = 0;

    const ocrData = result?.data as any;
    if (!ocrData?.lines || ocrData.lines.length === 0) return [];

    // 원본 페이지 viewport (scale=1)
    const origViewport = page.getViewport({ scale: 1.0 });
    const pageWidth = origViewport.width;
    const pageHeight = origViewport.height;

    // OCR 결과를 PdfTextItem으로 변환
    const items: PdfTextItem[] = [];

    for (const line of ocrData.lines) {
      const text = line.text?.trim();
      if (!text) continue;

      // OCR bbox를 원본 PDF 좌표로 변환 (scale 보정)
      const bbox = line.bbox;
      const x = bbox.x0 / scale;
      const y = bbox.y0 / scale;
      const w = (bbox.x1 - bbox.x0) / scale;
      const h = (bbox.y1 - bbox.y0) / scale;

      // 글자 크기 추정 (bbox 높이 기반)
      const fontSize = Math.max(h * 0.8, 8);

      items.push({
        text,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
        fontName: 'OCR',
        fontSize: Math.round(fontSize * 100) / 100,
        isBold: false,
        isItalic: false,
        pageIndex,
        pageWidth,
        pageHeight,
      });
    }

    return items;
  } catch (err) {
    console.warn(`OCR 실패 (페이지 ${pageIndex + 1}):`, err);
    return [];
  }
}

/**
 * 텍스트 부족 페이지를 이미지 + 숨김 OCR 텍스트로 변환
 * - 이미지: 원본 PDF 레이아웃 그대로 표시
 * - OCR 텍스트: 숨김 처리 (검색용)
 */
function buildImageWithHiddenOCR(imageUrl: string, ocrItems: PdfTextItem[]): string {
  const parts: string[] = [];

  // 이미지 표시 (원본 레이아웃 보존)
  parts.push(`<figure style="text-align:center;margin:0.5em 0"><img src="${imageUrl}" alt="" style="max-width:100%;height:auto" loading="lazy" /></figure>`);

  // OCR 텍스트 숨김 (검색용)
  if (ocrItems.length > 0) {
    const sorted = [...ocrItems].sort((a, b) => a.y - b.y);
    const ocrText = sorted.map(it => escapeHtml(it.text)).join(' ');
    parts.push(`<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">${ocrText}</div>`);
  }

  return parts.join('\n');
}

/**
 * 페이지의 그래픽 오퍼레이터를 분석하여 이미지/표/차트 포함 여부 판단
 * 
 * pdf.js 오퍼레이터 코드:
 *   - 85 (paintImageXObject), 82 (paintJpegXObject) → 이미지
 *   - 19 (moveTo), 20 (lineTo), 16 (rectangle) → 선/도형 (표, 차트)
 *   - 44 (showText), 45 (showSpacedText) → 텍스트
 * 
 * 그래픽 오퍼레이터 비율이 높으면 표/차트/이미지 페이지로 판단
 */
async function analyzePageGraphics(page: any): Promise<{
  hasImages: boolean;
  hasGraphics: boolean;
  graphicRatio: number;
  totalOps: number;
}> {
  try {
    const ops = await page.getOperatorList();
    let imageOps = 0;
    let graphicOps = 0; // 선, 사각형, 곡선 등
    let textOps = 0;
    let totalOps = ops.fnArray.length;

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      // 이미지
      if (fn === 85 || fn === 82) imageOps++;
      // 그래픽: moveTo(19), lineTo(20), rectangle(16), curveTo(13,14,15), stroke(34), fill(36,37)
      else if ([13, 14, 15, 16, 19, 20, 34, 36, 37].includes(fn)) graphicOps++;
      // 텍스트: showText(44), showSpacedText(45)
      else if (fn === 44 || fn === 45) textOps++;
    }

    const relevantOps = imageOps + graphicOps + textOps;
    const graphicRatio = relevantOps > 0 ? (imageOps + graphicOps) / relevantOps : 0;

    return {
      hasImages: imageOps > 0,
      hasGraphics: graphicOps > 10, // 10개 이상의 그래픽 오퍼레이터 = 표/차트 가능성
      graphicRatio,
      totalOps,
    };
  } catch (err) {
    return { hasImages: false, hasGraphics: false, graphicRatio: 0, totalOps: 0 };
  }
}

/**
 * 페이지를 캔버스에 렌더링하여 Blob으로 변환 (Storage 업로드용)
 */
async function renderPageToBlob(page: any, scale: number = 1.5): Promise<Blob | null> {
  try {
    if (typeof document === 'undefined') return null;

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        0.85
      );
    });

    // 메모리 해제
    canvas.width = 0;
    canvas.height = 0;

    return blob;
  } catch (err) {
    console.warn('페이지 이미지 렌더링 실패:', err);
    return null;
  }
}

// ============================================================
// 1단계: PDF 텍스트 추출 (pdf.js 래퍼)
// ============================================================

export async function extractTextItems(
  pdfDoc: any,
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
      if (!item.str || item.str.trim() === '') continue;

      const tx = item.transform;
      const x = tx[4];
      const y = viewport.height - tx[5];
      const fontSize = Math.abs(tx[0]) || Math.abs(tx[3]) || item.height || 12;

      const fontName = item.fontName || '';
      const isBold = /bold/i.test(fontName) || /Black/i.test(fontName) || /Heavy/i.test(fontName);
      const isItalic = /italic/i.test(fontName) || /oblique/i.test(fontName);

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

      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (fn !== 85 && fn !== 82) continue;

        const imageName = ops.argsArray[i]?.[0];
        if (!imageName) continue;

        try {
          const imgData = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
            page.objs.get(imageName, (data: any) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          if (!imgData || !imgData.width || !imgData.height) continue;
          if (imgData.width < 50 || imgData.height < 50) continue;

          const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
          if (!canvas) continue;

          canvas.width = imgData.width;
          canvas.height = imgData.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const imageData = ctx.createImageData(imgData.width, imgData.height);

          if (imgData.data) {
            if (imgData.data.length === imgData.width * imgData.height * 4) {
              imageData.data.set(imgData.data);
            } else if (imgData.data.length === imgData.width * imgData.height * 3) {
              const rgb = imgData.data;
              const rgba = imageData.data;
              for (let j = 0, k = 0; j < rgb.length; j += 3, k += 4) {
                rgba[k] = rgb[j]; rgba[k + 1] = rgb[j + 1]; rgba[k + 2] = rgb[j + 2]; rgba[k + 3] = 255;
              }
            } else if (imgData.data.length === imgData.width * imgData.height) {
              const gray = imgData.data;
              const rgba = imageData.data;
              for (let j = 0, k = 0; j < gray.length; j++, k += 4) {
                rgba[k] = gray[j]; rgba[k + 1] = gray[j]; rgba[k + 2] = gray[j]; rgba[k + 3] = 255;
              }
            } else { continue; }
          } else { continue; }

          ctx.putImageData(imageData, 0, 0);

          const isPhoto = imgData.width > 200 && imgData.height > 200;
          const format = isPhoto ? 'jpeg' : 'png';
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = format === 'jpeg' ? 0.85 : undefined;

          const dataUrl = canvas.toDataURL(mimeType, quality);
          const sizeBytes = Math.round(dataUrl.length * 0.75);

          const image: PdfImage = {
            pageIndex: pageNum - 1, y: 0, x: 0,
            width: imgData.width, height: imgData.height,
            dataUrl: '', sizeBytes, format,
          };

          if (sizeBytes <= IMAGE_INLINE_THRESHOLD) {
            image.dataUrl = dataUrl;
          } else if (uploadImage) {
            try {
              const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                  (b) => b ? resolve(b) : reject(new Error('toBlob failed')),
                  mimeType, quality
                );
              });
              const fileName = `pdf-img-${pageNum}-${i}.${format}`;
              const storageUrl = await uploadImage(blob, fileName);
              image.storageUrl = storageUrl;
            } catch (uploadErr) {
              console.warn('이미지 Storage 업로드 실패, base64 폴백:', uploadErr);
              image.dataUrl = dataUrl;
            }
          } else {
            image.dataUrl = dataUrl;
          }

          canvas.width = 0; canvas.height = 0;
          pageImages.push(image);
        } catch (imgErr) {
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
// 2단계: 라인 그룹핑
// ============================================================

export function groupIntoLines(items: PdfTextItem[]): TextLine[] {
  if (items.length === 0) return [];

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
    const avgHeight = (item.height + prevItem.height) / 2;
    const yTolerance = avgHeight * 0.5;

    if (Math.abs(item.y - prevItem.y) <= yTolerance) {
      currentLineItems.push(item);
    } else {
      lines.push(buildLine(currentLineItems));
      currentLineItems = [item];
    }
  }

  if (currentLineItems.length > 0) {
    lines.push(buildLine(currentLineItems));
  }

  return lines;
}

function buildLine(items: PdfTextItem[]): TextLine {
  items.sort((a, b) => a.x - b.x);

  let text = '';
  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
      const charWidth = items[i - 1].fontSize * 0.5;
      if (gap > charWidth * 1.5) { text += '  '; }
      else if (gap > charWidth * 0.3) { text += ' '; }
    }
    text += items[i].text;
  }

  const maxHeight = Math.max(...items.map(it => it.height));
  const boldCount = items.filter(it => it.isBold).length;
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
// 3단계: 다단 레이아웃 감지
// ============================================================

export function detectColumns(lines: TextLine[], pageWidth: number): TextLine[] {
  if (lines.length < 5) {
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  const fontSizes = lines.map(l => l.fontSize);
  const bodyFontSize = getMostFrequent(fontSizes);
  const bodyLines = lines.filter(l => Math.abs(l.fontSize - bodyFontSize) < bodyFontSize * 0.15);

  if (bodyLines.length < 5) {
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  const xStarts = bodyLines.map(l => l.x);
  const clusters = clusterValues(xStarts, pageWidth * 0.08);

  if (clusters.length <= 1) {
    return lines.map(l => ({ ...l, columnIndex: 0 }));
  }

  const clusterCenters = clusters.map(c => average(c));
  clusterCenters.sort((a, b) => a - b);

  return lines.map(line => {
    if (line.width > pageWidth * 0.7) {
      return { ...line, columnIndex: 0 };
    }
    let minDist = Infinity;
    let colIdx = 0;
    for (let i = 0; i < clusterCenters.length; i++) {
      const dist = Math.abs(line.x - clusterCenters[i]);
      if (dist < minDist) { minDist = dist; colIdx = i; }
    }
    return { ...line, columnIndex: colIdx };
  });
}

// ============================================================
// 4단계: 읽기 순서 재구성
// ============================================================

export function orderLines(lines: TextLine[]): TextLine[] {
  const maxCol = Math.max(...lines.map(l => l.columnIndex), 0);

  if (maxCol === 0) {
    return [...lines].sort((a, b) => a.y - b.y);
  }

  const result: TextLine[] = [];
  const fullWidthLines = lines.filter(l => 
    l.columnIndex === 0 && l.width > l.items[0]?.pageWidth * 0.7
  );
  const columnLines = lines.filter(l => 
    !(l.columnIndex === 0 && l.width > (l.items[0]?.pageWidth || 999) * 0.7)
  );

  const sortedFW = [...fullWidthLines].sort((a, b) => a.y - b.y);
  const sortedCL = [...columnLines].sort((a, b) => a.y - b.y);

  let fwIdx = 0;
  let clIdx = 0;

  while (clIdx < sortedCL.length || fwIdx < sortedFW.length) {
    const nextFwY = fwIdx < sortedFW.length ? sortedFW[fwIdx].y : Infinity;

    const blockLines: TextLine[] = [];
    while (clIdx < sortedCL.length && sortedCL[clIdx].y < nextFwY) {
      blockLines.push(sortedCL[clIdx]);
      clIdx++;
    }

    for (let col = 0; col <= maxCol; col++) {
      const colLines = blockLines.filter(l => l.columnIndex === col).sort((a, b) => a.y - b.y);
      result.push(...colLines);
    }

    if (fwIdx < sortedFW.length) { result.push(sortedFW[fwIdx]); fwIdx++; }
  }

  return result;
}

// ============================================================
// 5단계: 헤더/푸터 감지 및 제거
// ============================================================

export function detectHeadersFooters(
  pagesLines: TextLine[][],
): { cleanedPages: TextLine[][]; removedCount: number } {
  if (pagesLines.length < 3) {
    return { cleanedPages: pagesLines, removedCount: 0 };
  }

  const signatureMap = new Map<string, { count: number; pages: Set<number> }>();
  
  for (let pi = 0; pi < pagesLines.length; pi++) {
    const lines = pagesLines[pi];
    if (lines.length === 0) continue;
    const pageHeight = lines[0]?.items[0]?.pageHeight || 800;

    for (const line of lines) {
      const yRatio = line.y / pageHeight;
      if (yRatio > 0.15 && yRatio < 0.85) continue;

      const normalized = normalizeHeaderFooterText(line.text);
      if (!normalized) continue;

      const yBucket = Math.round(yRatio * 20) / 20;
      const sig = `${yBucket}|${normalized}`;

      const entry = signatureMap.get(sig) || { count: 0, pages: new Set() };
      entry.count++;
      entry.pages.add(pi);
      signatureMap.set(sig, entry);
    }
  }

  const headerFooterSigs = new Set<string>();
  for (const [sig, { pages }] of signatureMap) {
    if (pages.size >= Math.min(3, Math.ceil(pagesLines.length * 0.3))) {
      headerFooterSigs.add(sig);
    }
  }

  const pageNumberPattern = /^[\s\-\u2013\u2014]*\d+[\s\-\u2013\u2014]*$/;
  const pageOfPattern = /^\d+\s*[\/of]\s*\d+$/i;

  let removedCount = 0;
  const cleanedPages = pagesLines.map((lines, pi) => {
    const pageHeight = lines[0]?.items[0]?.pageHeight || 800;

    return lines.filter(line => {
      const yRatio = line.y / pageHeight;
      if (yRatio > 0.15 && yRatio < 0.85) return true;

      const normalized = normalizeHeaderFooterText(line.text);
      if (normalized) {
        const yBucket = Math.round(yRatio * 20) / 20;
        const sig = `${yBucket}|${normalized}`;
        if (headerFooterSigs.has(sig)) { removedCount++; return false; }
      }

      const trimmed = line.text.trim();
      if (pageNumberPattern.test(trimmed) || pageOfPattern.test(trimmed)) { removedCount++; return false; }

      return true;
    });
  });

  return { cleanedPages, removedCount };
}

function normalizeHeaderFooterText(text: string): string {
  return text.trim().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

// ============================================================
// 6단계: 라인 → 문단 병합
// ============================================================

export function mergeLinesIntoParagraphs(
  lines: TextLine[],
  dominantFontSize: number,
  pageWidth: number,
): TextParagraph[] {
  if (lines.length === 0) return [];

  const paragraphs: TextParagraph[] = [];
  let currentParagraphLines: TextLine[] = [lines[0]];

  const bodyLines = lines.filter(l => Math.abs(l.fontSize - dominantFontSize) < dominantFontSize * 0.15);
  const lineGaps = computeLineGaps(bodyLines);
  const avgLineGap = lineGaps.length > 0 ? median(lineGaps) : dominantFontSize * 1.4;

  const bodyXStarts = bodyLines.map(l => l.x);
  const baseX = bodyXStarts.length > 0 ? getMostFrequent(bodyXStarts.map(x => Math.round(x))) : 0;
  const indentThreshold = dominantFontSize * 1.5;

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];
    let isNewParagraph = false;

    const gap = currLine.y - prevLine.y;
    if (gap > avgLineGap * 1.8) isNewParagraph = true;
    if (Math.abs(currLine.fontSize - prevLine.fontSize) > dominantFontSize * 0.1) isNewParagraph = true;
    if (currLine.isBold !== prevLine.isBold) isNewParagraph = true;

    const currIndented = currLine.x - baseX > indentThreshold;
    const prevIndented = prevLine.x - baseX > indentThreshold;
    if (currIndented && !prevIndented && gap > avgLineGap * 0.8) isNewParagraph = true;

    const rightMargin = pageWidth - prevLine.xEnd;
    const normalRightMargin = pageWidth * 0.08;
    if (rightMargin > pageWidth * 0.25 && rightMargin > normalRightMargin * 3) {
      if (gap > avgLineGap * 0.8) isNewParagraph = true;
    }

    if (currLine.columnIndex !== prevLine.columnIndex && currLine.columnIndex >= 0) isNewParagraph = true;

    if (isNewParagraph) {
      paragraphs.push(buildParagraph(currentParagraphLines, baseX, indentThreshold));
      currentParagraphLines = [currLine];
    } else {
      currentParagraphLines.push(currLine);
    }
  }

  if (currentParagraphLines.length > 0) {
    paragraphs.push(buildParagraph(currentParagraphLines, baseX, indentThreshold));
  }

  return paragraphs;
}

function buildParagraph(lines: TextLine[], baseX: number, indentThreshold: number): TextParagraph {
  const text = mergeLineTexts(lines);
  const avgFontSize = average(lines.map(l => l.fontSize));
  const boldRatio = lines.filter(l => l.isBold).length / lines.length;
  const firstLineIndented = lines[0].x - baseX > indentThreshold;

  return {
    lines, text, type: 'body',
    fontSize: avgFontSize, isBold: boldRatio > 0.6,
    isIndented: firstLineIndented, pageIndex: lines[0].pageIndex,
  };
}

function mergeLineTexts(lines: TextLine[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0].text;

  let result = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const prevText = lines[i - 1].text;
    const currText = lines[i].text;

    if (prevText.endsWith('-') && !prevText.endsWith('--')) {
      result = result.slice(0, -1) + currText;
    } else if (isKoreanText(prevText)) {
      result += currText;
    } else {
      result += ' ' + currText;
    }
  }
  return result;
}

// ============================================================
// 7단계: 제목 감지
// ============================================================

export function detectHeadings(
  paragraphs: TextParagraph[],
  dominantFontSize: number,
  pageWidth: number,
): TextParagraph[] {
  return paragraphs.map(para => {
    const sizeRatio = para.fontSize / dominantFontSize;
    const lineCount = para.lines.length;
    const textLength = para.text.length;

    const avgLineX = average(para.lines.map(l => l.x));
    const avgLineXEnd = average(para.lines.map(l => l.xEnd));
    const leftMargin = avgLineX;
    const rightMargin = pageWidth - avgLineXEnd;
    const isCentered = Math.abs(leftMargin - rightMargin) < pageWidth * 0.1 && leftMargin > pageWidth * 0.15;

    let type = para.type;
    if (sizeRatio >= 1.5 && lineCount <= 3) type = 'heading1';
    else if (sizeRatio >= 1.25 && lineCount <= 3) type = 'heading2';
    else if (sizeRatio >= 1.1 && para.isBold && lineCount <= 2) type = 'heading3';
    else if (para.isBold && lineCount === 1 && textLength < 50 && isCentered) type = 'heading2';
    else if (para.isBold && lineCount === 1 && textLength < 80) type = 'heading3';

    if (textLength < 3) type = 'body';

    return { ...para, type };
  });
}

// ============================================================
// 8단계: 후처리
// ============================================================

export function postProcessParagraphs(paragraphs: TextParagraph[]): TextParagraph[] {
  return paragraphs.map(para => {
    let text = para.text;
    text = text.replace(/\s{2,}/g, ' ');
    text = text.trim();
    return { ...para, text };
  });
}

// ============================================================
// 9단계: HTML 생성
// ============================================================

export function generateHTML(paragraphs: TextParagraph[], images?: PdfImage[]): string {
  if (paragraphs.length === 0 && (!images || images.length === 0)) return '';

  const htmlParts: string[] = [];
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
    if (para.pageIndex !== lastPageIndex && lastPageIndex >= 0) {
      const pageImgs = imagesByPage.get(lastPageIndex);
      if (pageImgs && !insertedPages.has(lastPageIndex)) {
        for (const img of pageImgs) htmlParts.push(generateImageTag(img));
        insertedPages.add(lastPageIndex);
      }
    }
    lastPageIndex = para.pageIndex;

    const escapedText = escapeHtml(para.text);
    switch (para.type) {
      case 'heading1': htmlParts.push(`<h1>${escapedText}</h1>`); break;
      case 'heading2': htmlParts.push(`<h2>${escapedText}</h2>`); break;
      case 'heading3': htmlParts.push(`<h3>${escapedText}</h3>`); break;
      default:
        if (para.isBold) htmlParts.push(`<p><strong>${escapedText}</strong></p>`);
        else if (para.isIndented) htmlParts.push(`<p style="text-indent:1.5em">${escapedText}</p>`);
        else htmlParts.push(`<p>${escapedText}</p>`);
        break;
    }
  }

  if (lastPageIndex >= 0) {
    const pageImgs = imagesByPage.get(lastPageIndex);
    if (pageImgs && !insertedPages.has(lastPageIndex)) {
      for (const img of pageImgs) htmlParts.push(generateImageTag(img));
      insertedPages.add(lastPageIndex);
    }
  }

  for (const [pageIdx, pageImgs] of imagesByPage) {
    if (!insertedPages.has(pageIdx)) {
      for (const img of pageImgs) htmlParts.push(generateImageTag(img));
    }
  }

  return htmlParts.join('\n');
}

function generateImageTag(img: PdfImage): string {
  const src = img.storageUrl || img.dataUrl;
  if (!src) return '';
  return `<figure style="text-align:center;margin:1em 0"><img src="${src}" alt="" style="max-width:100%;height:auto" loading="lazy" /></figure>`;
}

// ============================================================
// 10단계: 메타데이터 분석
// ============================================================

export function analyzeDocumentMetadata(pagesItems: PdfTextItem[][]): DocumentStructure['metadata'] {
  const allItems = pagesItems.flat();

  if (allItems.length === 0) {
    return {
      totalPages: pagesItems.length, dominantFontSize: 12, dominantFontName: 'unknown',
      hasMultipleColumns: false, averageCharsPerPage: 0, language: 'ko',
    };
  }

  const fontSizes = allItems.map(it => Math.round(it.fontSize * 10) / 10);
  const dominantFontSize = getMostFrequent(fontSizes);

  const fontNames = allItems
    .filter(it => Math.abs(it.fontSize - dominantFontSize) < dominantFontSize * 0.1)
    .map(it => it.fontName);
  const dominantFontName = getMostFrequentString(fontNames) || 'unknown';

  const allText = allItems.map(it => it.text).join('');
  const koreanChars = (allText.match(/[\uAC00-\uD7AF\u3130-\u318F]/g) || []).length;
  const englishChars = (allText.match(/[a-zA-Z]/g) || []).length;
  const totalChars = allText.length;

  let language: 'ko' | 'en' | 'mixed' = 'mixed';
  if (koreanChars / totalChars > 0.3) language = 'ko';
  else if (englishChars / totalChars > 0.5) language = 'en';

  const charsPerPage = pagesItems.map(items => items.reduce((sum, it) => sum + it.text.length, 0));
  const averageCharsPerPage = charsPerPage.length > 0 ? Math.round(average(charsPerPage)) : 0;

  return {
    totalPages: pagesItems.length, dominantFontSize, dominantFontName,
    hasMultipleColumns: false, averageCharsPerPage, language,
  };
}

// ============================================================
// ★ 메인 변환 함수 (OCR 통합 파이프라인)
// ============================================================

export async function convertPdfToReflow(
  pdfDoc: any,
  onProgress?: ProgressCallback,
  uploadImage?: ImageUploadCallback,
): Promise<ReflowPage[]> {

  // ── 1단계: 텍스트 추출 ──
  if (onProgress) onProgress('PDF 텍스트 추출 중...', 0);
  const pagesItems = await extractTextItems(pdfDoc, (stage, progress) => {
    if (onProgress) onProgress(stage, progress * 0.2); // 0~20%
  });

  // ── 1.5단계: 이미지 추출 ──
  if (onProgress) onProgress('이미지 추출 중...', 20);
  let pagesImages: PdfImage[][] = [];
  try {
    pagesImages = await extractImages(pdfDoc, uploadImage, (stage, progress) => {
      if (onProgress) onProgress(stage, 20 + progress * 0.05); // 20~25%
    });
  } catch (imgErr) {
    console.warn('이미지 추출 실패 (텍스트만 변환):', imgErr);
    pagesImages = pagesItems.map(() => []);
  }

  // ── ★ 이미지 렌더링 + OCR 보강 단계 ──
  if (onProgress) onProgress('페이지 분석 중...', 25);
  
  const ocrPageHTMLs = new Map<number, string>();
  let ocrCount = 0;
  
  // 페이지당 평균 텍스트 길이 계산 (동적 임계값용)
  const pageTextLengths = pagesItems.map(items => items.map(it => it.text).join('').trim().length);
  const nonEmptyLengths = pageTextLengths.filter(len => len > MIN_TEXT_THRESHOLD);
  const avgTextLength = nonEmptyLengths.length > 0
    ? nonEmptyLengths.reduce((a, b) => a + b, 0) / nonEmptyLengths.length
    : 500;
  const dynamicThreshold = Math.max(MIN_TEXT_THRESHOLD, Math.round(avgTextLength * 0.3));
  
  console.log(`페이지 분석: 평균 텍스트 ${Math.round(avgTextLength)}자, 이미지 렌더링 임계값 ${dynamicThreshold}자`);
  
  for (let pi = 0; pi < pagesItems.length; pi++) {
    const items = pagesItems[pi];
    const totalText = items.map(it => it.text).join('').trim();
    const textLength = totalText.length;
    
    // ── 이미지 렌더링 판단 ──
    let shouldRenderAsImage = false;
    let reason = '';
    
    // 1차: 텍스트가 절대 최소 임계값 미만
    if (textLength < MIN_TEXT_THRESHOLD) {
      shouldRenderAsImage = true;
      reason = '텍스트 부족';
    }
    // 2차: 텍스트가 동적 임계값(평균의 30%) 미만
    else if (textLength < dynamicThreshold) {
      shouldRenderAsImage = true;
      reason = '텍스트 비율 낮음';
    }
    
    // 3차: 그래픽 오퍼레이터 분석 (텍스트가 있더라도 표/이미지 포함 시)
    if (!shouldRenderAsImage && textLength < avgTextLength * 0.8) {
      try {
        const page = await pdfDoc.getPage(pi + 1);
        const graphics = await analyzePageGraphics(page);
        
        if (graphics.hasImages || (graphics.hasGraphics && graphics.graphicRatio > GRAPHIC_OPS_RATIO)) {
          shouldRenderAsImage = true;
          reason = graphics.hasImages ? '이미지 포함' : '표/차트 포함';
        }
      } catch {}
    }
    
    if (!shouldRenderAsImage) continue;
    
    // ── 이미지 렌더링 + OCR 실행 ──
    try {
      if (onProgress) onProgress(`이미지 처리 중 (${pi + 1}페이지, ${reason})...`, 25 + (pi / pagesItems.length) * 15);
      
      const page = await pdfDoc.getPage(pi + 1);
      
      // 1. 페이지를 이미지로 렌더링 → Storage 업로드
      let imageUrl = '';
      const pageBlob = await renderPageToBlob(page, 1.5);
      if (pageBlob && uploadImage) {
        try {
          const fileName = `page-img-${pi + 1}.jpg`;
          imageUrl = await uploadImage(pageBlob, fileName);
        } catch (uploadErr) {
          console.warn(`페이지 ${pi + 1} 이미지 업로드 실패:`, uploadErr);
        }
      }
      
      // 이미지 업로드 실패 시 base64 폴백
      if (!imageUrl && pageBlob) {
        try {
          const reader = new FileReader();
          imageUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pageBlob);
          });
        } catch {}
      }
      
      // 2. OCR 실행 (숨김 텍스트용 - 텍스트가 적은 페이지만)
      let ocrItems: PdfTextItem[] = [];
      if (textLength < dynamicThreshold) {
        try {
          ocrItems = await ocrPage(page, pi);
        } catch (ocrErr) {
          console.warn(`OCR 실패 (페이지 ${pi + 1}):`, ocrErr);
        }
      }
      
      // 3. 이미지 + 숨김 텍스트 HTML 생성
      if (imageUrl) {
        // 기존 추출 텍스트가 있으면 그걸 숨김 텍스트로 사용
        const hiddenItems = ocrItems.length > 0 ? ocrItems : items.map(it => ({
          ...it,
          text: it.text,
        }));
        const html = buildImageWithHiddenOCR(imageUrl, hiddenItems);
        ocrPageHTMLs.set(pi, html);
        ocrCount++;
      }
    } catch (err) {
      console.warn(`페이지 ${pi + 1} 이미지 처리 실패:`, err);
    }
  }
  
  if (ocrCount > 0) {
    console.log(`이미지 렌더링: ${ocrCount}개 페이지 처리 완료`);
  }

  // 빈 페이지만 있으면 빈 결과 반환
  const totalItems = pagesItems.reduce((sum, p) => sum + p.length, 0);
  const totalImages = pagesImages.reduce((sum, p) => sum + p.length, 0);
  if (totalItems === 0 && totalImages === 0 && ocrPageHTMLs.size === 0) {
    return pagesItems.map((_, i) => ({
      pageNumber: i + 1,
      textContent: '',
    }));
  }

  // ── 메타데이터 분석 ──
  if (onProgress) onProgress('문서 구조 분석 중...', 40);
  const metadata = analyzeDocumentMetadata(pagesItems);

  // ── 2~4단계: 페이지별 구조 복원 ──
  if (onProgress) onProgress('헤더/푸터 감지 중...', 55);

  const pagesLines: TextLine[][] = [];
  for (let pi = 0; pi < pagesItems.length; pi++) {
    // OCR 페이지는 라인 처리 건너뛰기 (이미 HTML로 변환됨)
    if (ocrPageHTMLs.has(pi)) {
      pagesLines.push([]);
      continue;
    }
    
    const items = pagesItems[pi];
    if (items.length === 0) { pagesLines.push([]); continue; }
    const pageWidth = items[0].pageWidth;
    let lines = groupIntoLines(items);
    lines = detectColumns(lines, pageWidth);
    lines = orderLines(lines);
    pagesLines.push(lines);
  }

  const { cleanedPages } = detectHeadersFooters(pagesLines);

  // ── 6~8단계: 문단 병합 + 제목 감지 + 후처리 ──
  if (onProgress) onProgress('문단 구조 복원 중...', 70);

  const pageStructures: PageStructure[] = [];

  for (let pi = 0; pi < cleanedPages.length; pi++) {
    // OCR 페이지는 빈 구조 (HTML은 별도 병합)
    if (ocrPageHTMLs.has(pi)) {
      pageStructures.push({
        pageIndex: pi, paragraphs: [],
        pageWidth: pagesItems[pi]?.[0]?.pageWidth || 595,
        pageHeight: pagesItems[pi]?.[0]?.pageHeight || 842,
      });
      continue;
    }

    const lines = cleanedPages[pi];
    if (lines.length === 0) {
      pageStructures.push({
        pageIndex: pi, paragraphs: [],
        pageWidth: pagesItems[pi]?.[0]?.pageWidth || 595,
        pageHeight: pagesItems[pi]?.[0]?.pageHeight || 842,
      });
      continue;
    }

    const pageWidth = pagesItems[pi][0].pageWidth;
    const pageHeight = pagesItems[pi][0].pageHeight;

    let paragraphs = mergeLinesIntoParagraphs(lines, metadata.dominantFontSize, pageWidth);
    paragraphs = detectHeadings(paragraphs, metadata.dominantFontSize, pageWidth);
    paragraphs = postProcessParagraphs(paragraphs);

    pageStructures.push({ pageIndex: pi, paragraphs, pageWidth, pageHeight });
  }

  // ── 9단계: HTML 생성 (OCR 페이지 합류) ──
  if (onProgress) onProgress('HTML 생성 중...', 85);

  // 일반 페이지의 HTML 생성
  const allParagraphsFlat = pageStructures.flatMap(ps => ps.paragraphs);
  const allImagesFlat = pagesImages.flat().filter(img => img.dataUrl || img.storageUrl);
  
  // OCR 페이지를 포함한 최종 HTML 조립
  // 페이지 순서대로 HTML 조각을 조합
  const finalHTMLParts: string[] = [];
  
  for (let pi = 0; pi < pagesItems.length; pi++) {
    if (ocrPageHTMLs.has(pi)) {
      // OCR 페이지: OCR HTML 삽입
      finalHTMLParts.push(ocrPageHTMLs.get(pi)!);
      
      // 해당 페이지의 이미지도 삽입
      const pageImgs = pagesImages[pi] || [];
      for (const img of pageImgs) {
        const tag = generateImageTag(img);
        if (tag) finalHTMLParts.push(tag);
      }
    } else {
      // 일반 페이지: 기존 파이프라인 결과
      const pageParagraphs = allParagraphsFlat.filter(p => p.pageIndex === pi);
      const pageImgs = (pagesImages[pi] || []).filter(img => img.dataUrl || img.storageUrl);
      
      if (pageParagraphs.length > 0 || pageImgs.length > 0) {
        const pageHTML = generateHTML(pageParagraphs, pageImgs);
        if (pageHTML) finalHTMLParts.push(pageHTML);
      }
    }
  }
  
  const fullHTML = finalHTMLParts.join('\n');

  // ── 10단계: 페이지 분할 ──
  if (onProgress) onProgress('페이지 분할 중...', 95);
  const reflowPages = splitIntoReflowPages(fullHTML, 2000);

  if (onProgress) onProgress('변환 완료!', 100);

  return reflowPages;
}

// ============================================================
// 페이지 분할
// ============================================================

export function splitIntoReflowPages(html: string, targetLength: number = 2000): ReflowPage[] {
  if (!html || html.trim().length === 0) {
    return [{ pageNumber: 1, textContent: '' }];
  }

  const paragraphTags = html.split(/(?=<h[1-3]|<p[ >]|<figure[ >])/);
  const pages: ReflowPage[] = [];
  let currentPage = '';
  let currentLength = 0;

  for (const tag of paragraphTags) {
    if (!tag.trim()) continue;

    const isFigure = /^<figure/.test(tag.trim());
    const tagTextLength = isFigure ? 500 : tag.replace(/<[^>]*>/g, '').length;

    const isHeading = /^<h[1-3]/.test(tag.trim());
    if (isHeading && currentLength > 0) {
      pages.push({ pageNumber: pages.length + 1, textContent: currentPage.trim() });
      currentPage = ''; currentLength = 0;
    } else if (currentLength > 0 && currentLength + tagTextLength > targetLength) {
      if (currentLength > targetLength * 0.5) {
        pages.push({ pageNumber: pages.length + 1, textContent: currentPage.trim() });
        currentPage = ''; currentLength = 0;
      }
    }

    currentPage += tag;
    currentLength += tagTextLength;

    if (currentLength > targetLength * 1.5) {
      pages.push({ pageNumber: pages.length + 1, textContent: currentPage.trim() });
      currentPage = ''; currentLength = 0;
    }
  }

  if (currentPage.trim()) {
    pages.push({ pageNumber: pages.length + 1, textContent: currentPage.trim() });
  }

  if (pages.length === 0) {
    pages.push({ pageNumber: 1, textContent: '' });
  }

  return pages;
}

// ============================================================
// 유틸리티 함수
// ============================================================

function getMostFrequent(values: number[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const v of values) {
    const rounded = Math.round(v * 10) / 10;
    counts.set(rounded, (counts.get(rounded) || 0) + 1);
  }
  let maxCount = 0; let maxValue = values[0];
  for (const [val, count] of counts) { if (count > maxCount) { maxCount = count; maxValue = val; } }
  return maxValue;
}

function getMostFrequentString(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) { counts.set(v, (counts.get(v) || 0) + 1); }
  let maxCount = 0; let maxValue = values[0];
  for (const [val, count] of counts) { if (count > maxCount) { maxCount = count; maxValue = val; } }
  return maxValue;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clusterValues(values: number[], tolerance: number): number[][] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    const lastValue = lastCluster[lastCluster.length - 1];
    if (sorted[i] - lastValue <= tolerance) { lastCluster.push(sorted[i]); }
    else { clusters.push([sorted[i]]); }
  }
  const minSize = Math.max(2, values.length * 0.1);
  return clusters.filter(c => c.length >= minSize);
}

function computeLineGaps(lines: TextLine[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].y - lines[i - 1].y;
    if (gap > 0 && gap < lines[i].height * 5) gaps.push(gap);
  }
  return gaps;
}

function isKoreanText(text: string): boolean {
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u3130-\u318F]/g) || []).length;
  return koreanChars / Math.max(text.length, 1) > 0.3;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
