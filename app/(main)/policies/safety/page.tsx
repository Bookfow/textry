'use client'

import Link from 'next/link'

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">정책 및 안전</h1>
        <p className="text-sm text-gray-500 mb-8">최종 업데이트: 2026년 2월 13일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">커뮤니티 가이드라인</h2>
            <p>Textry는 모든 사용자가 안전하고 존중받는 환경에서 콘텐츠를 공유하고 즐길 수 있도록 다음 가이드라인을 운영합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">금지 콘텐츠</h2>
            <p>다음 유형의 콘텐츠는 Textry에서 허용되지 않습니다:</p>

            <h3 className="text-lg font-semibold mt-4 mb-2">유해하거나 위험한 콘텐츠</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>신체적 해를 끼칠 수 있는 활동을 조장하는 콘텐츠</li>
              <li>위험 물질의 제조 방법을 포함한 콘텐츠</li>
              <li>자해 또는 자살을 조장하는 콘텐츠</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">혐오 및 차별</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>인종, 민족, 종교, 성별, 성적 지향, 장애 등을 이유로 혐오를 조장하는 콘텐츠</li>
              <li>특정 집단에 대한 폭력을 선동하는 콘텐츠</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">폭력 및 선정적 콘텐츠</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>과도한 폭력을 묘사하는 콘텐츠</li>
              <li>성인용 또는 선정적 콘텐츠</li>
              <li>아동 착취와 관련된 모든 콘텐츠 (무관용 원칙)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">스팸 및 사기</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>스팸성 콘텐츠 또는 반복적인 무의미한 업로드</li>
              <li>피싱, 사기 등 사용자를 기만하는 콘텐츠</li>
              <li>조회수나 좋아요를 인위적으로 조작하는 행위</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4 mb-2">허위 정보</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>공중 보건에 해를 끼칠 수 있는 의료 허위 정보</li>
              <li>선거 과정을 방해하는 허위 정보</li>
              <li>의도적으로 조작된 콘텐츠</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">신고 절차</h2>
            <p>가이드라인을 위반하는 콘텐츠를 발견한 경우:</p>
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>해당 콘텐츠의 댓글 섹션 하단에 있는 <strong>"신고"</strong> 버튼을 클릭합니다.</li>
              <li>신고 사유를 선택하고 상세 내용을 입력합니다.</li>
              <li>Textry 운영팀이 신고 내용을 검토하고 적절한 조치를 취합니다.</li>
            </ol>
            <p className="mt-3">긴급 신고: <strong>safety@textry.io</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">위반 시 조치</h2>
            <p>가이드라인 위반 시 다음 조치가 취해질 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>해당 콘텐츠 삭제</li>
              <li>업로드 기능 일시 정지</li>
              <li>수익화 자격 박탈</li>
              <li>계정 일시 또는 영구 정지</li>
              <li>관련 법 집행 기관에 통보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">이의 제기</h2>
            <p>조치에 대해 이의가 있는 경우, 통지를 받은 날로부터 14일 이내에 이의를 제기할 수 있습니다.</p>
            <p>이의 제기: <strong>appeals@textry.io</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">불법촬영물 신고</h2>
            <p>불법촬영물 등 법률에 의해 금지된 콘텐츠를 발견한 경우 즉시 신고해주세요. Textry는 이러한 콘텐츠에 대해 무관용 원칙을 적용하며, 관련 법 집행 기관에 즉시 통보합니다.</p>
            <p className="mt-2">긴급 신고: <strong>safety@textry.io</strong></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
