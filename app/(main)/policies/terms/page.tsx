'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">서비스 약관</h1>
        <p className="text-sm text-gray-500 mb-8">최종 업데이트: 2026년 2월 13일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. 소개</h2>
            <p>본 약관은 Textry(이하 "서비스")를 이용하는 모든 사용자에게 적용됩니다. 서비스를 이용함으로써 본 약관에 동의하는 것으로 간주됩니다.</p>
            <p>Textry는 사용자가 문서를 업로드, 공유, 열람할 수 있는 디지털 콘텐츠 플랫폼입니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. 서비스 이용 자격</h2>
            <p>서비스를 이용하려면 만 14세 이상이어야 합니다. 만 14세 미만의 사용자는 법정 대리인의 동의가 필요합니다.</p>
            <p>사용자는 정확한 정보를 제공하여 계정을 생성해야 하며, 계정 보안에 대한 책임은 사용자에게 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. 콘텐츠 업로드 및 저작권</h2>
            <p>사용자는 본인이 저작권을 보유하거나 배포 권한을 가진 콘텐츠만 업로드할 수 있습니다.</p>
            <p>업로드된 콘텐츠에 대한 저작권은 원 저작권자에게 있으며, Textry는 서비스 운영에 필요한 범위 내에서 콘텐츠를 표시, 배포, 홍보할 수 있는 비독점적 라이선스를 부여받습니다.</p>
            <p>타인의 저작권을 침해하는 콘텐츠를 업로드할 경우, 해당 콘텐츠는 사전 통보 없이 삭제될 수 있으며, 반복적인 위반 시 계정이 영구 정지될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">4. 금지 행위</h2>
            <p>다음 행위는 엄격히 금지됩니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>타인의 저작권, 상표권, 기타 지식재산권을 침해하는 행위</li>
              <li>불법적, 유해한, 위협적, 모욕적, 괴롭히는, 명예를 훼손하는 콘텐츠 게시</li>
              <li>악성코드, 바이러스 등 유해한 소프트웨어 배포</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>다른 사용자의 개인정보를 무단으로 수집하는 행위</li>
              <li>허위 정보를 의도적으로 유포하는 행위</li>
              <li>불법 촬영물 등 법률에 의해 금지된 콘텐츠 게시</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">5. 프리미엄 구독</h2>
            <p>프리미엄 구독은 월정액 결제 방식으로 운영되며, 광고 없는 읽기 환경을 제공합니다.</p>
            <p>구독 해지는 언제든 가능하며, 해지 시점의 결제 주기가 끝날 때까지 서비스를 이용할 수 있습니다.</p>
            <p>환불은 관련 법률에 따라 처리됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">6. 작가 수익 프로그램</h2>
            <p>자격을 갖춘 작가는 광고 수익 및 프리미엄 구독 수익의 일부를 배분받을 수 있습니다.</p>
            <p>수익 배분 비율은 작가 등급에 따라 결정되며, Textry는 배분 비율을 사전 공지 후 변경할 수 있습니다.</p>
            <p>Textry 상에 게시, 태그 또는 추천된 콘텐츠들은 각 저작권자의 조건에 따릅니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">7. 서비스 변경 및 중단</h2>
            <p>Textry는 서비스를 개선하거나 운영상의 이유로 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</p>
            <p>중요한 변경 사항은 사전에 공지합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">8. 면책 조항</h2>
            <p>Textry는 사용자가 업로드한 콘텐츠의 정확성, 완전성, 적법성에 대해 보증하지 않습니다.</p>
            <p>서비스 이용으로 발생하는 모든 책임은 사용자 본인에게 있으며, Textry는 법률이 허용하는 범위 내에서 책임을 제한합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">9. 준거법 및 관할</h2>
            <p>본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 서울중앙지방법원을 제1심 관할 법원으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">10. 문의</h2>
            <p>약관에 관한 문의는 아래로 연락해주세요:</p>
            <p className="mt-2">이메일: support@textry.io</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
