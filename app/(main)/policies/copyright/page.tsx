'use client'

import Link from 'next/link'

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">저작권 정책</h1>
        <p className="text-sm text-gray-500 mb-8">최종 업데이트: 2026년 2월 13일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">Textry의 저작권 보호 원칙</h2>
            <p>Textry는 저작권자의 권리를 존중하며, 모든 사용자가 저작권법을 준수하도록 요구합니다. 저작권자의 허가 없이 콘텐츠를 업로드하는 행위는 엄격히 금지됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">저작권 침해 신고 절차</h2>
            <p>본인의 저작권이 침해된 경우, 다음 정보를 포함하여 신고해주세요:</p>
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>저작권자 또는 권한을 위임받은 자의 성명 및 연락처</li>
              <li>침해된 저작물에 대한 설명 및 원본 소재 정보</li>
              <li>Textry에서 침해 콘텐츠가 위치한 URL</li>
              <li>해당 콘텐츠가 저작권자의 허가 없이 사용되었다는 진술</li>
              <li>신고 내용이 정확하며 본인이 저작권자(또는 권한 위임자)임을 확인하는 서명</li>
            </ol>
            <p className="mt-3">신고 접수: <strong>copyright@textry.io</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">침해 콘텐츠 처리 절차</h2>
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li><strong>신고 접수:</strong> 저작권 침해 신고가 접수되면 즉시 검토를 시작합니다.</li>
              <li><strong>콘텐츠 비공개:</strong> 유효한 신고의 경우, 해당 콘텐츠를 즉시 비공개 처리합니다.</li>
              <li><strong>업로더 통지:</strong> 해당 콘텐츠의 업로더에게 침해 사실을 통지하고 소명 기회를 제공합니다.</li>
              <li><strong>이의 제기:</strong> 업로더는 14일 이내에 정당한 권리가 있음을 증명하는 이의를 제기할 수 있습니다.</li>
              <li><strong>최종 조치:</strong> 이의가 없거나 부적절한 경우, 콘텐츠는 영구 삭제됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">반복 위반자 정책</h2>
            <p>Textry는 반복적으로 저작권을 침해하는 사용자에 대해 다음 조치를 취합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>1차 위반:</strong> 해당 콘텐츠 삭제 및 경고</li>
              <li><strong>2차 위반:</strong> 업로드 기능 30일 정지</li>
              <li><strong>3차 위반:</strong> 계정 영구 정지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">업로더의 책임</h2>
            <p>콘텐츠를 업로드하는 사용자는 다음을 확인해야 합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>업로드하는 콘텐츠의 저작권을 본인이 보유하고 있거나, 저작권자로부터 배포 권한을 부여받았는지 여부</li>
              <li>제3자의 지식재산권을 침해하지 않는지 여부</li>
              <li>저작권 침해로 인한 법적 책임은 업로더에게 있음을 인지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">공정 이용 (Fair Use)</h2>
            <p>Textry는 저작권법상 공정 이용에 해당하는 콘텐츠를 인정합니다. 다만, 공정 이용 여부의 판단은 관련 법률 및 판례에 따르며, Textry가 최종 판단을 내리지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">문의</h2>
            <p>저작권 관련 문의: <strong>copyright@textry.io</strong></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
