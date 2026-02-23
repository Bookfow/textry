'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">서비스 이용약관</h1>
        <p className="text-sm text-gray-500 mb-8">시행일: 2026년 2월 14일 | 최종 수정일: 2026년 2월 14일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제1조 (목적)</h2>
            <p>이 약관은 Textry(이하 "회사")가 제공하는 콘텐츠 스트리밍 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>"서비스"</strong>란 회사가 제공하는 PDF 콘텐츠 업로드, 열람, 공유, 구독, 댓글 등의 온라인 플랫폼을 말합니다.</li>
              <li><strong>"회원"</strong>이란 회사와 서비스 이용 계약을 체결한 자를 말합니다.</li>
              <li><strong>"큐레이터"</strong>란 서비스에 콘텐츠를 업로드하는 회원을 말합니다.</li>
              <li><strong>"독자"</strong>란 서비스에서 콘텐츠를 열람하는 회원을 말합니다.</li>
              <li><strong>"프리미엄 회원"</strong>이란 유료 구독을 결제하여 광고 없는 서비스 등 추가 혜택을 이용하는 회원을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 합리적인 사유가 발생하면 약관을 변경할 수 있으며, 변경된 약관은 적용일자 7일 전부터 공지합니다. 이용자의 권리에 중대한 변경이 있는 경우 최소 30일 전에 공지합니다.</li>
              <li>회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제4조 (회원 가입)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>서비스 이용을 원하는 자는 회사가 정한 가입 양식에 따라 회원 정보를 기입한 후 이 약관에 동의한다는 의사 표시를 함으로써 회원 가입을 신청합니다.</li>
              <li>소셜 로그인(카카오, Google)을 통해 가입할 경우, 해당 소셜 서비스의 이용약관에도 동의하는 것으로 간주됩니다.</li>
              <li>만 14세 미만의 아동은 서비스에 가입할 수 없습니다.</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않을 수 있습니다: 타인의 명의를 이용한 경우, 허위 정보를 기재한 경우, 기타 회사가 정한 이용 신청 요건이 미비된 경우.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제5조 (서비스의 제공)</h2>
            <p>회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>PDF 콘텐츠 업로드 및 공유 서비스</li>
              <li>콘텐츠 열람 및 뷰어 서비스</li>
              <li>큐레이터 구독 및 알림 서비스</li>
              <li>댓글, 좋아요 등 커뮤니티 기능</li>
              <li>맞춤형 콘텐츠 추천</li>
              <li>프리미엄 구독 서비스 (유료)</li>
              <li>큐레이터 광고 수익 정산 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제6조 (콘텐츠 업로드 및 저작권)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회원이 업로드한 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.</li>
              <li>회원은 서비스에 콘텐츠를 업로드함으로써 회사에 서비스 운영에 필요한 범위 내에서의 비독점적 이용 권한을 부여합니다.</li>
              <li>회원은 타인의 저작권을 침해하는 콘텐츠를 업로드해서는 안 됩니다.</li>
              <li>저작권 침해 신고가 접수된 콘텐츠는 확인 후 삭제될 수 있습니다.</li>
              <li>반복적인 저작권 침해 시 계정이 정지될 수 있습니다.</li>
              <li>자세한 사항은 <Link href="/policies/copyright" className="text-blue-600 hover:underline">저작권 정책</Link>을 참고해주세요.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제7조 (광고 및 수익)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>서비스에는 광고가 포함될 수 있으며, 프리미엄 회원은 광고가 제거됩니다.</li>
              <li>큐레이터는 자신의 콘텐츠에서 발생한 광고 수익의 일부를 정산받을 수 있습니다.</li>
              <li>수익 배분 비율은 큐레이터 등급에 따라 결정되며, 회사는 배분 비율을 사전 공지 후 변경할 수 있습니다.</li>
              <li>부정 클릭, 조회수 조작 등 부정 행위가 확인될 경우 수익 정산이 취소될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제8조 (프리미엄 서비스)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>프리미엄 서비스는 월 단위로 결제되며, 자동 갱신됩니다.</li>
              <li>프리미엄 해지 시 현재 결제 기간이 끝날 때까지 혜택이 유지됩니다.</li>
              <li>결제 후 7일 이내, 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.</li>
              <li>환불은 콘텐츠이용자보호법 및 전자상거래법에 따라 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제9조 (금지 행위)</h2>
            <p>회원은 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>타인의 정보를 도용하는 행위</li>
              <li>서비스를 이용하여 법령에 위반되는 행위</li>
              <li>음란물, 폭력적·혐오적 콘텐츠 업로드</li>
              <li>타인의 저작권을 침해하는 콘텐츠 업로드</li>
              <li>서비스의 운영을 방해하는 행위</li>
              <li>조회수, 좋아요 등을 인위적으로 조작하는 행위</li>
              <li>광고 수익을 부정하게 취득하는 행위</li>
              <li>다른 이용자에게 불쾌감을 주는 행위</li>
              <li>악성코드, 바이러스 등 유해한 소프트웨어 배포</li>
              <li>다른 사용자의 개인정보를 무단으로 수집하는 행위</li>
              <li>불법 촬영물 등 법률에 의해 금지된 콘텐츠 게시</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제10조 (서비스 이용 제한)</h2>
            <p>회사는 다음의 경우 서비스 이용을 제한하거나 계정을 정지할 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>본 약관을 위반한 경우</li>
              <li>서비스의 정상적인 운영을 방해한 경우</li>
              <li>법령 위반 행위가 확인된 경우</li>
            </ul>
            <p className="mt-2">이용 제한 시 사전에 통지하며, 긴급한 경우 사후 통지할 수 있습니다. 자세한 조치 기준은 <Link href="/policies/safety" className="text-blue-600 hover:underline">정책 및 안전</Link> 페이지를 참고해주세요.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제11조 (회원 탈퇴)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회원은 언제든지 설정 페이지에서 탈퇴를 요청할 수 있습니다.</li>
              <li>탈퇴 시 회원 정보는 30일 이내에 파기되며, 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관됩니다.</li>
              <li>탈퇴 후 동일 이메일로 재가입이 가능합니다.</li>
              <li>탈퇴 시 미정산 수익은 최종 정산 후 지급됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제12조 (서비스 변경 및 중단)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회사는 서비스를 개선하거나 운영상의 이유로 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</li>
              <li>중요한 변경 사항은 사전에 공지합니다.</li>
              <li>천재지변, 불가항력적 사유로 인한 서비스 중단의 경우 사전 공지가 불가능할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제13조 (면책 조항)</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회사는 회원이 업로드한 콘텐츠의 정확성, 완전성, 적법성에 대해 보증하지 않습니다.</li>
              <li>회사는 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입하거나 책임지지 않습니다.</li>
              <li>서비스 이용으로 발생하는 모든 책임은 사용자 본인에게 있으며, 회사는 법률이 허용하는 범위 내에서 책임을 제한합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">제14조 (준거법 및 관할법원)</h2>
            <p>이 약관의 해석 및 분쟁에 관하여는 대한민국 법률을 적용하며, 분쟁이 발생하는 경우 서울중앙지방법원을 제1심 전속 관할법원으로 합니다.</p>
          </section>

          <section className="border-t dark:border-gray-800 pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">부칙: 이 약관은 2026년 2월 14일부터 시행합니다.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">약관에 관한 문의: support@textry.io</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}